import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  hentLager, gemLager, sletFraLager, opdaterUdløb, opdaterVare,
  KATEGORIER, INGREDIENS_KATALOG, ENHEDER,
} from '../data/lager'
import { supabase } from '../lib/supabase'
import { colors, shadow, radius, font } from '../data/theme'

// Module-level cache — survives re-renders, re-fetches only on hard reload
let _katalogCache = null

function gætKategori(navn) {
  const n = navn.toLowerCase()
  if (/oregano|timian|rosmarin|kanel|paprika|gurkemeje|spidskommen|karry|chiliflager|chilipulver|stødt peber|salt\b|stjerneanis|muskatnød|vaniljesukker|bagepulver|natron|laurbær|nelliker|allehånde|cayenne|hvidløgspulver|fennikelfrø|kardamom|sambal|ras el hanout|garam masala|sichuan|tørret|stødt|pulver|urter|krydderi/.test(n)) return 'krydderier'
  if (/frosn|frossen/.test(n)) return 'frys'
  if (/mælk|fløde|smør|æg|ost|yoghurt|skyr|ricotta|cream cheese|crème fraîche|creme fraiche|mascarpone|kefir|kvark|brie|gedeost|hytteost|flødeos|danbo|cheddar|mozzarella|parmesan|feta/.test(n)) return 'køl'
  if (/kylling|oksekød|svinekød|hakket kød|laks|tun\b|rejer|flæsk\b|bacon|skinke|pølse|lever\b|and\b|lam\b|kalv|kotelet|nakkefilet|mørbrønd|bøf|torsk|sild\b|fisk\b/.test(n)) return 'køl'
  if (/løg|gulerod|tomat|broccoli|blomkål|spinat|agurk|peberfrugt|kartoffel|søde kartofler|avocado|squash|svampe|champignon|aubergine|selleri|fennikel|asparges|porrer|purre|spidskål|grønkål|hvidkål|rødkål|ærter\b|majs|ingefær|citron|lime|appelsin|banan|æble|pære|mango|ananas|jordbær|hindbær|blåbær|tranebær|rabarber|koriander|basilikum|persille|dild|mynte|ramsløg|rucola|salat\b/.test(n)) return 'grønt'
  return 'tørvarer'
}

function gætEmoji(navn) {
  const n = navn.toLowerCase()
  if (/kylling|høne/.test(n)) return '🍗'
  if (/oksekød|hakket kød|bøf|tartar/.test(n)) return '🥩'
  if (/laks|torsk|fisk|tun\b/.test(n)) return '🐟'
  if (/rejer/.test(n)) return '🦐'
  if (/æg/.test(n)) return '🥚'
  if (/mælk|fløde|kefir/.test(n)) return '🥛'
  if (/smør/.test(n)) return '🧈'
  if (/ost|mozz|parmes|feta|cheddar|brie|gedeost|hytteost/.test(n)) return '🧀'
  if (/tomat/.test(n)) return '🍅'
  if (/løg|purløg|porrer|purre/.test(n)) return '🧅'
  if (/hvidløg/.test(n)) return '🧄'
  if (/gulerod/.test(n)) return '🥕'
  if (/kartoffel/.test(n)) return '🥔'
  if (/broccoli|blomkål|kål/.test(n)) return '🥦'
  if (/spinat|salat\b|rucola/.test(n)) return '🥬'
  if (/avocado/.test(n)) return '🥑'
  if (/citron|lime/.test(n)) return '🍋'
  if (/appelsin/.test(n)) return '🍊'
  if (/banan/.test(n)) return '🍌'
  if (/æble/.test(n)) return '🍎'
  if (/jordbær|hindbær|blåbær|bær/.test(n)) return '🍓'
  if (/mango|ananas/.test(n)) return '🍍'
  if (/champignon|svamp/.test(n)) return '🍄'
  if (/agurk|squash/.test(n)) return '🥒'
  if (/peberfrugt/.test(n)) return '🫑'
  if (/pasta|spaghetti|tagliatelle|penne|rigatoni|fusilli|orzo|lasagne/.test(n)) return '🍝'
  if (/ris\b|quinoa|bulgur|couscous/.test(n)) return '🍚'
  if (/mel\b|hvedemel|rugmel/.test(n)) return '🌾'
  if (/sukker|honning|sirup|melis/.test(n)) return '🍬'
  if (/chokolade/.test(n)) return '🍫'
  if (/salt\b/.test(n)) return '🧂'
  if (/chili|peber/.test(n)) return '🌶️'
  if (/kanel/.test(n)) return '🪵'
  if (/persille|basilikum|koriander|dild|mynte|timian|rosmarin|oregano|ingefær/.test(n)) return '🌿'
  if (/olie/.test(n)) return '🫙'
  if (/brød|rugbrød|baguette|bolle/.test(n)) return '🍞'
  if (/bønner|linser|kikærter/.test(n)) return '🫘'
  if (/kokosmælk|kokos/.test(n)) return '🥥'
  if (/vin\b|hvidvin|rødvin/.test(n)) return '🍷'
  if (/citron|lime/.test(n)) return '🍋'
  return '🥄'
}

