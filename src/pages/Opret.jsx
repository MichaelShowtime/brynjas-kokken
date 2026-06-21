import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { hentKreationer, gemKreation, genererNavn } from '../data/kreationer'
import { colors, shadow, radius, font } from '../data/theme'

async function analyserMedAI(base64Billede) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_KEY
  if (!apiKey) return null
  const mediaType = base64Billede.match(/^data:(image\/[a-z]+);base64,/)?.[1] ?? 'image/jpeg'
  const data = base64Billede.replace(/^data:image\/[a-z]+;base64,/, '')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
          { type: 'text', text: 'Identificér råvarer eller retten på billedet. Svar KUN med gyldig JSON (ingen markdown):\n{"råvarer":["ingrediens1","ingrediens2"],"ret":"Navn på retten eller forslag på dansk"}\nMax 8 råvarer, alt på dansk.' }
        ]
      }]
    })
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  return JSON.parse(json.content[0].text.trim())
}

export default function Opret() {
  // view: 'intro' | 'kamera' | 'review' | 'analyserer' | 'resultat' | 'gemt' | 'detalje'
  const [view, setView] = useState('intro')
  const [foto, setFoto] = useState(null)
  const [fejl, setFejl] = useState(null)
  const [facingMode, setFacingMode] = useState('environment')

  // Resultat-felter
  const [navn, setNavn] = useState('')
  const [fundet, setFundet] = useState([])
  const [referencer, setReferencer] = useState([])
  const [mention, setMention] = useState('')
  const [forslagListe, setForslagListe] = useState([])

  // Historik
  const [historik, setHistorik] = useState([])
  const [valgt, setValgt] = useState(null)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const filInputRef = useRef(null)
  const galleriInputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => setHistorik(hentKreationer()), [])

  const stopKamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => () => stopKamera(), [stopKamera])

  useEffect(() => {
    if (view === 'kamera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [view])

  function fejlbesked(e) {
    if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError')
      return 'Du afviste adgang til kameraet. Giv adgang i browserens indstillinger, eller upload et billede i stedet.'
    if (e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError')
      return 'Der blev ikke fundet et kamera på enheden.'
    return 'Kunne ikke åbne kameraet. Prøv at uploade et billede i stedet.'
  }

  async function startKamera(mode = facingMode) {
    setFejl(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setFejl('Kameraet understøttes ikke i denne browser — upload et billede i stedet.')
      return
    }
    try {
      stopKamera()
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode }, audio: false })
      streamRef.current = stream
      setFacingMode(mode)
      setView('kamera')
    } catch (e) {
      setFejl(fejlbesked(e))
      setView('intro')
    }
  }

  function vendKamera() {
    startKamera(facingMode === 'environment' ? 'user' : 'environment')
  }

  function tagBillede() {
    const v = videoRef.current
    const c = canvasRef.current
    if (!v || !c || !v.videoWidth) return
    c.width = v.videoWidth
    c.height = v.videoHeight
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
    setFoto(c.toDataURL('image/jpeg', 0.85))
    stopKamera()
    setView('review')
  }

  function annullerKamera() {
    stopKamera()
    setView('intro')
  }

  function tagIgen() {
    setFoto(null)
    startKamera()
  }

  function onFilValgt(e) {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => {
      setFoto(r.result)
      setView('review')
    }
    r.readAsDataURL(f)
    e.target.value = ''
  }

  async function brugBillede() {
    setView('analyserer')
    try {
      const resultat = await analyserMedAI(foto)
      if (resultat) {
        setNavn(resultat.ret ?? genererNavn())
        setFundet(resultat.råvarer ?? [])
      } else {
        setNavn(genererNavn())
        setFundet([])
      }
    } catch (e) {
      console.error('AI analyse fejlede:', e)
      setNavn(genererNavn())
      setFundet([])
    }
    setReferencer([])
    setMention('')
    setView('resultat')
  }

  function gem() {
    const kreation = {
      id: Date.now(),
      navn: navn.trim() || 'Uden navn',
      foto,
      referencer,
      fundet,
      dato: new Date().toISOString(),
    }
    setHistorik(gemKreation(kreation))
    setView('gemt')
  }

  function startForfra() {
    setFoto(null)
    setFejl(null)
    setNavn('')
    setFundet([])
    setReferencer([])
    setMention('')
    setForslagListe([])
    setView('intro')
  }

  // --- @-mention logik ---
  function tilføjRef(o) {
    setReferencer((r) => (r.some((x) => x.id === o.id) ? r : [...r, { id: o.id, titel: o.title ?? o.titel, emoji: '🍳' }]))
    setMention('')
    setForslagListe([])
  }
  function fjernRef(id) {
    setReferencer((r) => r.filter((x) => x.id !== id))
  }

  const visForslag = mention.includes('@')
  const query = mention.slice(mention.lastIndexOf('@') + 1).toLowerCase()

  useEffect(() => {
    if (!visForslag || !query) { setForslagListe([]); return }
    supabase.from('recipes').select('id, title, prep_time')
      .ilike('title', `%${query}%`)
      .not('id', 'in', `(${referencer.map(r => r.id).join(',') || '00000000-0000-0000-0000-000000000000'})`)
      .limit(8)
      .then(({ data }) => setForslagListe(data ?? []))
  }, [visForslag, query])

  return (
    <div style={styles.page}>
      <input ref={filInputRef} type="file" accept="image/*" capture="environment"
        onChange={onFilValgt} style={{ display: 'none' }} />
      <input ref={galleriInputRef} type="file" accept="image/*"
        onChange={onFilValgt} style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {view === 'intro' && (
        <Intro
          fejl={fejl}
          historik={historik}
          onKamera={() => startKamera()}
          onUpload={() => galleriInputRef.current?.click()}
          onÅbn={(k) => { setValgt(k); setView('detalje') }}
        />
      )}

      {view === 'kamera' && (
        <KameraView videoRef={videoRef} onTag={tagBillede} onVend={vendKamera} onLuk={annullerKamera} />
      )}

      {view === 'review' && <Review foto={foto} onIgen={tagIgen} onBrug={brugBillede} />}

      {view === 'analyserer' && <Analyserer foto={foto} />}

      {view === 'resultat' && (
        <div style={styles.intro}>
          <header style={styles.header}>
            <h1 style={styles.title}>Vi fandt en ret! 🎉</h1>
            <p style={styles.subtitle}>Tilret navnet og link gerne en opskrift.</p>
          </header>

          <div style={styles.resultatKort}>
            <img src={foto} alt="" style={styles.resultatFoto} />
            <div style={{ padding: '16px' }}>
              {/* Genkendte råvarer */}
              {fundet.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <label style={styles.feltLabel}>Genkendte råvarer</label>
                  <div style={styles.refChips}>
                    {fundet.map((r) => (
                      <span key={r} style={styles.chip}>✓ {r}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Redigerbart, genereret navn */}
              <label style={styles.feltLabel}>Navn (kan rettes)</label>
              <div style={styles.navnRow}>
                <input value={navn} onChange={(e) => setNavn(e.target.value)}
                  style={styles.navnInput} placeholder="Giv retten et navn" />
                <button style={styles.diceBtn} onClick={() => setNavn(genererNavn(navn))}
                  aria-label="Nyt forslag" title="Nyt forslag">🎲</button>
              </div>

              {/* @-reference */}
              <label style={{ ...styles.feltLabel, marginTop: 16 }}>Link til opskrift</label>
              {referencer.length > 0 && (
                <div style={styles.refChips}>
                  {referencer.map((r) => (
                    <span key={r.id} style={styles.refChip}>
                      {r.emoji} {r.titel}
                      <button style={styles.refX} onClick={() => fjernRef(r.id)} aria-label="Fjern">✕</button>
                    </span>
                  ))}
                </div>
              )}
              <input value={mention} onChange={(e) => setMention(e.target.value)}
                style={styles.mentionInput} placeholder="Skriv @ for at finde en opskrift" />

              {visForslag && (
                <div style={styles.dropdown}>
                  {forslagListe.length === 0 && <div style={styles.dropTom}>{query ? 'Ingen match' : 'Søg efter opskrift…'}</div>}
                  {forslagListe.map((o) => (
                    <button key={o.id} style={styles.dropItem} onClick={() => tilføjRef(o)}>
                      <span style={{ fontSize: 18 }}>🍳</span>
                      <span style={styles.dropTitel}>{o.title}</span>
                      {o.prep_time && <span style={styles.dropMeta}>⏱ {o.prep_time}m</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button style={styles.primaryBtn} onClick={gem}>Gem kreation</button>
          <button style={styles.ghostBtn} onClick={startForfra}>Tag et nyt billede</button>
        </div>
      )}

      {view === 'gemt' && (
        <div style={{ ...styles.intro, textAlign: 'center' }}>
          <div style={styles.illu}><span style={{ fontSize: 64 }}>✅</span></div>
          <h1 style={styles.title}>Gemt!</h1>
          <p style={styles.subtitle}>“{navn}” ligger nu i dine kreationer.</p>
          <button style={{ ...styles.primaryBtn, marginTop: 22 }} onClick={startForfra}>Færdig</button>
        </div>
      )}

      {view === 'detalje' && valgt && (
        <Detalje kreation={valgt} onTilbage={() => setView('intro')} onÅbnRef={() => navigate('/madmatch')} />
      )}
    </div>
  )
}

// --- Intro med historik ---
function Intro({ fejl, historik, onKamera, onUpload, onÅbn }) {
  return (
    <div style={styles.intro}>
      <header style={styles.header}>
        <h1 style={styles.title}>Opret med AI ✨</h1>
        <p style={styles.subtitle}>
          Tag et billede af dine råvarer eller en ret — så finder Brynjas Køkken en opskrift til dig.
        </p>
      </header>

      <div style={styles.illu}><span style={{ fontSize: 80 }}>📸</span></div>

      {fejl && <div style={styles.fejlBoks}>{fejl}</div>}

      <button style={styles.primaryBtn} onClick={onKamera}><CameraIcon /> Tag et billede</button>
      <button style={styles.ghostBtn} onClick={onUpload}>🖼️ Upload fra galleri</button>

      {historik.length > 0 && (
        <div style={styles.historik}>
          <h2 style={styles.historikTitel}>Seneste kreationer</h2>
          {historik.map((k) => (
            <button key={k.id} style={styles.histItem} onClick={() => onÅbn(k)}>
              {k.foto ? (
                <img src={k.foto} alt="" style={styles.histThumb} />
              ) : (
                <div style={{ ...styles.histThumb, ...styles.histThumbTom }}>🍽️</div>
              )}
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <p style={styles.histNavn}>{k.navn}</p>
                <p style={styles.histMeta}>
                  {datoKort(k.dato)}
                  {k.referencer?.length ? ` · 🔗 ${k.referencer.length}` : ''}
                </p>
              </div>
              <span style={styles.histPil}>→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function KameraView({ videoRef, onTag, onVend, onLuk }) {
  return (
    <div style={styles.kameraWrap}>
      <video ref={videoRef} playsInline muted autoPlay style={styles.video} />
      <button style={styles.lukBtn} onClick={onLuk} aria-label="Luk kamera">✕</button>
      <button style={styles.vendBtn} onClick={onVend} aria-label="Skift kamera">🔄</button>
      <div style={styles.shutterRow}>
        <button style={styles.shutter} onClick={onTag} aria-label="Tag billede">
          <span style={styles.shutterInner} />
        </button>
      </div>
    </div>
  )
}

function Review({ foto, onIgen, onBrug }) {
  return (
    <div style={styles.intro}>
      <header style={styles.header}>
        <h1 style={styles.title}>Ser det godt ud?</h1>
        <p style={styles.subtitle}>Brug billedet, eller tag et nyt.</p>
      </header>
      <img src={foto} alt="Dit billede" style={styles.preview} />
      <button style={styles.primaryBtn} onClick={onBrug}>Brug billede →</button>
      <button style={styles.ghostBtn} onClick={onIgen}>Tag igen</button>
    </div>
  )
}

function Analyserer({ foto }) {
  return (
    <div style={{ ...styles.intro, textAlign: 'center' }}>
      <img src={foto} alt="" style={{ ...styles.preview, opacity: 0.5 }} />
      <div style={styles.spinner} />
      <h2 style={{ ...styles.title, fontSize: 22, marginTop: 18 }}>Analyserer billede…</h2>
      <p style={styles.subtitle}>Brynjas Køkken kigger efter råvarer 🔍</p>
    </div>
  )
}

function Detalje({ kreation, onTilbage, onÅbnRef }) {
  return (
    <div style={styles.intro}>
      <header style={{ ...styles.header, textAlign: 'left', width: '100%' }}>
        <button style={styles.tilbageBtn} onClick={onTilbage}>← Tilbage</button>
      </header>
      <div style={styles.resultatKort}>
        {kreation.foto ? (
          <img src={kreation.foto} alt="" style={styles.resultatFoto} />
        ) : (
          <div style={{ ...styles.resultatFoto, ...styles.histThumbTom, fontSize: 48 }}>🍽️</div>
        )}
        <div style={{ padding: 16 }}>
          <h1 style={{ ...styles.title, fontSize: 23, textAlign: 'left' }}>{kreation.navn}</h1>
          <p style={{ ...styles.subtitle, textAlign: 'left', margin: '6px 0 0' }}>{datoLang(kreation.dato)}</p>

          {kreation.referencer?.length > 0 && (
            <>
              <p style={{ ...styles.feltLabel, marginTop: 16 }}>Linkede opskrifter</p>
              <div style={styles.refChips}>
                {kreation.referencer.map((r) => (
                  <button key={r.id} style={styles.refChipKlik} onClick={onÅbnRef}>
                    {r.emoji} {r.titel} →
                  </button>
                ))}
              </div>
            </>
          )}

          {kreation.fundet?.length > 0 && (
            <>
              <p style={{ ...styles.feltLabel, marginTop: 16 }}>Genkendte råvarer</p>
              <div style={styles.refChips}>
                {kreation.fundet.map((r) => (
                  <span key={r} style={styles.chip}>✓ {r}</span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

function datoKort(iso) {
  return new Date(iso).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function datoLang(iso) {
  return new Date(iso).toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

const styles = {
  page: { maxWidth: 480, margin: '0 auto', padding: '24px 20px 120px', minHeight: '100%' },

  header: { marginBottom: 18, textAlign: 'center' },
  title: { fontFamily: font.display, fontWeight: 600, fontSize: 28, lineHeight: 1.15, color: colors.text, margin: 0, letterSpacing: -0.5 },
  subtitle: { fontFamily: font.body, fontSize: 14.5, color: colors.muted, margin: '8px auto 0', lineHeight: 1.5, maxWidth: 320 },

  intro: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  illu: { width: 140, height: 140, borderRadius: 999, background: colors.card, boxShadow: shadow.card, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px 0 24px' },

  primaryBtn: { width: '100%', maxWidth: 360, padding: '15px', fontFamily: font.body, fontSize: 16, fontWeight: 700, color: '#fff', background: colors.green, border: 'none', borderRadius: radius.button, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 },
  ghostBtn: { width: '100%', maxWidth: 360, padding: '14px', fontFamily: font.body, fontSize: 15, fontWeight: 600, color: colors.text, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.button },
  fejlBoks: { width: '100%', maxWidth: 360, background: 'rgba(194,91,74,0.10)', color: colors.red, fontFamily: font.body, fontSize: 13.5, fontWeight: 600, padding: '12px 14px', borderRadius: 14, marginBottom: 14, lineHeight: 1.45 },

  // Felter
  feltLabel: { display: 'block', fontFamily: font.body, fontSize: 12.5, fontWeight: 700, color: colors.mutedLight, margin: '0 0 7px', letterSpacing: 0.3 },
  navnRow: { display: 'flex', gap: 8, alignItems: 'stretch' },
  navnInput: { flex: 1, padding: '11px 13px', fontFamily: font.display, fontWeight: 500, fontSize: 17, color: colors.text, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, outline: 'none' },
  diceBtn: { width: 44, flexShrink: 0, fontSize: 18, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12 },

  mentionInput: { width: '100%', padding: '11px 13px', fontFamily: font.body, fontSize: 15, color: colors.text, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, outline: 'none' },
  refChips: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  refChip: { display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: font.body, fontSize: 13, fontWeight: 600, color: colors.green, background: 'rgba(47,107,79,0.10)', padding: '6px 8px 6px 11px', borderRadius: radius.pill },
  refChipKlik: { display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: font.body, fontSize: 13, fontWeight: 600, color: colors.green, background: 'rgba(47,107,79,0.10)', padding: '7px 12px', borderRadius: radius.pill, border: 'none' },
  refX: { border: 'none', background: 'rgba(47,107,79,0.18)', color: colors.green, width: 18, height: 18, borderRadius: 999, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 },

  dropdown: { marginTop: 8, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 14, boxShadow: shadow.card, overflow: 'hidden' },
  dropItem: { width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', background: 'transparent', border: 'none', borderBottom: `1px solid ${colors.border}`, textAlign: 'left' },
  dropTitel: { flex: 1, fontFamily: font.body, fontSize: 14, fontWeight: 600, color: colors.text },
  dropMeta: { fontFamily: font.body, fontSize: 12, color: colors.mutedLight },
  dropTom: { padding: '12px 14px', fontFamily: font.body, fontSize: 13.5, color: colors.muted },

  // Kamera
  kameraWrap: { position: 'relative', width: '100%', borderRadius: radius.card, overflow: 'hidden', background: '#000', aspectRatio: '3 / 4', boxShadow: shadow.card },
  video: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  lukBtn: { position: 'absolute', top: 14, left: 14, width: 40, height: 40, borderRadius: 999, background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none', fontSize: 18, fontWeight: 700 },
  vendBtn: { position: 'absolute', top: 14, right: 14, width: 40, height: 40, borderRadius: 999, background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none', fontSize: 18 },
  shutterRow: { position: 'absolute', bottom: 22, left: 0, right: 0, display: 'flex', justifyContent: 'center' },
  shutter: { width: 74, height: 74, borderRadius: 999, background: 'rgba(255,255,255,0.3)', border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 56, height: 56, borderRadius: 999, background: '#fff' },

  preview: { width: '100%', maxWidth: 360, aspectRatio: '3 / 4', objectFit: 'cover', borderRadius: radius.card, boxShadow: shadow.card, marginBottom: 18 },
  spinner: { width: 44, height: 44, borderRadius: 999, marginTop: 22, border: `4px solid ${colors.border}`, borderTopColor: colors.green, animation: 'simmer-spin 0.8s linear infinite' },

  resultatKort: { width: '100%', maxWidth: 360, background: colors.card, borderRadius: radius.card, boxShadow: shadow.card, overflow: 'hidden', marginBottom: 18 },
  resultatFoto: { width: '100%', height: 180, objectFit: 'cover', display: 'block' },
  chip: { fontFamily: font.body, fontSize: 12.5, fontWeight: 600, color: colors.green, background: 'rgba(47,107,79,0.10)', padding: '5px 10px', borderRadius: radius.pill },

  // Historik
  historik: { width: '100%', maxWidth: 360, marginTop: 28 },
  historikTitel: { fontFamily: font.display, fontWeight: 600, fontSize: 18, color: colors.text, margin: '0 0 12px', letterSpacing: -0.3 },
  histItem: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: colors.card, border: 'none', borderRadius: 16, boxShadow: shadow.card, padding: 10, marginBottom: 10 },
  histThumb: { width: 52, height: 52, borderRadius: 12, objectFit: 'cover', flexShrink: 0 },
  histThumbTom: { background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 },
  histNavn: { fontFamily: font.body, fontWeight: 700, fontSize: 15, color: colors.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  histMeta: { fontFamily: font.body, fontSize: 12.5, color: colors.muted, margin: '3px 0 0' },
  histPil: { color: colors.mutedLight, fontSize: 18, flexShrink: 0, paddingRight: 6 },

  tilbageBtn: { fontFamily: font.body, fontSize: 14, fontWeight: 700, color: colors.green, background: 'none', border: 'none', padding: 0 },
}
