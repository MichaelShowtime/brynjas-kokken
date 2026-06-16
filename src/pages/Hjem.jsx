import { useNavigate } from 'react-router-dom'
import { venner, ugensRet, opslag } from '../data/feed'
import { opskrifter } from '../data/opskrifter'
import { colors, shadow, radius, font } from '../data/theme'

const BRUGER = 'Brynja'

// Tid-på-dagen hilsen
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

// Gradient ud fra én farve
function grad(c) {
  return `linear-gradient(135deg, ${c} 0%, ${shade(c)} 100%)`
}
function shade(hex) {
  const n = parseInt(hex.slice(1), 16)
  const f = 0.82
  return `rgb(${Math.round(((n >> 16) & 255) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)})`
}

export default function Hjem() {
  const navigate = useNavigate()
  const anbefalet = opskrifter.slice(2, 7)

  return (
    <div style={styles.page}>
      {/* Hilsen */}
      <header style={styles.topRow}>
        <div>
          <p style={styles.eyebrow}>{datoLinje()}</p>
          <h1 style={styles.title}>
            {hilsen()},<br />{BRUGER} 👋
          </h1>
        </div>
        <div style={styles.avatar}>🧑‍🍳</div>
      </header>

      {/* Streak / stats */}
      <div style={styles.stats}>
        <Stat tal="12" label="dages streak" ikon="🔥" fremhæv />
        <Stat tal="48" label="retter lavet" ikon="🍳" />
        <Stat tal="7" label="gemte" ikon="🔖" />
      </div>

      {/* Stories — aktive venner */}
      <Section titel="Aktive lige nu" handling="Se alle" onHandling={() => {}} />
      <div style={styles.scrollRow}>
        {venner.map((v) => (
          <div key={v.id} style={styles.story}>
            <div
              style={{
                ...styles.storyRing,
                background: v.live
                  ? `linear-gradient(135deg, ${colors.terracotta}, ${colors.red})`
                  : colors.border,
              }}
            >
              <div style={styles.storyAvatar}>{v.emoji}</div>
            </div>
            <span style={styles.storyNavn}>{v.navn}</span>
            {v.live && <span style={styles.liveDot}>LIVE</span>}
          </div>
        ))}
      </div>

      {/* Ugens opskrift — featured */}
      <Section titel="Ugens opskrift" />
      <button
        style={{ ...styles.featured, background: grad(ugensRet.farve) }}
        onClick={() => navigate('/madmatch')}
      >
        <span style={styles.featuredBadge}>⭐ Mest gemte</span>
        <div style={styles.featuredEmoji}>{ugensRet.emoji}</div>
        <div style={styles.featuredBody}>
          <h3 style={styles.featuredTitel}>{ugensRet.titel}</h3>
          <p style={styles.featuredMeta}>
            ⏱ {ugensRet.tid} min · {ugensRet.sværhedsgrad} · af {ugensRet.kok}
          </p>
          <p style={styles.featuredTekst}>{ugensRet.beskrivelse}</p>
        </div>
      </button>

      {/* Socialt feed */}
      <Section titel="I dit fællesskab" handling="Følg flere" onHandling={() => {}} />
      <div style={styles.feed}>
        {opslag.map((p) => (
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
              <button style={styles.followBtn}>+ Følg</button>
            </div>

            <div style={{ ...styles.postImg, background: grad(p.farve) }}>
              <span style={styles.postImgEmoji}>{p.emoji}</span>
              <span style={styles.postRet}>{p.ret}</span>
            </div>

            {p.citat && <p style={styles.postCitat}>“{p.citat}”</p>}

            <div style={styles.postFooter}>
              <span style={styles.postStat}>❤️ {p.likes}</span>
              <span style={styles.postStat}>💬 {p.kommentarer}</span>
              <span style={{ ...styles.postStat, marginLeft: 'auto', color: colors.green }}>
                Lav også →
              </span>
            </div>
          </article>
        ))}
      </div>

      {/* Mere til dig — andre retter */}
      <Section titel="Mere til dig" handling="Se alle" onHandling={() => navigate('/madmatch')} />
      <div style={styles.scrollRow}>
        {anbefalet.map((o) => (
          <button
            key={o.id}
            style={styles.recipeCard}
            onClick={() => navigate('/madmatch')}
          >
            <div style={{ ...styles.recipeHero, background: grad(o.farve) }}>
              <span style={styles.recipeEmoji}>{o.emoji}</span>
            </div>
            <div style={styles.recipeBody}>
              <p style={styles.recipeTitel}>{o.titel}</p>
              <p style={styles.recipeMeta}>⏱ {o.tid} min · {o.sværhedsgrad}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function Stat({ tal, label, ikon, fremhæv }) {
  return (
    <div
      style={{
        ...styles.stat,
        ...(fremhæv ? { background: colors.green } : null),
      }}
    >
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
  page: { maxWidth: 480, margin: '0 auto', padding: '20px 20px 120px', minHeight: '100%' },

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

  scrollRow: {
    display: 'flex', gap: 14, overflowX: 'auto', padding: '4px 0 8px',
    margin: '0 -20px', paddingLeft: 20, paddingRight: 20,
    scrollbarWidth: 'none',
  },

  // Stories
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

  // Featured
  featured: {
    width: '100%', textAlign: 'left', border: 'none', borderRadius: radius.card,
    boxShadow: shadow.card, padding: 0, overflow: 'hidden', position: 'relative',
    color: '#fff',
  },
  featuredBadge: {
    position: 'absolute', top: 14, left: 14, fontFamily: font.body, fontSize: 12,
    fontWeight: 700, background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(4px)',
    padding: '5px 11px', borderRadius: 999,
  },
  featuredEmoji: {
    fontSize: 72, textAlign: 'center', padding: '34px 0 8px',
    filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.22))',
  },
  featuredBody: { padding: '4px 18px 20px' },
  featuredTitel: { fontFamily: font.display, fontWeight: 800, fontSize: 24, margin: '0 0 6px', letterSpacing: -0.4 },
  featuredMeta: { fontFamily: font.body, fontSize: 13, fontWeight: 600, opacity: 0.92, margin: '0 0 8px' },
  featuredTekst: { fontFamily: font.body, fontSize: 14, lineHeight: 1.45, opacity: 0.92, margin: 0 },

  // Socialt feed
  feed: { display: 'flex', flexDirection: 'column', gap: 16 },
  post: {
    background: colors.card, borderRadius: radius.card, boxShadow: shadow.card,
    padding: 14,
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

  // Mere til dig
  recipeCard: {
    width: 160, flexShrink: 0, background: colors.card, borderRadius: 18,
    boxShadow: shadow.card, border: 'none', padding: 0, overflow: 'hidden', textAlign: 'left',
  },
  recipeHero: { height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  recipeEmoji: { fontSize: 48, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.18))' },
  recipeBody: { padding: '10px 12px 14px' },
  recipeTitel: { fontFamily: font.body, fontWeight: 700, fontSize: 14.5, color: colors.text, margin: '0 0 4px' },
  recipeMeta: { fontFamily: font.body, fontSize: 12, color: colors.muted, margin: 0 },
}
