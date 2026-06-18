import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { opslag } from '../data/feed'
import { hentVenner, hentVennerFraDB } from '../data/venner'
import { hentAktivBruger } from '../data/auth'
import { hentKreationer } from '../data/kreationer'
import { hentLikes } from '../data/likes'
import { colors, shadow, radius, font } from '../data/theme'
import { supabase } from '../lib/supabase'
import { billedeUrl, opskriftFarve, tidLabel, sværhedLabel, grad } from '../lib/recipeUtils'

function relativTid(isoString) {
  const diff = Date.now() - new Date(isoString).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Lige nu'
  if (min < 60) return `${min} min siden`
  const timer = Math.floor(min / 60)
  if (timer < 24) return `${timer} t siden`
  const dage = Math.floor(timer / 24)
  return `${dage} dag${dage > 1 ? 'e' : ''} siden`
}

function hilsen() {
  const t = new Date().getHours()
  if (t < 10) return 'Godmorgen'
  if (t < 14) return 'God formiddag'
  if (t < 18) return 'God eftermiddag'
  return 'God aften'
}

function datoLinje() {
  return new Date()
    .toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase()
}

function beregnStreak(kreationer) {
  if (!kreationer.length) return 0
  const datoer = new Set(kreationer.map((k) => k.dato?.slice(0, 10)).filter(Boolean))
  let streak = 0
  const dag = new Date()
  dag.setHours(0, 0, 0, 0)
  while (datoer.has(dag.toISOString().slice(0, 10))) {
    streak++
    dag.setDate(dag.getDate() - 1)
  }
  return streak
}

