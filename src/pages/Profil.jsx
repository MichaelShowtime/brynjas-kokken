import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { hentKreationer } from '../data/kreationer'
import { opskrifter } from '../data/opskrifter'
import { venner } from '../data/feed'
import { colors, shadow, radius, font } from '../data/theme'

const BRUGER = {
  navn: 'Brynja Kjartansdóttir',
  brugernavn: '@brynja',
  bio: 'Elsker mad der smager af noget 🍋 Koger helst fra bunden.',
  avatar: '🧑‍🍳',
  streak: 12,
  retterLavet: 48,
  følgere: 134,
  følger: 61,
}

const PRÆFERENCER = [
  { id: 'vegetar', label: 'Vegetar', emoji: '🥦' },
  { id: 'kød', label: 'Kød', emoji: '🥩' },
  { id: 'fisk', label: 'Fisk & skaldyr', emoji: '🐟' },
  { id: 'pasta', label: 'Pasta', emoji: '🍝' },
  { id: 'hurtig', label: 'Under 30 min', emoji: '⚡' },
  { id: 'asiatisk', label: 'Asiatisk', emoji: '🥢' },
  { id: 'bagning', label: 'Bagning', emoji: '🍞' },
  { id: 'suppe', label: 'Suppe', emoji: '🍲' },
]

const ACHIEVEMENTS = [
  { emoji: '🔥', titel: '12 dages streak', beskrivelse: 'Kogt 12 dage i træk', opnået: true },
  { emoji: '👨‍🍳', titel: 'Første ret', beskrivelse: 'Lavede din første ret', opnået: true },
  { emoji: '⭐', titel: 'Madsniffer', beskrivelse: 'Gemte 10+ opskrifter', opnået: true },
  { emoji: '🌿', titel: 'Grøn uge', beskrivelse: 'Kun vegetar i 7 dage', opnået: false },
  { emoji: '🍕', titel: 'Weekendkok', beskrivelse: 'Lavet mad 4 lørdage', opnået: false },
  { emoji: '🏆', titel: 'Mesterkok', beskrivelse: 'Lavet 100 retter', opnået: false },
]

// Gem gemte opskrifter i localStorage
const GEMTE_KEY = 'simmer_gemte_opskrifter'
function hentGemte() {
  try { return JSON.parse(localStorage.getItem(GEMTE_KEY)) || [1, 2, 5] } catch { return [1, 2, 5] }
}

function grad(c) {
  const n = parseInt(c.slice(1), 16)
  const f = 0.82
  return `linear-gradient(135deg, ${c}, rgb(${Math.round(((n >> 16) & 255) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)}))`
}

