import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'
import Anthropic from '@anthropic-ai/sdk'
import {
  AlertTriangle, Camera, Search, Trash2,
  Egg, Milk, Carrot, Fish, Leaf, LeafyGreen, Wheat, Snowflake,
  Beef, Drumstick, Package, Sparkles, Refrigerator, Apple, Bean,
} from 'lucide-react'
import {
  hentLager, gemLager, sletFraLager, opdaterUdløb, opdaterVare,
  KATEGORIER, INGREDIENS_KATALOG, ENHEDER, kanoniselér,
  hentAutoLager, gemAutoLager,
} from '../data/lager'
import { databases, DB_ID, COL, Query } from '../lib/appwrite'
import { colors, shadow, radius, font } from '../data/theme'
import { useLang } from '../lib/lang'
import { gætKategori, gætEmoji, gætEnhed } from '../lib/ingrediensUtils'
import { hentIndkøbsliste } from '../data/indkøbsliste'

// Module-level cache — survives re-renders, re-fetches only on hard reload
let _katalogCache = null

function VareIkon({ vare, size = 20 }) {
  const props = { size, strokeWidth: 2, color: colors.muted }
  const n = (vare?.navn ?? '').toLowerCase()
  if (/æg/.test(n)) return <Egg {...props} />
  if (/mælk|fløde|yoghurt|cremefraiche/.test(n)) return <Milk {...props} />
  if (/gulerod/.test(n)) return <Carrot {...props} />
  if (/laks|tun|torsk|rejer|fisk|skaldyr/.test(n)) return <Fish {...props} />
  if (/smør/.test(n)) return <Milk {...props} />
  if (/ost|mozzarella|feta|parmesan|cheddar/.test(n)) return <Egg {...props} />
  if (/kylling/.test(n)) return <Drumstick {...props} />
  if (/okse|hakket|bacon|pølse|svinekød/.test(n)) return <Beef {...props} />
  if (/mel|pasta|ris|havregryn|bulgur|couscous|quinoa|brød|tortilla/.test(n)) return <Wheat {...props} />
  if (/æble|banan|appelsin|citron|lime|mango|jordbær|hindbær|blåbær/.test(n)) return <Apple {...props} />
  if (/tofu|bønner|linser/.test(n)) return <Bean {...props} />
  if (/løg|hvidløg|porrer|tomat|peberfrugt|agurk|broccoli|blomkål|squash|champignon|spinat|avocado|selleri|koriander|basilikum|ingefær|kartof/.test(n)) return <LeafyGreen {...props} />
  if (vare?.kategori === 'frys') return <Snowflake {...props} />
  if (vare?.kategori === 'grønt') return <Leaf {...props} />
  if (vare?.kategori === 'tørvarer') return <Package {...props} />
  if (vare?.kategori === 'krydderier') return <Sparkles {...props} />
  if (vare?.kategori === 'køl') return <Refrigerator {...props} />
  return <Package {...props} />
}

const KATEGORI_IKONER = {
  køl:        <Refrigerator size={12} strokeWidth={2} />,
  grønt:      <LeafyGreen  size={12} strokeWidth={2} />,
  tørvarer:   <Package     size={12} strokeWidth={2} />,
  frys:       <Snowflake   size={12} strokeWidth={2} />,
  krydderier: <Sparkles    size={12} strokeWidth={2} />,
}

// ── Udløbs-hjælper ────────────────────────────────────────────────────────────
function udløbsInfo(udløbDato, t) {
  if (!udløbDato) return null
  const i_dag = new Date(); i_dag.setHours(0,0,0,0)
  const udløb = new Date(udløbDato); udløb.setHours(0,0,0,0)
  const dage = Math.round((udløb - i_dag) / 86400000)
  if (dage < 0)  return { tekst: t('lag.udløbet'),           farve: colors.red,        kritisk: true }
  if (dage === 0) return { tekst: t('lag.udløberIDag'),       farve: colors.red,        kritisk: true }
  if (dage === 1) return { tekst: t('lag.udløberIm'),         farve: colors.red,        kritisk: true }
  if (dage <= 5)  return { tekst: `${t('lag.omDage')} ${dage} ${t('lag.dage')}`, farve: colors.terracotta, kritisk: false }
  return null
}

