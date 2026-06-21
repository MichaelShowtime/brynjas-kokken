import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { hentAktivBruger } from '../data/auth'
import { billedeUrl, opskriftFarve, grad } from '../lib/recipeUtils'
import { colors, shadow, radius, font } from '../data/theme'
import { useLang, relativTidLang } from '../lib/lang'

export default function BrugerProfil() {
  const { userId }  = useParams()
  const navigate    = useNavigate()
  const { t }       = useLang()
  const bruger      = hentAktivBruger()
  const erEgenProfil = bruger?.id === userId

  const [kunde, setKunde]   = useState(null)
  const [posts, setPosts]   = useState([])
  const [loading, setLoading] = useState(true)

  // Overlay-state
  const [postMenuId,  setPostMenuId]  = useState(null)  // post-id med åben menu
  const [redigerPost, setRedigerPost] = useState(null)  // { id, citat }
  const [bekræfterSlet, setBekræfterSlet] = useState(false)

  useEffect(() => {
    if (!userId) return
    Promise.all([
      supabase.from('customers')
        .select('user_id, first_name, last_name, username, avatar, avatar_url, bio')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase.from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30),
    ]).then(([{ data: k }, { data: p }]) => {
      setKunde(k ?? null)
      setPosts(p ?? [])
      setLoading(false)
    })
  }, [userId])

  function åbnMenu(postId) {
    setPostMenuId(postId)
    setBekræfterSlet(false)
  }

  function lukMenu() {
    setPostMenuId(null)
    setBekræfterSlet(false)
  }

  async function sletPost() {
    if (!postMenuId) return
    await supabase.from('posts').delete().eq('id', postMenuId).eq('user_id', bruger.id)
    setPosts(prev => prev.filter(p => p.id !== postMenuId))
    lukMenu()
  }

  async function gemRedigering(nyCitat) {
    if (!redigerPost) return
    const value = nyCitat?.trim() || null
    await supabase.from('posts').update({ citat: value }).eq('id', redigerPost.id).eq('user_id', bruger.id)
    setPosts(prev => prev.map(p => p.id === redigerPost.id ? { ...p, citat: value } : p))
    setRedigerPost(null)
  }

  if (loading) {
    return <div style={s.loadPage}><div style={{ fontSize: 40 }}>👤</div></div>
  }

  if (!kunde) {
    return (
      <div style={s.loadPage}>
        <p style={s.loadTekst}>{t('bp.ikkeFundet')}</p>
        <button style={s.tilbage} onClick={() => navigate(-1)}>{t('bp.tilbage')}</button>
      </div>
    )
  }

  const navn   = [kunde.first_name, kunde.last_name].filter(Boolean).join(' ')
  const avatar = kunde.avatar_url
    ? <img src={kunde.avatar_url} alt={navn} style={s.avatarImg} />
    : <span style={s.avatarEmoji}>{kunde.avatar ?? '🧑‍🍳'}</span>

  const aktivPostMenu = postMenuId ? posts.find(p => p.id === postMenuId) : null

  return (
    <div style={s.page}>

      <button style={s.backBtn} onClick={() => navigate(-1)}>←</button>

      {/* Hero */}
      <div style={s.hero}>
        <div style={s.avatarRing}>{avatar}</div>
        <h1 style={s.navn}>{navn}</h1>
        {kunde.username && <p style={s.username}>@{kunde.username}</p>}
        {kunde.bio && <p style={s.bio}>{kunde.bio}</p>}
        <p style={s.antalPosts}>{posts.length} {posts.length === 1 ? t('bp.kreation') : t('bp.kreationer')}</p>
      </div>

      <div style={s.sektionHead}>
        <h2 style={s.sektionTitel}>{t('bp.kreationerTitel')}</h2>
      </div>

      {posts.length === 0 ? (
        <div style={s.tom}>
          <span style={{ fontSize: 36 }}>🍳</span>
          <p style={s.tomTekst}>{t('bp.tom')}</p>
        </div>
      ) : (
        <div style={s.feed}>
          {posts.map((p) => {
            const fotoUrl = p.foto_path ? billedeUrl(p.foto_path) : null
            return (
              <article key={p.id} style={s.post}>
                {fotoUrl ? (
                  <img src={fotoUrl} alt={p.opskrift_titel}
                    style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ ...s.postGradient, background: grad(opskriftFarve([])) }}>
                    <span style={s.postTitelOverlay}>{p.opskrift_titel}</span>
                  </div>
                )}
                <div style={s.postBody}>
                  <div style={s.postMeta}>
                    <div style={{ minWidth: 0 }}>
                      <p style={s.postRetNavn}>{p.opskrift_titel}</p>
                      <p style={s.postTid}>{relativTidLang(p.created_at, t)}</p>
                    </div>
                    {erEgenProfil && (
                      <button style={s.menuBtn} onClick={() => åbnMenu(p.id)}>⋯</button>
                    )}
                  </div>
                  {p.citat && <p style={s.postCitat}>"{p.citat}"</p>}
                  {p.opskrift_id && (
                    <button style={s.lavOgsåBtn} onClick={() => navigate(`/opskrift/${p.opskrift_id}`)}>
                      {t('bp.lavOgså')}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* ⋯ menu overlay */}
      {aktivPostMenu && (
        <div style={ovl.overlay} onClick={lukMenu}>
          <div style={ovl.sheet} onClick={e => e.stopPropagation()}>
            {!bekræfterSlet ? (
              <>
                <button style={ovl.item} onClick={() => {
                  setPostMenuId(null)
                  setRedigerPost({ id: aktivPostMenu.id, citat: aktivPostMenu.citat ?? '' })
                }}>
                  ✏️ {t('post.menuRediger')}
                </button>
                <div style={ovl.divider} />
                <button style={{ ...ovl.item, color: colors.red }} onClick={() => setBekræfterSlet(true)}>
                  🗑️ {t('post.menuSlet')}
                </button>
                <div style={ovl.divider} />
                <button style={{ ...ovl.item, color: colors.muted }} onClick={lukMenu}>
                  {t('pf.annuller')}
                </button>
              </>
            ) : (
              <div style={{ padding: '12px 20px 4px' }}>
                <p style={{ fontFamily: font.body, fontSize: 15, color: colors.text, textAlign: 'center', margin: '0 0 14px', lineHeight: 1.45 }}>
                  {t('post.sletBekræft')}
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button style={ovl.annullerKnap} onClick={() => setBekræfterSlet(false)}>{t('post.fortryd')}</button>
                  <button style={{ ...ovl.primærKnap, background: colors.red }} onClick={sletPost}>{t('post.sletJa')}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rediger-modal */}
      {redigerPost && (
        <RedigerModal
          citat={redigerPost.citat}
          t={t}
          onGem={gemRedigering}
          onLuk={() => setRedigerPost(null)}
        />
      )}
    </div>
  )
}

function RedigerModal({ citat, t, onGem, onLuk }) {
  const [value, setValue] = useState(citat)
  return (
    <div style={ovl.overlay} onClick={onLuk}>
      <div style={{ ...ovl.sheet, padding: '20px 20px 24px', gap: 12, alignItems: 'stretch' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontFamily: font.display, fontWeight: 800, fontSize: 18, color: colors.text, margin: 0 }}>
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

const s = {
  page: { maxWidth: 480, margin: '0 auto', padding: '0 0 120px', minHeight: '100%', background: colors.bg },
  loadPage: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12 },
  loadTekst: { fontFamily: font.body, fontSize: 16, color: colors.muted, margin: 0 },
  backBtn: { position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: 999, width: 40, height: 40, fontSize: 20, color: colors.green, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: shadow.card, zIndex: 10 },
  tilbage: { fontFamily: font.body, fontSize: 14, fontWeight: 700, color: colors.green, background: 'none', border: 'none', cursor: 'pointer' },
  hero: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px 28px', gap: 6, background: `linear-gradient(180deg, ${colors.card} 0%, ${colors.bg} 100%)` },
  avatarRing: { width: 88, height: 88, borderRadius: 999, background: colors.bg, border: `3px solid ${colors.green}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: shadow.card, marginBottom: 6 },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarEmoji: { fontSize: 44 },
  navn: { fontFamily: font.display, fontWeight: 800, fontSize: 24, color: colors.text, margin: 0, letterSpacing: -0.4 },
  username: { fontFamily: font.body, fontSize: 14, fontWeight: 600, color: colors.green, margin: 0 },
  bio: { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: '4px 0 0', textAlign: 'center', lineHeight: 1.5, maxWidth: 280 },
  antalPosts: { fontFamily: font.body, fontSize: 13, fontWeight: 700, color: colors.mutedLight, margin: '6px 0 0' },
  sektionHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '4px 20px 12px' },
  sektionTitel: { fontFamily: font.display, fontWeight: 800, fontSize: 19, color: colors.text, margin: 0, letterSpacing: -0.3 },
  tom: { textAlign: 'center', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  tomTekst: { fontFamily: font.body, fontSize: 15, color: colors.muted, margin: 0 },
  feed: { display: 'flex', flexDirection: 'column', gap: 16, padding: '0 20px' },
  post: { background: colors.card, borderRadius: radius.card, boxShadow: shadow.card, overflow: 'hidden' },
  postGradient: { height: 160, display: 'flex', alignItems: 'flex-end', padding: '0 14px 12px' },
  postTitelOverlay: { fontFamily: font.display, fontWeight: 800, fontSize: 18, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.3)' },
  postBody: { padding: '12px 14px 14px' },
  postMeta: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, gap: 8 },
  postRetNavn: { fontFamily: font.body, fontWeight: 700, fontSize: 14.5, color: colors.text, margin: 0 },
  postTid: { fontFamily: font.body, fontSize: 12, color: colors.mutedLight, margin: '2px 0 0' },
  postCitat: { fontFamily: font.body, fontSize: 14, color: colors.muted, fontStyle: 'italic', margin: '6px 0 0', lineHeight: 1.4 },
  lavOgsåBtn: { marginTop: 10, fontFamily: font.body, fontSize: 13.5, fontWeight: 700, color: colors.green, background: 'none', border: 'none', padding: 0, cursor: 'pointer' },
  menuBtn: { background: 'none', border: 'none', color: colors.muted, fontSize: 20, fontWeight: 800, letterSpacing: 1, cursor: 'pointer', padding: '0 4px', flexShrink: 0 },
}

const ovl = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 },
  sheet: { background: colors.card, borderRadius: 24, padding: '8px 0 20px', width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', boxShadow: '0 -4px 32px rgba(0,0,0,0.15)' },
  item: { fontFamily: font.body, fontSize: 16, fontWeight: 600, color: colors.text, background: 'none', border: 'none', padding: '15px 24px', textAlign: 'left', cursor: 'pointer' },
  divider: { height: 1, background: colors.border },
  annullerKnap: { flex: 1, fontFamily: font.body, fontSize: 15, fontWeight: 700, color: colors.muted, background: colors.bg, border: 'none', borderRadius: radius.button, padding: '13px 0', cursor: 'pointer' },
  primærKnap: { flex: 2, fontFamily: font.body, fontSize: 15, fontWeight: 700, color: '#fff', background: colors.green, border: 'none', borderRadius: radius.button, padding: '13px 0', cursor: 'pointer' },
}
