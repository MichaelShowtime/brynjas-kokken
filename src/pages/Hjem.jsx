import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, Pencil, Trash2, Search, Bookmark, UtensilsCrossed, MoreHorizontal, ChefHat, BookmarkCheck } from 'lucide-react'
import { hentGemte, toggleGemt } from '../data/gemte'
import { hentVenner, hentVennerFraDB } from '../data/venner'
import { hentAktivBruger } from '../data/auth'
import { hentKreationer } from '../data/kreationer'
import { hentLikes } from '../data/likes'
import { colors, shadow, radius, font } from '../data/theme'
import { supabase } from '../lib/supabase'
import { billedeUrl, opskriftFarve, tidLabel, sværhedLabel, grad } from '../lib/recipeUtils'
import { useLang, relativTidLang, datoLinjeLang } from '../lib/lang'

function hilsen(t, h) {
  if (h < 6)  return t('hjem.godnat')
  if (h < 10) return t('hjem.godmorgen')
  if (h < 12) return t('hjem.godFormiddag')
  if (h < 14) return t('hjem.godMiddag')
  if (h < 18) return t('hjem.godEftermiddag')
  if (h < 23) return t('hjem.godAftenen')
  return t('hjem.godnat')
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
  const { t, lang } = useLang()
  const [opskrifter, setOpskrifter] = useState([])
  const [loading, setLoading] = useState(true)
  const [vennerListe, setVennerListe] = useState(() => hentVenner())
  const [kreationer] = useState(() => hentKreationer())
  const [likes] = useState(() => hentLikes())
  const [dbPosts, setDbPosts] = useState([])
  const [postLikes, setPostLikes] = useState({})
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const [gemte, setGemte] = useState(() => hentGemte())
  const [søgeÅben, setSøgeÅben] = useState(false)
  const søgeInputRef = useRef(null)

  const bruger = hentAktivBruger()
  const streak = beregnStreak(kreationer)
  const [harUlæste, setHarUlæste] = useState(false)
  const [time, setTime] = useState(() => new Date().getHours())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date().getHours()), 30_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!bruger?.id) return
    const sidst = localStorage.getItem('simmer_notif_sist')
    const cutoff = sidst ?? '1970-01-01T00:00:00Z'
    supabase
      .from('venner')
      .select('*', { count: 'exact', head: true })
      .eq('ven_user_id', bruger.id)
      .gt('created_at', cutoff)
      .then(({ count }) => { if ((count ?? 0) > 0) setHarUlæste(true) })
  }, [bruger?.id])

  useEffect(() => {
    let cancelled = false
    const brugerTags = bruger?.tags ?? []
    supabase
      .from('recipes')
      .select('id, title, description, difficulty, prep_time, cook_time, tags, storage_image, image_url')
      .order('id', { ascending: true })
      .limit(1000)
      .then(({ data }) => {
        if (cancelled) return
        const alle = data ?? []
        const sorteret = brugerTags.length > 0
          ? [...alle].sort((a, b) => {
              const aMatch = (a.tags ?? []).filter(tg => brugerTags.includes(tg)).length
              const bMatch = (b.tags ?? []).filter(tg => brugerTags.includes(tg)).length
              return bMatch - aMatch
            })
          : alle
        if (!cancelled) { setOpskrifter(sorteret); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [bruger?.tags?.join(',')])

  useEffect(() => {
    if (!bruger?.id) return
    let cancelled = false
    let channel = null

    async function init() {
      const vennerData = await hentVennerFraDB(bruger.id)
      if (cancelled) return
      if (vennerData.length) setVennerListe(vennerData)

      const venUserIds = [bruger.id, ...vennerData.map((v) => v.id)].filter(Boolean)
      const emails     = [bruger.email, ...vennerData.map((v) => v.email)].filter(Boolean)

      if (vennerData.length > 0 && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }

      const idFilter   = venUserIds.join(',')
      const mailFilter = emails.map(e => `"${e}"`).join(',')
      const { data } = await supabase
        .from('posts')
        .select('*')
        .or(`user_id.in.(${idFilter}),bruger_email.in.(${mailFilter})`)
        .order('created_at', { ascending: false })
        .limit(20)
      const postsData = data ?? []
      if (!cancelled && postsData.length) setDbPosts(postsData)

      channel = supabase.channel(`hjem-feed-${bruger.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
          const post = payload.new
          const erFraVen = venUserIds.includes(post.user_id) || emails.includes(post.bruger_email)
          if (!erFraVen) return
          setDbPosts((prev) => [post, ...prev])
          setToast({ tekst: `${post.bruger_navn} lavede ${post.opskrift_titel}`, avatar: post.bruger_avatar ?? '🧑‍🍳' })
          if (toastTimer.current) clearTimeout(toastTimer.current)
          toastTimer.current = setTimeout(() => setToast(null), 4500)
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

  async function sletPost(postId) {
    await supabase.from('posts').delete().eq('id', postId).eq('user_id', bruger.id)
    setDbPosts(prev => prev.filter(p => p.id !== postId))
  }

  async function gemRedigering(postId, nyCitat) {
    const value = nyCitat?.trim() || null
    await supabase.from('posts').update({ citat: value }).eq('id', postId).eq('user_id', bruger.id)
    setDbPosts(prev => prev.map(p => p.id === postId ? { ...p, citat: value } : p))
  }

  const recentPostEmails = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    return new Set(dbPosts.filter((p) => new Date(p.created_at).getTime() > cutoff).map((p) => p.bruger_email))
  }, [dbPosts])

  const featured = getDagensRet(opskrifter)
  const anbefalet = opskrifter.slice(0, 6).filter(o => o.id !== featured?.id)

  return (
    <div style={styles.page}>

      <SøgeModal
        åben={søgeÅben}
        onLuk={() => setSøgeÅben(false)}
        opskrifter={opskrifter}
        navigate={navigate}
        inputRef={søgeInputRef}
        gemte={gemte}
        onToggleGem={(id) => { toggleGemt(id); setGemte(hentGemte()) }}
      />

      {toast && (
        <div style={styles.toast}>
          <span style={{ fontSize: 26, flexShrink: 0 }}>{toast.avatar}</span>
          <p style={styles.toastTekst}>{toast.tekst}</p>
          <button style={styles.toastLuk} onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      {/* ── Top-sektion (base creme) ─────────────────────────────────────────── */}
      <div style={styles.sektionTop}>
        <header style={styles.topRow}>
          <div>
            <p style={styles.eyebrow}>{datoLinjeLang(lang)}</p>
            <h1 style={styles.title}>
              {hilsen(t, time)},<br />{bruger?.navn ?? 'Kok'} 👋
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={styles.klokkeBtn} onClick={() => { setHarUlæste(false); navigate('/notifikationer') }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {harUlæste && <span style={styles.badge} />}
            </button>
            <button style={{ ...styles.avatar, border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => navigate('/profil')}>
              {bruger?.avatarUrl
                ? <img src={bruger.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 999 }} />
                : bruger?.avatar ?? '🧑‍🍳'}
            </button>
          </div>
        </header>

        <div style={styles.stats}>
          <Stat tal={streak > 0 ? streak : '—'} label={t('hjem.streakLabel')} ikon="🔥" fremhæv />
          <Stat tal={kreationer.length || '—'} label={t('pf.retterLavet')} ikon={<UtensilsCrossed size={15} />} />
          <Stat tal={gemte.length || '—'} label="gemte" ikon={<Bookmark size={15} />} onClick={() => navigate('/gemte')} />
        </div>

        <div style={{ ...styles.søgeWrap, cursor: 'pointer' }} onClick={() => { setSøgeÅben(true); søgeInputRef.current?.focus() }}>
          <Search size={17} color={colors.muted} style={{ opacity: 0.6, flexShrink: 0 }} />
          <span style={{ ...styles.søgeInput, color: colors.mutedLight, lineHeight: '1', display: 'flex', alignItems: 'center' }}>
            {t('hjem.søgPlaceholder').replace('🔍 ', '')}
          </span>
        </div>

        <Section titel={t('hjem.aktivNu')} handling={t('pf.tilføj')} onHandling={() => navigate('/profil')} />
        {(
          vennerListe.length === 0 ? (
            <div style={styles.tomVenner}>
              <span style={{ fontSize: 28 }}>👥</span>
              <p style={styles.tomVennerTekst}>{t('hjem.ingenAktive')}</p>
              <button style={styles.tilføjVenBtn} onClick={() => navigate('/profil')}>+ {t('pf.tilføjFørste').replace('+ ', '')}</button>
            </div>
          ) : (
            <div style={styles.scrollRow}>
              {vennerListe.map((v) => {
                const erAktiv = recentPostEmails.has(v.email)
                return (
                  <button
                    key={v.id}
                    style={{ ...styles.story, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    onClick={() => v.id && navigate(`/bruger/${v.id}`)}
                  >
                    <div style={{ ...styles.storyRing, background: erAktiv ? `linear-gradient(135deg, ${colors.terracotta}, ${colors.red})` : colors.border }}>
                      <div style={styles.storyAvatar}>{v.emoji}</div>
                    </div>
                    <span style={styles.storyNavn}>{v.navn}</span>
                  </button>
                )
              })}
            </div>
          )
        )}
      </div>

      {/* ── Dagens ret (blød grøn) ───────────────────────────────────────────── */}
      <div style={styles.sektionGrøn}>
        <Section titel={lang === 'en' ? "Today's dish" : 'Dagens ret'} />
        {loading ? (
          <div style={styles.featuredSkeleton} />
        ) : featured ? (
          <FeaturedCard opskrift={featured} onClick={() => navigate(`/opskrift/${featured.id}`)} />
        ) : null}
      </div>

      {/* ── Seneste retter (varm creme) ─────────────────────────────────────── */}
      <div style={styles.sektionCreme}>
          <Section titel={t('hjem.senesteFeed')} handling={lang === 'en' ? 'Follow more' : 'Følg flere'} onHandling={() => navigate('/profil')} />
          <div style={styles.feed}>
            {dbPosts.length > 0
              ? dbPosts.map((p) => (
                <PostKort
                  key={p.id}
                  post={p}
                  bruger={bruger}
                  likes={postLikes[p.id]}
                  onLike={toggleLike}
                  onSlet={sletPost}
                  onGemRedigering={gemRedigering}
                />
              ))
              : vennerListe.length === 0
                ? (
                  <div style={styles.feedTom}>
                    <span style={{ fontSize: 40 }}>👨‍👩‍👧</span>
                    <p style={styles.feedTomTitel}>{t('hjem.ingenFeed')}</p>
                    <p style={styles.feedTomTekst}>{t('hjem.ingenFeedSub')}</p>
                    <div style={styles.feedTomKnapper}>
                      <button style={styles.feedTomPrimær} onClick={() => navigate('/profil')}>+ {t('pf.tilføjFørste').replace('+ ', '')}</button>
                      <button style={styles.feedTomSekundær} onClick={() => navigate('/opret')}>{t('nav.opret')}</button>
                    </div>
                  </div>
                )
                : (
                  <div style={styles.feedTom}>
                    <span style={{ fontSize: 40 }}>🍳</span>
                    <p style={styles.feedTomTitel}>{t('hjem.ingenFeed')}</p>
                    <p style={styles.feedTomTekst}>{t('hjem.ingenFeedSub')}</p>
                    <button style={styles.feedTomPrimær} onClick={() => navigate('/opret')}>{t('nav.opret')}</button>
                  </div>
                )
            }
          </div>
        </div>

      {/* ── Mere til dig (base creme) ────────────────────────────────────────── */}
      <div style={styles.sektionBund}>
        <Section titel={lang === 'en' ? 'More for you' : 'Mere til dig'} handling={lang === 'en' ? 'See all' : 'Se alle'} onHandling={() => navigate('/galleri')} />
        <div style={styles.swipeRække}>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} style={styles.recipeCardSkeleton} />)
            : anbefalet.map((o) => (
                <RecipeCard
                  key={o.id}
                  opskrift={o}
                  onClick={() => navigate(`/opskrift/${o.id}`)}
                  gemte={gemte}
                  onToggleGem={(id) => {
                    toggleGemt(id)
                    setGemte(hentGemte())
                  }}
                />
              ))
          }
        </div>
      </div>
    </div>
  )
}

// ── PostKort ──────────────────────────────────────────────────────────────────

function PostKort({ post: p, bruger, likes, onLike, onSlet, onGemRedigering }) {
  const { t } = useLang()
  const navigate = useNavigate()
  const [visKommentarer, setVisKommentarer] = useState(false)
  const [visMenu, setVisMenu] = useState(false)
  const [redigerer, setRedigerer] = useState(false)

  const erMin = bruger?.id
    ? (p.user_id === bruger.id || (!p.user_id && p.bruger_email === bruger.email))
    : false

  const likeCount = likes?.count ?? 0
  const likedByMe = likes?.likedByMe ?? false

  return (
    <article style={pk.kort}>

      {/* ── Header ── */}
      <div style={pk.header}>
        <div style={pk.avatarWrap}>{p.bruger_avatar ?? '🧑‍🍳'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={pk.navn}>{p.bruger_navn}</p>
          <p style={pk.sub}>
            {p.opskrift_titel ? `lavede ${p.opskrift_titel}` : 'delte et opslag'}
            {' · '}{relativTidLang(p.created_at, t)}
          </p>
        </div>
        <button style={pk.menuBtn} onClick={() => erMin && setVisMenu(true)}>
          <MoreHorizontal size={20} color={colors.muted} />
        </button>
      </div>

      {/* ── Billede (1:1) ── */}
      <div style={pk.imgWrap}>
        {p.foto_path ? (
          <img src={billedeUrl(p.foto_path)} alt={p.opskrift_titel ?? ''} style={pk.img} />
        ) : (
          <div style={{ ...pk.img, background: grad(opskriftFarve([])) }} />
        )}
        {p.opskrift_titel && <span style={pk.bildePill}>{p.opskrift_titel}</span>}
      </div>

      {/* ── Handlinger ── */}
      <div style={pk.actions}>
        <button style={pk.actionBtn} onClick={() => onLike(p.id)}>
          <Heart size={22} fill={likedByMe ? colors.red : 'none'} color={likedByMe ? colors.red : colors.text} strokeWidth={2} />
        </button>
        <button style={pk.actionBtn} onClick={() => setVisKommentarer(v => !v)}>
          <MessageCircle size={21} color={visKommentarer ? colors.green : colors.text} strokeWidth={2} />
        </button>
        <button style={pk.actionBtn} onClick={() => navigate(p.opskrift_id ? `/opskrift/${p.opskrift_id}` : '/madmatch')}>
          <ChefHat size={21} color={colors.text} strokeWidth={2} />
        </button>
        {!erMin && (
          <button style={pk.followPill} onClick={() => navigate('/profil')}>
            + {t('pf.følger')}
          </button>
        )}
      </div>

      {/* ── Tekst ── */}
      <div style={pk.tekst}>
        {likeCount > 0 && (
          <p style={pk.likesTekst}>{likeCount} synes godt om</p>
        )}
        {(p.bruger_navn || p.citat) && (
          <p style={pk.caption}>
            <span style={pk.captionNavn}>{p.bruger_navn} </span>
            {p.citat && <span>{p.citat}</span>}
          </p>
        )}
      </div>

      {visKommentarer && <KommentarSektion postId={p.id} bruger={bruger} t={t} />}

      {visMenu && (
        <PostMenu
          t={t}
          onRediger={() => { setVisMenu(false); setRedigerer(true) }}
          onSlet={() => { setVisMenu(false); onSlet(p.id) }}
          onLuk={() => setVisMenu(false)}
        />
      )}

      {redigerer && (
        <RedigerModal
          citat={p.citat ?? ''}
          t={t}
          onGem={(nyCitat) => { setRedigerer(false); onGemRedigering(p.id, nyCitat) }}
          onLuk={() => setRedigerer(false)}
        />
      )}
    </article>
  )
}

// ── PostKort styles ───────────────────────────────────────────────────────────

const pk = {
  kort: {
    background: colors.card,
    borderRadius: radius.card,
    boxShadow: shadow.card,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px 10px',
  },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 999,
    background: colors.bg,
    border: '2px solid #fff',
    boxShadow: `0 0 0 2px ${colors.green}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    flexShrink: 0,
    overflow: 'hidden',
  },
  navn: {
    fontFamily: font.body,
    fontWeight: 700,
    fontSize: 13,
    color: colors.text,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sub: {
    fontFamily: font.body,
    fontSize: 11,
    color: colors.muted,
    margin: '1px 0 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  menuBtn: {
    background: 'none',
    border: 'none',
    padding: 4,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  imgWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: '1 / 1',
    overflow: 'hidden',
  },
  img: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  bildePill: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    background: 'rgba(31,36,33,0.55)',
    color: '#fff',
    fontFamily: font.body,
    fontWeight: 600,
    fontSize: 11,
    padding: '4px 10px',
    borderRadius: 999,
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    maxWidth: 'calc(100% - 20px)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '10px 12px 4px',
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  followPill: {
    marginLeft: 'auto',
    fontFamily: font.body,
    fontSize: 12,
    fontWeight: 700,
    color: colors.green,
    background: '#EAF1EA',
    border: 'none',
    borderRadius: 999,
    padding: '5px 12px',
    cursor: 'pointer',
  },
  tekst: {
    padding: '4px 12px 12px',
  },
  likesTekst: {
    fontFamily: font.body,
    fontWeight: 700,
    fontSize: 12,
    color: colors.text,
    margin: '0 0 2px',
  },
  caption: {
    fontFamily: font.body,
    fontSize: 12,
    color: colors.text,
    margin: 0,
    lineHeight: 1.45,
  },
  captionNavn: {
    fontWeight: 700,
  },
}

// ── KommentarSektion ──────────────────────────────────────────────────────────

function KommentarSektion({ postId, bruger, t }) {
  const [kommentarer, setKommentarer] = useState([])
  const [loading, setLoading] = useState(true)
  const [tekst, setTekst] = useState('')
  const [sender, setSender] = useState(false)
  const [fejl, setFejl] = useState(null)

  useEffect(() => {
    supabase
      .from('post_kommentarer')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data }) => { setKommentarer(data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [postId])

  async function sendKommentar() {
    if (!tekst.trim()) return
    setFejl(null)

    // Brug rigtig Supabase auth session — ikke cachede localStorage-data
    const { data: authData } = await supabase.auth.getUser()
    const uid = authData?.user?.id ?? bruger?.id
    if (!uid) { setFejl('Ikke logget ind'); return }

    const indhold = tekst.trim()
    const tempId = Date.now()
    const optimistisk = {
      id: tempId,
      post_id: postId,
      user_id: uid,
      bruger_navn: bruger?.navn ?? 'Anonym',
      bruger_avatar: bruger?.avatar ?? null,
      tekst: indhold,
      created_at: new Date().toISOString(),
    }
    setKommentarer(prev => [...prev, optimistisk])
    setTekst('')
    setSender(true)
    const { error } = await supabase
      .from('post_kommentarer')
      .insert({
        post_id:       postId,
        user_id:       uid,
        bruger_navn:   bruger?.navn ?? 'Anonym',
        bruger_avatar: bruger?.avatar ?? null,
        tekst:         indhold,
      })
    if (error) {
      console.error('Kommentar insert fejl:', error)
      setFejl(error.message)
      setKommentarer(prev => prev.filter(k => k.id !== tempId))
    }
    setSender(false)
  }

  return (
    <div style={kom.wrap}>
      {!loading && (
        kommentarer.length === 0 ? (
          <p style={kom.tom}>{t('post.ingenKom')}</p>
        ) : (
          <div style={kom.liste}>
            {kommentarer.map(k => (
              <div key={k.id} style={kom.item}>
                <div style={kom.avatar}>{k.bruger_avatar ?? '🧑‍🍳'}</div>
                <p style={kom.tekst}>
                  <span style={kom.navn}>{k.bruger_navn}</span>{' '}{k.tekst}
                </p>
              </div>
            ))}
          </div>
        )
      )}
      {fejl && (
        <p style={{ fontFamily: font.body, fontSize: 11, color: colors.red, margin: '4px 12px', padding: '4px 8px', background: 'rgba(194,91,74,0.08)', borderRadius: 6 }}>
          Fejl: {fejl}
        </p>
      )}
      {bruger && (
        <div style={kom.inputRow}>
          <div style={kom.miniAvatar}>{bruger.avatar ?? '🧑‍🍳'}</div>
          <input
            value={tekst}
            onChange={e => setTekst(e.target.value)}
            placeholder={t('post.skrivKom')}
            style={kom.input}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendKommentar() } }}
          />
          {tekst.trim() && (
            <button onClick={sendKommentar} disabled={sender} style={kom.sendBtn}>→</button>
          )}
        </div>
      )}
    </div>
  )
}

// ── PostMenu ──────────────────────────────────────────────────────────────────

function PostMenu({ t, onRediger, onSlet, onLuk }) {
  const [bekræfter, setBekræfter] = useState(false)
  return (
    <div style={ovl.overlay} onClick={onLuk}>
      <div style={ovl.sheet} onClick={e => e.stopPropagation()}>
        {!bekræfter ? (
          <>
            <button style={{ ...ovl.item, display: 'flex', alignItems: 'center', gap: 8 }} onClick={onRediger}><Pencil size={16} /> {t('post.menuRediger')}</button>
            <div style={ovl.divider} />
            <button style={{ ...ovl.item, color: colors.red, display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setBekræfter(true)}>
              <Trash2 size={16} /> {t('post.menuSlet')}
            </button>
            <div style={ovl.divider} />
            <button style={{ ...ovl.item, color: colors.muted }} onClick={onLuk}>{t('pf.annuller')}</button>
          </>
        ) : (
          <div style={{ padding: '12px 20px 4px' }}>
            <p style={{ fontFamily: font.body, fontSize: 15, color: colors.text, textAlign: 'center', margin: '0 0 14px', lineHeight: 1.45 }}>
              {t('post.sletBekræft')}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={ovl.annullerKnap} onClick={() => setBekræfter(false)}>{t('post.fortryd')}</button>
              <button style={{ ...ovl.primærKnap, background: colors.red }} onClick={onSlet}>{t('post.sletJa')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── RedigerModal ──────────────────────────────────────────────────────────────

function RedigerModal({ citat, t, onGem, onLuk }) {
  const [value, setValue] = useState(citat)
  return (
    <div style={ovl.overlay} onClick={onLuk}>
      <div style={{ ...ovl.sheet, padding: '20px 20px 24px', gap: 12, alignItems: 'stretch' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontFamily: font.display, fontWeight: 600, fontSize: 18, color: colors.text, margin: 0 }}>
          {t('post.redigerTitel')}
        </h3>
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Hvad synes du om retten?"
          style={{ fontFamily: font.body, fontSize: 14, color: colors.text, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '10px 12px', outline: 'none', resize: 'none', height: 80, boxSizing: 'border-box' }}
          maxLength={200}
          autoFocus
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={ovl.annullerKnap} onClick={onLuk}>{t('pf.annuller')}</button>
          <button style={ovl.primærKnap} onClick={() => onGem(value)}>{t('lag.gem')}</button>
        </div>
      </div>
    </div>
  )
}

// ── SøgeModal ─────────────────────────────────────────────────────────────────

function SøgeModal({ åben, onLuk, opskrifter, navigate, inputRef, gemte, onToggleGem }) {
  const [tekst, setTekst] = useState('')

  useEffect(() => {
    if (!åben) setTekst('')
  }, [åben])

  const filtreret = tekst.trim()
    ? opskrifter.filter(o =>
        o.title.toLowerCase().includes(tekst.toLowerCase()) ||
        (o.tags ?? []).some(tg => tg.toLowerCase().includes(tekst.toLowerCase()))
      )
    : opskrifter

  return (
    <>
      <div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 200, opacity: åben ? 1 : 0,
          pointerEvents: åben ? 'auto' : 'none',
          transition: 'opacity 0.28s ease',
        }}
        onClick={onLuk}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: '92vh',
        background: colors.bg, borderRadius: '22px 22px 0 0',
        zIndex: 201, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transform: åben ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.36s cubic-bezier(0.32, 0.72, 0, 1)',
        boxShadow: '0 -4px 40px rgba(0,0,0,0.18)',
      }}>
        {/* Drag-handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: colors.border }} />
        </div>

        {/* Søgefelt + luk */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 16px 10px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: colors.card, borderRadius: 14, padding: '0 14px', height: 46, boxShadow: shadow.card }}>
            <Search size={16} color={colors.muted} style={{ opacity: 0.6, flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="search"
              value={tekst}
              onChange={e => setTekst(e.target.value)}
              placeholder="Søg i alle opskrifter…"
              style={{ flex: 1, fontFamily: font.body, fontSize: 15, color: colors.text, background: 'transparent', border: 'none', outline: 'none' }}
            />
            {tekst && (
              <button onClick={() => setTekst('')} style={{ background: 'none', border: 'none', color: colors.mutedLight, cursor: 'pointer', padding: 0, fontSize: 15 }}>✕</button>
            )}
          </div>
          <button
            onClick={onLuk}
            style={{ fontFamily: font.body, fontSize: 14, fontWeight: 700, color: colors.green, background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', whiteSpace: 'nowrap' }}
          >
            Luk
          </button>
        </div>

        {/* Antal */}
        <p style={{ fontFamily: font.body, fontSize: 12.5, fontWeight: 700, color: colors.muted, margin: '0 16px 6px', letterSpacing: 0.3 }}>
          {filtreret.length} retter
        </p>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 120px', WebkitOverflowScrolling: 'touch' }}>
          {filtreret.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 60 }}>
              <span style={{ fontSize: 40 }}>🍽️</span>
              <p style={{ fontFamily: font.body, fontWeight: 600, fontSize: 16, color: colors.text, margin: '12px 0 4px' }}>Ingen retter fundet</p>
              <p style={{ fontFamily: font.body, fontSize: 14, color: colors.muted, margin: 0 }}>Prøv et andet søgeord</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {filtreret.map(o => {
                const img = billedeUrl(o.storage_image, o.image_url)
                const farve = opskriftFarve(o.tags)
                const tid = tidLabel(o.prep_time, o.cook_time)
                return (
                  <div key={o.id} style={{ background: colors.card, borderRadius: 16, boxShadow: shadow.card, overflow: 'hidden', position: 'relative' }}>
                    <button
                      style={{ display: 'block', width: '100%', border: 'none', padding: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
                      onClick={() => { onLuk(); navigate(`/opskrift/${o.id}`) }}
                    >
                      <div style={{ height: 110, background: grad(farve), overflow: 'hidden', position: 'relative' }}>
                        {img && <img src={img} alt={o.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                      </div>
                      <div style={{ padding: '9px 11px 12px' }}>
                        <p style={{ fontFamily: font.body, fontWeight: 700, fontSize: 13.5, color: colors.text, margin: '0 0 3px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>
                          {o.title}
                        </p>
                        {tid && <p style={{ fontFamily: font.body, fontSize: 11.5, color: colors.muted, margin: 0 }}>⏱ {tid}</p>}
                      </div>
                    </button>
                    <button
                      style={{ position: 'absolute', top: 7, right: 7, background: 'rgba(255,255,255,0.88)', border: 'none', borderRadius: 999, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                      onClick={e => { e.stopPropagation(); onToggleGem(o.id) }}
                    >
                      {gemte?.includes(o.id)
                        ? <BookmarkCheck size={14} color={colors.green} />
                        : <Bookmark size={14} color={colors.muted} />}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Øvrige subkomponenter ─────────────────────────────────────────────────────

function getDagensRet(opskrifter) {
  const aftensmad = opskrifter.filter(o => o.tags?.includes('aftensmad'))
  const pulje = aftensmad.length > 0 ? aftensmad : opskrifter
  if (!pulje.length) return null
  const dato = new Date().toISOString().split('T')[0]
  const seed = parseInt(dato.split('-').join(''), 10)
  const stabil = [...pulje].sort((a, b) => (a.id < b.id ? -1 : 1))
  return stabil[seed % stabil.length]
}

function FeaturedCard({ opskrift, onClick }) {
  const { lang } = useLang()
  const imgUrl = billedeUrl(opskrift.storage_image, opskrift.image_url)
  const farve = opskriftFarve(opskrift.tags)
  const tid = tidLabel(opskrift.prep_time, opskrift.cook_time)
  const sværhed = sværhedLabel(opskrift.difficulty)
  const meta = [tid && `⏱ ${tid}`, sværhed].filter(Boolean).join(' · ')
  const datoLabel = new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'da-DK', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <button style={styles.featured} onClick={onClick}>
      <div style={{ ...styles.featuredHero, background: grad(farve) }}>
        {imgUrl && <img src={imgUrl} alt={opskrift.title} style={styles.featuredImg} />}
        <span style={styles.featuredBadge}>{datoLabel}</span>
      </div>
      <div style={styles.featuredBody}>
        <h3 style={styles.featuredTitel}>{opskrift.title}</h3>
        {meta && <p style={styles.featuredMeta}>{meta}</p>}
        {opskrift.description && (
          <p style={styles.featuredTekst}>
            {opskrift.description.length > 120 ? opskrift.description.slice(0, 120) + '…' : opskrift.description}
          </p>
        )}
      </div>
    </button>
  )
}

function RecipeCard({ opskrift, onClick, gemte, onToggleGem }) {
  const imgUrl = billedeUrl(opskrift.storage_image, opskrift.image_url)
  const farve = opskriftFarve(opskrift.tags)
  const tid = tidLabel(opskrift.prep_time, opskrift.cook_time)
  const sværhed = sværhedLabel(opskrift.difficulty)
  const meta = [tid, sværhed].filter(Boolean).join(' · ')
  const erGemt = gemte?.includes(opskrift.id)

  return (
    <div style={{ ...styles.recipeCard, position: 'relative' }}>
      <button style={{ ...styles.recipeCard, boxShadow: 'none', borderRadius: 0, padding: 0, width: '100%' }} onClick={onClick}>
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
      {onToggleGem && (
        <button
          style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: 999, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
          onClick={e => { e.stopPropagation(); onToggleGem(opskrift.id) }}
        >
          {erGemt
            ? <BookmarkCheck size={15} color={colors.green} />
            : <Bookmark size={15} color={colors.muted} />}
        </button>
      )}
    </div>
  )
}

function Stat({ tal, label, ikon, fremhæv, onClick }) {
  const base = { ...styles.stat, ...(fremhæv ? { background: colors.green } : null), ...(onClick ? { cursor: 'pointer' } : null) }
  const inner = (
    <>
      <span style={{ ...styles.statTal, color: fremhæv ? '#fff' : colors.text, display: 'flex', alignItems: 'center', gap: 4 }}>
        {ikon}<span>{tal}</span>
      </span>
      <span style={{ ...styles.statLabel, color: fremhæv ? 'rgba(255,255,255,0.85)' : colors.muted }}>{label}</span>
    </>
  )
  return onClick
    ? <button style={{ ...base, border: 'none', textAlign: 'left' }} onClick={onClick}>{inner}</button>
    : <div style={base}>{inner}</div>
}

function Section({ titel, handling, onHandling }) {
  return (
    <div style={styles.sectionHead}>
      <h2 style={styles.sectionTitel}>{titel}</h2>
      {handling && <button style={styles.sectionLink} onClick={onHandling}>{handling}</button>}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  page: { maxWidth: 480, margin: '0 auto', minHeight: '100%', position: 'relative' },
  sektionTop:  { background: '#FAF7F2', padding: '20px 20px 24px' },
  sektionGrøn: { background: '#EAF1EA', padding: '8px 20px 28px' },
  sektionCreme:{ background: '#FFF6EC', padding: '8px 20px 28px' },
  sektionBund: { background: '#FAF7F2', padding: '8px 20px 120px' },

  toast: {
    position: 'fixed', top: 14, left: '50%', transform: 'translateX(-50%)',
    background: colors.card, borderRadius: 18, boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
    padding: '12px 14px 12px 16px', display: 'flex', alignItems: 'center', gap: 10,
    maxWidth: 340, width: 'calc(100vw - 32px)', zIndex: 400,
    border: `1.5px solid ${colors.border}`,
  },
  toastTekst: { flex: 1, fontFamily: font.body, fontSize: 14, fontWeight: 600, color: colors.text, margin: 0, lineHeight: 1.3 },
  toastLuk: { background: 'none', border: 'none', color: colors.mutedLight, fontSize: 14, padding: '0 0 0 4px', cursor: 'pointer', flexShrink: 0 },

  topRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  eyebrow: { fontFamily: font.body, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: colors.terracotta, margin: '0 0 6px' },
  title: { fontFamily: font.display, fontWeight: 600, fontSize: 30, lineHeight: 1.1, color: colors.text, margin: 0, letterSpacing: -0.6 },
  avatar: { width: 48, height: 48, borderRadius: 999, background: colors.card, boxShadow: shadow.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 },
  klokkeBtn: { position: 'relative', width: 40, height: 40, borderRadius: 999, background: colors.card, boxShadow: shadow.card, border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.text },
  badge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 999, background: colors.red, border: `2px solid ${colors.bg}` },

  stats: { display: 'flex', gap: 10, margin: '20px 0 4px' },
  stat: { flex: 1, background: colors.card, borderRadius: 16, boxShadow: shadow.card, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 },
  statTal: { fontFamily: font.display, fontWeight: 600, fontSize: 18 },
  statLabel: { fontFamily: font.body, fontSize: 11.5, fontWeight: 600 },

  sectionHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '16px 0 12px' },
  sectionTitel: { fontFamily: font.display, fontWeight: 600, fontSize: 19, color: colors.text, margin: 0, letterSpacing: -0.3 },
  sectionLink: { fontFamily: font.body, fontSize: 13, fontWeight: 700, color: colors.green, background: 'none', border: 'none', padding: 0 },

  søgeWrap: { display: 'flex', alignItems: 'center', gap: 10, background: colors.card, borderRadius: 16, boxShadow: shadow.card, padding: '0 14px', margin: '16px 0 4px', height: 48 },
  søgeInput: { flex: 1, fontFamily: font.body, fontSize: 15, color: colors.text, background: 'transparent', border: 'none', outline: 'none', padding: '0 4px' },
  søgeRyd: { background: 'none', border: 'none', color: colors.mutedLight, fontSize: 14, cursor: 'pointer', padding: '0 2px', flexShrink: 0 },
  søgePanel: { background: colors.card, borderRadius: 16, boxShadow: shadow.card, overflow: 'hidden', marginBottom: 8 },
  søgeTom: { fontFamily: font.body, fontSize: 14, color: colors.muted, textAlign: 'center', padding: '24px 16px', margin: 0 },
  søgeResultat: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: `1px solid ${colors.border}`, cursor: 'pointer' },
  søgeThumb: { width: 48, height: 48, borderRadius: 10, flexShrink: 0, overflow: 'hidden', position: 'relative' },
  søgeThumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  søgeNavn: { fontFamily: font.body, fontWeight: 700, fontSize: 14.5, color: colors.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  søgeMeta: { fontFamily: font.body, fontSize: 12.5, color: colors.muted, margin: '2px 0 0' },

  tomVenner: { background: colors.card, borderRadius: 16, boxShadow: shadow.card, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' },
  tomVennerTekst: { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: 0, lineHeight: 1.5 },
  tilføjVenBtn: { fontFamily: font.body, fontSize: 13, fontWeight: 700, color: colors.green, background: 'rgba(47,107,79,0.10)', border: 'none', borderRadius: 999, padding: '9px 16px', cursor: 'pointer' },

  scrollRow: { display: 'flex', gap: 14, overflowX: 'auto', padding: '4px 0 8px', margin: '0 -20px', paddingLeft: 20, paddingRight: 20, scrollbarWidth: 'none' },
  swipeRække: { display: 'flex', gap: 14, overflowX: 'auto', padding: '4px 0 12px', margin: '0 -20px', paddingLeft: 20, paddingRight: 20, scrollbarWidth: 'none', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' },

  story: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, width: 64 },
  storyRing: { width: 60, height: 60, borderRadius: 999, padding: 3, display: 'flex' },
  storyAvatar: { flex: 1, borderRadius: 999, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, border: `2px solid ${colors.card}` },
  storyNavn: { fontFamily: font.body, fontSize: 12, fontWeight: 600, color: colors.text },

  featured: { width: '100%', textAlign: 'left', border: 'none', borderRadius: radius.card, boxShadow: shadow.card, padding: 0, overflow: 'hidden', background: colors.card, cursor: 'pointer' },
  featuredSkeleton: { width: '100%', height: 300, borderRadius: radius.card, background: colors.border },
  featuredHero: { width: '100%', height: 200, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  featuredImg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  featuredBadge: { position: 'absolute', top: 14, left: 14, fontFamily: font.body, fontSize: 12, fontWeight: 700, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)', color: '#fff', padding: '5px 11px', borderRadius: 999, zIndex: 1 },
  featuredBody: { padding: '16px 18px 20px' },
  featuredTitel: { fontFamily: font.display, fontWeight: 600, fontSize: 22, margin: '0 0 6px', letterSpacing: -0.4, color: colors.text },
  featuredMeta: { fontFamily: font.body, fontSize: 13, fontWeight: 600, color: colors.muted, margin: '0 0 8px' },
  featuredTekst: { fontFamily: font.body, fontSize: 14, lineHeight: 1.45, color: colors.muted, margin: 0 },

  feed: { display: 'flex', flexDirection: 'column', gap: 16 },
  feedTom: { background: colors.card, borderRadius: radius.card, boxShadow: shadow.card, padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' },
  feedTomTitel: { fontFamily: font.display, fontWeight: 600, fontSize: 18, color: colors.text, margin: 0, letterSpacing: -0.3 },
  feedTomTekst: { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: 0, lineHeight: 1.55, maxWidth: 280 },
  feedTomKnapper: { display: 'flex', gap: 10, marginTop: 4 },
  feedTomPrimær: { fontFamily: font.body, fontWeight: 700, fontSize: 14, color: '#fff', background: colors.green, border: 'none', borderRadius: radius.button, padding: '11px 20px', cursor: 'pointer' },
  feedTomSekundær: { fontFamily: font.body, fontWeight: 700, fontSize: 14, color: colors.green, background: 'rgba(47,107,79,0.10)', border: 'none', borderRadius: radius.button, padding: '11px 20px', cursor: 'pointer' },

  post: { background: colors.card, borderRadius: radius.card, boxShadow: shadow.card, padding: 14 },
  postHead: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  postAvatar: { width: 40, height: 40, borderRadius: 999, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, border: `1px solid ${colors.border}` },
  postNavn: { fontFamily: font.body, fontSize: 15, fontWeight: 700, color: colors.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  postRetNavn: { fontWeight: 500, color: colors.terracotta },
  postTid: { fontFamily: font.body, fontSize: 12, color: colors.mutedLight, margin: '1px 0 0' },
  followBtn: { fontFamily: font.body, fontSize: 12.5, fontWeight: 700, color: colors.green, background: 'rgba(47,107,79,0.10)', border: 'none', borderRadius: 999, padding: '7px 12px', flexShrink: 0, cursor: 'pointer' },
  menuBtn: { background: 'none', border: 'none', color: colors.muted, fontSize: 20, fontWeight: 800, letterSpacing: 1, cursor: 'pointer', padding: '0 4px', flexShrink: 0 },
  postImg: { height: 150, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', color: '#fff' },
  postRet: { position: 'absolute', bottom: 12, left: 14, fontFamily: font.display, fontWeight: 600, fontSize: 18, textShadow: '0 1px 6px rgba(0,0,0,0.3)' },
  postCitat: { fontFamily: font.body, fontSize: 14, color: colors.text, fontStyle: 'italic', margin: '12px 2px 0', lineHeight: 1.4 },
  postFooter: { display: 'flex', alignItems: 'center', gap: 0, marginTop: 12 },
  postStat: { fontFamily: font.body, fontSize: 14, fontWeight: 600, color: colors.muted },

  recipeCard: { width: 160, flexShrink: 0, background: colors.card, borderRadius: 18, boxShadow: shadow.card, border: 'none', padding: 0, overflow: 'hidden', textAlign: 'left', cursor: 'pointer', scrollSnapAlign: 'start' },
  recipeCardSkeleton: { width: 160, height: 170, flexShrink: 0, borderRadius: 18, background: colors.border },
  recipeHero: { height: 110, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  recipeImg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  recipeInitial: { fontSize: 42, fontFamily: font.display, fontWeight: 600, color: 'rgba(255,255,255,0.9)', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))' },
  recipeBody: { padding: '10px 12px 14px' },
  recipeTitel: { fontFamily: font.body, fontWeight: 700, fontSize: 14.5, color: colors.text, margin: '0 0 4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  recipeMeta: { fontFamily: font.body, fontSize: 12, color: colors.muted, margin: 0 },
}

// ── Kommentar-styles ──────────────────────────────────────────────────────────

const kom = {
  wrap: { borderTop: `1px solid ${colors.border}`, marginTop: 10, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 },
  tom: { fontFamily: font.body, fontSize: 13, color: colors.muted, margin: 0, fontStyle: 'italic' },
  liste: { display: 'flex', flexDirection: 'column', gap: 7 },
  item: { display: 'flex', alignItems: 'flex-start', gap: 8 },
  avatar: { width: 26, height: 26, borderRadius: 999, background: colors.bg, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 },
  tekst: { fontFamily: font.body, fontSize: 13.5, color: colors.text, margin: 0, lineHeight: 1.4, flex: 1 },
  navn: { fontWeight: 700 },
  inputRow: { display: 'flex', alignItems: 'center', gap: 8, borderTop: `1px solid ${colors.border}`, paddingTop: 8 },
  miniAvatar: { width: 26, height: 26, borderRadius: 999, background: colors.bg, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 },
  input: { flex: 1, fontFamily: font.body, fontSize: 13.5, color: colors.text, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 999, padding: '7px 12px', outline: 'none' },
  sendBtn: { width: 32, height: 32, borderRadius: 999, background: colors.green, color: '#fff', border: 'none', fontSize: 16, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
}

// ── Overlay-styles ────────────────────────────────────────────────────────────

const ovl = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 },
  sheet: { background: colors.card, borderRadius: 24, padding: '8px 0 20px', width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', boxShadow: '0 -4px 32px rgba(0,0,0,0.15)' },
  item: { fontFamily: font.body, fontSize: 16, fontWeight: 600, color: colors.text, background: 'none', border: 'none', padding: '15px 24px', textAlign: 'left', cursor: 'pointer' },
  divider: { height: 1, background: colors.border },
  annullerKnap: { flex: 1, fontFamily: font.body, fontSize: 15, fontWeight: 700, color: colors.muted, background: colors.bg, border: 'none', borderRadius: radius.button, padding: '13px 0', cursor: 'pointer' },
  primærKnap: { flex: 2, fontFamily: font.body, fontSize: 15, fontWeight: 700, color: '#fff', background: colors.green, border: 'none', borderRadius: radius.button, padding: '13px 0', cursor: 'pointer' },
}
