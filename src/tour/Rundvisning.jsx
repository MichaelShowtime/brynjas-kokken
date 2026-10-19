import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { colors, font, radius } from '../data/theme'
import { find, harStørrelse } from './dom'

const PAD = 8          // luft mellem det fremhævede element og lyskanten
const AFSTAND = 24     // fra lyskanten til forklaringsboksen (inkl. pilen)
const KANT = 12        // minimum afstand til skærmkanten
const PIL = 22         // pilens størrelse
const DÆMP = 'rgba(18, 26, 21, 0.7)'

function læsRadius(el, bredde, højde) {
  const rå = getComputedStyle(el).borderTopLeftRadius || ''
  const tal = parseFloat(rå)
  if (rå.includes('%')) return Math.min(bredde, højde) * (tal / 100)
  return Number.isFinite(tal) ? tal : 0
}

function begræns(værdi, min, max) {
  return Math.max(min, Math.min(max, værdi))
}

// Finder ud af, hvor forklaringsboksen skal ligge i forhold til det fremhævede område
function placér(lys, kortB, kortH, vb, vh) {
  if (!lys) {
    return { type: 'midt', left: (vb - kortB) / 2, top: Math.max(KANT, (vh - kortH) / 2) }
  }
  const cx = lys.left + lys.width / 2
  const cy = lys.top + lys.height / 2
  const under = vh - (lys.top + lys.height) - AFSTAND - KANT
  const over = lys.top - AFSTAND - KANT
  const højre = vb - (lys.left + lys.width) - AFSTAND - KANT
  const venstre = lys.left - AFSTAND - KANT

  const vandret = () => begræns(cx - kortB / 2, KANT, vb - kortB - KANT)
  const lodret = () => begræns(cy - kortH / 2, KANT, vh - kortH - KANT)

  if (under >= kortH) {
    const left = vandret()
    return { type: 'under', left, top: lys.top + lys.height + AFSTAND, pil: begræns(cx - left, PIL, kortB - PIL) }
  }
  if (over >= kortH) {
    const left = vandret()
    return { type: 'over', left, top: lys.top - AFSTAND - kortH, pil: begræns(cx - left, PIL, kortB - PIL) }
  }
  if (højre >= kortB) {
    const top = lodret()
    return { type: 'højre', left: lys.left + lys.width + AFSTAND, top, pil: begræns(cy - top, PIL, kortH - PIL) }
  }
  if (venstre >= kortB) {
    const top = lodret()
    return { type: 'venstre', left: lys.left - AFSTAND - kortB, top, pil: begræns(cy - top, PIL, kortH - PIL) }
  }
  // Der er ikke plads ved siden af: læg boksen, hvor der er mest plads, og lad den dække lidt
  const nederst = under >= over
  return {
    type: 'dækker',
    left: vandret(),
    top: nederst ? vh - kortH - KANT : KANT,
  }
}

