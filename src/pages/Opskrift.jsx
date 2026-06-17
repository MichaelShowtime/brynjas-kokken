import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { hentLager, byggLagerOpslag } from '../data/lager'
import { billedeUrl, opskriftFarve, tidLabel, sværhedLabel, grad } from '../lib/recipeUtils'
import { colors, shadow, radius, font } from '../data/theme'

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

function PortionVælger({ portioner, original, onChange }) {
  // Brug "stk" for store batches (kager, cookies, kugler), ellers "pers."
  const enhed = original > 8 ? 'stk' : 'pers.'

  return (
    <div style={pv.wrap}>
      <span style={pv.label}>Tilpas mængde</span>
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
          Nulstil til {original}
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
    background: colors.bg, fontFamily: font.display, fontSize: 20, fontWeight: 700,
    color: colors.text, cursor: 'pointer', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  tal: {
    fontFamily: font.display, fontWeight: 800, fontSize: 20, color: colors.text,
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

// ── Noter (lokalt pr. opskrift) ────────────────────────────────────────────────

const NOTER_KEY = (id) => `brynjas_noter_${id}`
function hentNoter(id) { try { return localStorage.getItem(NOTER_KEY(id)) ?? '' } catch { return '' } }
function gemNoter(id, tekst) { try { localStorage.setItem(NOTER_KEY(id), tekst) } catch {} }

// ── Hoved-komponent ───────────────────────────────────────────────────────────

export default function Opskrift() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [opskrift, setOpskrift] = useState(null)
  const [loading, setLoading] = useState(true)
  const [portioner, setPortioner] = useState(null)
  const [noter, setNoter] = useState('')

  useEffect(() => {
    let cancelled = false
    supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!cancelled) {
          setOpskrift(data)
          setPortioner(data?.servings ?? 4)
          setNoter(hentNoter(id))
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [id])

  const lagerOpslag = useMemo(() => byggLagerOpslag(hentLager()), [])

  if (loading) {
    return (
      <div style={s.loadPage}>
        <div style={s.loadSpinner}>🍳</div>
        <p style={s.loadTekst}>Henter opskrift…</p>
      </div>
    )
  }

  if (!opskrift) {
    return (
      <div style={s.loadPage}>
        <p style={s.loadTekst}>Opskrift ikke fundet</p>
        <button style={s.backBtnInline} onClick={() => navigate(-1)}>← Tilbage</button>
      </div>
    )
  }

  const imgUrl = billedeUrl(opskrift.storage_image)
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

  const tjek = (i) => lagerOpslag.harNok(i.name, skalértDecimal(i.amount), i.unit)
  const har = ingredienser.filter((i) => { const r = tjek(i); return r.fundet && r.nok })
  const mangler = ingredienser.filter((i) => { const r = tjek(i); return !r.fundet || !r.nok })

  return (
    <div style={s.page}>
      {/* Hero */}
      <div style={{ ...s.hero, background: grad(farve) }}>
        {imgUrl && <img src={imgUrl} alt={opskrift.title} style={s.heroImg} />}
        <button style={s.backBtn} onClick={() => navigate(-1)}>←</button>
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

        {opskrift.source && <p style={s.kilde}>fra {opskrift.source}</p>}

        {opskrift.description && (
          <p style={s.beskrivelse}>{opskrift.description}</p>
        )}

        {/* Ingredienser */}
        {ingredienser.length > 0 && (
          <section style={s.sektion}>
            <div style={s.sektionHeader}>
              <h2 style={s.sektionTitel}>Ingredienser</h2>
              {mangler.length === 0
                ? <span style={s.harAltBadge}>Du har alt ✓</span>
                : <span style={s.manglerBadge}>{mangler.length} mangler</span>
              }
            </div>

            {/* Portionsvælger */}
            {opskrift.servings && (
              <PortionVælger
                portioner={portioner}
                original={originalPortioner}
                onChange={setPortioner}
              />
            )}

            <div style={s.ingrediensListe}>
              {har.map((i, idx) => (
                <div key={idx} style={s.ingrediensItem}>
                  <span style={s.harIkon}>✓</span>
                  <span style={s.ingrediensNavn}>{i.name}</span>
                  <span style={s.ingrediensMeta}>
                    {[skalér(i.amount, faktor), i.unit].filter(Boolean).join(' ')}
                  </span>
                </div>
              ))}
              {mangler.map((i, idx) => (
                <div key={idx} style={{ ...s.ingrediensItem, ...s.ingrediensMangler }}>
                  <span style={s.manglerIkon}>+</span>
                  <span style={s.ingrediensNavn}>{i.name}</span>
                  <span style={s.ingrediensMeta}>
                    {[skalér(i.amount, faktor), i.unit].filter(Boolean).join(' ')}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Fremgangsmåde */}
        {opskrift.steps?.length > 0 && (
          <section style={s.sektion}>
            <h2 style={s.sektionTitel}>Fremgangsmåde</h2>
            <div style={s.stepsListe}>
              {opskrift.steps.map((trin, idx) => (
                <div key={idx} style={s.trin}>
                  <div style={s.trinNr}>{idx + 1}</div>
                  <p style={s.trinTekst}>{trin}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Noter */}
        <section style={s.sektion}>
          <h2 style={s.sektionTitel}>Mine noter</h2>
          <textarea
            value={noter}
            onChange={(e) => { setNoter(e.target.value); gemNoter(id, e.target.value) }}
            placeholder="Skriv dine egne noter, tilpasninger eller tip her…"
            style={s.noterFelt}
          />
        </section>

        {/* Kildelink */}
        {opskrift.source_url && (
          <a href={opskrift.source_url} target="_blank" rel="noopener noreferrer" style={s.kildeLink}>
            Se original opskrift på {opskrift.source} →
          </a>
        )}

        {/* Start cook mode */}
        <button style={s.startKnap} onClick={() => navigate(`/kok/${opskrift.id}`)}>
          🍳 Start tilberedning
        </button>
      </div>
    </div>
  )
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
    fontFamily: font.display, fontWeight: 800, fontSize: 28, letterSpacing: -0.5,
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

  beskrivelse: {
    fontFamily: font.body, fontSize: 15, lineHeight: 1.55, color: colors.muted, margin: '0 0 24px',
  },

  sektion: { marginBottom: 28 },

  sektionHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
  },
  sektionTitel: {
    fontFamily: font.display, fontWeight: 800, fontSize: 20,
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

  stepsListe: { display: 'flex', flexDirection: 'column', gap: 14 },
  trin: { display: 'flex', gap: 14, alignItems: 'flex-start' },
  trinNr: {
    width: 32, height: 32, borderRadius: 999, flexShrink: 0,
    background: colors.green, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: font.display, fontWeight: 800, fontSize: 14,
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
}
