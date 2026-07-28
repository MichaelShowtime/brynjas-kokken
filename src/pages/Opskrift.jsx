import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { databases, DB_ID, COL } from '../lib/appwrite'
import { hentLager, byggLagerOpslag } from '../data/lager'
import { billedeUrl, opskriftFarve, tidLabel, sværhedLabel, grad, normaliserOpskrift } from '../lib/recipeUtils'
import { colors, shadow, radius, font } from '../data/theme'
import { useLang } from '../lib/lang'
import { tilføjTilIndkøbsliste } from '../data/indkøbsliste'
import { gætEmoji, gætKategori } from '../lib/ingrediensUtils'
import { erGemt, toggleGemt } from '../data/gemte'
import { hentAktivBruger } from '../data/auth'
import { Bookmark, BookmarkCheck } from 'lucide-react'

// Splitter "Smør (kødsauce)" → ["Smør", "til kødsauce"]
function splitNavn(navn) {
  const m = (navn ?? '').match(/^(.*?)\s*\(([^)]+)\)\s*$/)
  return m ? [m[1].trim(), m[2].trim()] : [navn, null]
}

// ── Mængde-skalering ──────────────────────────────────────────────────────────

// Kendte brøk-tegn → decimalværdi
const BRØK = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1/3, '⅔': 2/3, '⅛': 0.125, '⅜': 0.375 }
const BRØK_INV = Object.entries(BRØK).sort((a, b) => a[1] - b[1])

function parseMængde(str) {
  if (!str) return null
  const s = String(str).trim()
  if (BRØK[s] !== undefined) return BRØK[s]
  // "1½", "2¼" osv.
  const blandet = s.match(/^(\d+)(½|¼|¾|⅓|⅔|⅛|⅜)$/)
  if (blandet) return parseInt(blandet[1]) + BRØK[blandet[2]]
  const tal = parseFloat(s.replace(',', '.'))
  return isNaN(tal) ? null : tal
}

function formatMængde(num) {
  if (num === null || num <= 0) return null
  const hel = Math.floor(num)
  const rest = num - hel
  // Find nærmeste brøk inden for ±0.09
  let bedsteBrøk = null, bedsteAfstand = 0.09
  for (const [tegn, val] of BRØK_INV) {
    const afstand = Math.abs(rest - val)
    if (afstand < bedsteAfstand) { bedsteAfstand = afstand; bedsteBrøk = tegn }
  }
  if (bedsteBrøk) return hel > 0 ? `${hel}${bedsteBrøk}` : bedsteBrøk
  // Afrund fornuftigt efter størrelse
  if (num >= 200) return String(Math.round(num / 5) * 5)
  if (num >= 50)  return String(Math.round(num))
  if (num >= 10)  return String(Math.round(num * 2) / 2)  // 0,5-skridt
  if (num >= 1)   return String(Math.round(num * 4) / 4 % 1 === 0
                    ? Math.round(num * 4) / 4
                    : parseFloat((Math.round(num * 4) / 4).toFixed(2)))
  return String(parseFloat(num.toFixed(2)))
}

function skalér(mængde, faktor) {
  if (faktor === 1 || !mængde) return mængde
  const tal = parseMængde(mængde)
  if (tal === null) return mængde   // tekst som "lidt" / "efter smag" — uændret
  return formatMængde(tal * faktor) ?? mængde
}

// ── Portionsvælger ────────────────────────────────────────────────────────────

function PortionVælger({ portioner, original, onChange, t }) {
  const enhed = original > 8 ? t('op.stk') : t('op.pers')

  return (
    <div style={pv.wrap}>
      <span style={pv.label}>{t('op.tilpasMængde')}</span>
      <div style={pv.kontrol}>
        <button
          style={{ ...pv.btn, opacity: portioner <= 1 ? 0.35 : 1 }}
          onClick={() => onChange(Math.max(1, portioner - 1))}
          disabled={portioner <= 1}
        >−</button>
        <span style={pv.tal}>
          {portioner}
          <span style={pv.enhed}> {enhed}</span>
        </span>
        <button
          style={{ ...pv.btn, opacity: portioner >= 100 ? 0.35 : 1 }}
          onClick={() => onChange(Math.min(100, portioner + 1))}
          disabled={portioner >= 100}
        >+</button>
      </div>
      {portioner !== original && (
        <button style={pv.nulstil} onClick={() => onChange(original)}>
          {t('op.nulstilTil')} {original}
        </button>
      )}
    </div>
  )
}