export default function Rundvisning({ trin, visning, optaget, onNæste, onTilbage, onLuk }) {
  const [lys, setLys] = useState(null)
  const [kortH, setKortH] = useState(260)
  const [vindue, setVindue] = useState(() => ({ b: window.innerWidth, h: window.innerHeight }))
  const kortRef = useRef(null)
  const næsteRef = useRef(null)

  const mål = trin?.mål ?? null
  const klar = !!trin && !optaget

  // Følg det fremhævede element, så lyset også følger med ved scroll, skærmdrejning og vinduer, der glider ind
  useEffect(() => {
    if (!klar || !mål) return undefined
    let ramme
    let sidst = null
    let sidstEl = null
    let sidstRadius = 0
    const tik = () => {
      const el = find(mål)
      if (el && harStørrelse(el)) {
        const r = el.getBoundingClientRect()
        if (el !== sidstEl) { sidstEl = el; sidstRadius = læsRadius(el, r.width, r.height) }
        if (!sidst || Math.abs(sidst.left - r.left) > 0.5 || Math.abs(sidst.top - r.top) > 0.5
          || Math.abs(sidst.width - r.width) > 0.5 || Math.abs(sidst.height - r.height) > 0.5) {
          sidst = { left: r.left, top: r.top, width: r.width, height: r.height, radius: sidstRadius }
          setLys(sidst)
        }
      }
      setVindue((v) => (v.b === window.innerWidth && v.h === window.innerHeight ? v : { b: window.innerWidth, h: window.innerHeight }))
      ramme = requestAnimationFrame(tik)
    }
    ramme = requestAnimationFrame(tik)
    return () => cancelAnimationFrame(ramme)
  }, [klar, mål])

  // Mål boksens højde, så den kan placeres rigtigt
  useEffect(() => {
    const kort = kortRef.current
    if (!kort || typeof ResizeObserver === 'undefined') return undefined
    const iagttager = new ResizeObserver(() => setKortH(kort.offsetHeight))
    iagttager.observe(kort)
    return () => iagttager.disconnect()
  }, [klar, trin])

  // Sæt fokus på "Næste" ved hvert trin, så Enter og skærmlæser virker
  useEffect(() => {
    if (klar) næsteRef.current?.focus({ preventScroll: true })
  }, [klar, trin])

  // Tastatur: pile, Enter og Escape. Tab bliver inde i boksen.
  useEffect(() => {
    function påTast(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onLuk()
        return
      }
      if (!klar) return
      const kort = kortRef.current
      const fokusIKort = kort && kort.contains(document.activeElement)
      if (e.key === 'ArrowRight') { e.preventDefault(); onNæste() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); onTilbage() }
      else if (e.key === 'Enter' && !fokusIKort) { e.preventDefault(); onNæste() }
      else if (e.key === 'Tab' && kort) {
        const knapper = [...kort.querySelectorAll('button:not([disabled])')]
        if (!knapper.length) return
        const først = knapper[0]
        const sidst = knapper[knapper.length - 1]
        if (!fokusIKort) { e.preventDefault(); først.focus() }
        else if (e.shiftKey && document.activeElement === først) { e.preventDefault(); sidst.focus() }
        else if (!e.shiftKey && document.activeElement === sidst) { e.preventDefault(); først.focus() }
      }
    }
    window.addEventListener('keydown', påTast, true)
    return () => window.removeEventListener('keydown', påTast, true)
  }, [klar, onNæste, onTilbage, onLuk])

  const kortB = Math.min(380, vindue.b - 2 * KANT)
  const synligtLys = klar && mål && lys
    ? { left: lys.left - PAD, top: lys.top - PAD, width: lys.width + 2 * PAD, height: lys.height + 2 * PAD, radius: Math.min(lys.radius + PAD, 28) }
    : null
  const plads = klar ? placér(synligtLys, kortB, kortH, vindue.b, vindue.h) : null
  const visPil = plads && ['under', 'over', 'højre', 'venstre'].includes(plads.type)

  const første = visning?.indeks === 0
  const sidste = !!visning?.erSidste
  const andel = visning ? Math.round((visning.position / visning.total) * 100) : 0

  return createPortal(
    <div style={s.rod}>
      <style>{css}</style>

      {/* Blokerer alle tryk og rul på siden bagved. Dæmper hele skærmen, når intet er fremhævet. */}
      <div style={{ ...s.blok, background: synligtLys ? 'transparent' : DÆMP }} aria-hidden="true" />

      {synligtLys && (
        <div
          className="rv-lys"
          aria-hidden="true"
          style={{
            ...s.lys,
            left: synligtLys.left,
            top: synligtLys.top,
            width: synligtLys.width,
            height: synligtLys.height,
            borderRadius: synligtLys.radius,
          }}
        />
      )}

      {optaget && (
        <div className="rv-vent" role="status" style={s.vent}>Et øjeblik …</div>
      )}

      {klar && plads && (
        <div
          key={visning.indeks}
          ref={kortRef}
          className="rv-kort"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rv-titel"
          aria-describedby="rv-tekst"
          style={{ ...s.kort, width: kortB, left: plads.left, top: plads.top }}
        >
          {visPil && <div style={pilStil(plads)} aria-hidden="true" />}

          <div style={s.øverst}>
            <span style={s.kapitel}>{trin.kapitel}</span>
            <span style={s.trinTæller}>Trin {visning.position} af {visning.total}</span>
          </div>

          <div aria-live="polite">
            <h2 id="rv-titel" style={s.titel}>{trin.titel}</h2>
            <p id="rv-tekst" style={s.tekst}>{trin.tekst}</p>
          </div>

          <div style={s.bjælke} aria-hidden="true">
            <div style={{ ...s.bjælkeFyld, width: `${andel}%` }} />
          </div>

          <div style={s.knapper}>
            {!første && (
              <button type="button" style={s.sekundær} onClick={onTilbage}>Tilbage</button>
            )}
            <button ref={næsteRef} type="button" style={s.primær} onClick={onNæste}>
              {sidste ? 'Færdig' : 'Næste'}
            </button>
          </div>

          {!sidste && (
            <button type="button" style={s.spring} onClick={onLuk}>Spring over</button>
          )}
        </div>
      )}
    </div>,
    document.body,
  )
}

