import { colors, shadow, radius, font } from '../data/theme'

/*
 * Redesignet swipe-kort til Mad-match — stort hero-billede, badge, tags, rating.
 * Klik på billedet åbner modal med ingrediens-detaljer + venners reaktioner.
 */
export default function SwipeCard({
  opskrift,
  analyse,
  cardStyle,
  likeOpacity = 0,
  nopeOpacity = 0,
  pointerHandlers = {},
  innerRef,
  onKlik = () => {},
}) {
  const { har, mangler } = analyse
  const manglerTekst = mangler.length > 0 ? `${har.length} af ${opskrift.ingredienser.length}` : 'Du har alt'

  return (
    <div ref={innerRef} style={{ ...styles.card, ...cardStyle }} {...pointerHandlers}>
      {/* Stempler */}
      <div style={{ ...styles.stamp, ...styles.likeStamp, opacity: likeOpacity }}>
        GEM
      </div>
      <div style={{ ...styles.stamp, ...styles.nopeStamp, opacity: nopeOpacity }}>
        SPRING OVER
      </div>

      {/* Hero — klikbar for modal */}
      <button
        type="button"
        style={{ ...styles.hero, background: heroGradient(opskrift.farve) }}
        onClick={onKlik}
        aria-label="Se detaljer"
      >
        {/* Foto-kilde badge */}
        <span style={styles.badge}>auto-foto · {opskrift.kilde}</span>

        {/* Billede-emoji */}
        <span style={styles.heroEmoji} aria-hidden="true">
          {opskrift.emoji}
        </span>

        {/* Ingrediens-status øverst til højre */}
        <span style={styles.ingrediensBadge}>
          {manglerTekst}
          {mangler.length === 0 ? ' ✓' : ''}
        </span>
      </button>

      {/* Indhold — tags, titel, meta */}
      <div style={styles.body}>
        <div style={styles.tags}>
          {opskrift.kategori && <span style={styles.tag}>{opskrift.kategori}</span>}
          {opskrift.tid <= 30 && <span style={styles.tag}>Hurtig</span>}
        </div>

        <h2 style={styles.titel}>{opskrift.titel}</h2>

        <div style={styles.meta}>
          <span>⏱ {opskrift.tid} min</span>
          <span style={styles.dot}>·</span>
          <span>⭐ {opskrift.rating}</span>
          <span style={styles.dot}>·</span>
          <span style={{ ...styles.ingrediensMeta, color: mangler.length === 0 ? colors.green : colors.terracotta }}>
            {mangler.length > 0 ? `${mangler.length} mangler` : 'Alt håndteret'}
          </span>
        </div>
      </div>
    </div>
  )
}

function heroGradient(c) {
  return `linear-gradient(135deg, ${c} 0%, ${shade(c)} 100%)`
}

function shade(hex) {
  const n = parseInt(hex.slice(1), 16)
  const f = 0.8
  const r = Math.round(((n >> 16) & 255) * f)
  const g = Math.round(((n >> 8) & 255) * f)
  const b = Math.round((n & 255) * f)
  return `rgb(${r},${g},${b})`
}

const styles = {
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    background: colors.card,
    borderRadius: radius.card,
    boxShadow: shadow.card,
    overflow: 'hidden',
    touchAction: 'none',
    userSelect: 'none',
  },

  stamp: {
    position: 'absolute',
    top: 22,
    fontFamily: font.display,
    fontWeight: 800,
    fontSize: 26,
    letterSpacing: 1,
    padding: '6px 14px',
    borderRadius: 12,
    border: '4px solid',
    zIndex: 5,
    pointerEvents: 'none',
  },
  likeStamp: {
    left: 18,
    color: colors.green,
    borderColor: colors.green,
    transform: 'rotate(-14deg)',
  },
  nopeStamp: {
    right: 18,
    color: colors.red,
    borderColor: colors.red,
    transform: 'rotate(14deg)',
  },

  hero: {
    width: '100%',
    height: 360,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    color: '#fff',
  },

  badge: {
    position: 'absolute',
    top: 14,
    left: 14,
    fontFamily: font.body,
    fontSize: 11.5,
    fontWeight: 700,
    background: 'rgba(255,255,255,0.24)',
    backdropFilter: 'blur(6px)',
    padding: '6px 12px',
    borderRadius: radius.pill,
    letterSpacing: 0.2,
  },

  heroEmoji: {
    fontSize: 110,
    lineHeight: 1,
    filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.24))',
  },

  ingrediensBadge: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    fontFamily: font.body,
    fontSize: 13,
    fontWeight: 700,
    background: 'rgba(255,255,255,0.28)',
    backdropFilter: 'blur(6px)',
    padding: '7px 13px',
    borderRadius: radius.pill,
    letterSpacing: 0.2,
  },

  body: { padding: '18px 16px 20px' },

  tags: { display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  tag: {
    fontFamily: font.body,
    fontSize: 12.5,
    fontWeight: 700,
    color: colors.text,
    background: colors.bg,
    padding: '6px 12px',
    borderRadius: radius.pill,
  },

  titel: {
    fontFamily: font.display,
    fontWeight: 800,
    fontSize: 26,
    color: colors.text,
    margin: '0 0 8px',
    letterSpacing: -0.5,
    lineHeight: 1.15,
  },

  meta: {
    fontFamily: font.body,
    fontSize: 13.5,
    color: colors.muted,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  dot: { color: colors.mutedLight, fontSize: 10 },
  ingrediensMeta: { fontWeight: 700 },
}
