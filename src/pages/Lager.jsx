import { useState, useEffect, useRef } from 'react'
import {
  hentLager, gemLager, sletFraLager, opdaterUdløb,
  KATEGORIER, INGREDIENS_KATALOG, ENHEDER,
} from '../data/lager'
import { colors, shadow, radius, font } from '../data/theme'

// ── Udløbs-hjælper ────────────────────────────────────────────────────────────
function udløbsInfo(udløbDato) {
  if (!udløbDato) return null
  const i_dag = new Date(); i_dag.setHours(0,0,0,0)
  const udløb = new Date(udløbDato); udløb.setHours(0,0,0,0)
  const dage = Math.round((udløb - i_dag) / 86400000)
  if (dage < 0)  return { tekst: 'Udløbet',          farve: colors.red,        kritisk: true }
  if (dage === 0) return { tekst: 'Udløber i dag',    farve: colors.red,        kritisk: true }
  if (dage === 1) return { tekst: 'Udløber i morgen', farve: colors.red,        kritisk: true }
  if (dage <= 5)  return { tekst: `om ${dage} dage`,  farve: colors.terracotta, kritisk: false }
  return null
}

const KATEGORI_LABELS = {
  køl:       'Køl',
  grønt:     'Grønt & Frugt',
  tørvarer:  'Tørvarer & Konserves',
  frys:      'Frys',
  krydderier:'Krydderier',
}

