import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { hentLager } from '../data/lager'
import { billedeUrl, opskriftFarve, tidLabel, sværhedLabel, grad } from '../lib/recipeUtils'
import { colors, shadow, radius, font } from '../data/theme'

export default function Opskrift() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [opskrift, setOpskrift] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!cancelled) { setOpskrift(data); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [id])

  const lagerNavne = useMemo(
    () => new Set(hentLager().map((v) => v.navn.toLowerCase())),
    []
  )

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
  const ingredienser = opskrift.ingredients ?? []
  const har = ingredienser.filter((i) => lagerNavne.has((i.name ?? '').toLowerCase()))
  const mangler = ingredienser.filter((i) => !lagerNavne.has((i.name ?? '').toLowerCase()))

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
          {opskrift.servings && <span style={s.metaChip}>🍽 {opskrift.servings} pers.</span>}
        </div>

        {/* Kilde */}
        {opskrift.source && (
          <p style={s.kilde}>fra {opskrift.source}</p>
        )}

        {/* Beskrivelse */}
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
            <div style={s.ingrediensListe}>
              {har.map((i, idx) => (
                <div key={idx} style={s.ingrediensItem}>
                  <span style={s.harIkon}>✓</span>
                  <span style={s.ingrediensNavn}>{i.name}</span>
                  <span style={s.ingrediensMeta}>
                    {[i.amount, i.unit].filter(Boolean).join(' ')}
                  </span>
                </div>
              ))}
              {mangler.map((i, idx) => (
                <div key={idx} style={{ ...s.ingrediensItem, ...s.ingrediensMangler }}>
                  <span style={s.manglerIkon}>+</span>
                  <span style={s.ingrediensNavn}>{i.name}</span>
                  <span style={s.ingrediensMeta}>
                    {[i.amount, i.unit].filter(Boolean).join(' ')}
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

        {/* Kildelink */}
        {opskrift.source_url && (
          <a href={opskrift.source_url} target="_blank" rel="noopener noreferrer" style={s.kildeLink}>
            Se original opskrift på {opskrift.source} →
          </a>
        )}
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
  loadSpinner: { fontSize: 48, animation: 'spin 1.2s linear infinite' },
  loadTekst: { fontFamily: font.body, fontSize: 16, color: colors.muted, margin: 0 },
  backBtnInline: {
    fontFamily: font.body, fontWeight: 700, fontSize: 15, color: colors.green,
    background: 'none', border: 'none', padding: 0, marginTop: 8,
  },

  hero: {
    width: '100%', height: 280, position: 'relative', overflow: 'hidden',
  },
  heroImg: {
    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
  },
  backBtn: {
    position: 'absolute', top: 16, left: 16,
    width: 40, height: 40, borderRadius: 999,
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
    fontFamily: font.body, fontSize: 12.5, color: colors.mutedLight,
    margin: '8px 0 14px',
  },

  beskrivelse: {
    fontFamily: font.body, fontSize: 15, lineHeight: 1.55,
    color: colors.muted, margin: '0 0 24px',
  },

  sektion: { marginBottom: 28 },

  sektionHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  sektionTitel: {
    fontFamily: font.display, fontWeight: 800, fontSize: 20,
    color: colors.text, margin: 0, letterSpacing: -0.3,
  },
  harAltBadge: {
    fontFamily: font.body, fontSize: 12.5, fontWeight: 700,
    color: colors.green, background: 'rgba(47,107,79,0.10)',
    padding: '5px 12px', borderRadius: 999,
  },
  manglerBadge: {
    fontFamily: font.body, fontSize: 12.5, fontWeight: 700,
    color: colors.terracotta, background: 'rgba(224,138,91,0.12)',
    padding: '5px 12px', borderRadius: 999,
  },

  ingrediensListe: {
    background: colors.card, borderRadius: radius.card,
    boxShadow: shadow.card, overflow: 'hidden',
  },
  ingrediensItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '13px 16px',
    borderBottom: `1px solid ${colors.border}`,
  },
  ingrediensMangler: { opacity: 0.75 },
  harIkon: {
    fontFamily: font.body, fontSize: 16, fontWeight: 700,
    color: colors.green, width: 22, flexShrink: 0, textAlign: 'center',
  },
  manglerIkon: {
    fontFamily: font.body, fontSize: 18, fontWeight: 700,
    color: colors.terracotta, width: 22, flexShrink: 0, textAlign: 'center',
  },
  ingrediensNavn: {
    fontFamily: font.body, fontSize: 15, fontWeight: 600,
    color: colors.text, flex: 1,
  },
  ingrediensMeta: {
    fontFamily: font.body, fontSize: 13, color: colors.muted,
    flexShrink: 0,
  },

  stepsListe: { display: 'flex', flexDirection: 'column', gap: 14 },
  trin: {
    display: 'flex', gap: 14, alignItems: 'flex-start',
  },
  trinNr: {
    width: 32, height: 32, borderRadius: 999, flexShrink: 0,
    background: colors.green, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: font.display, fontWeight: 800, fontSize: 14,
  },
  trinTekst: {
    fontFamily: font.body, fontSize: 15, lineHeight: 1.55,
    color: colors.text, margin: '4px 0 0', flex: 1,
  },

  kildeLink: {
    display: 'block', fontFamily: font.body, fontSize: 14, fontWeight: 700,
    color: colors.green, textDecoration: 'none',
    padding: '14px 0', borderTop: `1px solid ${colors.border}`,
    marginTop: 8,
  },
}