const pv = {
  wrap: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: colors.card, borderRadius: 16, boxShadow: shadow.card,
    padding: '12px 16px', marginBottom: 20,
  },
  label: {
    fontFamily: font.body, fontSize: 13.5, fontWeight: 600, color: colors.muted, flex: 1,
  },
  kontrol: {
    display: 'flex', alignItems: 'center', gap: 4,
  },
  btn: {
    width: 36, height: 36, borderRadius: 999, border: 'none',
    background: colors.bg, fontFamily: font.display, fontSize: 20, fontWeight: 500,
    color: colors.text, cursor: 'pointer', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  tal: {
    fontFamily: font.display, fontWeight: 600, fontSize: 20, color: colors.text,
    minWidth: 52, textAlign: 'center',
  },
  enhed: {
    fontFamily: font.body, fontSize: 13, fontWeight: 600, color: colors.muted,
  },
  nulstil: {
    fontFamily: font.body, fontSize: 12, fontWeight: 700, color: colors.green,
    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
}

import { hentNote, gemNote } from '../data/noter'
import { hentRatingsForOpskrift, gemRating } from '../data/ratings'
import { hentVennerFraDB } from '../data/venner'
import { beregnNæringsindhold } from '../data/nutrition'

// ── Hoved-komponent ───────────────────────────────────────────────────────────

export default function Opskrift() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useLang()
  const [opskrift, setOpskrift] = useState(null)
  const [loading, setLoading] = useState(true)
  const [gemt, setGemt] = useState(() => erGemt(id))
  const [portioner, setPortioner] = useState(null)
  const [noter, setNoter] = useState('')
  const [noteStatus, setNoteStatus] = useState('idle') // 'idle' | 'gemmer' | 'gemt'
  const debounceRef = useRef(null)
  const [chatÅben, setChatÅben] = useState(false)
  const [beskeder, setBeskeder] = useState(() => [
    { rolle: 'ai', tekst: null },
  ])
  const [chatInput, setChatInput] = useState('')
  const [sender, setSender] = useState(false)
  const chatBundRef = useRef(null)
  const [indkøbsToast, setIndkøbsToast] = useState(null)

  const [næring, setNæring]           = useState(null)   // null | false | { kalorier, ... }
  const [næringLoading, setNæringLoading] = useState(false)
  const [alleRatings, setAlleRatings] = useState([])
  const [venner, setVenner]           = useState([])
  const [ratingInput, setRatingInput] = useState(0)
  const [noteInput, setNoteInput]     = useState('')
  const [gemmerRating, setGemmerRating] = useState(false)
  const [ratingSaved, setRatingSaved]   = useState(false)

  useEffect(() => {
    let cancelled = false
    databases.getDocument(DB_ID, COL.recipes, id)
      .then((doc) => {
        if (!cancelled) {
          const data = normaliserOpskrift(doc)
          setOpskrift(data)
          const stdPortioner = hentAktivBruger()?.standardPortioner
          setPortioner(stdPortioner ?? data?.servings ?? 4)
          setLoading(false)
        }
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  const lagerOpslag = useMemo(() => byggLagerOpslag(hentLager()), [])

  useEffect(() => {
    let cancelled = false
    hentNote(id).then((tekst) => { if (!cancelled) setNoter(tekst) })
    return () => {
      cancelled = true
      clearTimeout(debounceRef.current)
    }
  }, [id])

  useEffect(() => {
    const bruger = hentAktivBruger()
    if (!opskrift || !bruger?.showNutrition) return
    let cancelled = false
    setNæringLoading(true)
    beregnNæringsindhold(opskrift.ingredients ?? [], opskrift.servings ?? 4)
      .then(data => { if (!cancelled) setNæring(data ?? false) })
      .catch(() => { if (!cancelled) setNæring(false) })
      .finally(() => { if (!cancelled) setNæringLoading(false) })
    return () => { cancelled = true }
  }, [opskrift])

  useEffect(() => {
    let cancelled = false
    const bruger = hentAktivBruger()
    Promise.all([
      hentRatingsForOpskrift(id),
      bruger?.id ? hentVennerFraDB(bruger.id) : Promise.resolve([]),
    ]).then(([ratings, vennerData]) => {
      if (cancelled) return
      setAlleRatings(ratings)
      setVenner(vennerData)
      const minEgen = ratings.find(r => r.user_id === bruger?.id)
      if (minEgen) {
        setRatingInput(minEgen.rating)
        setNoteInput(minEgen.note ?? '')
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [id])

  async function håndterGemRating() {
    const bruger = hentAktivBruger()
    if (!bruger?.id || !ratingInput || gemmerRating) return
    setGemmerRating(true)
    try {
      const gemt = await gemRating(id, ratingInput, noteInput, bruger.id)
      setAlleRatings(prev => {
        const uden = prev.filter(r => r.user_id !== bruger.id)
        return [...uden, gemt]
      })
      setRatingSaved(true)
      setTimeout(() => setRatingSaved(false), 2500)
    } catch (e) {
      console.error('Rating fejlede:', e)
    } finally {
      setGemmerRating(false)
    }
  }

  useEffect(() => {
    if (chatÅben && chatBundRef.current) {
      chatBundRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [beskeder, chatÅben])

  async function sendBesked() {
    const tekst = chatInput.trim()
    if (!tekst || sender) return
    const nyBeskeder = [...beskeder, { rolle: 'bruger', tekst }]
    setBeskeder(nyBeskeder)
    setChatInput('')
    setSender(true)
    try {
      const systemPrompt = `You are a helpful cooking assistant that EXCLUSIVELY answers questions about this specific recipe. ${t('op.chatLang')}

RECIPE: ${opskrift.title}
${opskrift.description ? `DESCRIPTION: ${opskrift.description}\n` : ''}SERVINGS: ${opskrift.servings ?? 'not specified'}
COOKING TIME: ${[opskrift.prep_time && `prep ${opskrift.prep_time} min`, opskrift.cook_time && `cook ${opskrift.cook_time} min`].filter(Boolean).join(', ') || 'not specified'}

INGREDIENTS:
${(opskrift.ingredients ?? []).map((i) => `- ${[i.name, i.amount, i.unit].filter(Boolean).join(' ')}`).join('\n')}

INSTRUCTIONS:
${(opskrift.steps ?? []).map((trin, idx) => `${idx + 1}. ${trin}`).join('\n')}${opskrift.tags?.length ? `\n\nTAGS: ${opskrift.tags.join(', ')}` : ''}

IMPORTANT RULE: You MAY ONLY answer questions related to this specific recipe — ingredients, cooking, substitutions, serving suggestions, tips and tricks. If the question is not about this dish, respond exactly: "${t('op.chatOffTopic')}"`
      const apiMessages = nyBeskeder.slice(1).map((m) => ({
        role: m.rolle === 'bruger' ? 'user' : 'assistant',
        content: m.tekst,
      }))
      const claudeRes = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: systemPrompt,
          messages: apiMessages,
        }),
      })
      if (!claudeRes.ok) throw new Error(`HTTP ${claudeRes.status}`)
      const { text: svar = t('op.chatFejl') } = await claudeRes.json()
      // Trim til maks 50 beskeder (25 runder) for at undgå hukommelseslæk
      setBeskeder((prev) => {
        const ny = [...prev, { rolle: 'ai', tekst: svar }]
        return ny.length > 50 ? ny.slice(ny.length - 50) : ny
      })
    } catch {
      setBeskeder((prev) => [...prev, { rolle: 'ai', tekst: t('op.chatFejl') }])
    } finally {
      setSender(false)
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 120 }}>
        <div style={{ height: 260, background: colors.border, borderRadius: '0 0 24px 24px' }} />
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ height: 28, width: '65%', background: colors.border, borderRadius: 8, marginBottom: 12 }} />
          <div style={{ height: 16, width: '40%', background: colors.border, borderRadius: 6, marginBottom: 20 }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {[80, 90, 70].map((w, i) => (
              <div key={i} style={{ height: 30, width: w, background: colors.border, borderRadius: 999 }} />
            ))}
          </div>
          {[1,2,3,4,5].map((i) => (
            <div key={i} style={{ height: 14, background: colors.border, borderRadius: 6, marginBottom: 10, width: i % 2 === 0 ? '80%' : '100%' }} />
          ))}
        </div>
      </div>
    )
  }

  if (!opskrift) {
    return (
      <div style={s.loadPage}>
        <p style={s.loadTekst}>{t('op.ikkeFundet')}</p>
        <button style={s.backBtnInline} onClick={() => navigate(-1)}>{t('op.tilbage')}</button>
      </div>
    )
  }

  // Kun ophavsmanden må se sin egen ventende/afviste opskrift — alle andre ser "ikke tilgængelig"
  const nuværendeBruger = hentAktivBruger()
  const erEjer = opskrift.created_by && opskrift.created_by === nuværendeBruger?.id
  if (opskrift.status && opskrift.status !== 'approved' && !erEjer) {
    return (
      <div style={s.loadPage}>
        <p style={s.loadTekst}>Denne opskrift er ikke tilgængelig endnu.</p>
        <button style={s.backBtnInline} onClick={() => navigate(-1)}>{t('op.tilbage')}</button>
      </div>
    )
  }

  const imgUrl = billedeUrl(opskrift.storage_image, opskrift.image_url)
  const farve = opskriftFarve(opskrift.tags)
  const tid = tidLabel(opskrift.prep_time, opskrift.cook_time)
  const sværhed = sværhedLabel(opskrift.difficulty)
  const originalPortioner = opskrift.servings ?? portioner
  const faktor = portioner / originalPortioner

  // Brug "stk" for store batches
  const portionEnhed = originalPortioner > 8 ? 'stk' : 'pers.'

  const ingredienser = opskrift.ingredients ?? []

  // Skalér råmængde til decimal (til sammenligning med lager — ingen formattering)
  const skalértDecimal = (amount) => {
    const tal = parseMængde(amount)
    return tal === null ? amount : String(tal * faktor)
  }

  // Gruppe-check: summer mængder pr. lager-vare, sammenlign med lager
  const skaleretIngredenser = ingredienser.map(i => ({
    name: i.name, amount: skalértDecimal(i.amount), unit: i.unit,
  }))
  const lagerRes = lagerOpslag.tjekAlle(skaleretIngredenser)
  const har     = ingredienser.filter((_, i) => lagerRes[i].fundet && lagerRes[i].nok)
  const mangler = ingredienser.filter((_, i) => !lagerRes[i].fundet || !lagerRes[i].nok)

  return (
    <div style={s.page}>
      {/* Hero */}
      <div style={{ ...s.hero, background: grad(farve) }}>
        {imgUrl && <img src={imgUrl} alt={opskrift.title} style={s.heroImg} />}
        <button style={s.backBtn} onClick={() => navigate(-1)}>←</button>
        <button
          style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.88)', border: 'none', borderRadius: 999, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(6px)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
          onClick={() => { const ny = toggleGemt(id); setGemt(ny) }}
        >
          {gemt
            ? <BookmarkCheck size={18} color={colors.green} />
            : <Bookmark size={18} color={colors.text} />}
        </button>
      </div>

      <div style={s.body}>
        {/* Tags */}
        {opskrift.tags?.length > 0 && (
          <div style={s.tagRække}>
            {opskrift.tags.slice(0, 5).map((t) => (
              <span key={t} style={s.tag}>{t}</span>
            ))}
          </div>
        )}

        {/* Titel */}
        <h1 style={s.titel}>{opskrift.title}</h1>

        {/* Meta-chips */}
        <div style={s.metaRække}>
          {tid && <span style={s.metaChip}>⏱ {tid}</span>}
          {sværhed && <span style={s.metaChip}>{sværhed}</span>}
          {opskrift.servings && (
            <span style={s.metaChip}>🍽 {portioner} {portionEnhed}</span>
          )}
        </div>

        {hentAktivBruger()?.showNutrition && (
          <NæringsPanel næring={næring} loading={næringLoading} portioner={portioner} />
        )}

        {erEjer && opskrift.status !== 'approved' && (
          <div style={s.statusBanner}>
            {opskrift.status === 'pending'
              ? '⏳ Denne opskrift afventer godkendelse og er kun synlig for dig lige nu.'
              : '✕ Denne opskrift blev ikke godkendt til offentlig visning. Redigér og send igen fra din profil.'}
          </div>
        )}

        {opskrift.created_by && (
          <p style={s.kilde}>
            Opskrift af{' '}
            <span style={s.forfatterLink} onClick={() => navigate(`/bruger/${opskrift.created_by}`)}>
              {opskrift.author_username ?? 'en bruger'}
            </span>
          </p>
        )}

        {opskrift.source && !opskrift.created_by && <p style={s.kilde}>{t('op.fra')} {opskrift.source}</p>}

        {opskrift.description && (
          <p style={s.beskrivelse}>{opskrift.description}</p>
        )}

        {/* Ingredienser */}
        {ingredienser.length > 0 && (
          <section style={s.sektion}>
            <div style={s.sektionHeader}>
              <h2 style={s.sektionTitel}>{t('op.ingredienser')}</h2>
              {mangler.length === 0
                ? <span style={s.harAltBadge}>{t('op.duHarAlt')}</span>
                : <span style={s.manglerBadge}>{mangler.length} {t('op.mangler')}</span>
              }
            </div>

            {/* Portionsvælger */}
            {opskrift.servings && (
              <PortionVælger
                portioner={portioner}
                original={originalPortioner}
                onChange={setPortioner}
                t={t}
              />
            )}

            <div style={s.ingrediensListe}>
              {ingredienser.map((i, idx) => {
                const r = lagerRes[idx]
                const nok = r.fundet && r.nok
                const [base, ctx] = splitNavn(i.name)
                const meta = [skalér(i.amount, faktor), i.unit].filter(Boolean).join(' ')
                return (
                  <div key={idx} style={nok ? s.ingrediensItem : { ...s.ingrediensItem, ...s.ingrediensMangler }}>
                    <span style={nok ? s.harIkon : s.manglerIkon}>{nok ? '✓' : '+'}</span>
                    <span style={{ flex: 1 }}>
                      <span style={s.ingrediensNavn}>{base}</span>
                      {ctx && <span style={s.ingrediensKontekst}>{ctx}</span>}
                    </span>
                    <span style={s.ingrediensMeta}>{meta}</span>
                  </div>
                )
              })}
            </div>

            {/* Indkøbsliste-knap */}
            {ingredienser.length > 0 && (
              <button
                style={s.indkøbsKnap}
                onClick={() => {
                  const køb = mangler.length > 0 ? mangler : ingredienser
                  const varer = køb.map((i) => ({
                    navn: i.name,
                    mængde: skalér(i.amount, faktor) ?? null,
                    enhed: i.unit ?? null,
                    emoji: gætEmoji(i.name),
                    kategori: gætKategori(i.name),
                    opskriftTitel: opskrift.title,
                    opskriftId: opskrift.id,
                  }))
                  tilføjTilIndkøbsliste(varer)
                  const antal = varer.length
                  setIndkøbsToast(`${antal} ${t('op.tilføjtBekræft')}`)
                  setTimeout(() => setIndkøbsToast(null), 3000)
                }}
              >
                {mangler.length > 0 ? t('op.tilføjIndkøb') : t('op.tilføjAlt')}
              </button>
            )}
            {indkøbsToast && (
              <div style={s.indkøbsToast}>{indkøbsToast}</div>
            )}
          </section>
        )}

        {/* Fremgangsmåde */}
        {opskrift.steps?.length > 0 && (
          <section style={s.sektion}>
            <h2 style={s.sektionTitel}>{t('op.fremgangsmåde')}</h2>
            <div style={s.stepsListe}>
              {opskrift.steps.map((trin, idx) => (
                <div key={idx} style={s.trin}>
                  <div style={s.trinNr}>{idx + 1}</div>
                  <div style={{ flex: 1 }}>
                    <p style={s.trinTekst}>{trin}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Rating */}
        <RatingSektion
          alleRatings={alleRatings}
          venner={venner}
          ratingInput={ratingInput}
          noteInput={noteInput}
          gemmerRating={gemmerRating}
          ratingSaved={ratingSaved}
          bruger={hentAktivBruger()}
          onRatingChange={setRatingInput}
          onNoteChange={setNoteInput}
          onGem={håndterGemRating}
        />

        {/* Noter */}
        <section style={s.sektion}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={s.sektionTitel}>{t('op.mineNoter')}</h2>
            {noteStatus === 'gemt' && <span style={{ fontFamily: font.body, fontSize: 12, color: colors.green }}>Gemt ✓</span>}
            {noteStatus === 'gemmer' && <span style={{ fontFamily: font.body, fontSize: 12, color: colors.muted }}>Gemmer…</span>}
          </div>
          <textarea
            value={noter}
            onChange={(e) => {
              const val = e.target.value
              setNoter(val)
              setNoteStatus('gemmer')
              clearTimeout(debounceRef.current)
              debounceRef.current = setTimeout(async () => {
                await gemNote(id, val)
                setNoteStatus('gemt')
                setTimeout(() => setNoteStatus('idle'), 2000)
              }, 1000)
            }}
            placeholder={t('op.noterPh')}
            style={s.noterFelt}
          />
        </section>

        {/* Kildelink */}
        {opskrift.source_url && (
          <a href={opskrift.source_url} target="_blank" rel="noopener noreferrer" style={s.kildeLink}>
            {t('op.seOriginal')} {opskrift.source} →
          </a>
        )}

        {/* Start cook mode */}
        <button style={s.startKnap} onClick={() => navigate(`/kok/${opskrift.id}`)}>
          {t('op.startKnap')}
        </button>
      </div>

      {/* AI Chat */}
      <style>{`
        @keyframes simmerSlideUp { from { transform: translateX(-50%) translateY(100%) } to { transform: translateX(-50%) translateY(0) } }
        @keyframes simmerDot { 0%,80%,100% { opacity:0.3 } 40% { opacity:1 } }
        .sd { animation: simmerDot 1.4s infinite; display:inline-block; margin:0 1px; }
        .sd:nth-child(2) { animation-delay:.2s }
        .sd:nth-child(3) { animation-delay:.4s }
      `}</style>

      {!chatÅben && (
        <button style={s.chatFab} onClick={() => setChatÅben(true)} aria-label="Spørg AI om opskriften">
          💬
        </button>
      )}

      {chatÅben && (
        <>
          <div style={s.chatOverlay} onClick={() => setChatÅben(false)} />
          <div style={s.chatDrawer}>
            <div style={s.chatHeader}>
              <div style={s.chatDragPil} />
              <span style={s.chatTitel}>{t('op.chatSpørg')}</span>
              <button style={s.chatLuk} onClick={() => setChatÅben(false)}>✕</button>
            </div>
            <div style={s.chatBeskeder}>
              {beskeder.map((m, i) => (
                <div key={i} style={m.rolle === 'bruger' ? s.chatRækkeBruger : s.chatRækkeAi}>
                  <div style={m.rolle === 'bruger' ? s.chatBobleBruger : s.chatBobbleAi}>
                    {m.tekst ?? t('op.chatVelkomst')}
                  </div>
                </div>
              ))}
              {sender && (
                <div style={s.chatRækkeAi}>
                  <div style={s.chatBobbleAi}>
                    <span className="sd">•</span>
                    <span className="sd">•</span>
                    <span className="sd">•</span>
                  </div>
                </div>
              )}
              <div ref={chatBundRef} />
            </div>
            <div style={s.chatInputRække}>
              <input
                style={s.chatInputFelt}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendBesked()}
                placeholder={t('op.chatPh')}
                disabled={sender}
              />
              <button
                style={{ ...s.chatSend, opacity: (!chatInput.trim() || sender) ? 0.4 : 1 }}
                onClick={sendBesked}
                disabled={!chatInput.trim() || sender}
              >↑</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── NæringsPanel ──────────────────────────────────────────────────────────────

function NæringsPanel({ næring, loading, portioner }) {
  const [infoÅben, setInfoÅben] = useState(false)

  if (loading) {
    return (
      <div style={np.wrap}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={np.skeleton} />
        ))}
      </div>
    )
  }

  if (næring === false || næring === null) {
    return næring === false
      ? <p style={np.utilgængelig}>Næringsindhold ikke tilgængeligt for denne ret</p>
      : null
  }

  const poster = [
    { label: 'Kalorier', value: næring.kalorier, enhed: 'kcal', fed: true },
    { label: 'Protein',  value: næring.protein,  enhed: 'g' },
    { label: 'Kulhyd.',  value: næring.kulhydrat, enhed: 'g' },
    { label: 'Fedt',     value: næring.fedt,      enhed: 'g' },
    { label: 'Fibre',    value: næring.fibre,      enhed: 'g' },
  ]

  return (
    <div style={np.container}>
      <div style={np.headerRække}>
        <span style={np.overskrift}>Per portion</span>
        <button style={np.infoKnap} onClick={() => setInfoÅben(v => !v)} aria-label="Info om næringsindhold">ⓘ</button>
      </div>
      {infoÅben && (
        <p style={np.infoTekst}>Estimeret næringsindhold baseret på ingredienserne — kan afvige fra det faktiske.</p>
      )}
      <div style={np.wrap}>
        {poster.map(({ label, value, enhed, fed }) => (
          <div key={label} style={np.celle}>
            <span style={{ ...np.værdi, ...(fed ? np.kalorie : {}) }}>~{value}</span>
            <span style={np.enhed}>{enhed}</span>
            <span style={np.label}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const np = {
  container: {
    marginBottom: 16,
    background: colors.card,
    borderRadius: 16,
    boxShadow: shadow.card,
    padding: '12px 14px',
  },
  headerRække: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  overskrift: {
    fontFamily: font.body, fontSize: 12, fontWeight: 700,
    color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  infoKnap: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: font.body, fontSize: 13, color: colors.mutedLight, padding: 0, lineHeight: 1,
  },
  infoTekst: {
    fontFamily: font.body, fontSize: 12, color: colors.muted,
    margin: '0 0 10px', fontStyle: 'italic', lineHeight: 1.5,
  },
  wrap: {
    display: 'flex', gap: 4, justifyContent: 'space-between',
  },
  celle: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
  },
  værdi: {
    fontFamily: font.display, fontWeight: 600, fontSize: 17, color: colors.text,
  },
  kalorie: { fontSize: 20, color: colors.green },
  enhed: {
    fontFamily: font.body, fontSize: 10, fontWeight: 600, color: colors.muted,
  },
  label: {
    fontFamily: font.body, fontSize: 11, color: colors.mutedLight,
  },
  skeleton: {
    flex: 1, height: 48, background: colors.border,
    borderRadius: 10, animation: 'pulse 1.4s ease-in-out infinite',
  },
  utilgængelig: {
    fontFamily: font.body, fontSize: 12.5, color: colors.mutedLight,
    fontStyle: 'italic', margin: '0 0 14px',
  },
}

// ── RatingStjerner ────────────────────────────────────────────────────────────

function RatingStjerner({ value, hover, interactive, onHover, onLeave, onClick, size = 28 }) {
  const aktiv = hover || value
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          disabled={!interactive}
          style={{
            background: 'none', border: 'none', padding: '2px 3px',
            fontSize: size, lineHeight: 1, cursor: interactive ? 'pointer' : 'default',
            color: n <= aktiv ? '#F5A623' : colors.border,
            transition: 'color 0.1s',
          }}
          onMouseEnter={() => onHover?.(n)}
          onMouseLeave={() => onLeave?.()}
          onClick={() => onClick?.(n)}
        >★</button>
      ))}
    </div>
  )
}

// ── RatingSektion ─────────────────────────────────────────────────────────────

function RatingSektion({ alleRatings, venner, ratingInput, noteInput, gemmerRating, ratingSaved, bruger, onRatingChange, onNoteChange, onGem }) {
  const [hover, setHover] = useState(0)

  const antalRatings = alleRatings.length
  const snit = antalRatings > 0
    ? (alleRatings.reduce((s, r) => s + r.rating, 0) / antalRatings).toFixed(1)
    : null

  const vennerIds = new Set(venner.map(v => v.id))
  const vennerRatings = alleRatings
    .filter(r => vennerIds.has(r.user_id))
    .map(r => {
      const ven = venner.find(v => v.id === r.user_id)
      return { ...r, ven }
    })

  const MAX_NOTE = 300

  return (
    <section style={s.sektion}>
      {/* ── Gennemsnit ── */}
      <div style={rs.header}>
        <h2 style={s.sektionTitel}>Rating</h2>
        {snit && (
          <span style={rs.snitBadge}>
            <span style={{ color: '#F5A623' }}>★</span> {snit}
            <span style={rs.antalTxt}> ({antalRatings})</span>
          </span>
        )}
      </div>

      {/* ── Min rating ── */}
      <div style={rs.kortWrap}>
        <p style={rs.label}>{bruger ? 'Din rating' : 'Log ind for at rate'}</p>
        <RatingStjerner
          value={ratingInput}
          hover={hover}
          interactive={!!bruger}
          onHover={bruger ? setHover : undefined}
          onLeave={bruger ? () => setHover(0) : undefined}
          onClick={bruger ? onRatingChange : undefined}
        />

        {bruger && ratingInput > 0 && (
          <>
            <div style={rs.noteWrap}>
              <textarea
                value={noteInput}
                onChange={(e) => onNoteChange(e.target.value.slice(0, MAX_NOTE))}
                placeholder="Din note (valgfrit) — hvad syntes du? Tips? Ændringer?"
                style={rs.noteFelt}
                rows={3}
              />
              <span style={{ ...rs.tæller, color: noteInput.length >= MAX_NOTE - 20 ? colors.terracotta : colors.muted }}>
                {noteInput.length}/{MAX_NOTE}
              </span>
            </div>
            <button
              style={{ ...rs.gemKnap, opacity: gemmerRating ? 0.6 : 1 }}
              disabled={gemmerRating}
              onClick={onGem}
            >
              {ratingSaved ? '✓ Gemt' : gemmerRating ? 'Gemmer…' : 'Gem rating'}
            </button>
          </>
        )}
      </div>

      {/* ── Venners ratings ── */}
      <div style={rs.vennerSektionHeader}>
        <span style={rs.vennerLabel}>Venners ratings</span>
      </div>

      {vennerRatings.length === 0 ? (
        <p style={rs.tomState}>Ingen af dine venner har prøvet denne ret endnu.</p>
      ) : (
        <div style={rs.vennerListe}>
          {vennerRatings.map((r) => (
            <div key={r.$id} style={rs.venKort}>
              <div style={rs.venAvatar}>
                {r.ven?.avatarUrl
                  ? <img src={r.ven.avatarUrl} alt={r.ven.navn} style={rs.venAvatarImg} />
                  : <span style={rs.venEmoji}>{r.ven?.emoji ?? '🧑‍🍳'}</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={rs.venNavn}>{r.ven?.navn} {r.ven?.efternavn}</div>
                <RatingStjerner value={r.rating} interactive={false} size={16} />
                {r.note ? <p style={rs.venNote}>"{r.note}"</p> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

const rs = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  snitBadge: {
    fontFamily: font.body, fontSize: 14, fontWeight: 700, color: colors.text,
    background: colors.card, boxShadow: shadow.card,
    padding: '5px 12px', borderRadius: 999,
  },
  antalTxt: { fontWeight: 400, color: colors.muted },

  kortWrap: {
    background: colors.card, borderRadius: 16, boxShadow: shadow.card,
    padding: '16px', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10,
  },
  label: { fontFamily: font.body, fontSize: 13, fontWeight: 600, color: colors.muted, margin: 0 },

  noteWrap: { position: 'relative' },
  noteFelt: {
    width: '100%', padding: '11px 12px', paddingBottom: 22,
    fontFamily: font.body, fontSize: 14, color: colors.text, lineHeight: 1.5,
    background: colors.bg, border: `1.5px solid ${colors.border}`,
    borderRadius: 12, outline: 'none', resize: 'none', boxSizing: 'border-box',
  },
  tæller: {
    position: 'absolute', bottom: 8, right: 10,
    fontFamily: font.body, fontSize: 11, transition: 'color 0.2s',
  },

  gemKnap: {
    alignSelf: 'flex-end', fontFamily: font.body, fontWeight: 700, fontSize: 14,
    color: '#fff', background: colors.green,
    border: 'none', borderRadius: 999, padding: '10px 22px', cursor: 'pointer',
    transition: 'opacity 0.15s',
  },

  vennerSektionHeader: { marginBottom: 10 },
  vennerLabel: { fontFamily: font.body, fontSize: 13, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },

  tomState: { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: '4px 0 0', fontStyle: 'italic' },

  vennerListe: { display: 'flex', flexDirection: 'column', gap: 10 },
  venKort: {
    display: 'flex', gap: 12, alignItems: 'flex-start',
    background: colors.card, borderRadius: 14, boxShadow: shadow.card, padding: '12px 14px',
  },
  venAvatar: { width: 38, height: 38, borderRadius: 999, overflow: 'hidden', flexShrink: 0, background: colors.border, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  venAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  venEmoji: { fontSize: 20 },
  venNavn: { fontFamily: font.body, fontSize: 13.5, fontWeight: 700, color: colors.text, marginBottom: 3 },
  venNote: { fontFamily: font.body, fontSize: 13, color: colors.muted, margin: '5px 0 0', lineHeight: 1.4, fontStyle: 'italic' },
}

const s = {
  page: { maxWidth: 480, margin: '0 auto', minHeight: '100%', paddingBottom: 80 },

  loadPage: {
    maxWidth: 480, margin: '0 auto', minHeight: '60vh',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 12, padding: 24,
  },
  loadSpinner: { fontSize: 48 },
  loadTekst: { fontFamily: font.body, fontSize: 16, color: colors.muted, margin: 0 },
  backBtnInline: {
    fontFamily: font.body, fontWeight: 700, fontSize: 15, color: colors.green,
    background: 'none', border: 'none', padding: 0, marginTop: 8,
  },

  hero: { width: '100%', height: 280, position: 'relative', overflow: 'hidden' },
  heroImg: {
    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
  },
  backBtn: {
    position: 'absolute', top: 16, left: 16, width: 40, height: 40, borderRadius: 999,
    background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(8px)',
    border: 'none', color: '#fff', fontSize: 20, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2, cursor: 'pointer',
  },

  body: { padding: '20px 20px 0' },

  tagRække: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  tag: {
    fontFamily: font.body, fontSize: 12, fontWeight: 700,
    color: colors.green, background: 'rgba(47,107,79,0.10)',
    padding: '5px 11px', borderRadius: 999,
  },

  titel: {
    fontFamily: font.display, fontWeight: 600, fontSize: 28, letterSpacing: -0.5,
    color: colors.text, margin: '0 0 14px', lineHeight: 1.1,
  },

  metaRække: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  metaChip: {
    fontFamily: font.body, fontSize: 13, fontWeight: 600,
    color: colors.muted, background: colors.card, boxShadow: shadow.card,
    padding: '6px 12px', borderRadius: 999,
  },

  kilde: {
    fontFamily: font.body, fontSize: 12.5, color: colors.mutedLight, margin: '8px 0 14px',
  },
  forfatterLink: { color: colors.green, fontWeight: 700, cursor: 'pointer' },
  statusBanner: {
    fontFamily: font.body, fontSize: 13, fontWeight: 600, color: '#8A5A2B',
    background: 'rgba(181,118,61,0.12)', border: '1px solid rgba(181,118,61,0.3)',
    borderRadius: 12, padding: '10px 14px', margin: '10px 0', lineHeight: 1.5,
  },

  beskrivelse: {
    fontFamily: font.body, fontSize: 15, lineHeight: 1.55, color: colors.muted, margin: '0 0 24px',
  },

  sektion: { marginBottom: 28 },

  sektionHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
  },
  sektionTitel: {
    fontFamily: font.display, fontWeight: 600, fontSize: 20,
    color: colors.text, margin: 0, letterSpacing: -0.3,
  },
  harAltBadge: {
    fontFamily: font.body, fontSize: 12.5, fontWeight: 700,
    color: colors.green, background: 'rgba(47,107,79,0.10)', padding: '5px 12px', borderRadius: 999,
  },
  manglerBadge: {
    fontFamily: font.body, fontSize: 12.5, fontWeight: 700,
    color: colors.terracotta, background: 'rgba(224,138,91,0.12)', padding: '5px 12px', borderRadius: 999,
  },


  ingrediensListe: {
    background: colors.card, borderRadius: radius.card, boxShadow: shadow.card, overflow: 'hidden',
  },
  ingrediensItem: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
    borderBottom: `1px solid ${colors.border}`,
  },
  ingrediensMangler: { opacity: 0.72 },
  harIkon: {
    fontFamily: font.body, fontSize: 16, fontWeight: 700, color: colors.green,
    width: 22, flexShrink: 0, textAlign: 'center',
  },
  manglerIkon: {
    fontFamily: font.body, fontSize: 18, fontWeight: 700, color: colors.terracotta,
    width: 22, flexShrink: 0, textAlign: 'center',
  },
  ingrediensNavn: {
    fontFamily: font.body, fontSize: 15, fontWeight: 600, color: colors.text, flex: 1,
  },
  ingrediensMeta: {
    fontFamily: font.body, fontSize: 13, color: colors.muted, flexShrink: 0,
  },
  ingrediensKontekst: {
    display: 'block', fontFamily: font.body, fontSize: 11.5,
    color: colors.muted, fontStyle: 'italic', marginTop: 1,
  },

  indkøbsKnap: {
    width: '100%', marginTop: 14,
    fontFamily: font.body, fontWeight: 700, fontSize: 14,
    color: colors.green, background: 'rgba(47,107,79,0.08)',
    border: `1.5px solid rgba(47,107,79,0.25)`, borderRadius: radius.button,
    padding: '13px', cursor: 'pointer', textAlign: 'center',
  },
  indkøbsToast: {
    marginTop: 10, padding: '10px 14px', background: colors.green,
    color: '#fff', borderRadius: 12, fontFamily: font.body,
    fontSize: 13.5, fontWeight: 600, textAlign: 'center',
  },

  stepsListe: { display: 'flex', flexDirection: 'column', gap: 14 },
  trin: { display: 'flex', gap: 14, alignItems: 'flex-start' },
  trinNr: {
    width: 32, height: 32, borderRadius: 999, flexShrink: 0,
    background: colors.green, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: font.display, fontWeight: 600, fontSize: 14,
  },
  trinTekst: {
    fontFamily: font.body, fontSize: 15, lineHeight: 1.55, color: colors.text, margin: '4px 0 0', flex: 1,
  },

  kildeLink: {
    display: 'block', fontFamily: font.body, fontSize: 14, fontWeight: 700,
    color: colors.green, textDecoration: 'none',
    padding: '14px 0', borderTop: `1px solid ${colors.border}`, marginTop: 8,
  },

  noterFelt: {
    width: '100%', minHeight: 100, padding: '13px 14px',
    fontFamily: font.body, fontSize: 14.5, color: colors.text, lineHeight: 1.55,
    background: colors.card, border: `1.5px solid ${colors.border}`,
    borderRadius: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box',
    boxShadow: shadow.card,
  },

  startKnap: {
    display: 'block', width: '100%', padding: '16px 0', marginTop: 16, marginBottom: 8,
    fontFamily: font.body, fontSize: 16, fontWeight: 800,
    color: '#fff', background: colors.green,
    border: 'none', borderRadius: radius.button, cursor: 'pointer',
    boxShadow: shadow.fab,
  },

  // ── Chat ──────────────────────────────────────────────────────────────────────
  chatFab: {
    position: 'fixed', bottom: 88, right: 20, zIndex: 200,
    width: 52, height: 52, borderRadius: 999,
    background: colors.green, border: 'none',
    boxShadow: shadow.fab, fontSize: 22, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  chatOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.32)', zIndex: 290,
  },
  chatDrawer: {
    position: 'fixed', bottom: 0, left: '50%',
    transform: 'translateX(-50%)',
    width: '100%', maxWidth: 480,
    background: colors.bg,
    borderRadius: '20px 20px 0 0',
    boxShadow: '0 -4px 28px rgba(0,0,0,0.14)',
    zIndex: 300,
    display: 'flex', flexDirection: 'column',
    maxHeight: '72vh',
    animation: 'simmerSlideUp 0.28s cubic-bezier(0.34,1.2,0.64,1) both',
  },
  chatHeader: {
    display: 'flex', alignItems: 'center',
    padding: '14px 16px 10px',
    borderBottom: `1px solid ${colors.border}`,
    position: 'relative', flexShrink: 0,
  },
  chatDragPil: {
    position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
    width: 36, height: 4, borderRadius: 999, background: colors.border,
  },
  chatTitel: {
    fontFamily: font.display, fontWeight: 600, fontSize: 15.5,
    color: colors.text, flex: 1, textAlign: 'center', marginTop: 10,
  },
  chatLuk: {
    background: 'none', border: 'none', fontSize: 17, color: colors.muted,
    cursor: 'pointer', padding: '4px 2px', marginTop: 10, lineHeight: 1,
  },
  chatBeskeder: {
    flex: 1, overflowY: 'auto', padding: '14px 14px 8px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  chatRækkeBruger: { display: 'flex', justifyContent: 'flex-end' },
  chatRækkeAi:    { display: 'flex', justifyContent: 'flex-start' },
  chatBobleBruger: {
    maxWidth: '78%',
    background: colors.green, color: '#fff',
    padding: '10px 14px',
    borderRadius: '18px 18px 4px 18px',
    fontFamily: font.body, fontSize: 14.5, lineHeight: 1.45,
  },
  chatBobbleAi: {
    maxWidth: '78%',
    background: colors.card, color: colors.text,
    padding: '10px 14px',
    borderRadius: '18px 18px 18px 4px',
    fontFamily: font.body, fontSize: 14.5, lineHeight: 1.45,
    boxShadow: shadow.card,
  },
  chatInputRække: {
    display: 'flex', gap: 8, padding: '10px 14px 22px',
    borderTop: `1px solid ${colors.border}`, flexShrink: 0,
  },
  chatInputFelt: {
    flex: 1, padding: '11px 14px',
    fontFamily: font.body, fontSize: 14.5, color: colors.text,
    background: colors.card, border: `1.5px solid ${colors.border}`,
    borderRadius: 999, outline: 'none',
  },
  chatSend: {
    width: 42, height: 42, borderRadius: 999, flexShrink: 0,
    background: colors.green, border: 'none',
    color: '#fff', fontSize: 18, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
}
