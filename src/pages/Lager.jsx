import { useState } from 'react'
import { lagerData } from '../data/lager'
import { colors, shadow, radius, font } from '../data/theme'

export default function Lager() {
  const [raavarer, setRaavarer] = useState(lagerData)
  const [modalAaben, setModalAaben] = useState(false)
  const [navn, setNavn] = useState('')
  const [mængde, setMængde] = useState('')

  function tilføjRaavare(e) {
    e.preventDefault()
    if (!navn.trim()) return
    const ny = {
      id: Date.now(),
      navn: navn.trim(),
      mængde: mængde.trim() || '—',
      emoji: '🥕',
    }
    setRaavarer((prev) => [...prev, ny])
    setNavn('')
    setMængde('')
    setModalAaben(false)
  }

  function lukModal() {
    setModalAaben(false)
    setNavn('')
    setMængde('')
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>Mit Lager</h1>
        <p style={styles.subtitle}>
          {raavarer.length} {raavarer.length === 1 ? 'råvare' : 'råvarer'}
        </p>
      </header>

      {/* Liste over råvarer */}
      <ul style={styles.list}>
        {raavarer.map((r) => (
          <li key={r.id} style={styles.cardItem}>
            <div style={styles.cardLeft}>
              <span style={styles.emoji} aria-hidden="true">{r.emoji}</span>
              <div>
                <div style={styles.navn}>{r.navn}</div>
                <div style={styles.mængde}>{r.mængde}</div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* FAB */}
      <button
        type="button"
        onClick={() => setModalAaben(true)}
        style={styles.fab}
        aria-label="Tilføj råvare"
      >
        <PlusIcon />
      </button>

      {/* Tilføj-modal */}
      {modalAaben && (
        <div style={styles.overlay} onClick={lukModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Tilføj råvare</h2>
            <form onSubmit={tilføjRaavare}>
              <label style={styles.field}>
                <span style={styles.fieldLabel}>Navn</span>
                <input
                  autoFocus
                  value={navn}
                  onChange={(e) => setNavn(e.target.value)}
                  placeholder="f.eks. Gulerødder"
                  style={styles.input}
                />
              </label>
              <label style={styles.field}>
                <span style={styles.fieldLabel}>Mængde</span>
                <input
                  value={mængde}
                  onChange={(e) => setMængde(e.target.value)}
                  placeholder="f.eks. 500g"
                  style={styles.input}
                />
              </label>
              <button type="submit" style={styles.primaryBtn}>Tilføj</button>
              <button type="button" onClick={lukModal} style={styles.ghostBtn}>Annullér</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function PlusIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

const styles = {
  page: {
    maxWidth: 480,
    margin: '0 auto',
    padding: '24px 20px 120px',
    position: 'relative',
    minHeight: '100%',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontFamily: font.display,
    fontWeight: 800,
    fontSize: 32,
    lineHeight: 1.1,
    color: colors.text,
    margin: 0,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: font.body,
    fontSize: 14,
    color: colors.muted,
    margin: '6px 0 0',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  cardItem: {
    background: colors.card,
    padding: '12px 14px',
    borderRadius: 14,
    boxShadow: shadow.card,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 24,
    lineHeight: 1,
    width: 28,
    textAlign: 'center',
  },
  navn: {
    fontFamily: font.body,
    fontWeight: 700,
    fontSize: 16,
    color: colors.text,
  },
  mængde: {
    fontFamily: font.body,
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  fab: {
    position: 'fixed',
    right: 20,
    bottom: 92,
    width: 56,
    height: 56,
    borderRadius: 999,
    background: colors.green,
    border: 'none',
    boxShadow: shadow.fab,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(31,36,33,0.35)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 60,
    padding: 16,
  },
  modal: {
    background: colors.card,
    borderRadius: radius.card,
    boxShadow: shadow.card,
    width: '100%',
    maxWidth: 448,
    padding: 24,
    marginBottom: 24,
  },
  modalTitle: {
    fontFamily: font.display,
    fontWeight: 700,
    fontSize: 22,
    color: colors.text,
    margin: '0 0 18px',
  },
  field: {
    display: 'block',
    marginBottom: 14,
  },
  fieldLabel: {
    display: 'block',
    fontFamily: font.body,
    fontSize: 13,
    fontWeight: 600,
    color: colors.muted,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: 16,
    color: colors.text,
    background: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    outline: 'none',
  },
  primaryBtn: {
    width: '100%',
    marginTop: 6,
    padding: '14px',
    fontFamily: font.body,
    fontSize: 16,
    fontWeight: 700,
    color: '#fff',
    background: colors.green,
    border: 'none',
    borderRadius: radius.button,
  },
  ghostBtn: {
    width: '100%',
    marginTop: 8,
    padding: '12px',
    fontFamily: font.body,
    fontSize: 15,
    fontWeight: 600,
    color: colors.muted,
    background: 'transparent',
    border: 'none',
    borderRadius: radius.button,
  },
}
