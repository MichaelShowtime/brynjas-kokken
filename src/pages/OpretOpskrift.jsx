import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, X, Camera, ImagePlus, ChevronLeft } from 'lucide-react'
import { databases, storage, DB_ID, COL, ID, BUCKET_ID, Permission, Role } from '../lib/appwrite'
import { hentAktivBruger } from '../data/auth'
import { ENHEDER } from '../data/lager'
import { hentIngrediensKatalog, søgKatalog } from '../lib/ingrediensKatalog'
import { colors, shadow, radius, font } from '../data/theme'

const SVÆRHEDER = [
  { id: 'let', label: 'Nem' },
  { id: 'mellem', label: 'Mellem' },
  { id: 'svær', label: 'Svær' },
]

const TILGÆNGELIGE_TAGS = [
  'vegetar', 'veganer', 'kød', 'fisk', 'mere-grønt', 'bælgfrugter', 'low-carb',
  'protein-rig', 'morgenmad', 'frokost', 'aftensmad', 'hurtig', 'medium-tid',
  'weekend', 'spare-penge', 'italiensk', 'asiatisk', 'mexicansk', 'dansk',
  'indisk', 'mellemøstlig', 'laktosefri', 'glutenfri', 'nøddefri', 'nem',
  'suppe', 'salat', 'dessert', 'bagning', 'børnevenlig',
]

const TOM_INGREDIENS = () => ({ name: '', amount: '', unit: 'stk', valgt: false })

async function sendGodkendelsesMail(titel, recipeId) {
  try {
    await fetch('/api/notify-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titel, recipeId }),
    })
  } catch (e) {
    console.error('Kunne ikke sende admin-mail:', e)
  }
}

