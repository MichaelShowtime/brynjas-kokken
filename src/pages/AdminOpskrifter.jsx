import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check, X, Clock } from 'lucide-react'
import { databases, DB_ID, COL, Query } from '../lib/appwrite'
import { hentAktivBruger } from '../data/auth'
import { erAdmin } from '../data/admin'
import { billedeUrl, grad, opskriftFarve } from '../lib/recipeUtils'
import { colors, shadow, radius, font } from '../data/theme'

export default function AdminOpskrifter() {
  const navigate = useNavigate()
  const bruger = hentAktivBruger()
  const [searchParams] = useSearchParams()
  const highlightId = searchParams.get('highlight')

  const [liste, setListe] = useState(null)
  const [handlerId, setHandlerId] = useState(null)
  const [fejl, setFejl] = useState(null)

  useEffect(() => {
    if (!erAdmin(bruger)) return
    hentKø()
  }, [])

  async function hentKø() {
    const res = await databases.listDocuments(DB_ID, COL.recipes, [
      Query.equal('status', 'pending'),
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ])
    setListe(res.documents.map((d) => ({ ...d, id: d.$id })))
  }

  async function håndter(id, nyStatus) {
    setHandlerId(id)
    setFejl(null)
    try {
      await databases.updateDocument(DB_ID, COL.recipes, id, { status: nyStatus })
      setListe((l) => l.filter((o) => o.id !== id))
    } catch (e) {
      setFejl('Handlingen fejlede: ' + (e.message ?? ''))
    }
    setHandlerId(null)
  }

  if (!erAdmin(bruger)) {
    return (
      <div style={s.page}>
        <p style={s.ikkeAdgang}>Du har ikke adgang til denne side.</p>
        <button style={s.tilbageBtn} onClick={() => navigate('/hjem')}>← Til forsiden</button>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <h1 style={s.titel}>Godkend opskrifter</h1>
      <p style={s.subtitel}>
        {liste === null ? 'Indlæser…' : `${liste.length} opskrift${liste.length === 1 ? '' : 'er'} afventer godkendelse`}
      </p>

      {fejl && <div style={s.fejlBoks}>{fejl}</div>}

      {liste?.length === 0 && (
        <div style={s.tom}>
          <Clock size={36} color={colors.mutedLight} />
          <p style={s.tomTekst}>Ingen opskrifter afventer lige nu 🎉</p>
        </div>
      )}

      {liste?.map((o) => {
        const farve = opskriftFarve(o.tags ?? [])
        const imgUrl = billedeUrl(o.storage_image, o.image_url)
        const ingredienser = (() => { try { return JSON.parse(o.ingredients_json ?? '[]') } catch { return [] } })()
        const trin = (() => { try { return JSON.parse(o.steps_json ?? '[]') } catch { return [] } })()
        const behandles = handlerId === o.id
        return (
          <div key={o.id} style={{ ...s.kort, ...(o.id === highlightId ? s.kortFremhævet : {}) }}>
            <div style={{ ...s.hero, background: grad(farve) }}>
              {imgUrl ? <img src={imgUrl} alt="" style={s.heroImg} /> : <span style={s.heroInitial}>{o.title.charAt(0)}</span>}
            </div>
            <div style={s.body}>
              <p style={s.titelRække}>{o.title}</p>
              <p style={s.meta}>
                Af {o.author_username ?? o.author ?? 'ukendt'} · {ingredienser.length} ingredienser · {trin.length} trin
                {o.servings ? ` · ${o.servings} pers.` : ''}{o.cook_time ? ` · ${o.cook_time}` : ''}
              </p>
              {o.description && <p style={s.beskrivelse}>{o.description}</p>}
              {o.tags?.length > 0 && (
                <div style={s.tagRow}>{o.tags.map((t) => <span key={t} style={s.tagChip}>{t}</span>)}</div>
              )}

              <details style={s.details}>
                <summary style={s.summary}>Se ingredienser og fremgangsmåde</summary>
                <div style={{ marginTop: 10 }}>
                  <p style={s.detailsLabel}>Ingredienser</p>
                  <ul style={s.liste}>
                    {ingredienser.map((i, idx) => <li key={idx}>{[i.amount, i.unit, i.name].filter(Boolean).join(' ')}</li>)}
                  </ul>
                  <p style={s.detailsLabel}>Fremgangsmåde</p>
                  <ol style={s.liste}>
                    {trin.map((t, idx) => <li key={idx}>{t}</li>)}
                  </ol>
                </div>
              </details>

              <div style={s.knapRow}>
                <button style={{ ...s.knap, ...s.godkendKnap, opacity: behandles ? 0.6 : 1 }}
                  onClick={() => håndter(o.id, 'approved')} disabled={behandles}>
                  <Check size={16} /> Godkend
                </button>
                <button style={{ ...s.knap, ...s.afvisKnap, opacity: behandles ? 0.6 : 1 }}
                  onClick={() => håndter(o.id, 'rejected')} disabled={behandles}>
                  <X size={16} /> Afvis
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const s = {
  page: { maxWidth: 560, margin: '0 auto', padding: '24px 20px 100px' },
  titel: { fontFamily: font.display, fontWeight: 600, fontSize: 26, color: colors.text, margin: 0, letterSpacing: -0.5 },
  subtitel: { fontFamily: font.body, fontSize: 13.5, color: colors.muted, margin: '6px 0 22px' },
  ikkeAdgang: { fontFamily: font.body, fontSize: 15, color: colors.text, textAlign: 'center', marginTop: 100 },
  tilbageBtn: { display: 'block', margin: '16px auto 0', background: 'none', border: 'none', fontFamily: font.body, fontSize: 14, fontWeight: 700, color: colors.green, cursor: 'pointer' },

  fejlBoks: { background: 'rgba(194,91,74,0.10)', color: colors.red, fontFamily: font.body, fontSize: 13.5, fontWeight: 600, padding: '12px 14px', borderRadius: 14, marginBottom: 16 },

  tom: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 0' },
  tomTekst: { fontFamily: font.body, fontSize: 14, color: colors.muted },

  kort: { background: colors.card, borderRadius: radius.card, boxShadow: shadow.card, overflow: 'hidden', marginBottom: 16 },
  kortFremhævet: { border: `2px solid ${colors.green}` },
  hero: { height: 140, position: 'relative' },
  heroImg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  heroInitial: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font.display, fontWeight: 700, fontSize: 44, color: 'rgba(255,255,255,0.75)' },
  body: { padding: 16 },
  titelRække: { fontFamily: font.display, fontWeight: 600, fontSize: 18, color: colors.text, margin: 0 },
  meta: { fontFamily: font.body, fontSize: 12.5, color: colors.muted, margin: '4px 0 0' },
  beskrivelse: { fontFamily: font.body, fontSize: 13.5, color: colors.text, margin: '10px 0 0', lineHeight: 1.5 },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tagChip: { fontFamily: font.body, fontSize: 11.5, fontWeight: 600, color: colors.green, background: 'rgba(47,107,79,0.10)', padding: '4px 9px', borderRadius: radius.pill },

  details: { marginTop: 12 },
  summary: { fontFamily: font.body, fontSize: 13, fontWeight: 700, color: colors.green, cursor: 'pointer' },
  detailsLabel: { fontFamily: font.body, fontSize: 12, fontWeight: 700, color: colors.mutedLight, margin: '10px 0 4px' },
  liste: { fontFamily: font.body, fontSize: 13, color: colors.text, margin: 0, paddingLeft: 20, lineHeight: 1.6 },

  knapRow: { display: 'flex', gap: 10, marginTop: 16 },
  knap: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px', fontFamily: font.body, fontSize: 14, fontWeight: 700, border: 'none', borderRadius: radius.button, cursor: 'pointer' },
  godkendKnap: { color: '#fff', background: colors.green },
  afvisKnap: { color: colors.red, background: 'rgba(194,91,74,0.10)' },
}