function gætEnhed(navn) {
  const n = navn.toLowerCase()
  if (/salt|peber|karry|gurkemeje|kanel|spidskommen|paprika|bagepulver|natron|chili|oregano|timian|rosmarin|stødt|tørret|pulver|fennikel|kardamom/.test(n)) return 'tsk'
  if (/olie|sojasauce|eddike|sennep|worcestershire|tabasco|fiskesauce|østerssauce/.test(n)) return 'spsk'
  if (/mælk|fløde|kefir|yoghurt|skyr/.test(n)) return 'dl'
  if (/kød|fisk|laks|kylling|oksekød|smør|ost|mel|sukker|havregryn|bacon|skinke|pasta|ris|linser|kikærter/.test(n)) return 'g'
  if (/løg|tomat|gulerod|kartoffel|æble|citron|banan|æg|peberfrugt|agurk|squash/.test(n)) return 'stk'
  return 'stk'
}

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
  const navigate = useNavigate()
  const [lager, setLager]           = useState(hentLager)
  const [aktiv, setAktiv]           = useState('råvarer')
  const [tilføjOpen, setTilføjOpen] = useState(false)
  const [udløbEdit, setUdløbEdit]   = useState(null)
  const [redigerVare, setRedigerVare] = useState(null) // vare-objekt til edit

  // Opdatér state + localStorage
  function opdater(nyListe) { setLager(nyListe); gemLager(nyListe) }

  function slet(id)           { opdater(sletFraLager(id)); setRedigerVare(null) }
  function sætUdløb(id, dato) { setUdløbEdit(null); opdater(opdaterUdløb(id, dato)) }
  function gem(id, data)      { setRedigerVare(null); opdater(opdaterVare(id, data)) }

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
                <span style={s.advarselLink} onClick={() => navigate('/madmatch')}>Se retter der bruger dem →</span>
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
                      <div style={s.vareRække}>
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
                          {!harUdløb && !v.snartTom && !info && (
                            <button style={s.udløbReminder}
                              onClick={() => setUdløbEdit(v.id)}>
                              <span style={{ color: colors.green }}>+ Udløbsdato</span>
                            </button>
                          )}
                        </div>

                        {/* Mængde + rediger-knap */}
                        <span style={s.mængde}>
                          {v.mængde ? `${v.mængde} ${v.enhed}` : v.enhed}
                        </span>
                        <button style={s.editBtn} onClick={() => setRedigerVare(v)} aria-label="Rediger">
                          <PencilIcon />
                        </button>
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

      {/* Rediger vare-sheet */}
      {redigerVare && (
        <RedigerSheet
          vare={redigerVare}
          onGem={(data) => gem(redigerVare.id, data)}
          onSlet={() => slet(redigerVare.id)}
          onLuk={() => setRedigerVare(null)}
        />
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

function BarcodeScanner({ onDetected, onLuk }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const [fejl, setFejl] = useState(null)

  useEffect(() => {
    if (!('BarcodeDetector' in window)) {
      setFejl('Stregkodescanner understøttes ikke i denne browser (kræver Chrome/Edge/Safari 17+).')
      return
    }
    const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'] })
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        streamRef.current = stream
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
        async function scan() {
          if (!videoRef.current || videoRef.current.readyState < 2) { rafRef.current = requestAnimationFrame(scan); return }
          try {
            const koder = await detector.detect(videoRef.current)
            if (koder.length > 0) { stream.getTracks().forEach((t) => t.stop()); onDetected(koder[0].rawValue); return }
          } catch {}
          rafRef.current = requestAnimationFrame(scan)
        }
        rafRef.current = requestAnimationFrame(scan)
      })
      .catch(() => setFejl('Kunne ikke åbne kamera — tjek kameratilladelse.'))
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); cancelAnimationFrame(rafRef.current) }
  }, [onDetected])

  return (
    <div style={{ marginBottom: 14 }}>
      {fejl ? (
        <div style={{ fontFamily: font.body, fontSize: 13.5, color: colors.red, padding: '12px 0' }}>{fejl}</div>
      ) : (
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#000', height: 200 }}>
          <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 8, border: `2px solid ${colors.green}`, borderRadius: 10, pointerEvents: 'none' }} />
          <p style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', color: '#fff', fontFamily: font.body, fontSize: 12.5, fontWeight: 700, margin: 0 }}>
            Hold stregkoden inden for rammen
          </p>
        </div>
      )}
      <button style={{ ...s.ghostBtn, marginTop: 8 }} onClick={onLuk}>Annullér scanner</button>
    </div>
  )
}