export default function Hjem() {
  const navigate = useNavigate()
  const [opskrifter, setOpskrifter] = useState([])
  const [loading, setLoading] = useState(true)
  const [vennerListe, setVennerListe] = useState(() => hentVenner())
  const [kreationer] = useState(() => hentKreationer())
  const [likes] = useState(() => hentLikes())
  const [dbPosts, setDbPosts] = useState([])
  const [postLikes, setPostLikes] = useState({})
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const [søgeTekst, setSøgeTekst] = useState('')
  const [søgeResultater, setSøgeResultater] = useState([])
  const [søgerAktivt, setSøgerAktivt] = useState(false)
  const søgeTimer = useRef(null)

  const bruger = hentAktivBruger()
  const streak = beregnStreak(kreationer)

  // Recipes — kun opskrifter med tags, filtreret på brugerens tags
  useEffect(() => {
    let cancelled = false
    const brugerTags = bruger?.tags ?? []
    supabase
      .from('recipes')
      .select('id, title, description, difficulty, prep_time, cook_time, tags, storage_image')
      .not('tags', 'is', null)
      .neq('tags', '{}')
      .limit(60)
      .then(({ data }) => {
        if (cancelled) return
        const alle = (data ?? []).filter(r => r.tags?.length > 0)
        // Sorter: retter der matcher brugerens tags kommer først
        const sorteret = brugerTags.length > 0
          ? [...alle].sort((a, b) => {
              const aMatch = a.tags.filter(t => brugerTags.includes(t)).length
              const bMatch = b.tags.filter(t => brugerTags.includes(t)).length
              return bMatch - aMatch
            })
          : alle
        if (!cancelled) { setOpskrifter(sorteret); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [bruger?.tags?.join(',')])

  // Venner → filtreret feed → realtime
  useEffect(() => {
    if (!bruger?.id) return
    let cancelled = false
    let channel = null

    async function init() {
      // 1. Hent venner (bruger nu user_id)
      const vennerData = await hentVennerFraDB(bruger.id)
      if (cancelled) return
      if (vennerData.length) setVennerListe(vennerData)

      const venUserIds = vennerData.map((v) => v.id).filter(Boolean)
      const emails = vennerData.map((v) => v.email).filter(Boolean)

      // 2. Bed om notifikationstilladelse når man har venner
      if (venUserIds.length > 0 && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }

      // 3. Hent posts — fra venner hvis man følger nogen, ellers alle (discovery)
      const query = venUserIds.length > 0
        ? supabase.from('posts').select('*').in('user_id', venUserIds)
        : supabase.from('posts').select('*')
      const { data: postsData } = await query.order('created_at', { ascending: false }).limit(20)
      if (!cancelled && postsData?.length) setDbPosts(postsData)

      // 4. Realtime — nye posts fra venner
      channel = supabase.channel(`hjem-feed-${bruger.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
          const post = payload.new
          const erFraVen = venUserIds.length === 0 || venUserIds.includes(post.user_id)
          if (!erFraVen) return

          // Opdater feed live
          setDbPosts((prev) => [post, ...prev])

          // In-app toast
          setToast({ tekst: `${post.bruger_navn} lavede ${post.opskrift_titel}`, avatar: post.bruger_avatar ?? '🧑‍🍳' })
          if (toastTimer.current) clearTimeout(toastTimer.current)
          toastTimer.current = setTimeout(() => setToast(null), 4500)

          // Browser-notifikation
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`🍳 ${post.bruger_navn} lavede mad!`, {
              body: post.opskrift_titel + (post.citat ? ` · "${post.citat}"` : ''),
              icon: '/favicon.ico',
            })
          }
        })
        .subscribe()
    }

    init()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [bruger?.id])

  function håndterSøg(tekst) {
    setSøgeTekst(tekst)
    if (søgeTimer.current) clearTimeout(søgeTimer.current)
    if (!tekst.trim()) { setSøgeResultater([]); setSøgerAktivt(false); return }
    setSøgerAktivt(true)
    søgeTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('recipes')
        .select('id, title, prep_time, cook_time, tags, storage_image')
        .ilike('title', `%${tekst.trim()}%`)
        .limit(12)
      setSøgeResultater(data ?? [])
    }, 280)
  }

  function rydSøg() { setSøgeTekst(''); setSøgeResultater([]); setSøgerAktivt(false) }

  // Hent likes når posts loader
  useEffect(() => {
    if (!dbPosts.length || !bruger?.id) return
    const ids = dbPosts.map((p) => p.id)
    supabase.from('post_likes').select('post_id, user_id').in('post_id', ids).then(({ data }) => {
      const map = {}
      for (const like of data ?? []) {
        if (!map[like.post_id]) map[like.post_id] = { count: 0, likedByMe: false }
        map[like.post_id].count++
        if (like.user_id === bruger.id) map[like.post_id].likedByMe = true
      }
      setPostLikes(map)
    })
  }, [dbPosts, bruger?.id])

  async function toggleLike(postId) {
    if (!bruger?.id) return
    const cur = postLikes[postId] ?? { count: 0, likedByMe: false }
    if (cur.likedByMe) {
      setPostLikes((prev) => ({ ...prev, [postId]: { count: Math.max(0, cur.count - 1), likedByMe: false } }))
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', bruger.id)
    } else {
      setPostLikes((prev) => ({ ...prev, [postId]: { count: cur.count + 1, likedByMe: true } }))
      await supabase.from('post_likes').insert({ post_id: postId, user_id: bruger.id })
    }
  }

  // Venner der postede indenfor 24 timer — bruges til live-ring
  const recentPostEmails = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    return new Set(dbPosts.filter((p) => new Date(p.created_at).getTime() > cutoff).map((p) => p.bruger_email))
  }, [dbPosts])

  const featured = opskrifter[0] ?? null
  const anbefalet = opskrifter.slice(1, 6)

  return (
    <div style={styles.page}>

      {/* In-app toast notifikation */}
      {toast && (
        <div style={styles.toast}>
          <span style={{ fontSize: 26, flexShrink: 0 }}>{toast.avatar}</span>
          <p style={styles.toastTekst}>{toast.tekst}</p>
          <button style={styles.toastLuk} onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      {/* Hilsen */}
      <header style={styles.topRow}>
        <div>
          <p style={styles.eyebrow}>{datoLinje()}</p>
          <h1 style={styles.title}>
            {hilsen()},<br />{bruger?.navn ?? 'Kok'} 👋
          </h1>
        </div>
        <div style={styles.avatar}>{bruger?.avatar ?? '🧑‍🍳'}</div>
      </header>

      {/* Streak / stats */}
      <div style={styles.stats}>
        <Stat tal={streak > 0 ? streak : '—'} label="dages streak" ikon="🔥" fremhæv />
        <Stat tal={kreationer.length || '—'} label="retter lavet" ikon="🍳" />
        <Stat tal={likes.length || '—'} label="gemte" ikon="🔖" />
      </div>

      {/* Søgefelt */}
      <div style={styles.søgeWrap}>
        <span style={styles.søgeIkon}>🔍</span>
        <input
          type="search"
          value={søgeTekst}
          onChange={(e) => håndterSøg(e.target.value)}
          placeholder="Søg i opskrifter…"
          style={styles.søgeInput}
        />
        {søgeTekst && (
          <button style={styles.søgeRyd} onClick={rydSøg}>✕</button>
        )}
      </div>

      {/* Søgeresultater */}
      {søgerAktivt && (
        <div style={styles.søgePanel}>
          {søgeResultater.length === 0 ? (
            <p style={styles.søgeTom}>Ingen opskrifter fundet for "{søgeTekst}"</p>
          ) : (
            søgeResultater.map((o) => {
              const img = billedeUrl(o.storage_image)
              const farve = opskriftFarve(o.tags)
              const tid = tidLabel(o.prep_time, o.cook_time)
              return (
                <button key={o.id} style={styles.søgeResultat} onClick={() => { rydSøg(); navigate(`/opskrift/${o.id}`) }}>
                  <div style={{ ...styles.søgeThumb, background: grad(farve) }}>
                    {img && <img src={img} alt="" style={styles.søgeThumbImg} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <p style={styles.søgeNavn}>{o.title}</p>
                    {tid && <p style={styles.søgeMeta}>⏱ {tid}</p>}
                  </div>
                  <span style={{ color: colors.mutedLight, fontSize: 20 }}>›</span>
                </button>
              )
            })
          )}
        </div>
      )}

      {/* Stories — aktive venner */}
      {!søgerAktivt && <Section titel="Aktive lige nu" handling="Tilføj venner" onHandling={() => navigate('/profil')} />}
      {!søgerAktivt && (
        vennerListe.length === 0 ? (
          <div style={styles.tomVenner}>
            <span style={{ fontSize: 28 }}>👥</span>
            <p style={styles.tomVennerTekst}>Tilføj venner for at se, hvad de laver i køkkenet.</p>
            <button style={styles.tilføjVenBtn} onClick={() => navigate('/profil')}>+ Find venner</button>
          </div>
        ) : (
          <div style={styles.scrollRow}>
            {vennerListe.map((v) => {
              const erAktiv = recentPostEmails.has(v.email)
              return (
                <div key={v.id} style={styles.story}>
                  <div style={{ ...styles.storyRing, background: erAktiv ? `linear-gradient(135deg, ${colors.terracotta}, ${colors.red})` : colors.border }}>
                    <div style={styles.storyAvatar}>{v.emoji}</div>
                  </div>
                  <span style={styles.storyNavn}>{v.navn}</span>
                  {erAktiv && <span style={styles.liveDot}>NY</span>}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Ugens opskrift */}
      {!søgerAktivt && <Section titel="Ugens opskrift" />}
      {!søgerAktivt && (loading ? (
        <div style={styles.featuredSkeleton} />
      ) : featured ? (
        <FeaturedCard opskrift={featured} onClick={() => navigate(`/opskrift/${featured.id}`)} />
      ) : null)}

      {/* Socialt feed */}
      {!søgerAktivt && <Section titel="I dit fællesskab" handling="Følg flere" onHandling={() => navigate('/profil')} />}
      {!søgerAktivt && <div style={styles.feed}>
        {dbPosts.length > 0
          ? dbPosts.map((p) => (
            <article key={p.id} style={styles.post}>
              <div style={styles.postHead}>
                <div style={styles.postAvatar}>{p.bruger_avatar ?? '🧑‍🍳'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={styles.postNavn}>
                    {p.bruger_navn}{' '}
                    <span style={styles.postHandling}>lavede</span>
                  </p>
                  <p style={styles.postTid}>{relativTid(p.created_at)}</p>
                </div>
                <button style={styles.followBtn} onClick={() => navigate('/profil')}>+ Følg</button>
              </div>
              {p.foto_path ? (
                <img
                  src={billedeUrl(p.foto_path)}
                  alt={p.opskrift_titel}
                  style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 14 }}
                />
              ) : (
                <div style={{ ...styles.postImg, background: grad(opskriftFarve([])) }}>
                  <span style={styles.postRet}>{p.opskrift_titel}</span>
                </div>
              )}
              {p.citat && <p style={styles.postCitat}>"{p.citat}"</p>}
              <div style={styles.postFooter}>
                <button
                  style={{ ...styles.postStat, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: postLikes[p.id]?.likedByMe ? colors.red : colors.muted }}
                  onClick={() => toggleLike(p.id)}
                >
                  {postLikes[p.id]?.likedByMe ? '❤️' : '🤍'} {postLikes[p.id]?.count ?? 0}
                </button>
                {p.opskrift_id ? (
                  <button
                    style={{ ...styles.postStat, marginLeft: 'auto', color: colors.green, background: 'none', border: 'none', fontFamily: font.body, fontWeight: 600, fontSize: 14, cursor: 'pointer', padding: 0 }}
                    onClick={() => navigate(`/opskrift/${p.opskrift_id}`)}
                  >
                    Lav også →
                  </button>
                ) : (
                  <button
                    style={{ ...styles.postStat, marginLeft: 'auto', color: colors.green, background: 'none', border: 'none', fontFamily: font.body, fontWeight: 600, fontSize: 14, cursor: 'pointer', padding: 0 }}
                    onClick={() => navigate('/madmatch')}
                  >
                    Lav også →
                  </button>
                )}
              </div>
            </article>
          ))
          : opslag.map((p) => (
            <article key={p.id} style={styles.post}>
              <div style={styles.postHead}>
                <div style={styles.postAvatar}>{p.avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={styles.postNavn}>
                    {p.navn}{' '}
                    <span style={styles.postHandling}>{p.handling}</span>
                  </p>
                  <p style={styles.postTid}>{p.tid}</p>
                </div>
                <button style={styles.followBtn} onClick={() => navigate('/profil')}>+ Følg</button>
              </div>
              <div style={{ ...styles.postImg, background: grad(p.farve) }}>
                <span style={styles.postImgEmoji}>{p.emoji}</span>
                <span style={styles.postRet}>{p.ret}</span>
              </div>
              {p.citat && <p style={styles.postCitat}>"{p.citat}"</p>}
              <div style={styles.postFooter}>
                <span style={styles.postStat}>❤️ {p.likes}</span>
                <span style={styles.postStat}>💬 {p.kommentarer}</span>
                {p.opskriftId ? (
                  <button
                    style={{ ...styles.postStat, marginLeft: 'auto', color: colors.green, background: 'none', border: 'none', fontFamily: font.body, fontWeight: 600, fontSize: 14, cursor: 'pointer', padding: 0 }}
                    onClick={() => navigate(`/opskrift/${p.opskriftId}`)}
                  >
                    Lav også →
                  </button>
                ) : (
                  <button
                    style={{ ...styles.postStat, marginLeft: 'auto', color: colors.green, background: 'none', border: 'none', fontFamily: font.body, fontWeight: 600, fontSize: 14, cursor: 'pointer', padding: 0 }}
                    onClick={() => navigate('/madmatch')}
                  >
                    Lav også →
                  </button>
                )}
              </div>
            </article>
          ))
        }
      </div>}

      {/* Mere til dig */}
      {!søgerAktivt && <Section titel="Mere til dig" handling="Se alle" onHandling={() => navigate('/galleri')} />}
      {!søgerAktivt && <div style={styles.swipeRække}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={styles.recipeCardSkeleton} />
            ))
          : anbefalet.map((o) => (
              <RecipeCard key={o.id} opskrift={o} onClick={() => navigate(`/opskrift/${o.id}`)} />
            ))}
      </div>}
    </div>
  )
}

function FeaturedCard({ opskrift, onClick }) {
  const imgUrl = billedeUrl(opskrift.storage_image)
  const farve = opskriftFarve(opskrift.tags)
  const tid = tidLabel(opskrift.prep_time, opskrift.cook_time)
  const sværhed = sværhedLabel(opskrift.difficulty)
  const meta = [tid && `⏱ ${tid}`, sværhed].filter(Boolean).join(' · ')

  return (
    <button style={styles.featured} onClick={onClick}>
      <div style={{ ...styles.featuredHero, background: grad(farve) }}>
        {imgUrl && <img src={imgUrl} alt={opskrift.title} style={styles.featuredImg} />}
        <span style={styles.featuredBadge}>⭐ Anbefalet til dig</span>
      </div>
      <div style={styles.featuredBody}>
        <h3 style={styles.featuredTitel}>{opskrift.title}</h3>
        {meta && <p style={styles.featuredMeta}>{meta}</p>}
        {opskrift.description && (
          <p style={styles.featuredTekst}>
            {opskrift.description.length > 120
              ? opskrift.description.slice(0, 120) + '…'
              : opskrift.description}
          </p>
        )}
      </div>
    </button>
  )
}

function RecipeCard({ opskrift, onClick }) {
  const imgUrl = billedeUrl(opskrift.storage_image)
  const farve = opskriftFarve(opskrift.tags)
  const tid = tidLabel(opskrift.prep_time, opskrift.cook_time)
  const sværhed = sværhedLabel(opskrift.difficulty)
  const meta = [tid, sværhed].filter(Boolean).join(' · ')

  return (
    <button style={styles.recipeCard} onClick={onClick}>
      <div style={{ ...styles.recipeHero, background: grad(farve) }}>
        {imgUrl ? (
          <img src={imgUrl} alt={opskrift.title} style={styles.recipeImg} />
        ) : (
          <span style={styles.recipeInitial}>{opskrift.title.charAt(0)}</span>
        )}
      </div>
      <div style={styles.recipeBody}>
        <p style={styles.recipeTitel}>{opskrift.title}</p>
        {meta && <p style={styles.recipeMeta}>{meta}</p>}
      </div>
    </button>
  )
}

function Stat({ tal, label, ikon, fremhæv }) {
  return (
    <div style={{ ...styles.stat, ...(fremhæv ? { background: colors.green } : null) }}>
      <span style={{ ...styles.statTal, color: fremhæv ? '#fff' : colors.text }}>
        {ikon} {tal}
      </span>
      <span style={{ ...styles.statLabel, color: fremhæv ? 'rgba(255,255,255,0.85)' : colors.muted }}>
        {label}
      </span>
    </div>
  )
}

function Section({ titel, handling, onHandling }) {
  return (
    <div style={styles.sectionHead}>
      <h2 style={styles.sectionTitel}>{titel}</h2>
      {handling && (
        <button style={styles.sectionLink} onClick={onHandling}>{handling}</button>
      )}
    </div>
  )
}

const styles = {
  page: { maxWidth: 480, margin: '0 auto', padding: '20px 20px 120px', minHeight: '100%', position: 'relative' },

  toast: {
    position: 'fixed', top: 14, left: '50%', transform: 'translateX(-50%)',
    background: colors.card, borderRadius: 18, boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
    padding: '12px 14px 12px 16px', display: 'flex', alignItems: 'center', gap: 10,
    maxWidth: 340, width: 'calc(100vw - 32px)', zIndex: 400,
    border: `1.5px solid ${colors.border}`,
  },
  toastTekst: {
    flex: 1, fontFamily: font.body, fontSize: 14, fontWeight: 600, color: colors.text,
    margin: 0, lineHeight: 1.3,
  },
  toastLuk: {
    background: 'none', border: 'none', color: colors.mutedLight,
    fontSize: 14, padding: '0 0 0 4px', cursor: 'pointer', flexShrink: 0,
  },

  topRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  eyebrow: {
    fontFamily: font.body, fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
    color: colors.terracotta, margin: '0 0 6px',
  },
  title: {
    fontFamily: font.display, fontWeight: 800, fontSize: 30, lineHeight: 1.1,
    color: colors.text, margin: 0, letterSpacing: -0.6,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 999, background: colors.card,
    boxShadow: shadow.card, display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 24, flexShrink: 0,
  },

  stats: { display: 'flex', gap: 10, margin: '20px 0 4px' },
  stat: {
    flex: 1, background: colors.card, borderRadius: 16, boxShadow: shadow.card,
    padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2,
  },
  statTal: { fontFamily: font.display, fontWeight: 800, fontSize: 18 },
  statLabel: { fontFamily: font.body, fontSize: 11.5, fontWeight: 600 },

  sectionHead: {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    margin: '26px 0 12px',
  },
  sectionTitel: {
    fontFamily: font.display, fontWeight: 800, fontSize: 19, color: colors.text,
    margin: 0, letterSpacing: -0.3,
  },
  sectionLink: {
    fontFamily: font.body, fontSize: 13, fontWeight: 700, color: colors.green,
    background: 'none', border: 'none', padding: 0,
  },

  søgeWrap: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: colors.card, borderRadius: 16, boxShadow: shadow.card,
    padding: '0 14px', margin: '16px 0 4px', height: 48,
  },
  søgeIkon: { fontSize: 17, flexShrink: 0, opacity: 0.5 },
  søgeInput: {
    flex: 1, fontFamily: font.body, fontSize: 15, color: colors.text,
    background: 'transparent', border: 'none', outline: 'none',
    padding: '0 4px',
  },
  søgeRyd: {
    background: 'none', border: 'none', color: colors.mutedLight,
    fontSize: 14, cursor: 'pointer', padding: '0 2px', flexShrink: 0,
  },
  søgePanel: {
    background: colors.card, borderRadius: 16, boxShadow: shadow.card,
    overflow: 'hidden', marginBottom: 8,
  },
  søgeTom: {
    fontFamily: font.body, fontSize: 14, color: colors.muted,
    textAlign: 'center', padding: '24px 16px', margin: 0,
  },
  søgeResultat: {
    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px', background: 'transparent', border: 'none',
    borderBottom: `1px solid ${colors.border}`, cursor: 'pointer',
  },
  søgeThumb: {
    width: 48, height: 48, borderRadius: 10, flexShrink: 0,
    overflow: 'hidden', position: 'relative',
  },
  søgeThumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  søgeNavn: {
    fontFamily: font.body, fontWeight: 700, fontSize: 14.5, color: colors.text,
    margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  søgeMeta: {
    fontFamily: font.body, fontSize: 12.5, color: colors.muted, margin: '2px 0 0',
  },

  tomVenner: {
    background: colors.card, borderRadius: 16, boxShadow: shadow.card,
    padding: '20px 20px', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 8, textAlign: 'center',
  },
  tomVennerTekst: {
    fontFamily: font.body, fontSize: 14, color: colors.muted, margin: 0, lineHeight: 1.5,
  },
  tilføjVenBtn: {
    fontFamily: font.body, fontSize: 13, fontWeight: 700, color: colors.green,
    background: 'rgba(47,107,79,0.10)', border: 'none', borderRadius: 999,
    padding: '9px 16px', cursor: 'pointer',
  },

  scrollRow: {
    display: 'flex', gap: 14, overflowX: 'auto', padding: '4px 0 8px',
    margin: '0 -20px', paddingLeft: 20, paddingRight: 20,
    scrollbarWidth: 'none',
  },
  swipeRække: {
    display: 'flex', gap: 14, overflowX: 'auto', padding: '4px 0 12px',
    margin: '0 -20px', paddingLeft: 20, paddingRight: 20,
    scrollbarWidth: 'none', scrollSnapType: 'x mandatory',
    WebkitOverflowScrolling: 'touch',
  },

  story: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, width: 64, position: 'relative' },
  storyRing: { width: 60, height: 60, borderRadius: 999, padding: 3, display: 'flex' },
  storyAvatar: {
    flex: 1, borderRadius: 999, background: colors.bg, display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: 26,
    border: `2px solid ${colors.card}`,
  },
  storyNavn: { fontFamily: font.body, fontSize: 12, fontWeight: 600, color: colors.text },
  liveDot: {
    position: 'absolute', top: 48, fontFamily: font.body, fontSize: 8, fontWeight: 800,
    color: '#fff', background: colors.red, padding: '2px 5px', borderRadius: 999, letterSpacing: 0.5,
  },

  featured: {
    width: '100%', textAlign: 'left', border: 'none', borderRadius: radius.card,
    boxShadow: shadow.card, padding: 0, overflow: 'hidden', background: colors.card,
    cursor: 'pointer',
  },
  featuredSkeleton: {
    width: '100%', height: 300, borderRadius: radius.card, background: colors.border,
  },
  featuredHero: {
    width: '100%', height: 200, position: 'relative', overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  featuredImg: {
    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
  },
  featuredBadge: {
    position: 'absolute', top: 14, left: 14, fontFamily: font.body, fontSize: 12,
    fontWeight: 700, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)',
    color: '#fff', padding: '5px 11px', borderRadius: 999, zIndex: 1,
  },
  featuredBody: { padding: '16px 18px 20px' },
  featuredTitel: {
    fontFamily: font.display, fontWeight: 800, fontSize: 22, margin: '0 0 6px',
    letterSpacing: -0.4, color: colors.text,
  },
  featuredMeta: {
    fontFamily: font.body, fontSize: 13, fontWeight: 600, color: colors.muted, margin: '0 0 8px',
  },
  featuredTekst: {
    fontFamily: font.body, fontSize: 14, lineHeight: 1.45, color: colors.muted, margin: 0,
  },

  feed: { display: 'flex', flexDirection: 'column', gap: 16 },
  post: {
    background: colors.card, borderRadius: radius.card, boxShadow: shadow.card, padding: 14,
  },
  postHead: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  postAvatar: {
    width: 40, height: 40, borderRadius: 999, background: colors.bg, display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
    border: `1px solid ${colors.border}`,
  },
  postNavn: { fontFamily: font.body, fontSize: 15, fontWeight: 700, color: colors.text, margin: 0 },
  postHandling: { fontWeight: 500, color: colors.muted },
  postTid: { fontFamily: font.body, fontSize: 12, color: colors.mutedLight, margin: '1px 0 0' },
  followBtn: {
    fontFamily: font.body, fontSize: 12.5, fontWeight: 700, color: colors.green,
    background: 'rgba(47,107,79,0.10)', border: 'none', borderRadius: 999,
    padding: '7px 12px', flexShrink: 0,
  },
  postImg: {
    height: 150, borderRadius: 14, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', position: 'relative', color: '#fff',
  },
  postImgEmoji: { fontSize: 60, filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.2))' },
  postRet: {
    position: 'absolute', bottom: 12, left: 14, fontFamily: font.display,
    fontWeight: 800, fontSize: 18, textShadow: '0 1px 6px rgba(0,0,0,0.3)',
  },
  postCitat: {
    fontFamily: font.body, fontSize: 14, color: colors.text, fontStyle: 'italic',
    margin: '12px 2px 0', lineHeight: 1.4,
  },
  postFooter: { display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 },
  postStat: { fontFamily: font.body, fontSize: 14, fontWeight: 600, color: colors.muted },

  recipeCard: {
    width: 160, flexShrink: 0, background: colors.card, borderRadius: 18,
    boxShadow: shadow.card, border: 'none', padding: 0, overflow: 'hidden',
    textAlign: 'left', cursor: 'pointer', scrollSnapAlign: 'start',
  },
  recipeCardSkeleton: {
    width: 160, height: 170, flexShrink: 0, borderRadius: 18, background: colors.border,
  },
  recipeHero: {
    height: 110, overflow: 'hidden', position: 'relative',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  recipeImg: {
    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
  },
  recipeInitial: {
    fontSize: 42, fontFamily: font.display, fontWeight: 800,
    color: 'rgba(255,255,255,0.9)', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))',
  },
  recipeBody: { padding: '10px 12px 14px' },
  recipeTitel: {
    fontFamily: font.body, fontWeight: 700, fontSize: 14.5, color: colors.text,
    margin: '0 0 4px',
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  recipeMeta: { fontFamily: font.body, fontSize: 12, color: colors.muted, margin: 0 },
}
