import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, UserPlus, MessageCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { hentAktivBruger } from '../data/auth'
import { useLang, relativTidLang } from '../lib/lang'
import { colors, shadow, radius, font } from '../data/theme'

const SIST_SET_KEY = 'simmer_notif_sist'

export default function Notifikationer() {
  const navigate = useNavigate()
  const { t } = useLang()
  const bruger = hentAktivBruger()
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!bruger?.id) return
    let cancelled = false

    async function hent() {
      const [følgerRes, minePostsRes] = await Promise.all([
        supabase
          .from('venner')
          .select('bruger_user_id, bruger_email, created_at')
          .eq('ven_user_id', bruger.id)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('posts')
          .select('id, opskrift_titel')
          .eq('user_id', bruger.id)
          .limit(50),
      ])

      if (cancelled) return

      const følgere = følgerRes.data ?? []
      const minePosts = minePostsRes.data ?? []

      // Hent følgeres kundeinfo
      const følgerIds = følgere.map((f) => f.bruger_user_id).filter(Boolean)
      const { data: følgerKunder } = følgerIds.length
        ? await supabase
            .from('customers')
            .select('user_id, first_name, avatar, username')
            .in('user_id', følgerIds)
        : { data: [] }

      if (cancelled) return

      // Hent likes og kommentarer på mine posts
      const minePostIds = minePosts.map((p) => p.id)
      const [likesRes, kommentarerRes] = await Promise.all([
        minePostIds.length
          ? supabase.from('post_likes').select('post_id, user_id, created_at').in('post_id', minePostIds).neq('user_id', bruger.id).order('created_at', { ascending: false }).limit(30)
          : { data: [] },
        minePostIds.length
          ? supabase.from('post_kommentarer').select('post_id, user_id, bruger_navn, bruger_avatar, created_at').in('post_id', minePostIds).neq('user_id', bruger.id).order('created_at', { ascending: false }).limit(30)
          : { data: [] },
      ])
      const likes = likesRes.data ?? []
      const kommentarer = kommentarerRes.data ?? []

      if (cancelled) return

      // Hent likeres kundeinfo
      const likerIds = [...new Set(likes.map((l) => l.user_id))]
      const { data: likerKunder } = likerIds.length
        ? await supabase.from('customers').select('user_id, first_name, avatar, username').in('user_id', likerIds)
        : { data: [] }

      if (cancelled) return

      // Byg notifikations-liste
      const nFølgere = følgere.map((f) => {
        const k = (følgerKunder ?? []).find((c) => c.user_id === f.bruger_user_id)
        return {
          id: `follow-${f.bruger_user_id ?? f.bruger_email}`,
          type: 'følger',
          navn: k?.first_name ?? f.bruger_email?.split('@')[0] ?? '?',
          avatar: k?.avatar ?? '🧑‍🍳',
          userId: f.bruger_user_id,
          tid: f.created_at,
        }
      })

      const nLikes = likes.map((l) => {
        const k = (likerKunder ?? []).find((c) => c.user_id === l.user_id)
        const post = minePosts.find((p) => p.id === l.post_id)
        return {
          id: `like-${l.user_id}-${l.post_id}`,
          type: 'like',
          navn: k?.first_name ?? '?',
          avatar: k?.avatar ?? '🧑‍🍳',
          userId: l.user_id,
          opskrift: post?.opskrift_titel ?? '',
          tid: l.created_at,
        }
      })

      const nKommentarer = kommentarer.map((k) => {
        const post = minePosts.find((p) => p.id === k.post_id)
        return {
          id: `kommentar-${k.user_id}-${k.post_id}-${k.created_at}`,
          type: 'kommentar',
          navn: k.bruger_navn ?? '?',
          avatar: k.bruger_avatar ?? '🧑‍🍳',
          userId: k.user_id,
          opskrift: post?.opskrift_titel ?? '',
          tid: k.created_at,
        }
      })

      const alle = [...nFølgere, ...nLikes, ...nKommentarer].sort(
        (a, b) => new Date(b.tid) - new Date(a.tid)
      )

      if (!cancelled) {
        setNotifs(alle)
        setLoading(false)
        localStorage.setItem(SIST_SET_KEY, new Date().toISOString())
      }
    }

    hent()
    return () => { cancelled = true }
  }, [bruger?.id])

  return (
    <div style={s.page}>
      <header style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>←</button>
        <h1 style={s.titel}>{t('notif.titel')}</h1>
      </header>

      {loading ? (
        <div style={s.center}>
          <p style={s.muted}>{t('notif.henter')}</p>
        </div>
      ) : notifs.length === 0 ? (
        <div style={s.center}>
          <span style={{ fontSize: 48 }}>🔔</span>
          <p style={s.tomTitel}>{t('notif.tom')}</p>
          <p style={s.tomSub}>{t('notif.tomSub')}</p>
        </div>
      ) : (
        <div style={s.liste}>
          {notifs.map((n) => (
            <NotifRæk
              key={n.id}
              notif={n}
              t={t}
              onClick={() => n.userId && navigate(`/bruger/${n.userId}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NotifRæk({ notif, t, onClick }) {
  const tekst = notif.type === 'følger'
    ? t('notif.følger')
    : notif.type === 'kommentar'
      ? `kommenterede${notif.opskrift ? ` · ${notif.opskrift}` : ''}`
      : `${t('notif.likede')}${notif.opskrift ? ` · ${notif.opskrift}` : ''}`

  const ikon = notif.type === 'følger'
    ? <UserPlus size={16} color={colors.green} />
    : notif.type === 'kommentar'
      ? <MessageCircle size={16} color={colors.green} />
      : <Heart size={16} color={colors.red} fill={colors.red} />

  return (
    <button style={s.ræk} onClick={onClick}>
      <div style={s.avatarBox}>{notif.avatar}</div>
      <div style={s.tekster}>
        <p style={s.navn}>
          <span style={s.navnFed}>{notif.navn}</span>{' '}
          <span style={s.handling}>{tekst}</span>
        </p>
        <p style={s.tid}>{relativTidLang(notif.tid, t)}</p>
      </div>
      <span style={{ ...s.ikon, display: 'flex', alignItems: 'center' }}>{ikon}</span>
    </button>
  )
}

const s = {
  page: {
    maxWidth: 480, margin: '0 auto',
    padding: '0 0 120px', minHeight: '100%',
    background: colors.bg,
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '20px 20px 16px',
    position: 'sticky', top: 0, background: colors.bg, zIndex: 10,
  },
  backBtn: {
    background: 'none', border: 'none', fontSize: 22,
    color: colors.green, cursor: 'pointer', padding: '4px 6px',
    lineHeight: 1,
  },
  titel: {
    fontFamily: font.display, fontWeight: 600, fontSize: 24,
    color: colors.text, margin: 0, letterSpacing: -0.4,
  },
  center: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 12, padding: '60px 32px',
    textAlign: 'center',
  },
  muted: { fontFamily: font.body, fontSize: 15, color: colors.muted, margin: 0 },
  tomTitel: {
    fontFamily: font.display, fontWeight: 600, fontSize: 19,
    color: colors.text, margin: 0, letterSpacing: -0.3,
  },
  tomSub: {
    fontFamily: font.body, fontSize: 14, color: colors.muted,
    margin: 0, lineHeight: 1.55, maxWidth: 280,
  },
  liste: { display: 'flex', flexDirection: 'column' },
  ræk: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 20px',
    background: 'none', border: 'none', width: '100%',
    cursor: 'pointer', textAlign: 'left',
    borderBottom: `1px solid ${colors.border}`,
  },
  avatarBox: {
    width: 46, height: 46, borderRadius: 999,
    background: colors.card, border: `1.5px solid ${colors.border}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, flexShrink: 0, boxShadow: shadow.card,
  },
  tekster: { flex: 1, minWidth: 0 },
  navn: {
    fontFamily: font.body, fontSize: 14.5,
    color: colors.text, margin: '0 0 3px', lineHeight: 1.35,
  },
  navnFed: { fontWeight: 700 },
  handling: { fontWeight: 400, color: colors.muted },
  tid: {
    fontFamily: font.body, fontSize: 12,
    color: colors.mutedLight, margin: 0,
  },
  ikon: { fontSize: 18, flexShrink: 0 },
}