function TilføjSheet({ onTilføj, onLuk }) {
  const [søgning, setSøgning]     = useState('')
  const [valgt, setValgt]         = useState(null)
  const [mængde, setMængde]       = useState('')
  const [enhed, setEnhed]         = useState('stk')
  const [udløb, setUdløb]         = useState('')
  const [katalog, setKatalog]     = useState(_katalogCache ?? INGREDIENS_KATALOG)
  const [indlæser, setIndlæser]   = useState(!_katalogCache)
  const [scanMode, setScanMode]   = useState(false)
  const [lytter, setLytter]       = useState(false)
  const søgeRef = useRef(null)

  useEffect(() => { søgeRef.current?.focus() }, [])

  useEffect(() => {
    if (_katalogCache) return
    supabase.from('recipes').select('ingredients').then(({ data }) => {
      const statiskeNavne = new Set(INGREDIENS_KATALOG.map((i) => i.navn.toLowerCase()))
      const set = new Set(statiskeNavne)
      const ekstra = []
      for (const r of data ?? []) {
        for (const ing of r.ingredients ?? []) {
          const navn = (ing.name ?? '').trim()
          if (!navn || set.has(navn.toLowerCase())) continue
          set.add(navn.toLowerCase())
          ekstra.push({ navn, kategori: gætKategori(navn), emoji: gætEmoji(navn), standardEnhed: gætEnhed(navn) })
        }
      }
      ekstra.sort((a, b) => a.navn.localeCompare(b.navn, 'da'))
      const kombineret = [...INGREDIENS_KATALOG, ...ekstra]
      _katalogCache = kombineret
      setKatalog(kombineret)
      setIndlæser(false)
    })
  }, [])

  const resultater = useMemo(() => {
    const søg = søgning.trim().toLowerCase()
    if (!søg) return katalog.slice(0, 30)
    return katalog
      .filter((v) => v.navn.toLowerCase().includes(søg))
      .sort((a, b) => {
        const aStart = a.navn.toLowerCase().startsWith(søg)
        const bStart = b.navn.toLowerCase().startsWith(søg)
        if (aStart && !bStart) return -1
        if (!aStart && bStart) return 1
        return a.navn.localeCompare(b.navn, 'da')
      })
      .slice(0, 25)
  }, [katalog, søgning])

  function vælgIngrediens(item) {
    setValgt(item)
    setEnhed(item.standardEnhed)
    setSøgning(item.navn)
  }

  async function skanBarcode(kode) {
    setScanMode(false)
    setSøgning('Søger produkt…')
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${kode}.json`)
      const data = await res.json()
      if (data.status === 1 && data.product) {
        const navn = data.product.product_name_da || data.product.product_name || kode
        const matchFraKatalog = katalog.find((k) => k.navn.toLowerCase() === navn.toLowerCase())
        if (matchFraKatalog) {
          vælgIngrediens(matchFraKatalog)
        } else {
          const nyVare = { navn, emoji: gætEmoji(navn), kategori: gætKategori(navn), standardEnhed: gætEnhed(navn) }
          vælgIngrediens(nyVare)
        }
      } else {
        setSøgning('')
        alert(`Produkt med kode ${kode} ikke fundet. Prøv manuelt.`)
      }
    } catch {
      setSøgning('')
    }
  }

  function startStemme() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Taleindtastning understøttes ikke i denne browser.'); return }
    const rec = new SR()
    rec.lang = 'da-DK'
    rec.onstart = () => setLytter(true)
    rec.onresult = (e) => {
      const tekst = e.results[0][0].transcript
      setLytter(false)
      setSøgning(tekst)
      setValgt(null)
    }
    rec.onerror = () => setLytter(false)
    rec.onend = () => setLytter(false)
    rec.start()
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={s.sheetTitel}>Tilføj råvare</h2>
          <button style={s.lukBtn} onClick={onLuk}>✕</button>
        </div>

        {/* Scanner + stemme-knapper */}
        {!valgt && !scanMode && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button style={s.scanKnap} onClick={() => setScanMode(true)}>📸 Scan stregkode</button>
            <button style={{ ...s.scanKnap, opacity: lytter ? 0.7 : 1 }} onClick={startStemme}>
              {lytter ? '🎙️ Lytter…' : '🎤 Stemme'}
            </button>
          </div>
        )}

        {/* Stregkodescanner */}
        {scanMode && <BarcodeScanner onDetected={skanBarcode} onLuk={() => setScanMode(false)} />}

        {/* Søgefelt + resultater — skjult under scanner */}
        {!scanMode && (<>
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

          {/* Ingrediens-tæller */}
          {!valgt && !indlæser && (
            <p style={s.katalogTæller}>{katalog.length} ingredienser · fra alle opskrifter</p>
          )}

          {/* Søgeresultater — kun hvis ikke valgt */}
          {!valgt && (
          <div style={s.resultaterListe}>
            {indlæser ? (
              <div style={s.ingenResultater}>Henter ingredienser fra opskrifter…</div>
            ) : resultater.length === 0 ? (
              <div style={s.ingenResultater}>
                Ingen ingredienser fundet —{' '}
                <button style={s.manueltLink}
                  onClick={() => setValgt({
                    navn: søgning.trim(),
                    emoji: gætEmoji(søgning.trim()),
                    kategori: gætKategori(søgning.trim()),
                    standardEnhed: gætEnhed(søgning.trim()),
                  })}>
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
        </>)}

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

// ── Rediger vare-sheet ────────────────────────────────────────────────────────

function RedigerSheet({ vare, onGem, onSlet, onLuk }) {
  const [mængde, setMængde] = useState(vare.mængde ?? '')
  const [enhed, setEnhed]   = useState(vare.enhed ?? 'stk')
  const [udløb, setUdløb]   = useState(vare.udløb ?? '')
  const [bekræftSlet, setBekræftSlet] = useState(false)

  function gem() {
    onGem({ mængde: mængde.trim(), enhed, udløb: udløb || null })
  }

  return (
    <div style={s.overlay} onClick={onLuk}>
      <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={s.greb} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 26 }}>{vare.emoji}</span>
            <h2 style={s.sheetTitel}>{vare.navn}</h2>
          </div>
          <button style={s.lukBtn} onClick={onLuk}>✕</button>
        </div>

        {/* Mængde + enhed */}
        <label style={s.feltLabel}>Mængde</label>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="number" inputMode="decimal"
            value={mængde} onChange={(e) => setMængde(e.target.value)}
            placeholder="fx. 400"
            style={{ ...s.input, flex: 1 }}
            autoFocus
          />
          <select value={enhed} onChange={(e) => setEnhed(e.target.value)} style={s.enhedSelect}>
            {ENHEDER.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        {/* Udløbsdato */}
        <label style={s.feltLabel}>
          Udløbsdato <span style={{ color: colors.mutedLight, fontWeight: 400 }}>(valgfrit)</span>
        </label>
        <input
          type="date" value={udløb} onChange={(e) => setUdløb(e.target.value)}
          min={new Date().toISOString().slice(0,10)}
          style={s.input}
        />

        <button style={s.primærBtn} onClick={gem}>Gem ændringer</button>

        {/* Slet */}
        {bekræftSlet ? (
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button style={s.ghostBtn} onClick={() => setBekræftSlet(false)}>Annullér</button>
            <button style={{ ...s.primærBtn, background: colors.red }} onClick={onSlet}>
              Slet permanent
            </button>
          </div>
        ) : (
          <button style={{ ...s.ghostBtn, color: colors.red, marginTop: 6 }}
            onClick={() => setBekræftSlet(true)}>
            🗑 Fjern fra lager
          </button>
        )}
      </div>
    </div>
  )
}

// ── Pencil-ikon ───────────────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke={colors.mutedLight} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
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
  editBtn: {
    width: 32, height: 32, borderRadius: 8, background: colors.bg, border: `1px solid ${colors.border}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    cursor: 'pointer', marginLeft: 4,
  },
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

  katalogTæller: { fontFamily: font.body, fontSize: 11.5, color: colors.mutedLight, margin: '-4px 0 10px', letterSpacing: 0.2 },

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
  scanKnap: { flex: 1, padding: '10px 8px', fontFamily: font.body, fontWeight: 700, fontSize: 13, color: colors.green, background: 'rgba(47,107,79,0.10)', border: 'none', borderRadius: 12, cursor: 'pointer' },
}
