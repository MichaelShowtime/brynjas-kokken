import { colors, shadow, radius, font } from '../data/theme'

// Simpel pladsholder til skærme der endnu ikke er bygget.
export default function Placeholder({ emoji, title, text }) {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.emoji} aria-hidden="true">{emoji}</div>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.text}>{text}</p>
        <span style={styles.badge}>Kommer snart</span>
      </div>
    </div>
  )
}

const styles = {
  page: {
    maxWidth: 480,
    margin: '0 auto',
    padding: '24px 20px 120px',
    minHeight: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    background: colors.card,
    borderRadius: radius.card,
    boxShadow: shadow.card,
    padding: '40px 28px',
    textAlign: 'center',
    width: '100%',
  },
  emoji: { fontSize: 48, lineHeight: 1 },
  title: {
    fontFamily: font.display,
    fontWeight: 800,
    fontSize: 28,
    color: colors.text,
    margin: '16px 0 8px',
    letterSpacing: -0.5,
  },
  text: {
    fontFamily: font.body,
    fontSize: 15,
    color: colors.muted,
    margin: '0 0 20px',
    lineHeight: 1.5,
  },
  badge: {
    display: 'inline-block',
    fontFamily: font.body,
    fontSize: 13,
    fontWeight: 600,
    color: colors.green,
    background: 'rgba(47,107,79,0.10)',
    padding: '6px 14px',
    borderRadius: radius.pill,
  },
}
