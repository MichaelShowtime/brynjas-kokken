import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { billedeUrl, opskriftFarve, grad } from '../lib/recipeUtils'
import { colors, shadow, radius, font } from '../data/theme'

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

export default function BrugerProfil() {
  const { userId } = useParams()
  const navigate   = useNavigate()
  const [kunde, setKunde]   = useState(null)
  const [posts, setPosts]   = useState([])
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div style={s.loadPage}>
        <div style={{ fontSize: 40 }}>👤</div>
      </div>
    )
  }

  if (!kunde) {
    return (
      <div style={s.loadPage}>
        <p style={s.loadTekst}>Bruger ikke fundet</p>
        <button style={s.tilbage} onClick={() => navigate(-1)}>← Tilbage</button>
      </div>
    )
  }

  const navn    = [kunde.first_name, kunde.last_name].filter(Boolean).join(' ')
  const avatar  = kunde.avatar_url
    ? <img src={kunde.avatar_url} alt={navn} style={s.avatarImg} />
    : <span style={s.avatarEmoji}>{kunde.avatar ?? '🧑‍🍳'}</span>

  return (
    <div style={s.page}>

      {/* Tilbage-knap */}
      <button style={s.backBtn} onClick={() => navigate(-1)}>←</button>

      {/* Hero */}
      <div style={s.hero}>
        <div style={s.avatarRing}>{avatar}</div>
        <h1 style={s.navn}>{navn}</h1>
        {kunde.username && <p style={s.username}>@{kunde.username}</p>}
        {kunde.bio && <p style={s.bio}>{kunde.bio}</p>}
        <p style={s.antalPosts}>{posts.length} {posts.length === 1 ? 'kreation' : 'kreationer'}</p>
      </div>

      {/* Posts */}
      <div style={s.sektionHead}>
        <h2 style={s.sektionTitel}>Kreationer</h2>
      </div>

      {posts.length === 0 ? (
        <div style={s.tom}>
          <span style={{ fontSize: 36 }}>🍳</span>
          <p style={s.tomTekst}>Ingen kreationer endnu</p>
        </div>
      ) : (
        <div style={s.feed}>
          {posts.map((p) => {
            const fotoUrl = p.foto_path ? billedeUrl(p.foto_path) : null
            return (
              <article key={p.id} style={s.post}>
                {fotoUrl ? (
                  <img src={fotoUrl} alt={p.opskrift_titel}
                    style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 14, display: 'block' }} />
                ) : (
                  <div style={{ ...s.postGradient, background: grad(opskriftFarve([])) }}>
                    <span style={s.postTitel}>{p.opskrift_titel}</span>
                  </div>
                )}
                <div style={s.postBody}>
                  <div style={s.postMeta}>
                    <span style={s.postRetNavn}>{p.opskrift_titel}</span>
                    <span style={s.postTid}>{relativTid(p.created_at)}</span>
                  </div>
                  {p.citat && <p style={s.postCitat}>"{p.citat}"</p>}
                  {p.opskrift_id && (
                    <button style={s.lavOgsåBtn}
                      onClick={() => navigate(`/opskrift/${p.opskrift_id}`)}>
                      Lav også →
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

const s = {
  page: { maxWidth: 480, margin: '0 auto', padding: '0 0 120px', minHeight: '100%', background: colors.bg },

  loadPage: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12 },
  loadTekst: { fontFamily: font.body, fontSize: 16, color: colors.muted, margin: 0 },

  backBtn: {
    position: 'absolute', top: 16, left: 16,
    background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)',
    border: 'none', borderRadius: 999, width: 40, height: 40,
    fontSize: 20, color: colors.green, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: shadow.card, zIndex: 10,
  },
  tilbage: { fontFamily: font.body, fontSize: 14, fontWeight: 700, color: colors.green, background: 'none', border: 'none', cursor: 'pointer' },

  hero: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '60px 24px 28px', gap: 6, position: 'relative',
    background: `linear-gradient(180deg, ${colors.card} 0%, ${colors.bg} 100%)`,
  },
  avatarRing: {
    width: 88, height: 88, borderRadius: 999,
    background: colors.bg, border: `3px solid ${colors.green}`,
    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: shadow.card, marginBottom: 6,
  },
  avatarImg:   { width: '100%', height: '100%', objectFit: 'cover' },
  avatarEmoji: { fontSize: 44 },
  navn:     { fontFamily: font.display, fontWeight: 800, fontSize: 24, color: colors.text, margin: 0, letterSpacing: -0.4 },
  username: { fontFamily: font.body, fontSize: 14, fontWeight: 600, color: colors.green, margin: 0 },
  bio:      { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: '4px 0 0', textAlign: 'center', lineHeight: 1.5, maxWidth: 280 },
  antalPosts: { fontFamily: font.body, fontSize: 13, fontWeight: 700, color: colors.mutedLight, margin: '6px 0 0' },

  sektionHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '4px 20px 12px' },
  sektionTitel: { fontFamily: font.display, fontWeight: 800, fontSize: 19, color: colors.text, margin: 0, letterSpacing: -0.3 },

  tom: { textAlign: 'center', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  tomTekst: { fontFamily: font.body, fontSize: 15, color: colors.muted, margin: 0 },

  feed: { display: 'flex', flexDirection: 'column', gap: 16, padding: '0 20px' },
  post: { background: colors.card, borderRadius: radius.card, boxShadow: shadow.card, overflow: 'hidden' },
  postGradient: { height: 160, display: 'flex', alignItems: 'flex-end', padding: '0 14px 12px' },
  postTitel: { fontFamily: font.display, fontWeight: 800, fontSize: 18, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.3)' },
  postBody: { padding: '12px 14px 14px' },
  postMeta: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 },
  postRetNavn: { fontFamily: font.body, fontWeight: 700, fontSize: 14.5, color: colors.text },
  postTid: { fontFamily: font.body, fontSize: 12, color: colors.mutedLight },
  postCitat: { fontFamily: font.body, fontSize: 14, color: colors.muted, fontStyle: 'italic', margin: '6px 0 0', lineHeight: 1.4 },
  lavOgsåBtn: { marginTop: 10, fontFamily: font.body, fontSize: 13.5, fontWeight: 700, color: colors.green, background: 'none', border: 'none', padding: 0, cursor: 'pointer' },
}