export default function Lager() {
  const [lager, setLager]           = useState(hentLager)
  const [aktiv, setAktiv]           = useState('råvarer')
  const [tilføjOpen, setTilføjOpen] = useState(false)
  const [udløbEdit, setUdløbEdit]   = useState(null) // { id }

  // Opdatér state + localStorage
  function opdater(nyListe) { setLager(nyListe); gemLager(nyListe) }

  function slet(id)           { opdater(sletFraLager(id)) }
  function sætUdløb(id, dato) { setUdløbEdit(null); opdater(opdaterUdløb(id, dato)) }

  function tilføj(vare) {
    const ny = [{ ...vare, id: Date.now() }, ...lager]
    opdater(ny)
    setTilføjOpen(false)
  }

  // Grupper lager per kategori
  const grupper = KATEGORIER
    .map((k) => ({ ...k, varer: lager.filter((v) => v.kategori === k.id) }))
    .filter((g) => g.varer.length > 0)

  // Tæl kritiske varer
  const snartUdløb = lager.filter((v) => {
    const info = udløbsInfo(v.udløb)
    return info?.kritisk
  }).length

  const udløberSnart = lager.filter((v) => {
    const info = udløbsInfo(v.udløb)
    return info !== null
  }).length

  return (
    <div style={s.page}>

      {/* Header */}
      <div style={s.header}>
        <h1 style={s.titel}>Lager</h1>
        <button style={s.tilføjBtn} onClick={() => setTilføjOpen(true)}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Tilføj
        </button>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        <button style={{ ...s.tab, ...(aktiv === 'råvarer' ? s.tabAktiv : {}) }}
          onClick={() => setAktiv('råvarer')}>Råvarer</button>
        <button style={{ ...s.tab, ...(aktiv === 'villave' ? s.tabAktiv : {}) }}
          onClick={() => setAktiv('villave')}>Vil lave</button>
      </div>

      {aktiv === 'råvarer' && (
        <>
          {/* Udløbs-advarsel */}
          {udløberSnart > 0 && (
            <div style={s.advarsel}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <span style={s.advarselTekst}>
                {udløberSnart} {udløberSnart === 1 ? 'vare udløber' : 'varer udløber'} snart.{' '}
                <span style={s.advarselLink}>Se retter der bruger dem →</span>
              </span>
            </div>
          )}

          {/* Varer per kategori */}
          {grupper.map((g) => (
            <div key={g.id} style={s.gruppe}>
              <p style={s.gruppeLabel}>{g.label.toUpperCase()}</p>
              <div style={s.kortBoks}>
                {g.varer.map((v, i) => {
                  const info = udløbsInfo(v.udløb)
                  const harUdløb = !!v.udløb
                  const erSidst = i === g.varer.length - 1
                  return (
                    <div key={v.id}>
                      <div style={s.vareRække}
                        onContextMenu={(e) => { e.preventDefault(); slet(v.id) }}>
                        {/* Thumbnail */}
                        <div style={s.thumb}>{v.emoji}</div>

                        {/* Navn + sub-labels */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={s.vareNavn}>{v.navn}</div>

                          {/* Udløbs-badge */}
                          {info && (
                            <span style={{ ...s.badge, background: info.kritisk ? '#FDECEA' : '#FEF3EC', color: info.farve }}>
                              {info.tekst}
                            </span>
                          )}

                          {/* Snart-tom badge */}
                          {v.snartTom && !info && (
                            <span style={s.snartTomBadge}>Snart tom</span>
                          )}

                          {/* Ingen udløbsdato */}
                          {!harUdløb && !v.snartTom && (
                            <button style={s.udløbReminder}
                              onClick={() => setUdløbEdit(v.id)}>
                              Udløbsdato ikke registreret · <span style={{ color: colors.green }}>Registrér</span>
                            </button>
                          )}
                        </div>

                        {/* Mængde */}
                        <span style={s.mængde}>
                          {v.mængde ? `${v.mængde} ${v.enhed}` : v.enhed}
                        </span>
                      </div>

                      {/* Divider — ikke efter sidste */}
                      {!erSidst && <div style={s.divider} />}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {lager.length === 0 && (
            <div style={s.tom}>
              <span style={{ fontSize: 40 }}>🧺</span>
              <p style={s.tomTekst}>Dit lager er tomt.<br />Tryk "+ Tilføj" for at komme i gang.</p>
            </div>
          )}
        </>
      )}

      {aktiv === 'villave' && (
        <div style={s.tom}>
          <span style={{ fontSize: 40 }}>🍳</span>
          <p style={s.tomTekst}>Her vises retter du kan lave med dit lager.<br />Aktiver "Matcher mit lager" i Mad-match.</p>
        </div>
      )}

      {/* Tilføj-sheet */}
      {tilføjOpen && (
        <TilføjSheet onTilføj={tilføj} onLuk={() => setTilføjOpen(false)} />
      )}

      {/* Inline udløbsdato-editor */}
      {udløbEdit && (
        <UdløbDialog
          id={udløbEdit}
          navn={lager.find(v => v.id === udløbEdit)?.navn}
          onGem={sætUdløb}
          onLuk={() => setUdløbEdit(null)}
        />
      )}
    </div>
  )
}

// ── Tilføj-sheet ─────────────────────────────────────────────────────────────

function TilføjSheet({ onTilføj, onLuk }) {
  const [søgning, setSøgning]     = useState('')
  const [valgt, setValgt]         = useState(null)   // { navn, emoji, kategori, standardEnhed }
  const [mængde, setMængde]       = useState('')
  const [enhed, setEnhed]         = useState('stk')
  const [udløb, setUdløb]         = useState('')
  const søgeRef = useRef(null)

  useEffect(() => { søgeRef.current?.focus() }, [])

  // Filtrer katalog
  const resultater = søgning.trim().length === 0
    ? INGREDIENS_KATALOG.slice(0, 30)
    : INGREDIENS_KATALOG.filter((v) =>
        v.navn.toLowerCase().includes(søgning.toLowerCase())
      ).slice(0, 20)

  function vælgIngrediens(item) {
    setValgt(item)
    setEnhed(item.standardEnhed)
    setSøgning(item.navn)
  }

  function håndterTilføj() {
    if (!valgt) return
    onTilføj({
      navn:     valgt.navn,
      emoji:    valgt.emoji,
      kategori: valgt.kategori,
      mængde:   mængde.trim(),
      enhed:    enhed,
      udløb:    udløb || null,
      snartTom: false,
    })
  }

  return (
    <div style={s.overlay} onClick={onLuk}>
      <div style={s.sheet} onClick={(e) => e.stopPropagation()}>

        {/* Greb */}
        <div style={s.greb} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={s.sheetTitel}>Tilføj råvare</h2>
          <button style={s.lukBtn} onClick={onLuk}>✕</button>
        </div>

        {/* Søgefelt */}
        <div style={s.søgeWrap}>
          <span style={s.søgeIkon}>🔍</span>
          <input
            ref={søgeRef}
            value={søgning}
            onChange={(e) => { setSøgning(e.target.value); setValgt(null) }}
            placeholder="Søg ingrediens, fx. Løg…"
            style={s.søgeInput}
          />
          {søgning && (
            <button style={s.søgeRyd} onClick={() => { setSøgning(''); setValgt(null) }}>✕</button>
          )}
        </div>

        {/* Søgeresultater — kun hvis ikke valgt */}
        {!valgt && (
          <div style={s.resultaterListe}>
            {resultater.length === 0 ? (
              <div style={s.ingenResultater}>
                Ingen ingredienser fundet —{' '}
                <button style={s.manueltLink}
                  onClick={() => setValgt({ navn: søgning.trim(), emoji: '🥄', kategori: 'tørvarer', standardEnhed: 'stk' })}>
                  tilføj manuelt
                </button>
              </div>
            ) : (
              resultater.map((item, i) => (
                <button key={i} style={s.resultatItem} onClick={() => vælgIngrediens(item)}>
                  <span style={{ fontSize: 22, width: 30, textAlign: 'center' }}>{item.emoji}</span>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <p style={s.resultatNavn}>{fremhæv(item.navn, søgning)}</p>
                    <p style={s.resultatKategori}>{KATEGORI_LABELS[item.kategori]}</p>
                  </div>
                  <span style={{ color: colors.mutedLight, fontSize: 18 }}>›</span>
                </button>
              ))
            )}
          </div>
        )}

        {/* Detalje-formular — når ingrediens er valgt */}
        {valgt && (
          <div style={s.detaljeFormular}>
            <div style={s.valgtHeader}>
              <span style={{ fontSize: 28 }}>{valgt.emoji}</span>
              <div>
                <p style={s.valgtNavn}>{valgt.navn}</p>
                <p style={s.valgtKategori}>{KATEGORI_LABELS[valgt.kategori]}</p>
              </div>
              <button style={s.skiftBtn} onClick={() => setValgt(null)}>Skift</button>
            </div>

            {/* Mængde + enhed */}
            <label style={s.feltLabel}>Mængde</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="number"
                inputMode="decimal"
                value={mængde}
                onChange={(e) => setMængde(e.target.value)}
                placeholder="fx. 400"
                style={{ ...s.input, flex: 1 }}
                autoFocus
              />
              <select
                value={enhed}
                onChange={(e) => setEnhed(e.target.value)}
                style={s.enhedSelect}
              >
                {ENHEDER.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            {/* Udløbsdato */}
            <label style={s.feltLabel}>
              Udløbsdato <span style={{ color: colors.mutedLight, fontWeight: 400 }}>(valgfrit)</span>
            </label>
            <input
              type="date"
              value={udløb}
              onChange={(e) => setUdløb(e.target.value)}
              min={new Date().toISOString().slice(0,10)}
              style={s.input}
            />

            <button
              style={{ ...s.primærBtn, opacity: valgt ? 1 : 0.5 }}
              onClick={håndterTilføj}
            >
              Tilføj til lager
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Udløbsdato-dialog ─────────────────────────────────────────────────────────

function UdløbDialog({ id, navn, onGem, onLuk }) {
  const [dato, setDato] = useState('')

  return (
    <div style={s.overlay} onClick={onLuk}>
      <div style={{ ...s.sheet, paddingBottom: 32 }} onClick={(e) => e.stopPropagation()}>
        <div style={s.greb} />
        <h2 style={s.sheetTitel}>Registrér udløbsdato</h2>
        <p style={{ fontFamily: font.body, fontSize: 14, color: colors.muted, margin: '0 0 20px' }}>
          {navn}
        </p>
        <input
          type="date"
          value={dato}
          onChange={(e) => setDato(e.target.value)}
          min={new Date().toISOString().slice(0,10)}
          style={s.input}
          autoFocus
        />
        <button style={{ ...s.primærBtn, marginTop: 12 }} onClick={() => dato && onGem(id, dato)}>
          Gem dato
        </button>
        <button style={s.ghostBtn} onClick={onLuk}>Annullér</button>
      </div>
    </div>
  )
}

// ── Fremhæv søgeord i tekst ───────────────────────────────────────────────────

function fremhæv(tekst, søgning) {
  if (!søgning.trim()) return tekst
  const regex = new RegExp(`(${søgning.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const dele = tekst.split(regex)
  return (
    <span>
      {dele.map((del, i) =>
        regex.test(del)
          ? <mark key={i} style={{ background: 'rgba(47,107,79,0.15)', color: colors.green, fontWeight: 700, borderRadius: 3 }}>{del}</mark>
          : del
      )}
    </span>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page: { maxWidth: 480, margin: '0 auto', padding: '0 0 120px', minHeight: '100%' },

  // Header
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '28px 20px 12px' },
  titel: { fontFamily: font.display, fontWeight: 800, fontSize: 32, color: colors.text, margin: 0, letterSpacing: -0.5 },
  tilføjBtn: { display: 'flex', alignItems: 'center', gap: 6, fontFamily: font.body, fontWeight: 700, fontSize: 14.5, color: '#fff', background: colors.green, border: 'none', borderRadius: 999, padding: '10px 18px', boxShadow: shadow.fab },

  // Tabs
  tabs: { display: 'flex', gap: 8, padding: '0 20px 16px' },
  tab: { fontFamily: font.body, fontWeight: 700, fontSize: 14, color: colors.muted, background: colors.card, border: `1.5px solid ${colors.border}`, borderRadius: 999, padding: '9px 20px' },
  tabAktiv: { color: '#fff', background: colors.green, border: `1.5px solid ${colors.green}` },

  // Advarsel
  advarsel: { display: 'flex', alignItems: 'flex-start', gap: 10, margin: '0 16px 14px', background: '#FEF3EC', border: '1px solid #F5C9A7', borderRadius: 14, padding: '12px 14px' },
  advarselTekst: { fontFamily: font.body, fontSize: 13.5, color: colors.terracotta, lineHeight: 1.45, fontWeight: 600 },
  advarselLink: { textDecoration: 'underline', cursor: 'pointer' },

  // Grupper
  gruppe: { marginBottom: 8 },
  gruppeLabel: { fontFamily: font.body, fontWeight: 800, fontSize: 11.5, color: colors.mutedLight, letterSpacing: 1, margin: '0 0 8px', padding: '0 20px' },
  kortBoks: { background: colors.card, borderRadius: radius.card, boxShadow: shadow.card, margin: '0 16px', overflow: 'hidden' },

  // Vare-række
  vareRække: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px' },
  thumb: { width: 40, height: 40, borderRadius: 12, background: colors.bg, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 },
  vareNavn: { fontFamily: font.body, fontWeight: 700, fontSize: 15, color: colors.text, lineHeight: 1.2 },
  mængde: { fontFamily: font.body, fontWeight: 600, fontSize: 14, color: colors.muted, flexShrink: 0 },
  divider: { height: 1, background: colors.border, margin: '0 16px' },

  // Badges
  badge: { display: 'inline-block', fontFamily: font.body, fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 999, marginTop: 4 },
  snartTomBadge: { display: 'inline-block', fontFamily: font.body, fontSize: 12, fontWeight: 700, color: colors.terracotta, background: '#FEF3EC', padding: '3px 9px', borderRadius: 999, marginTop: 4 },
  udløbReminder: { display: 'block', background: 'none', border: 'none', padding: 0, marginTop: 4, fontFamily: font.body, fontSize: 11.5, color: colors.mutedLight, cursor: 'pointer', textAlign: 'left' },

  // Tom
  tom: { textAlign: 'center', padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  tomTekst: { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: 0, lineHeight: 1.6 },

  // Sheet overlay
  overlay: { position: 'fixed', inset: 0, background: 'rgba(31,36,33,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 },
  sheet: { background: colors.card, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, padding: '12px 20px 40px', maxHeight: '88vh', overflowY: 'auto' },
  greb: { width: 40, height: 4, background: colors.border, borderRadius: 999, margin: '0 auto 20px' },
  sheetTitel: { fontFamily: font.display, fontWeight: 800, fontSize: 22, color: colors.text, margin: 0 },
  lukBtn: { width: 32, height: 32, borderRadius: 999, background: colors.bg, border: 'none', fontSize: 14, color: colors.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' },

  // Søgefelt
  søgeWrap: { position: 'relative', marginBottom: 12 },
  søgeIkon: { position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' },
  søgeInput: { width: '100%', padding: '13px 42px 13px 42px', fontFamily: font.body, fontSize: 15, color: colors.text, background: colors.bg, border: `1.5px solid ${colors.border}`, borderRadius: 14, outline: 'none', boxSizing: 'border-box' },
  søgeRyd: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 14, color: colors.mutedLight, padding: 4 },

  // Resultatliste
  resultaterListe: { maxHeight: 340, overflowY: 'auto', marginBottom: 8 },
  resultatItem: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', borderBottom: `1px solid ${colors.border}`, padding: '12px 4px', textAlign: 'left' },
  resultatNavn: { fontFamily: font.body, fontWeight: 700, fontSize: 15, color: colors.text, margin: 0 },
  resultatKategori: { fontFamily: font.body, fontSize: 12.5, color: colors.mutedLight, margin: '2px 0 0' },
  ingenResultater: { fontFamily: font.body, fontSize: 14, color: colors.muted, padding: '16px 4px' },
  manueltLink: { background: 'none', border: 'none', color: colors.green, fontWeight: 700, fontFamily: font.body, fontSize: 14, textDecoration: 'underline', padding: 0, cursor: 'pointer' },

  // Valgt ingrediens
  detaljeFormular: { paddingTop: 8 },
  valgtHeader: { display: 'flex', alignItems: 'center', gap: 12, background: colors.bg, borderRadius: 14, padding: '12px 14px', marginBottom: 18 },
  valgtNavn: { fontFamily: font.body, fontWeight: 700, fontSize: 16, color: colors.text, margin: 0 },
  valgtKategori: { fontFamily: font.body, fontSize: 12.5, color: colors.mutedLight, margin: '2px 0 0' },
  skiftBtn: { marginLeft: 'auto', fontFamily: font.body, fontSize: 13, fontWeight: 700, color: colors.green, background: 'none', border: 'none', padding: 0 },

  // Formular-felter
  feltLabel: { display: 'block', fontFamily: font.body, fontSize: 12.5, fontWeight: 700, color: colors.mutedLight, margin: '0 0 7px', letterSpacing: 0.3 },
  input: { width: '100%', padding: '12px 14px', fontFamily: font.body, fontSize: 15, color: colors.text, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 14 },
  enhedSelect: { padding: '12px 10px', fontFamily: font.body, fontSize: 15, color: colors.text, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, outline: 'none', flexShrink: 0, marginBottom: 14 },
  primærBtn: { width: '100%', padding: '14px', fontFamily: font.body, fontWeight: 700, fontSize: 15, color: '#fff', background: colors.green, border: 'none', borderRadius: radius.button, marginTop: 4 },
  ghostBtn: { width: '100%', padding: '13px', fontFamily: font.body, fontWeight: 700, fontSize: 15, color: colors.muted, background: 'transparent', border: 'none', borderRadius: radius.button, marginTop: 8 },
}
