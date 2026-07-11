import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bookmark, BookmarkX } from 'lucide-react'
import { databases, DB_ID, COL, Query } from '../lib/appwrite'
import { hentGemte, toggleGemt } from '../data/gemte'
import { billedeUrl, opskriftFarve, grad, tidLabel, sværhedLabel } from '../lib/recipeUtils'
import { colors, shadow, radius, font } from '../data/theme'
import { useLang } from '../lib/lang'

export default function Gemte() {
  const navigate = useNavigate()
  const { lang } = useLang()
  const [opskrifter, setOpskrifter] = useState([])
  const [loading, setLoading] = useState(true)
  const [gemteIds, setGemteIds] = useState(() => hentGemte())

  useEffect(() => {
    const ids = hentGemte()
    setGemteIds(ids)
    if (!ids.length) { setLoading(false); return }
    databases.listDocuments(DB_ID, COL.recipes, [Query.equal('$id', ids), Query.limit(ids.length)])
      .then(({ documents }) => {
        const sorteret = documents.map(d => ({ ...d, id: d.$id }))
          .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
        setOpskrifter(sorteret)
        setLoading(false)
      })
  }, [])

  function håndterFjern(id) {
    toggleGemt(id)
    const nyIds = gemteIds.filter(x => x !== id)
    setGemteIds(nyIds)
    setOpskrifter(prev => prev.filter(o => o.id !== id))
  }

  return (
    <div style={s.page}>
      <header style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>←</button>
        <h1 style={s.titel}>{lang === 'en' ? 'Saved recipes' : 'Gemte opskrifter'}</h1>
      </header>

      {loading ? (
        <div style={s.liste}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} style={s.skeleton} />)}
        </div>
      ) : opskrifter.length === 0 ? (
        <div style={s.tom}>
          <Bookmark size={48} color={colors.border} strokeWidth={1.5} />
          <p style={s.tomTitel}>{lang === 'en' ? 'Nothing saved yet' : 'Intet gemt endnu'}</p>
          <p style={s.tomSub}>{lang === 'en' ? 'Bookmark recipes to find them here' : 'Bogmærk opskrifter for at finde dem her'}</p>
          <button style={s.primærKnap} onClick={() => navigate('/galleri')}>
            {lang === 'en' ? 'Browse recipes' : 'Se opskrifter'}
          </button>
        </div>
      ) : (
        <div style={s.liste}>
          {opskrifter.map(o => (
            <GemtKort
              key={o.id}
              opskrift={o}
              onÅbn={() => navigate(`/opskrift/${o.id}`)}
              onFjern={() => håndterFjern(o.id)}
              lang={lang}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function GemtKort({ opskrift: o, onÅbn, onFjern, lang }) {
  const imgUrl = billedeUrl(o.storage_image, o.image_url)
  const farve = opskriftFarve(o.tags)
  const tid = tidLabel(o.prep_time, o.cook_time)
  const sværhed = sværhedLabel(o.difficulty)
  const meta = [tid && `⏱ ${tid}`, sværhed].filter(Boolean).join(' · ')

  return (
    <div style={s.kort}>
      <button style={s.kortHoved} onClick={onÅbn}>
        <div style={{ ...s.thumb, background: grad(farve) }}>
          {imgUrl && <img src={imgUrl} alt={o.title} style={s.thumbImg} />}
        </div>
        <div style={s.kortTekst}>
          <p style={s.kortTitel}>{o.title}</p>
          {meta && <p style={s.kortMeta}>{meta}</p>}
          {o.description && (
            <p style={s.kortDesc}>
              {o.description.length > 80 ? o.description.slice(0, 80) + '…' : o.description}
            </p>
          )}
        </div>
      </button>
      <button style={s.fjernBtn} onClick={onFjern} aria-label={lang === 'en' ? 'Remove bookmark' : 'Fjern bogmærke'}>
        <BookmarkX size={20} color={colors.muted} />
      </button>
    </div>
  )
}

const s = {
  page: { maxWidth: 480, margin: '0 auto', padding: '0 0 120px', minHeight: '100%', background: colors.bg },
  header: { display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 16px', position: 'sticky', top: 'env(safe-area-inset-top, 0px)', background: colors.bg, zIndex: 10 },
  backBtn: { background: 'none', border: 'none', fontSize: 22, color: colors.green, cursor: 'pointer', padding: '4px 6px', lineHeight: 1 },
  titel: { fontFamily: font.display, fontWeight: 600, fontSize: 24, color: colors.text, margin: 0, letterSpacing: -0.4 },
  liste: { display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 16px' },
  skeleton: { height: 96, borderRadius: radius.card, background: colors.border },
  tom: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 32px', textAlign: 'center' },
  tomTitel: { fontFamily: font.display, fontWeight: 600, fontSize: 19, color: colors.text, margin: 0, letterSpacing: -0.3 },
  tomSub: { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: 0, lineHeight: 1.55, maxWidth: 260 },
  primærKnap: { fontFamily: font.body, fontWeight: 700, fontSize: 14, color: '#fff', background: colors.green, border: 'none', borderRadius: 999, padding: '10px 22px', cursor: 'pointer', marginTop: 4 },
  kort: { background: colors.card, borderRadius: radius.card, boxShadow: shadow.card, display: 'flex', alignItems: 'stretch', overflow: 'hidden' },
  kortHoved: { flex: 1, display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0 12px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', minWidth: 0 },
  thumb: { width: 72, height: 72, borderRadius: 10, flexShrink: 0, overflow: 'hidden', position: 'relative' },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  kortTekst: { flex: 1, minWidth: 0 },
  kortTitel: { fontFamily: font.body, fontWeight: 700, fontSize: 14.5, color: colors.text, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  kortMeta: { fontFamily: font.body, fontSize: 12, fontWeight: 600, color: colors.muted, margin: '0 0 3px' },
  kortDesc: { fontFamily: font.body, fontSize: 12.5, color: colors.muted, margin: 0, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  fjernBtn: { background: 'none', border: 'none', padding: '0 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, borderLeft: `1px solid ${colors.border}` },
}