function pilStil(plads) {
  const kant = `3px solid ${colors.green}`
  const grund = {
    position: 'absolute',
    width: PIL,
    height: PIL,
    background: colors.card,
    transform: 'rotate(45deg)',
  }
  switch (plads.type) {
    case 'under':
      return { ...grund, top: -PIL / 2, left: plads.pil - PIL / 2, borderTop: kant, borderLeft: kant }
    case 'over':
      return { ...grund, bottom: -PIL / 2, left: plads.pil - PIL / 2, borderBottom: kant, borderRight: kant }
    case 'højre':
      return { ...grund, left: -PIL / 2, top: plads.pil - PIL / 2, borderLeft: kant, borderBottom: kant }
    default:
      return { ...grund, right: -PIL / 2, top: plads.pil - PIL / 2, borderTop: kant, borderRight: kant }
  }
}

const css = `
  .rv-lys {
    box-shadow:
      0 0 0 3px rgba(255,255,255,0.95),
      0 0 0 6px ${colors.green},
      0 0 22px 8px rgba(47,107,79,0.55),
      0 0 0 100vmax ${DÆMP};
    transition: left .25s ease, top .25s ease, width .25s ease, height .25s ease, border-radius .25s ease;
    animation: rv-puls 1.8s ease-in-out infinite;
  }
  .rv-kort { animation: rv-ind .22s ease-out both; }
  .rv-vent { animation: rv-ind .2s ease-out .5s both; }
  .rv-kort button:focus-visible {
    outline: 3px solid ${colors.terracotta};
    outline-offset: 3px;
  }
  @keyframes rv-puls {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.18); }
  }
  @keyframes rv-ind {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .rv-lys { animation: none; transition: none; }
    .rv-kort, .rv-vent { animation: none; }
  }
`

const s = {
  rod: { position: 'fixed', inset: 0, zIndex: 3000, fontFamily: font.body },
  blok: { position: 'fixed', inset: 0, touchAction: 'none', overscrollBehavior: 'contain' },
  lys: { position: 'fixed', pointerEvents: 'none' },
  vent: {
    position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
    background: colors.card, color: colors.text, fontWeight: 700, fontSize: 17,
    padding: '14px 22px', borderRadius: radius.pill,
  },
  kort: {
    position: 'fixed',
    boxSizing: 'border-box',
    background: colors.card,
    borderRadius: radius.card,
    boxShadow: '0 18px 48px rgba(0,0,0,0.35)',
    padding: '18px 20px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxHeight: 'calc(100vh - 24px)',
    overflowY: 'auto',
  },
  øverst: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  kapitel: { fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: colors.green },
  trinTæller: { fontSize: 14, fontWeight: 700, color: '#5E5E57', whiteSpace: 'nowrap' },
  titel: { fontFamily: font.display, fontWeight: 600, fontSize: 23, lineHeight: 1.2, letterSpacing: -0.3, color: colors.text, margin: '2px 0 6px' },
  tekst: { fontSize: 17, lineHeight: 1.5, color: colors.text, margin: 0 },
  bjælke: { height: 6, borderRadius: 999, background: colors.border, overflow: 'hidden', margin: '4px 0 2px' },
  bjælkeFyld: { height: '100%', background: colors.green, borderRadius: 999, transition: 'width .25s ease' },
  knapper: { display: 'flex', gap: 10, marginTop: 6 },
  primær: {
    flex: 1, minHeight: 52, fontFamily: font.body, fontWeight: 800, fontSize: 18,
    color: '#fff', background: colors.green, border: 'none', borderRadius: radius.button, cursor: 'pointer',
  },
  sekundær: {
    minHeight: 52, padding: '0 20px', fontFamily: font.body, fontWeight: 700, fontSize: 17,
    color: colors.green, background: 'rgba(47,107,79,0.10)', border: 'none', borderRadius: radius.button, cursor: 'pointer',
  },
  spring: {
    minHeight: 44, background: 'none', border: 'none', fontFamily: font.body, fontWeight: 700,
    fontSize: 16, color: '#5E5E57', textDecoration: 'underline', cursor: 'pointer',
  },
}