export default function Profil() {
  const navigate = useNavigate()
  const [aktivTab, setAktivTab] = useState('gemte') // 'gemte' | 'kreationer' | 'badges'
  const [præferencer, setPræferencer] = useState(['vegetar', 'pasta', 'hurtig'])
  const [redigerBio, setRedigerBio] = useState(false)
  const [bio, setBio] = useState(BRUGER.bio)
  const [kreationer, setKreationer] = useState([])
  const [gemteIds, setGemteIds] = useState(hentGemte)

  useEffect(() => {
    setKreationer(hentKreationer())
  }, [])

  const gemteOpskrifter = opskrifter.filter(o => gemteIds.includes(o.id))

  function togglePræference(id) {
    setPræferencer(p =>
      p.includes(id) ? p.filter(x => x !== id) : [...p, id]
    )
  }

  return (
    <div style={s.page}>

      {/* Hero-sektion */}
      <div style={s.hero}>
        <div style={s.avatarWrap}>
          <div style={s.avatar}>{BRUGER.avatar}</div>
          <div style={s.streakBadge}>🔥 {BRUGER.streak}</div>
        </div>

        <h1 style={s.navn}>{BRUGER.navn}</h1>
        <p style={s.brugernavn}>{BRUGER.brugernavn}</p>

        {redigerBio ? (
          <div style={s.bioEditWrap}>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              style={s.bioInput}
              rows={2}
              autoFocus
            />
            <button style={s.gemBioBtn} onClick={() => setRedigerBio(false)}>Gem</button>
          </div>
        ) : (
          <p style={s.bio} onClick={() => setRedigerBio(true)}>
            {bio} <span style={s.redigerHint}>✎</span>
          </p>
        )}

        {/* Stats */}
        <div style={s.statsRow}>
          <Stat tal={BRUGER.retterLavet} label="retter" />
          <div style={s.statDivider} />
          <Stat tal={BRUGER.følgere} label="følgere" />
          <div style={s.statDivider} />
          <Stat tal={BRUGER.følger} label="følger" />
        </div>

        {/* Handlingsknapper */}
        <div style={s.btnRow}>
          <button style={s.editBtn}>Rediger profil</button>
          <button style={s.shareBtn}>
            <ShareIcon />
          </button>
        </div>
      </div>

      {/* Venner-preview */}
      <div style={s.vennerKort}>
        <div style={s.vennerHeader}>
          <p style={s.vennerLabel}>Dine madvenner</p>
          <button style={s.seeAllBtn}>Se alle</button>
        </div>
        <div style={s.vennerRække}>
          {venner.map(v => (
            <div key={v.id} style={s.vennerItem}>
              <div style={{
                ...s.vennerRing,
                background: v.live
                  ? `linear-gradient(135deg, ${colors.terracotta}, ${colors.red})`
                  : colors.border,
              }}>
                <div style={s.vennerAvatar}>{v.emoji}</div>
              </div>
              <span style={s.vennerNavn}>{v.navn}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Madpræferencer */}
      <div style={s.sektion}>
        <h2 style={s.sektionTitel}>Mine smagspræferencer</h2>
        <p style={s.sektionHint}>Bruges til at skræddersy dine forslag</p>
        <div style={s.præfGrid}>
          {PRÆFERENCER.map(p => (
            <button
              key={p.id}
              onClick={() => togglePræference(p.id)}
              style={{
                ...s.præfChip,
                ...(præferencer.includes(p.id) ? s.præfChipAktiv : null),
              }}
            >
              <span style={{ fontSize: 18 }}>{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs: Gemte / Kreationer / Badges */}
      <div style={s.tabs}>
        {[
          { id: 'gemte', label: `Gemte (${gemteOpskrifter.length})` },
          { id: 'kreationer', label: `Kreationer (${kreationer.length})` },
          { id: 'badges', label: 'Badges' },
        ].map(t => (
          <button
            key={t.id}
            style={{ ...s.tab, ...(aktivTab === t.id ? s.tabAktiv : null) }}
            onClick={() => setAktivTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab-indhold */}
      {aktivTab === 'gemte' && (
        <div style={s.grid}>
          {gemteOpskrifter.length === 0 && (
            <TomStat
              emoji="🔖"
              tekst="Du har ikke gemt nogen opskrifter endnu."
              knap="Gå til Mad-match"
              onKnap={() => navigate('/madmatch')}
            />
          )}
          {gemteOpskrifter.map(o => (
            <button key={o.id} style={s.opskriftKort} onClick={() => navigate('/madmatch')}>
              <div style={{ ...s.opskriftHero, background: grad(o.farve) }}>
                <span style={s.opskriftEmoji}>{o.emoji}</span>
              </div>
              <div style={s.opskriftBody}>
                <p style={s.opskriftTitel}>{o.titel}</p>
                <p style={s.opskriftMeta}>⏱ {o.tid} min · ⭐ {o.rating}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {aktivTab === 'kreationer' && (
        <div>
          {kreationer.length === 0 && (
            <TomStat
              emoji="📸"
              tekst="Tag et billede og skab din første kreation."
              knap="Gå til Opret"
              onKnap={() => navigate('/opret')}
            />
          )}
          {kreationer.map(k => (
            <div key={k.id} style={s.kreationItem}>
              {k.foto ? (
                <img src={k.foto} alt="" style={s.kreationThumb} />
              ) : (
                <div style={{ ...s.kreationThumb, ...s.kreationThumbTom }}>🍽️</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={s.kreationNavn}>{k.navn}</p>
                <p style={s.kreationMeta}>
                  {new Date(k.dato).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })}
                  {k.referencer?.length ? ` · 🔗 ${k.referencer.length} opskrift${k.referencer.length > 1 ? 'er' : ''}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {aktivTab === 'badges' && (
        <div style={s.badgeGrid}>
          {ACHIEVEMENTS.map((a, i) => (
            <div
              key={i}
              style={{
                ...s.badge,
                ...(a.opnået ? null : s.badgeLocked),
              }}
            >
              <span style={s.badgeEmoji}>{a.opnået ? a.emoji : '🔒'}</span>
              <p style={s.badgeTitel}>{a.titel}</p>
              <p style={s.badgeBeskrivelse}>{a.beskrivelse}</p>
            </div>
          ))}
        </div>
      )}

      {/* Indstillinger */}
      <div style={s.sektion}>
        <h2 style={s.sektionTitel}>Indstillinger</h2>
        {[
          { emoji: '🔔', label: 'Notifikationer', sub: 'Daglige forslag kl. 17:00' },
          { emoji: '🌍', label: 'Sprog', sub: 'Dansk' },
          { emoji: '🛡️', label: 'Privatliv', sub: 'Offentlig profil' },
          { emoji: '❓', label: 'Hjælp & feedback', sub: null },
        ].map((item, i) => (
          <button key={i} style={s.indstillingRække}>
            <span style={s.indstillingEmoji}>{item.emoji}</span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={s.indstillingLabel}>{item.label}</p>
              {item.sub && <p style={s.indstillingSub}>{item.sub}</p>}
            </div>
            <span style={s.indstillingPil}>›</span>
          </button>
        ))}
      </div>

      <button style={s.logUdBtn}>Log ud</button>

    </div>
  )
}

function Stat({ tal, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={s.statTal}>{tal}</p>
      <p style={s.statLabel}>{label}</p>
    </div>
  )
}

function TomStat({ emoji, tekst, knap, onKnap }) {
  return (
    <div style={s.tomStat}>
      <span style={{ fontSize: 36 }}>{emoji}</span>
      <p style={s.tomStatTekst}>{tekst}</p>
      <button style={s.tomStatKnap} onClick={onKnap}>{knap}</button>
    </div>
  )
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  )
}

const s = {
  page: {
    maxWidth: 480,
    margin: '0 auto',
    padding: '0 0 120px',
    minHeight: '100%',
  },

  // Hero
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '28px 24px 24px',
    background: colors.card,
    boxShadow: shadow.card,
    marginBottom: 12,
  },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 999,
    background: colors.bg,
    border: `3px solid ${colors.border}`,
    fontSize: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadow.card,
  },
  streakBadge: {
    position: 'absolute',
    bottom: -6,
    right: -8,
    background: colors.card,
    border: `2px solid ${colors.border}`,
    borderRadius: 999,
    fontSize: 12,
    fontFamily: font.body,
    fontWeight: 800,
    color: colors.text,
    padding: '3px 8px',
    boxShadow: shadow.card,
  },
  navn: {
    fontFamily: font.display,
    fontWeight: 800,
    fontSize: 22,
    color: colors.text,
    margin: 0,
    letterSpacing: -0.4,
  },
  brugernavn: {
    fontFamily: font.body,
    fontSize: 13.5,
    fontWeight: 600,
    color: colors.mutedLight,
    margin: '3px 0 10px',
  },
  bio: {
    fontFamily: font.body,
    fontSize: 14,
    color: colors.muted,
    margin: '0 0 16px',
    textAlign: 'center',
    lineHeight: 1.5,
    maxWidth: 300,
  },
  redigerHint: {
    fontSize: 12,
    color: colors.mutedLight,
    marginLeft: 4,
  },
  bioEditWrap: { width: '100%', maxWidth: 320, marginBottom: 16 },
  bioInput: {
    width: '100%',
    fontFamily: font.body,
    fontSize: 14,
    color: colors.text,
    background: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    padding: '10px 12px',
    resize: 'none',
    outline: 'none',
    boxSizing: 'border-box',
  },
  gemBioBtn: {
    marginTop: 8,
    padding: '8px 20px',
    fontFamily: font.body,
    fontWeight: 700,
    fontSize: 13.5,
    color: '#fff',
    background: colors.green,
    border: 'none',
    borderRadius: radius.button,
  },
  statsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    marginBottom: 18,
  },
  statTal: {
    fontFamily: font.display,
    fontWeight: 800,
    fontSize: 20,
    color: colors.text,
    margin: 0,
  },
  statLabel: {
    fontFamily: font.body,
    fontSize: 12,
    color: colors.muted,
    margin: '2px 0 0',
    fontWeight: 500,
  },
  statDivider: {
    width: 1,
    height: 28,
    background: colors.border,
  },
  btnRow: { display: 'flex', gap: 10 },
  editBtn: {
    flex: 1,
    padding: '11px 20px',
    fontFamily: font.body,
    fontWeight: 700,
    fontSize: 14,
    color: colors.text,
    background: colors.bg,
    border: `1.5px solid ${colors.border}`,
    borderRadius: radius.button,
  },
  shareBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.button,
    background: colors.bg,
    border: `1.5px solid ${colors.border}`,
    color: colors.muted,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Venner
  vennerKort: {
    background: colors.card,
    borderRadius: radius.card,
    boxShadow: shadow.card,
    padding: '16px 16px 18px',
    margin: '0 16px 12px',
  },
  vennerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  vennerLabel: {
    fontFamily: font.display,
    fontWeight: 800,
    fontSize: 16,
    color: colors.text,
    margin: 0,
  },
  seeAllBtn: {
    fontFamily: font.body,
    fontSize: 13,
    fontWeight: 700,
    color: colors.green,
    background: 'none',
    border: 'none',
    padding: 0,
  },
  vennerRække: {
    display: 'flex',
    gap: 14,
    overflowX: 'auto',
    scrollbarWidth: 'none',
  },
  vennerItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  vennerRing: {
    width: 52,
    height: 52,
    borderRadius: 999,
    padding: 3,
    display: 'flex',
  },
  vennerAvatar: {
    flex: 1,
    borderRadius: 999,
    background: colors.bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    border: `2px solid ${colors.card}`,
  },
  vennerNavn: {
    fontFamily: font.body,
    fontSize: 11.5,
    fontWeight: 600,
    color: colors.text,
  },

  // Præferencer
  sektion: {
    padding: '20px 16px',
  },
  sektionTitel: {
    fontFamily: font.display,
    fontWeight: 800,
    fontSize: 18,
    color: colors.text,
    margin: '0 0 4px',
    letterSpacing: -0.3,
  },
  sektionHint: {
    fontFamily: font.body,
    fontSize: 13,
    color: colors.mutedLight,
    margin: '0 0 14px',
  },
  præfGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  præfChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    fontFamily: font.body,
    fontSize: 13.5,
    fontWeight: 700,
    color: colors.muted,
    background: colors.card,
    border: `1.5px solid ${colors.border}`,
    padding: '9px 14px',
    borderRadius: radius.pill,
    boxShadow: shadow.card,
    transition: 'all 0.18s ease',
  },
  præfChipAktiv: {
    color: '#fff',
    background: colors.green,
    border: `1.5px solid ${colors.green}`,
  },

  // Tabs
  tabs: {
    display: 'flex',
    borderBottom: `1px solid ${colors.border}`,
    margin: '0 16px',
  },
  tab: {
    flex: 1,
    fontFamily: font.body,
    fontWeight: 700,
    fontSize: 13.5,
    color: colors.mutedLight,
    background: 'none',
    border: 'none',
    borderBottom: '2.5px solid transparent',
    padding: '12px 4px',
    transition: 'all 0.18s ease',
  },
  tabAktiv: {
    color: colors.green,
    borderBottom: `2.5px solid ${colors.green}`,
  },

  // Grid til gemte opskrifter
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    padding: '16px',
  },
  opskriftKort: {
    background: colors.card,
    borderRadius: 18,
    boxShadow: shadow.card,
    border: 'none',
    padding: 0,
    overflow: 'hidden',
    textAlign: 'left',
  },
  opskriftHero: {
    height: 90,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  opskriftEmoji: {
    fontSize: 40,
    filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.2))',
  },
  opskriftBody: { padding: '10px 12px 13px' },
  opskriftTitel: {
    fontFamily: font.body,
    fontWeight: 700,
    fontSize: 13.5,
    color: colors.text,
    margin: '0 0 4px',
    lineHeight: 1.3,
  },
  opskriftMeta: {
    fontFamily: font.body,
    fontSize: 12,
    color: colors.muted,
    margin: 0,
  },

  // Kreationer
  kreationItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: colors.card,
    borderRadius: 16,
    boxShadow: shadow.card,
    padding: 12,
    margin: '0 16px 10px',
  },
  kreationThumb: {
    width: 54,
    height: 54,
    borderRadius: 12,
    objectFit: 'cover',
    flexShrink: 0,
  },
  kreationThumbTom: {
    background: colors.bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
  },
  kreationNavn: {
    fontFamily: font.body,
    fontWeight: 700,
    fontSize: 14.5,
    color: colors.text,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  kreationMeta: {
    fontFamily: font.body,
    fontSize: 12.5,
    color: colors.muted,
    margin: '3px 0 0',
  },

  // Badges
  badgeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 10,
    padding: '16px',
  },
  badge: {
    background: colors.card,
    borderRadius: 16,
    boxShadow: shadow.card,
    padding: '16px 10px',
    textAlign: 'center',
  },
  badgeLocked: {
    opacity: 0.45,
  },
  badgeEmoji: { fontSize: 28 },
  badgeTitel: {
    fontFamily: font.body,
    fontWeight: 700,
    fontSize: 12,
    color: colors.text,
    margin: '8px 0 3px',
    lineHeight: 1.2,
  },
  badgeBeskrivelse: {
    fontFamily: font.body,
    fontSize: 10.5,
    color: colors.muted,
    margin: 0,
    lineHeight: 1.3,
  },

  // Tom-stat
  tomStat: {
    textAlign: 'center',
    padding: '32px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    gridColumn: '1 / -1',
  },
  tomStatTekst: {
    fontFamily: font.body,
    fontSize: 14,
    color: colors.muted,
    margin: 0,
    lineHeight: 1.5,
  },
  tomStatKnap: {
    padding: '10px 20px',
    fontFamily: font.body,
    fontWeight: 700,
    fontSize: 14,
    color: '#fff',
    background: colors.green,
    border: 'none',
    borderRadius: radius.button,
    marginTop: 4,
  },

  // Indstillinger
  indstillingRække: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    background: colors.card,
    border: 'none',
    borderRadius: 14,
    boxShadow: shadow.card,
    padding: '13px 14px',
    marginBottom: 8,
    textAlign: 'left',
  },
  indstillingEmoji: { fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 },
  indstillingLabel: {
    fontFamily: font.body,
    fontWeight: 700,
    fontSize: 14.5,
    color: colors.text,
    margin: 0,
  },
  indstillingSub: {
    fontFamily: font.body,
    fontSize: 12.5,
    color: colors.mutedLight,
    margin: '2px 0 0',
  },
  indstillingPil: {
    fontSize: 20,
    color: colors.mutedLight,
    flexShrink: 0,
  },

  // Log ud
  logUdBtn: {
    margin: '4px 16px 0',
    width: 'calc(100% - 32px)',
    padding: '14px',
    fontFamily: font.body,
    fontWeight: 700,
    fontSize: 15,
    color: colors.red,
    background: 'rgba(194,91,74,0.08)',
    border: 'none',
    borderRadius: radius.button,
  },
}