export default function OpretOpskrift() {
  const navigate = useNavigate()
  const { id: redigerId } = useParams()
  const bruger = hentAktivBruger()
  const erRedigering = !!redigerId

  const [indlæser, setIndlæser] = useState(erRedigering)
  const [gemmer, setGemmer] = useState(false)
  const [fejl, setFejl] = useState(null)
  const [oprindeligStatus, setOprindeligStatus] = useState(null)

  const [titel, setTitel] = useState('')
  const [beskrivelse, setBeskrivelse] = useState('')
  const [billedeFil, setBilledeFil] = useState(null)
  const [billedePreview, setBilledePreview] = useState(null)
  const [eksisterendeBilledeUrl, setEksisterendeBilledeUrl] = useState(null)
  const [servings, setServings] = useState('4')
  const [prepTime, setPrepTime] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [difficulty, setDifficulty] = useState('let')
  const [cuisine, setCuisine] = useState('')
  const [tags, setTags] = useState([])
  const [ingredienser, setIngredienser] = useState([TOM_INGREDIENS()])
  const [trin, setTrin] = useState([''])
  const [katalog, setKatalog] = useState([])
  useEffect(() => { hentIngrediensKatalog().then(setKatalog) }, [])

  const billedeInputRef = useRef(null)

  useEffect(() => {
    if (!erRedigering) return
    databases.getDocument(DB_ID, COL.recipes, redigerId).then((doc) => {
      if (doc.created_by !== bruger?.id) { navigate('/profil'); return }
      setTitel(doc.title ?? '')
      setBeskrivelse(doc.description ?? '')
      setEksisterendeBilledeUrl(doc.storage_image || doc.image_url || null)
      setServings(String(doc.servings ?? 4))
      setPrepTime(doc.prep_time ?? '')
      setCookTime(doc.cook_time ?? '')
      setDifficulty(doc.difficulty ?? 'let')
      setCuisine(doc.cuisine ?? '')
      setTags(doc.tags ?? [])
      setOprindeligStatus(doc.status ?? 'pending')
      try {
        const ing = JSON.parse(doc.ingredients_json ?? '[]')
        setIngredienser(ing.length ? ing.map((i) => ({ ...i, valgt: true })) : [TOM_INGREDIENS()])
      } catch { setIngredienser([TOM_INGREDIENS()]) }
      try {
        const st = JSON.parse(doc.steps_json ?? '[]')
        setTrin(st.length ? st : [''])
      } catch { setTrin(['']) }
      setIndlæser(false)
    }).catch(() => { setFejl('Kunne ikke hente opskriften.'); setIndlæser(false) })
  }, [erRedigering, redigerId, bruger?.id, navigate])

  function vælgBillede(e) {
    const fil = e.target.files?.[0]
    if (!fil) return
    if (!fil.type.startsWith('image/')) { setFejl('Vælg venligst et billede (jpg, png, webp)'); return }
    if (fil.size > 8_000_000) { setFejl('Billedet er for stort — maks 8 MB'); return }
    setFejl(null)
    setBilledeFil(fil)
    setBilledePreview(URL.createObjectURL(fil))
    e.target.value = ''
  }

  function opdaterIngrediens(i, felt, værdi) {
    setIngredienser((liste) => liste.map((ing, idx) => idx === i ? { ...ing, [felt]: værdi } : ing))
  }
  function tilføjIngrediens() { setIngredienser((l) => [...l, TOM_INGREDIENS()]) }
  function fjernIngrediens(i) { setIngredienser((l) => l.length > 1 ? l.filter((_, idx) => idx !== i) : l) }

  function opdaterTrin(i, værdi) { setTrin((l) => l.map((s, idx) => idx === i ? værdi : s)) }
  function tilføjTrin() { setTrin((l) => [...l, '']) }
  function fjernTrin(i) { setTrin((l) => l.length > 1 ? l.filter((_, idx) => idx !== i) : l) }

  function toggleTag(id) {
    setTags((t) => t.includes(id) ? t.filter((x) => x !== id) : t.length < 6 ? [...t, id] : t)
  }

  function validér() {
    if (!titel.trim()) return 'Opskriften skal have en titel'
    const gyldigeIng = ingredienser.filter((i) => i.name.trim())
    if (gyldigeIng.length < 1) return 'Tilføj mindst én ingrediens'
    const ikkeValgt = gyldigeIng.find((i) => !i.valgt)
    if (ikkeValgt) return `Vælg "${ikkeValgt.name.trim()}" fra listen under ingrediensfeltet, så appen kan matche den med dit lager`
    const gyldigeTrin = trin.filter((s) => s.trim())
    if (gyldigeTrin.length < 1) return 'Tilføj mindst ét fremgangsmåde-trin'
    return null
  }

  async function gem() {
    const problem = validér()
    if (problem) { setFejl(problem); return }
    if (!bruger?.id) { setFejl('Du skal være logget ind'); return }

    setGemmer(true)
    setFejl(null)
    try {
      let storageImage = eksisterendeBilledeUrl
      if (billedeFil) {
        const fileId = ID.unique()
        await storage.createFile(BUCKET_ID, fileId, billedeFil)
        storageImage = storage.getFileView(BUCKET_ID, fileId)
      }

      const gyldigeIng = ingredienser
        .filter((i) => i.name.trim())
        .map((i) => ({ name: i.name.trim(), amount: (i.amount ?? '').toString().trim(), unit: i.unit ?? '' }))
      const gyldigeTrin = trin.filter((s) => s.trim()).map((s) => s.trim())

      // Redigering af en afvist eller ventende opskrift sætter den tilbage i kø.
      // Godkendte opskrifter forbliver godkendte ved redigering (ellers forsvinder de fra feedet ved en lille rettelse).
      const nyStatus = erRedigering
        ? (oprindeligStatus === 'approved' ? 'approved' : 'pending')
        : 'pending'

      const dok = {
        title: titel.trim(),
        description: beskrivelse.trim() || null,
        source: bruger.navn ? `Bruger: ${bruger.navn}` : 'Bruger',
        source_url: null,
        author: bruger.navn ?? null,
        image_url: null,
        storage_image: storageImage,
        prep_time: prepTime.trim() || null,
        cook_time: cookTime.trim() || null,
        servings: parseInt(servings) || 4,
        difficulty,
        cuisine: cuisine.trim() || null,
        tags,
        ingredients_json: JSON.stringify(gyldigeIng),
        steps_json: JSON.stringify(gyldigeTrin),
        translated: true,
        created_by: bruger.id,
        author_username: bruger.username ?? bruger.navn ?? null,
        author_avatar: bruger.avatarUrl ?? bruger.avatar ?? null,
        status: nyStatus,
      }

      let recipeId = redigerId
      if (erRedigering) {
        await databases.updateDocument(DB_ID, COL.recipes, redigerId, dok)
      } else {
        const oprettet = await databases.createDocument(DB_ID, COL.recipes, ID.unique(), dok, [
          Permission.read(Role.any()),
          Permission.update(Role.user(bruger.id)),
          Permission.delete(Role.user(bruger.id)),
        ])
        recipeId = oprettet.$id
      }

      if (nyStatus === 'pending') sendGodkendelsesMail(dok.title, recipeId)

      navigate('/profil?fane=mine', { replace: true })
    } catch (e) {
      console.error('Kunne ikke gemme opskrift:', e)
      const msg = e.message ?? ''
      if (msg.includes('too large') || msg.includes('413')) setFejl('Billedet er for stort — prøv et mindre billede')
      else if (msg === 'Failed to fetch') setFejl('Ingen forbindelse til serveren. Prøv igen.')
      else setFejl('Kunne ikke gemme opskriften: ' + msg)
    }
    setGemmer(false)
  }

  if (indlæser) return <div style={s.page}><p style={s.loadingTekst}>Indlæser…</p></div>

  const visBillede = billedePreview ?? eksisterendeBilledeUrl

  return (
    <div style={s.page}>
      <div style={s.header} data-tour="opret-top">
        <button style={s.tilbageBtn} onClick={() => navigate(-1)}><ChevronLeft size={20} /> Tilbage</button>
        <h1 style={s.titel}>{erRedigering ? 'Redigér opskrift' : 'Opret opskrift'}</h1>
        <p style={s.subtitel}>
          {erRedigering
            ? 'Ændringer sendes til godkendelse igen, hvis opskriften ikke allerede er live.'
            : 'Del din opskrift med fællesskabet — den bliver synlig for andre, når en admin har godkendt den.'}
        </p>
      </div>

      {fejl && <div style={s.fejlBoks}>{fejl}</div>}

      {/* Billede */}
      <label style={s.feltLabel}>Billede (valgfrit)</label>
      <input ref={billedeInputRef} type="file" accept="image/*" onChange={vælgBillede} style={{ display: 'none' }} />
      <button style={s.billedeVælger} data-tour="opret-billede" onClick={() => billedeInputRef.current?.click()}>
        {visBillede ? (
          <img src={visBillede} alt="" style={s.billedePreview} />
        ) : (
          <div style={s.billedeTomt}>
            <Camera size={28} color={colors.mutedLight} />
            <span style={s.billedeTomtTekst}>Tilføj et billede af retten</span>
          </div>
        )}
        <div style={s.billedeOverlay}><ImagePlus size={16} color="#fff" /></div>
      </button>

      {/* Titel + beskrivelse */}
      <label style={s.feltLabel}>Titel</label>
      <input value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="Fx Boller i karry" style={s.input} data-tour="opret-titel" />

      <label style={s.feltLabel}>Beskrivelse (valgfrit)</label>
      <textarea value={beskrivelse} onChange={(e) => setBeskrivelse(e.target.value)}
        placeholder="Kort om retten — hvorfor er den god?" style={{ ...s.input, height: 70, resize: 'none' }} data-tour="opret-beskrivelse" />

      {/* Meta-række */}
      <div style={s.metaRow} data-tour="opret-meta">
        <div style={{ flex: 1 }}>
          <label style={s.feltLabel}>Portioner</label>
          <input type="number" min="1" max="20" value={servings} onChange={(e) => setServings(e.target.value)} style={s.input} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={s.feltLabel}>Tid</label>
          <input value={cookTime} onChange={(e) => setCookTime(e.target.value)} placeholder="fx 30 min" style={s.input} />
        </div>
      </div>

      <label style={s.feltLabel}>Sværhedsgrad</label>
      <div style={s.chipRow} data-tour="opret-svaerhed">
        {SVÆRHEDER.map((sv) => (
          <button key={sv.id} onClick={() => setDifficulty(sv.id)}
            style={{ ...s.chip, ...(difficulty === sv.id ? s.chipAktiv : {}) }}>
            {sv.label}
          </button>
        ))}
      </div>

      <label style={s.feltLabel}>Køkken (valgfrit)</label>
      <input value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="fx dansk, italiensk" style={s.input} data-tour="opret-koekken" />

      <label style={s.feltLabel}>Tags (vælg op til 6)</label>
      <div style={s.chipRow} data-tour="opret-tags">
        {TILGÆNGELIGE_TAGS.map((tag) => (
          <button key={tag} onClick={() => toggleTag(tag)}
            style={{ ...s.chip, ...(tags.includes(tag) ? s.chipAktiv : {}) }}>
            {tag}
          </button>
        ))}
      </div>

      {/* Ingredienser */}
      <label style={{ ...s.feltLabel, marginTop: 22 }}>Ingredienser</label>
      {ingredienser.map((ing, i) => (
        <div key={i} style={s.ingRække}>
          <IngrediensFelt
            ing={ing}
            katalog={katalog}
            inputStyle={{ ...s.input, flex: 1, marginBottom: 0 }}
            onTekst={(tekst) => setIngredienser((l) => l.map((x, idx) => idx === i ? { ...x, name: tekst, valgt: false } : x))}
            onVælg={(navn, enhed) => setIngredienser((l) => l.map((x, idx) => idx === i ? { ...x, name: navn, unit: enhed ?? x.unit, valgt: true } : x))}
          />
          <input value={ing.amount} onChange={(e) => opdaterIngrediens(i, 'amount', e.target.value)}
            placeholder="Mængde" style={{ ...s.input, width: 64, marginBottom: 0 }} data-tour="opret-maengde" />
          <select value={ing.unit} onChange={(e) => opdaterIngrediens(i, 'unit', e.target.value)} style={s.enhedSelect} data-tour="opret-enhed">
            {ENHEDER.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <button style={s.fjernRækkeBtn} onClick={() => fjernIngrediens(i)} aria-label="Fjern ingrediens"><X size={16} /></button>
        </div>
      ))}
      <button style={s.tilføjRækkeBtn} data-tour="opret-tilfoej-ing" onClick={tilføjIngrediens}><Plus size={15} /> Tilføj ingrediens</button>

      {/* Fremgangsmåde */}
      <label style={{ ...s.feltLabel, marginTop: 22 }}>Fremgangsmåde</label>
      {trin.map((t, i) => (
        <div key={i} style={s.trinRække}>
          <span style={s.trinNr}>{i + 1}</span>
          <textarea value={t} onChange={(e) => opdaterTrin(i, e.target.value)}
            placeholder={`Trin ${i + 1}`} style={{ ...s.input, flex: 1, marginBottom: 0, height: 44, resize: 'vertical' }} data-tour="opret-trin" />
          <button style={s.fjernRækkeBtn} onClick={() => fjernTrin(i)} aria-label="Fjern trin"><X size={16} /></button>
        </div>
      ))}
      <button style={s.tilføjRækkeBtn} data-tour="opret-tilfoej-trin" onClick={tilføjTrin}><Plus size={15} /> Tilføj trin</button>

      <button style={{ ...s.primærBtn, opacity: gemmer ? 0.7 : 1 }} data-tour="opret-send" onClick={gem} disabled={gemmer}>
        {gemmer ? 'Gemmer…' : erRedigering ? 'Gem ændringer' : 'Send til godkendelse'}
      </button>
    </div>
  )
}

// Ingrediensfelt med søgning — man vælger fra kendte ingredienser (så navnene matcher lageret)
function IngrediensFelt({ ing, katalog, inputStyle, onTekst, onVælg }) {
  const [fokus, setFokus] = useState(false)
  const forslag = fokus && !ing.valgt ? søgKatalog(katalog, ing.name) : []
  const tekst = ing.name.trim()
  const visAlligevel = fokus && !ing.valgt && tekst.length > 1 && !forslag.some((f) => f.navn.toLowerCase() === tekst.toLowerCase())

  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0 }} data-tour="opret-ingrediens">
      <input
        value={ing.name}
        onChange={(e) => onTekst(e.target.value)}
        onFocus={() => setFokus(true)}
        onBlur={() => setTimeout(() => setFokus(false), 150)}
        placeholder="Søg ingrediens, fx hakket oksekød"
        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', borderColor: ing.valgt ? colors.green : (inputStyle.borderColor ?? undefined) }}
      />
      {(forslag.length > 0 || visAlligevel) && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, boxShadow: shadow.card, marginTop: 4, overflow: 'hidden', maxHeight: 240, overflowY: 'auto' }}>
          {forslag.map((f) => (
            <button key={f.navn} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onVælg(f.navn, f.standardEnhed); setFokus(false) }}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: `1px solid ${colors.border}`, padding: '10px 12px', fontFamily: font.body, fontSize: 14.5, color: colors.text, cursor: 'pointer' }}>
              {f.navn}
            </button>
          ))}
          {visAlligevel && (
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onVælg(tekst.charAt(0).toUpperCase() + tekst.slice(1), null); setFokus(false) }}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 12px', fontFamily: font.body, fontSize: 13, fontWeight: 700, color: colors.green, cursor: 'pointer' }}>
              Brug "{tekst}" alligevel
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const s = {
  page: { maxWidth: 480, margin: '0 auto', padding: '20px 20px 100px' },
  header: { marginBottom: 18 },
  tilbageBtn: { display: 'flex', alignItems: 'center', gap: 2, background: 'none', border: 'none', fontFamily: font.body, fontSize: 14, fontWeight: 700, color: colors.green, padding: 0, marginBottom: 10, cursor: 'pointer' },
  titel: { fontFamily: font.display, fontWeight: 600, fontSize: 26, color: colors.text, margin: 0, letterSpacing: -0.5 },
  subtitel: { fontFamily: font.body, fontSize: 13.5, color: colors.muted, margin: '6px 0 0', lineHeight: 1.5 },
  loadingTekst: { fontFamily: font.body, fontSize: 14, color: colors.muted, textAlign: 'center', padding: '60px 0' },

  fejlBoks: { background: 'rgba(194,91,74,0.10)', color: colors.red, fontFamily: font.body, fontSize: 13.5, fontWeight: 600, padding: '12px 14px', borderRadius: 14, marginBottom: 16, lineHeight: 1.45 },

  feltLabel: { display: 'block', fontFamily: font.body, fontSize: 12.5, fontWeight: 700, color: colors.mutedLight, margin: '0 0 7px', letterSpacing: 0.3 },
  input: { width: '100%', padding: '11px 13px', fontFamily: font.body, fontSize: 14.5, color: colors.text, background: colors.card, border: `1.5px solid ${colors.border}`, borderRadius: 12, outline: 'none', marginBottom: 16, boxSizing: 'border-box' },

  metaRow: { display: 'flex', gap: 12 },

  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { fontFamily: font.body, fontSize: 13, fontWeight: 600, color: colors.muted, background: colors.card, border: `1.5px solid ${colors.border}`, borderRadius: radius.pill, padding: '7px 14px', cursor: 'pointer' },
  chipAktiv: { color: '#fff', background: colors.green, border: `1.5px solid ${colors.green}` },

  billedeVælger: { position: 'relative', display: 'block', width: '100%', borderRadius: radius.card, overflow: 'hidden', border: 'none', padding: 0, marginBottom: 18, cursor: 'pointer' },
  billedePreview: { width: '100%', height: 180, objectFit: 'cover', display: 'block' },
  billedeTomt: { width: '100%', height: 140, background: colors.card, border: `1.5px dashed ${colors.border}`, borderRadius: radius.card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 },
  billedeTomtTekst: { fontFamily: font.body, fontSize: 13, color: colors.mutedLight },
  billedeOverlay: { position: 'absolute', bottom: 10, right: 10, width: 32, height: 32, borderRadius: 999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  ingRække: { display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' },
  enhedSelect: { padding: '11px 8px', fontFamily: font.body, fontSize: 13, color: colors.text, background: colors.card, border: `1.5px solid ${colors.border}`, borderRadius: 12, outline: 'none' },
  trinRække: { display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start' },
  trinNr: { fontFamily: font.body, fontWeight: 700, fontSize: 13, color: colors.mutedLight, width: 20, textAlign: 'center', paddingTop: 13, flexShrink: 0 },
  fjernRækkeBtn: { width: 34, height: 34, flexShrink: 0, borderRadius: 10, background: colors.card, border: `1.5px solid ${colors.border}`, color: colors.mutedLight, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  tilføjRækkeBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', fontFamily: font.body, fontSize: 13.5, fontWeight: 700, color: colors.green, padding: '6px 0', cursor: 'pointer' },

  primærBtn: { width: '100%', padding: '15px', fontFamily: font.body, fontSize: 16, fontWeight: 700, color: '#fff', background: colors.green, border: 'none', borderRadius: radius.button, marginTop: 24, cursor: 'pointer', boxShadow: shadow.fab },
}
