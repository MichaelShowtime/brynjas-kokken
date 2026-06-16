import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { opdaterBruger, hentAktivBruger } from '../data/auth'
import { ONBOARDING_TRIN } from '../data/tags'
import { colors, shadow, radius, font } from '../data/theme'

export default function Onboarding() {
  const navigate = useNavigate()
  const bruger = hentAktivBruger()
  const [trinIdx, setTrinIdx] = useState(0)
  const [valgte, setValgte] = useState({}) // { trinId: [svarIdx, ...] }
  const [afsluttes, setAfsluttes] = useState(false)

  const trin = ONBOARDING_TRIN[trinIdx]
  const erSidste = trinIdx === ONBOARDING_TRIN.length - 1
  const trinValgte = valgte[trin.id] || []

  function toggleSvar(idx) {
    if (trin.multi) {
      setValgte((v) => {
        const nuværende = v[trin.id] || []
        const ny = nuværende.includes(idx)
          ? nuværende.filter((i) => i !== idx)
          : [...nuværende, idx]
        return { ...v, [trin.id]: ny }
      })
    } else {
      setValgte((v) => ({ ...v, [trin.id]: [idx] }))
    }
  }

  function næste() {
    if (!trin.multi && trinValgte.length === 0) return // Kræv valg ved single-choice
    if (erSidste) {
      afslutOnboarding()
    } else {
      setTrinIdx((i) => i + 1)
    }
  }

  function tilbage() {
    if (trinIdx > 0) setTrinIdx((i) => i - 1)
  }

  function spring() {
    if (erSidste) {
      afslutOnboarding()
    } else {
      setTrinIdx((i) => i + 1)
    }
  }

  function afslutOnboarding() {
    setAfsluttes(true)

    // Saml alle tags fra alle svar
    const alleTags = new Set(bruger?.tags || [])
    for (const [trinId, svarIndeks] of Object.entries(valgte)) {
      const trinDef = ONBOARDING_TRIN.find((t) => t.id === trinId)
      if (!trinDef) continue
      for (const idx of svarIndeks) {
        const svar = trinDef.svar[idx]
        svar?.tags?.forEach((tag) => alleTags.add(tag))
      }
    }

    opdaterBruger({ tags: [...alleTags], onboardingFærdig: true })
    setTimeout(() => navigate('/hjem', { replace: true }), 600)
  }

  const fremgang = ((trinIdx + 1) / ONBOARDING_TRIN.length) * 100

  if (afsluttes) {
    return (
      <div style={s.page}>
        <div style={s.inner}>
          <div style={s.afslutCirkel}>🎉</div>
          <h1 style={s.afslutTitel}>Alt er klar!</h1>
          <p style={s.afslutTekst}>
            Vi har sat Simmer op efter dine præferencer.
            <br />Velkommen, {bruger?.navn}!
          </p>
          <div style={s.spinner} />
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <div style={s.inner}>

        {/* Fremgangsbjælke */}
        <div style={s.fremgangWrap}>
          <div style={{ ...s.fremgangBar, width: `${fremgang}%` }} />
        </div>
        <p style={s.fremgangTekst}>
          {trinIdx + 1} / {ONBOARDING_TRIN.length}
        </p>

        {/* Ikon */}
        <div style={s.trinIkon}>{trin.ikon}</div>

        {/* Spørgsmål */}
        <h1 style={s.spørgsmål}>{trin.spørgsmål}</h1>
        {trin.multi && (
          <p style={s.multiHint}>Vælg gerne flere</p>
        )}

        {/* Svar */}
        <div style={s.svarListe}>
          {trin.svar.map((svar, idx) => {
            const erValgt = trinValgte.includes(idx)
            return (
              <button
                key={idx}
                style={{ ...s.svarKnap, ...(erValgt ? s.svarAktiv : {}) }}
                onClick={() => toggleSvar(idx)}
              >
                <span style={s.svarTekst}>{svar.label}</span>
                {erValgt && <span style={s.tjek}>✓</span>}
              </button>
            )
          })}
        </div>

        {/* Navigation */}
        <div style={s.navRække}>
          {trinIdx > 0 && (
            <button style={s.tilbageBtn} onClick={tilbage}>‹ Tilbage</button>
          )}
          <div style={{ flex: 1 }} />
          <button style={s.springBtn} onClick={spring}>
            Spring over
          </button>
          <button
            style={{
              ...s.næsteBtn,
              opacity: (!trin.multi && trinValgte.length === 0) ? 0.5 : 1,
            }}
            onClick={næste}
            disabled={!trin.multi && trinValgte.length === 0}
          >
            {erSidste ? 'Kom i gang 🚀' : 'Næste →'}
          </button>
        </div>

      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' },
  inner: { width: '100%', maxWidth: 420 },

  fremgangWrap: { height: 5, background: colors.border, borderRadius: 999, marginBottom: 8, overflow: 'hidden' },
  fremgangBar: { height: '100%', background: colors.green, borderRadius: 999, transition: 'width 0.4s ease' },
  fremgangTekst: { fontFamily: font.body, fontSize: 12, fontWeight: 600, color: colors.mutedLight, margin: '0 0 28px', textAlign: 'right' },

  trinIkon: { fontSize: 52, textAlign: 'center', marginBottom: 18 },
  spørgsmål: { fontFamily: font.display, fontWeight: 800, fontSize: 24, color: colors.text, margin: '0 0 8px', letterSpacing: -0.4, lineHeight: 1.25, textAlign: 'center' },
  multiHint: { fontFamily: font.body, fontSize: 13, color: colors.mutedLight, textAlign: 'center', margin: '0 0 20px' },

  svarListe: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 },
  svarKnap: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '15px 18px', background: colors.card,
    border: `1.5px solid ${colors.border}`, borderRadius: 16,
    boxShadow: shadow.card, fontFamily: font.body, fontWeight: 600,
    fontSize: 15, color: colors.text, textAlign: 'left', cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  svarAktiv: { border: `1.5px solid ${colors.green}`, background: 'rgba(47,107,79,0.06)' },
  svarTekst: { flex: 1 },
  tjek: { color: colors.green, fontWeight: 800, fontSize: 16, marginLeft: 10 },

  navRække: { display: 'flex', alignItems: 'center', gap: 10 },
  tilbageBtn: { background: 'none', border: 'none', fontFamily: font.body, fontSize: 14, fontWeight: 700, color: colors.muted, cursor: 'pointer', padding: '8px 0', flexShrink: 0 },
  springBtn: { background: 'none', border: 'none', fontFamily: font.body, fontSize: 14, fontWeight: 700, color: colors.mutedLight, cursor: 'pointer', padding: '8px 4px', flexShrink: 0 },
  næsteBtn: { padding: '13px 22px', fontFamily: font.body, fontWeight: 700, fontSize: 15, color: '#fff', background: colors.green, border: 'none', borderRadius: radius.button, boxShadow: shadow.fab, cursor: 'pointer', flexShrink: 0 },

  // Afslut-skærm
  afslutCirkel: { fontSize: 64, textAlign: 'center', margin: '0 0 20px' },
  afslutTitel: { fontFamily: font.display, fontWeight: 800, fontSize: 28, color: colors.text, textAlign: 'center', margin: '0 0 10px', letterSpacing: -0.5 },
  afslutTekst: { fontFamily: font.body, fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 1.6, margin: '0 0 32px' },
  spinner: { width: 32, height: 32, border: `3px solid ${colors.border}`, borderTop: `3px solid ${colors.green}`, borderRadius: '50%', animation: 'simmer-spin 0.8s linear infinite', margin: '0 auto' },
}