export default function Lager() {
  const navigate = useNavigate()
  const { t } = useLang()
  const [lager, setLager]           = useState(hentLager)
  const [tilføjOpen, setTilføjOpen] = useState(false)
  const [udløbEdit, setUdløbEdit]   = useState(null)
  const [redigerVare, setRedigerVare] = useState(null)
  const [autoLager, setAutoLager]   = useState(hentAutoLager)
  const indkøbsAntal = hentIndkøbsliste().length

  // Opdatér state + localStorage
  function opdater(nyListe) { setLager(nyListe); gemLager(nyListe) }

  function slet(id)           { opdater(sletFraLager(id)); setRedigerVare(null) }
  function sætUdløb(id, dato) { setUdløbEdit(null); opdater(opdaterUdløb(id, dato)) }
  function gem(id, data)      { setRedigerVare(null); opdater(opdaterVare(id, data)) }

  function tilføj(vare) {
    const varer = Array.isArray(vare) ? vare : [vare]
    const ny = [...varer.map((v, i) => ({ ...v, id: Date.now() + i })), ...lager]
    opdater(ny)
    setTilføjOpen(false)
  }

  // Grupper lager per kategori
  const grupper = KATEGORIER
    .map((k) => ({ ...k, varer: lager.filter((v) => v.kategori === k.id) }))
    .filter((g) => g.varer.length > 0)

  const KATEGORI_LABELS = {
    køl:       t('lag.kat.køl'),
    grønt:     t('lag.kat.grønt'),
    tørvarer:  t('lag.kat.tørvarer'),
    frys:      t('lag.kat.frys'),
    krydderier:t('lag.kat.krydderier'),
  }

  // Tæl kritiske varer
  const snartUdløb = lager.filter((v) => {
    const info = udløbsInfo(v.udløb, t)
    return info?.kritisk
  }).length

  const udløberSnart = lager.filter((v) => {
    const info = udløbsInfo(v.udløb, t)
    return info !== null
  }).length

  return (
    <div style={s.page}>

      {/* Header */}
      <div style={s.header}>
        <h1 style={s.titel}>{t('lag.titel')}</h1>
        <button style={s.indkøbsBtn} onClick={() => navigate('/indkøbsliste')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          {indkøbsAntal > 0 && <span style={s.indkøbsBadge}>{indkøbsAntal}</span>}
        </button>
        <button style={s.tilføjBtn} onClick={() => setTilføjOpen(true)}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> {t('lag.tilføj').replace('+ ', '')}
        </button>
      </div>

      {/* Udløbs-advarsel */}
      {true && (
        <>
          {udløberSnart > 0 && (
            <div style={s.advarsel}>
              <AlertTriangle size={16} color={colors.terracotta} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={s.advarselTekst}>
                {udløberSnart} {udløberSnart === 1 ? t('lag.vare') : t('lag.varer')} {t('lag.udløberSnart')}{' '}
                <span style={s.advarselLink} onClick={() => navigate('/madmatch')}>{t('lag.seRetter')}</span>
              </span>
            </div>
          )}

          {/* Varer per kategori */}
          {grupper.map((g) => (
            <div key={g.id} style={s.gruppe}>
              <div style={{ ...s.gruppeLabel, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: 'inherit', display: 'flex' }}>{KATEGORI_IKONER[g.id]}</span>
                <span>{(KATEGORI_LABELS[g.id] ?? g.label).toUpperCase()}</span>
              </div>
              <div style={s.kortBoks}>
                {g.varer.map((v, i) => {
                  const info = udløbsInfo(v.udløb, t)
                  const harUdløb = !!v.udløb
                  const erSidst = i === g.varer.length - 1
                  return (
                    <div key={v.id}>
                      <div style={s.vareRække}>
                        {/* Thumbnail */}
                        <div style={s.thumb}><VareIkon vare={v} /></div>

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
                            <span style={s.snartTomBadge}>{t('lag.snartTom')}</span>
                          )}

                          {/* Ingen udløbsdato */}
                          {!harUdløb && !v.snartTom && !info && (
                            <button style={s.udløbReminder}
                              onClick={() => setUdløbEdit(v.id)}>
                              <span style={{ color: colors.green }}>{t('lag.tilføjUdløb')}</span>
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
              <p style={s.tomTekst}>{t('lag.tom')}</p>
              <p style={s.tomSub}>{t('lag.tomSub')}</p>
              <button style={s.tomKnap} onClick={() => setTilføjOpen(true)}>{t('lag.tilføj')}</button>
            </div>
          )}
        </>
      )}

      {/* Auto-opdater lager */}
      <div
        style={{
          margin: '20px 16px 8px',
          background: autoLager ? colors.card : '#FEF3EC',
          border: `1.5px solid ${autoLager ? colors.border : '#F5C9A7'}`,
          borderRadius: 16,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 22 }}>🛒</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: font.body, fontWeight: 700, fontSize: 14, color: colors.text, margin: 0 }}>
            {t('pf.autoLager')}
          </p>
          <p style={{ fontFamily: font.body, fontSize: 12.5, color: autoLager ? colors.muted : colors.terracotta, margin: '2px 0 0', lineHeight: 1.4 }}>
            {autoLager ? t('pf.autoLagerSub') : t('lag.autoSlået')}
          </p>
        </div>
        <button
          onClick={() => { const ny = !autoLager; setAutoLager(ny); gemAutoLager(ny) }}
          style={{
            width: 44, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
            background: autoLager ? colors.green : '#ddd',
            position: 'relative', transition: 'background 0.2s',
          }}
        >
          <span style={{
            position: 'absolute', top: 3, left: autoLager ? 21 : 3,
            width: 20, height: 20, borderRadius: 999, background: '#fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s',
          }} />
        </button>
      </div>

      {/* Tilføj-sheet */}
      {tilføjOpen && (
        <TilføjSheet onTilføj={tilføj} onLuk={() => setTilføjOpen(false)} t={t} KATEGORI_LABELS={KATEGORI_LABELS} />
      )}

      {/* Rediger vare-sheet */}
      {redigerVare && (
        <RedigerSheet
          vare={redigerVare}
          onGem={(data) => gem(redigerVare.id, data)}
          onSlet={() => slet(redigerVare.id)}
          onLuk={() => setRedigerVare(null)}
          t={t}
        />
      )}

      {/* Inline udløbsdato-editor */}
      {udløbEdit && (
        <UdløbDialog
          id={udløbEdit}
          navn={lager.find(v => v.id === udløbEdit)?.navn}
          onGem={sætUdløb}
          onLuk={() => setUdløbEdit(null)}
          t={t}
        />
      )}
    </div>
  )
}

// ── Tilføj-sheet ─────────────────────────────────────────────────────────────

function BarcodeScanner({ onDetected, onLuk }) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const [fejl, setFejl] = useState(null)
  const [klar, setKlar] = useState(false)

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setFejl('Kamera understøttes ikke i denne browser.')
      return
    }

    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader

    let stoppet = false

    reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err, controls) => {
      if (stoppet) return
      if (result) {
        stoppet = true
        controls.stop()
        onDetected(result.getText())
        return
      }
      // NotFoundException er normal — betyder bare ingen kode i dette frame
      if (err && !(err instanceof NotFoundException)) {
        stoppet = true
        controls.stop()
        setFejl('Kamera-fejl — tjek at du har givet tilladelse.')
      }
    })
      .then(() => { if (!stoppet) setKlar(true) })
      .catch((e) => {
        if (!stoppet) setFejl(e?.message?.includes('Permission') || e?.name === 'NotAllowedError'
          ? 'Kameratilladelse nægtet — tillad kamera i browserindstillinger.'
          : 'Kunne ikke åbne kamera.')
      })

    return () => {
      stoppet = true
      try { readerRef.current?.reset() } catch {}
    }
  }, [onDetected])

  return (
    <div style={{ marginBottom: 14 }}>
      {fejl ? (
        <div style={{ fontFamily: font.body, fontSize: 13.5, color: colors.red, background: '#FEF3F2', borderRadius: 10, padding: '12px 13px' }}>
          {fejl}
        </div>
      ) : (
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#000', height: 210 }}>
          <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {/* Sigte-ramme */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-54%)', width: '72%', height: 90, pointerEvents: 'none' }}>
            {/* Hjørner */}
            {[['0','0','right','bottom'],['0','auto','right','auto'],['auto','0','auto','bottom'],['auto','auto','auto','auto']].map(([t,r,br,bl], i) => (
              <div key={i} style={{ position: 'absolute', top: t === 'auto' ? 'auto' : 0, bottom: t === 'auto' ? 0 : 'auto', left: r === 'auto' ? 'auto' : 0, right: r === 'auto' ? 0 : 'auto', width: 20, height: 20, borderTop: (i < 2) ? `3px solid ${colors.green}` : 'none', borderBottom: (i >= 2) ? `3px solid ${colors.green}` : 'none', borderLeft: (i === 0 || i === 2) ? `3px solid ${colors.green}` : 'none', borderRight: (i === 1 || i === 3) ? `3px solid ${colors.green}` : 'none' }} />
            ))}
          </div>
          <p style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center', color: klar ? '#fff' : 'rgba(255,255,255,0.6)', fontFamily: font.body, fontSize: 12.5, fontWeight: 700, margin: 0 }}>
            {klar ? 'Hold stregkoden inden for rammen' : 'Starter kamera…'}
          </p>
        </div>
      )}
      <button style={{ ...s.ghostBtn, marginTop: 8 }} onClick={onLuk}>Annullér</button>
    </div>
  )
}

