import { useState, useEffect, useRef } from 'react'
import { Plus, Play, Pause, RotateCcw, X, BellRing } from 'lucide-react'
import { colors, shadow, radius, font } from '../data/theme'

function mmss(sek) {
  const m = Math.floor(sek / 60)
  const s = sek % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Kort bip + vibration når en timer er færdig
function alarm() {
  try { navigator.vibrate?.([300, 150, 300, 150, 300]) } catch { /* ignorer */ }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    const ctx = new Ctx()
    ;[0, 0.35, 0.7].forEach((t0) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 880
      gain.gain.value = 0.15
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + t0)
      osc.stop(ctx.currentTime + t0 + 0.2)
    })
    setTimeout(() => ctx.close(), 1500)
  } catch { /* ingen lyd tilgængelig */ }
}

// Flere navngivne nedtællings-timere. Nye timere starter ikke af sig selv.
export default function KøkkenTimere() {
  const [timere, setTimere] = useState([])
  const [åben, setÅben] = useState(false)
  const [navn, setNavn] = useState('')
  const [min, setMin] = useState('')
  const [sek, setSek] = useState('')
  const nextId = useRef(1)

  // Én fælles tick-løkke så længe mindst én timer kører
  const kørerNogen = timere.some((t) => t.kører)
  useEffect(() => {
    if (!kørerNogen) return
    const iv = setInterval(() => {
      setTimere((prev) => prev.map((t) => {
        if (!t.kører) return t
        const rest = t.rest - 1
        if (rest <= 0) { alarm(); return { ...t, rest: 0, kører: false, færdig: true } }
        return { ...t, rest }
      }))
    }, 1000)
    return () => clearInterval(iv)
  }, [kørerNogen])

  function tilføj(e) {
    e.preventDefault()
    const total = (parseInt(min, 10) || 0) * 60 + (parseInt(sek, 10) || 0)
    if (total <= 0) return
    setTimere((prev) => [...prev, {
      id: nextId.current++,
      navn: navn.trim() || `Timer ${nextId.current - 1}`,
      total, rest: total, kører: false, færdig: false,
    }])
    setNavn(''); setMin(''); setSek(''); setÅben(false)
  }

  const opdater = (id, patch) => setTimere((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  const fjern = (id) => setTimere((prev) => prev.filter((t) => t.id !== id))

  return (
    <div style={s.wrap} data-tour="kok-timere">
      {timere.map((t) => (
        <div key={t.id} style={{ ...s.række, ...(t.færdig ? s.rækkeFærdig : null) }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={s.navn}>{t.navn}</p>
            <p style={{ ...s.tid, color: t.færdig ? colors.red : colors.text }}>
              {t.færdig ? <span style={s.færdigTekst}><BellRing size={16} /> Færdig!</span> : mmss(t.rest)}
            </p>
          </div>
          {t.kører
            ? <button style={s.ikonKnap} onClick={() => opdater(t.id, { kører: false })} aria-label="Pause timer"><Pause size={18} /></button>
            : <button style={{ ...s.ikonKnap, ...s.startKnap }} onClick={() => opdater(t.id, { kører: true, færdig: false, rest: t.rest > 0 ? t.rest : t.total })} aria-label="Start timer"><Play size={18} /></button>}
          <button style={s.ikonKnap} onClick={() => opdater(t.id, { rest: t.total, kører: false, færdig: false })} aria-label="Nulstil timer"><RotateCcw size={17} /></button>
          <button style={s.ikonKnap} onClick={() => fjern(t.id)} aria-label="Fjern timer"><X size={17} /></button>
        </div>
      ))}

      {åben ? (
        <form style={s.form} onSubmit={tilføj}>
          <input style={s.input} value={navn} onChange={(e) => setNavn(e.target.value)} placeholder="Navn, fx Kartofler" maxLength={30} autoFocus />
          <div style={s.tidRække}>
            <input style={{ ...s.input, width: 70 }} type="number" inputMode="numeric" min="0" value={min} onChange={(e) => setMin(e.target.value)} placeholder="min" />
            <input style={{ ...s.input, width: 70 }} type="number" inputMode="numeric" min="0" max="59" value={sek} onChange={(e) => setSek(e.target.value)} placeholder="sek" />
            <button type="submit" style={s.opretKnap}>Opret</button>
            <button type="button" style={s.annullerKnap} onClick={() => setÅben(false)}>Annullér</button>
          </div>
        </form>
      ) : (
        <button style={s.tilføjKnap} onClick={() => setÅben(true)}>
          <Plus size={16} /> Tilføj timer
        </button>
      )}
    </div>
  )
}

const s = {
  wrap: { margin: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 },
  række: { display: 'flex', alignItems: 'center', gap: 8, background: colors.card, borderRadius: 14, boxShadow: shadow.card, padding: '10px 12px' },
  rækkeFærdig: { border: `1.5px solid ${colors.red}` },
  navn: { fontFamily: font.body, fontSize: 12.5, fontWeight: 700, color: colors.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  tid: { fontFamily: font.display, fontWeight: 600, fontSize: 24, margin: '2px 0 0', letterSpacing: 0.5 },
  færdigTekst: { display: 'inline-flex', alignItems: 'center', gap: 6 },
  ikonKnap: { width: 36, height: 36, borderRadius: 999, border: 'none', background: colors.bg, color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  startKnap: { background: colors.green, color: '#fff' },
  tilføjKnap: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: font.body, fontSize: 13.5, fontWeight: 700, color: colors.green, background: 'rgba(47,107,79,0.10)', border: 'none', borderRadius: radius.button, padding: '11px 0', cursor: 'pointer' },
  form: { background: colors.card, borderRadius: 14, boxShadow: shadow.card, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  tidRække: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  input: { fontFamily: font.body, fontSize: 15, color: colors.text, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '9px 11px', outline: 'none', boxSizing: 'border-box' },
  opretKnap: { fontFamily: font.body, fontSize: 13.5, fontWeight: 700, color: '#fff', background: colors.green, border: 'none', borderRadius: 999, padding: '9px 16px', cursor: 'pointer' },
  annullerKnap: { fontFamily: font.body, fontSize: 13.5, fontWeight: 600, color: colors.muted, background: 'none', border: 'none', padding: '9px 6px', cursor: 'pointer' },
}