function TilføjSheet({ onTilføj, onLuk, t, KATEGORI_LABELS }) {
  const [søgning, setSøgning]     = useState('')
  const [valgt, setValgt]         = useState(null)
  const [mængde, setMængde]       = useState('')
  const [enhed, setEnhed]         = useState('stk')
  const [udløb, setUdløb]         = useState('')
  const [katalog, setKatalog]     = useState(_katalogCache ?? INGREDIENS_KATALOG)
  const [indlæser, setIndlæser]   = useState(!_katalogCache)
  const [scanMode, setScanMode]           = useState(false)
  const [scanFejl, setScanFejl]           = useState(null)
  const [billedeAnalyserer, setBilledeAnalyserer] = useState(false)
  const [billedeItems, setBilledeItems]   = useState(null)
  const søgeRef      = useRef(null)
  const billedeInputRef = useRef(null)

  useEffect(() => { søgeRef.current?.focus() }, [])

  useEffect(() => {
    if (_katalogCache) return
    databases.listDocuments(DB_ID, COL.recipes, [Query.limit(1000)]).then(({ documents: data }) => {
      const statiskeNavne = new Set(INGREDIENS_KATALOG.map((i) => i.navn.toLowerCase()))
      const set = new Set(statiskeNavne)
      const ekstra = []
      for (const r of data ?? []) {
        const ings = r.ingredients_json ? JSON.parse(r.ingredients_json) : (r.ingredients ?? [])
        for (const ing of ings) {
          // Normaliser råt ingrediensnavn til et rent pantry-navn
          const rå = (ing.name ?? '').trim()
          if (!rå) continue

          // Split "Mandelsmør eller peanutbutter" → to separate varer
          const dele = rå.split(/\s+eller\s+/i)

          for (const del of dele) {
            // Fuld kanonisering: strip parentes, komma/dash, adjektiver, præpositionsled
            const raw = kanoniselér(del)
            if (!raw || raw.length < 2) continue
            // Kapitalisér til display (kanoniselér returnerer lowercase)
            const navn = raw.charAt(0).toUpperCase() + raw.slice(1)
            if (set.has(navn.toLowerCase())) continue
            set.add(navn.toLowerCase())
            ekstra.push({ navn, kategori: gætKategori(navn), emoji: gætEmoji(navn), standardEnhed: gætEnhed(navn) })
          }
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

  async function analyserBillede(fil) {
    setBilledeAnalyserer(true)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(fil)
      })
      const anthropic = new Anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_KEY, dangerouslyAllowBrowser: true })
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: fil.type || 'image/jpeg', data: base64 } },
            { type: 'text', text: 'Du er en præcis madlager-assistent. Analyser billedet og identificer alle madvarer.\n\nHOVEDREGEL: Identificer altid HVAD produktet er (hovedsubstantiv), ikke HVORDAN det er beskrevet (adjektiv/forstavelse).\n\nEksempler på korrekt navngivning:\n- "Blomster honning" → "Honning"\n- "Basilikum pesto" → "Pesto"\n- "Økologisk mælk" → "Mælk"\n- "Frisk persille" → "Persille"\n- "Hakket oksekød" → "Oksekød"\n- "Røget laks" → "Laks"\n- "Saltede mandler" → "Mandler"\n- "Koncentreret tomatpuré" → "Tomatpuré"\n- "Pesto med basilikum" → "Pesto"\n- "Økologisk græsk yoghurt" → "Græsk yoghurt"\n\nAndre regler:\n- Adjektiver og beskrivende ord (blomster, økologisk, frisk, hakket, røget, saltet) er IKKE produktnavnet\n- Beholder = ikke produktet: beskriv INDHOLDET af krukke/dåse/flaske\n- Brandnavne fjernes: brug generisk navn (fx "Kikærter" ikke "Bonduelle Kikærter")\n- Sæt usikker: true hvis du ikke er 100% sikker\n\nReturner KUN JSON array (navne på dansk):\n[{"navn":"...","mængde":"","enhed":"stk","kategori":"tørvarer","usikker":false}]\nKategorier: grønt, køl, frys, tørvarer, krydderier.' }
          ]
        }]
      })
      const tekst = msg.content[0]?.text ?? ''
      const jsonMatch = tekst.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('Intet JSON i svar')
      const items = JSON.parse(jsonMatch[0])
      const matchede = items.map((item) => {
        const kn = kanoniselér(item.navn ?? '')
        // 1. Eksakt kanoniseret match
        let match = katalog.find((k) => kanoniselér(k.navn) === kn)
        // 2. Sidst ord i scannernavn — fx "basilikum pesto" → "pesto"
        if (!match && kn) {
          const ord = kn.split(/\s+/)
          const sidsteOrd = ord[ord.length - 1]
          if (sidsteOrd && sidsteOrd.length >= 3) {
            match = katalog.find((k) => kanoniselér(k.navn) === sidsteOrd)
          }
        }
        // 3. Substring som sidste udvej (katalog-ord indeholdt i produktnavn)
        if (!match && kn) match = katalog.find((k) => { const kk = kanoniselér(k.navn); return kk && kk.length >= 4 && kn.includes(kk) })
        if (match) return { ...item, navn: match.navn, emoji: match.emoji, kategori: match.kategori, enhed: item.enhed || match.standardEnhed }
        return { ...item, emoji: null, kategori: item.kategori || gætKategori(item.navn), enhed: item.enhed || gætEnhed(item.navn) }
      })
      setBilledeItems(matchede)
    } catch {
      setScanFejl('Kunne ikke analysere billedet — prøv igen.')
      setTimeout(() => setScanFejl(null), 4000)
    } finally {
      setBilledeAnalyserer(false)
      if (billedeInputRef.current) billedeInputRef.current.value = ''
    }
  }

  async function skanBarcode(kode) {
    setScanMode(false)
    setSøgning('Søger produkt…')
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${kode}.json`)
      if (!res.ok) throw new Error('HTTP-fejl')
      let data
      try { data = await res.json() } catch { throw new Error('Ugyldigt svar') }
      if (data.status === 1 && data.product) {
        const rårNavn = (data.product.product_name_da || data.product.product_name || '').trim()
        if (!rårNavn) {
          setSøgning('')
          setScanFejl('Produktet er fundet men mangler navn — søg manuelt.')
          setTimeout(() => setScanFejl(null), 4000)
          return
        }
        const kanonNavn = kanoniselér(rårNavn)
        // 1. Eksakt match
        let matchFraKatalog = katalog.find((k) => k.navn.toLowerCase() === rårNavn.toLowerCase())
        // 2. Kanoniseret match (fx "Kildevand 0,5L" → kanoniselér → "vand" matcher "Vand")
        if (!matchFraKatalog && kanonNavn) {
          matchFraKatalog = katalog.find((k) => kanoniselér(k.navn) === kanonNavn)
        }
        // 3. Substring: katalog-navn indeholdt i det kanoniserede produkt-navn
        if (!matchFraKatalog && kanonNavn) {
          matchFraKatalog = katalog.find((k) => {
            const kk = kanoniselér(k.navn)
            return kk && kk.length >= 3 && kanonNavn.includes(kk)
          })
        }
        if (matchFraKatalog) {
          vælgIngrediens(matchFraKatalog)
        } else {
          const visNavn = kanonNavn
            ? kanonNavn.charAt(0).toUpperCase() + kanonNavn.slice(1)
            : rårNavn
          vælgIngrediens({ navn: visNavn, emoji: gætEmoji(visNavn), kategori: gætKategori(visNavn), standardEnhed: gætEnhed(visNavn) })
        }
      } else {
        setSøgning('')
        setScanFejl('Produktet blev ikke fundet — tilføj manuelt.')
        setTimeout(() => setScanFejl(null), 4000)
      }
    } catch {
      setSøgning('')
      setScanFejl('Kunne ikke slå produktet op — tjek din internetforbindelse.')
      setTimeout(() => setScanFejl(null), 4000)
    }
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
          <h2 style={s.sheetTitel}>{t('lag.tilføjDialog.titel')}</h2>
          <button style={s.lukBtn} onClick={onLuk}>✕</button>
        </div>

        {/* Billede-analyse-spinner */}
        {billedeAnalyserer && (
          <div style={{ fontFamily: font.body, fontSize: 14, color: colors.muted, textAlign: 'center', padding: '24px 0' }}>
            🔍 Analyserer billede…
          </div>
        )}

        {/* Billede-scanner: review-liste */}
        {billedeItems !== null && !billedeAnalyserer && (
          <BilledeReview
            items={billedeItems}
            onOpdater={(idx, felt, val) => setBilledeItems((it) => it.map((x, i) => i === idx ? { ...x, [felt]: val } : x))}
            onFjern={(idx) => setBilledeItems((it) => it.filter((_, i) => i !== idx))}
            onTilføjAlle={() => { if (billedeItems.length > 0) onTilføj(billedeItems); setBilledeItems(null) }}
            onAnnuller={() => setBilledeItems(null)}
          />
        )}

        {/* Normal tilføj-UI — skjult under billede-review */}
        {billedeItems === null && !billedeAnalyserer && (<>

          {/* Scan-knapper */}
          {!valgt && !scanMode && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                style={{ ...s.scanKnap, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1 }}
                onClick={() => setScanMode(true)}
              >
                <Camera size={15} /> Stregkode
              </button>
              <button
                style={{ ...s.scanKnap, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1 }}
                onClick={() => billedeInputRef.current?.click()}
              >
                📷 Scan billede
              </button>
            </div>
          )}
          <input
            ref={billedeInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) analyserBillede(f) }}
          />

          {/* Stregkodescanner */}
          {scanMode && <BarcodeScanner onDetected={skanBarcode} onLuk={() => setScanMode(false)} />}

          {/* Inline scan-fejl */}
          {scanFejl && (
            <div style={{ fontFamily: font.body, fontSize: 13.5, color: colors.red, background: '#FEF3F2', borderRadius: 10, padding: '10px 13px', marginBottom: 10 }}>
              {scanFejl}
            </div>
          )}

          {/* Søgefelt + resultater — skjult under scanner */}
          {!scanMode && (<>
            <div style={s.søgeWrap}>
              <Search size={16} color={colors.muted} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.6 }} />
              <input
                ref={søgeRef}
                value={søgning}
                onChange={(e) => { setSøgning(e.target.value); setValgt(null) }}
                placeholder={t('lag.søgPh')}
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
                    <span style={{ width: 30, display: 'flex', justifyContent: 'center', color: colors.muted }}><VareIkon vare={item} size={18} /></span>
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
                <span style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: colors.muted }}><VareIkon vare={valgt} size={24} /></span>
                <div>
                  <p style={s.valgtNavn}>{valgt.navn}</p>
                  <p style={s.valgtKategori}>{KATEGORI_LABELS[valgt.kategori]}</p>
                </div>
                <button style={s.skiftBtn} onClick={() => setValgt(null)}>Skift</button>
              </div>

              {/* Mængde + enhed */}
              <label style={s.feltLabel}>{t('lag.mængde')}</label>
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
              <label style={s.feltLabel}>{t('lag.udløber')}</label>
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
                {t('lag.tilføjDialog.gem')}
              </button>
            </div>
          )}
        </>)}
      </div>
    </div>
  )
}

// ── Billede-scanner review-liste ──────────────────────────────────────────────

function BilledeReview({ items, onOpdater, onFjern, onTilføjAlle, onAnnuller }) {
  return (
    <div>
      <div style={{ background: '#FFFBEB', border: '1.5px solid #F59E0B', borderRadius: 10, padding: '10px 13px', marginBottom: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <AlertTriangle size={16} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontFamily: font.body, fontSize: 13, color: '#92400E', margin: 0, lineHeight: 1.45 }}>
          Tjek venligst at informationerne er korrekte inden du tilføjer
        </p>
      </div>
      {items.length === 0 ? (
        <p style={{ fontFamily: font.body, fontSize: 14, color: colors.muted, textAlign: 'center', padding: '20px 0', margin: 0 }}>
          Ingen madvarer fundet — prøv et andet billede
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {items.map((item, i) => (
            <div key={i} style={{ background: colors.bg, border: `1.5px solid ${item.usikker ? '#F59E0B' : colors.border}`, borderRadius: 12, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: colors.muted }}><VareIkon vare={item} size={20} /></span>
              {item.usikker && <AlertTriangle size={13} color="#F59E0B" style={{ flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: font.body, fontSize: 14, fontWeight: 600, color: colors.text, margin: 0, marginBottom: 3 }}>{item.navn}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={item.mængde ?? ''}
                    onChange={(e) => onOpdater(i, 'mængde', e.target.value)}
                    placeholder="Mængde"
                    style={{ fontFamily: font.body, fontSize: 12.5, color: colors.muted, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '3px 7px', width: 70, background: colors.card }}
                  />
                  <select
                    value={item.enhed || 'stk'}
                    onChange={(e) => onOpdater(i, 'enhed', e.target.value)}
                    style={{ fontFamily: font.body, fontSize: 12.5, color: colors.muted, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '3px 6px', background: colors.card }}
                  >
                    {ENHEDER.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              <button
                onClick={() => onFjern(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.mutedLight, padding: 4, flexShrink: 0, fontSize: 16 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        style={{ ...s.primærBtn, marginBottom: 8, opacity: items.length === 0 ? 0.5 : 1 }}
        onClick={onTilføjAlle}
        disabled={items.length === 0}
      >
        Tilføj alle ({items.length})
      </button>
      <button style={s.ghostBtn} onClick={onAnnuller}>Annullér</button>
    </div>
  )
}

// ── Rediger vare-sheet ────────────────────────────────────────────────────────

function RedigerSheet({ vare, onGem, onSlet, onLuk, t }) {
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
            <span style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.muted }}><VareIkon vare={vare} size={22} /></span>
            <h2 style={s.sheetTitel}>{vare.navn}</h2>
          </div>
          <button style={s.lukBtn} onClick={onLuk}>✕</button>
        </div>

        {/* Mængde + enhed */}
        <label style={s.feltLabel}>{t('lag.mængde')}</label>
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
        <label style={s.feltLabel}>{t('lag.udløber')}</label>
        <input
          type="date" value={udløb} onChange={(e) => setUdløb(e.target.value)}
          min={new Date().toISOString().slice(0,10)}
          style={s.input}
        />

        <button style={s.primærBtn} onClick={gem}>{t('lag.redigerDialog.gem')}</button>

        {/* Slet */}
        {bekræftSlet ? (
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button style={s.ghostBtn} onClick={() => setBekræftSlet(false)}>{t('lag.annuller')}</button>
            <button style={{ ...s.primærBtn, background: colors.red }} onClick={onSlet}>
              {t('lag.slet')}
            </button>
          </div>
        ) : (
          <button style={{ ...s.ghostBtn, color: colors.red, marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onClick={() => setBekræftSlet(true)}>
            <Trash2 size={16} /> {t('lag.slet')}
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

function UdløbDialog({ id, navn, onGem, onLuk, t }) {
  const [dato, setDato] = useState('')

  return (
    <div style={s.overlay} onClick={onLuk}>
      <div style={{ ...s.sheet, paddingBottom: 32 }} onClick={(e) => e.stopPropagation()}>
        <div style={s.greb} />
        <h2 style={s.sheetTitel}>{t('lag.udløber')}</h2>
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
          {t('lag.gem')}
        </button>
        <button style={s.ghostBtn} onClick={onLuk}>{t('lag.annuller')}</button>
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
  titel: { fontFamily: font.display, fontWeight: 600, fontSize: 32, color: colors.text, margin: 0, letterSpacing: -0.5 },
  tilføjBtn: { display: 'flex', alignItems: 'center', gap: 6, fontFamily: font.body, fontWeight: 700, fontSize: 14.5, color: '#fff', background: colors.green, border: 'none', borderRadius: 999, padding: '10px 18px', boxShadow: shadow.fab },
  indkøbsBtn: { position: 'relative', width: 40, height: 40, borderRadius: 999, background: colors.card, boxShadow: shadow.card, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.text, marginRight: 4 },
  indkøbsBadge: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 999, background: colors.terracotta, border: `2px solid ${colors.bg}` },

  // Tabs

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
  tomTekst: { fontFamily: font.display, fontWeight: 600, fontSize: 18, color: colors.text, margin: '0 0 8px' },
  tomSub:   { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: '0 0 20px', lineHeight: 1.6, maxWidth: 280, textAlign: 'center' },
  tomKnap:  { fontFamily: font.body, fontWeight: 700, fontSize: 14, color: '#fff', background: colors.green, border: 'none', borderRadius: radius.button, padding: '12px 24px', cursor: 'pointer' },

  // Sheet overlay
  overlay: { position: 'fixed', inset: 0, background: 'rgba(31,36,33,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 },
  sheet: { background: colors.card, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, padding: '12px 20px 40px', maxHeight: '88vh', overflowY: 'auto' },
  greb: { width: 40, height: 4, background: colors.border, borderRadius: 999, margin: '0 auto 20px' },
  sheetTitel: { fontFamily: font.display, fontWeight: 600, fontSize: 22, color: colors.text, margin: 0 },
  lukBtn: { width: 32, height: 32, borderRadius: 999, background: colors.bg, border: 'none', fontSize: 14, color: colors.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' },

  katalogTæller: { fontFamily: font.body, fontSize: 11.5, color: colors.mutedLight, margin: '-4px 0 10px', letterSpacing: 0.2 },

  // Søgefelt
  søgeWrap: { position: 'relative', marginBottom: 12 },
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
