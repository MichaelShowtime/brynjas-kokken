import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { hentAktivBruger } from '../data/auth'
import { billedeUrl, opskriftFarve, grad, tidLabel, sværhedLabel } from '../lib/recipeUtils'
import { colors, shadow, radius, font } from '../data/theme'

const SEKTIONER = [
  { id: 'til-dig',       label: 'Tilpasset til dig',      emoji: '⭐', filter: (r, tags) => r.tags?.some(t => tags.includes(t)) },
  { id: 'hurtige',       label: 'Hurtige hverdagsretter', emoji: '⚡', filter: (r) => r.tags?.includes('hurtig') || (r.prep_time ?? 0) + (r.cook_time ?? 0) <= 30 },
  { id: 'vegetar',       label: 'Vegetarisk',             emoji: '🥦', filter: (r) => r.tags?.some(t => ['vegetar','veganer','mere-grønt'].includes(t)) },
  { id: 'internationalt',label: 'Internationalt køkken',  emoji: '🌍', filter: (r) => r.tags?.some(t => ['italiensk','asiatisk','mexicansk','indisk','mellemøstlig'].includes(t)) },
  { id: 'familie',       label: 'Familiemad',             emoji: '👨‍👩‍👧', filter: (r) => r.tags?.includes('familievenlig') },
  { id: 'alle',          label: 'Alle opskrifter',        emoji: '📖', filter: () => true },
]

export default function Galleri() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const bruger = hentAktivBruger()
  const brugerTags = bruger?.tags ?? []

  const [opskrifter, setOpskrifter] = useState([])
  const [loading, setLoading] = useState(true)
  const [aktivSektion, setAktivSektion] = useState(() => searchParams.get('filter') ?? 'til-dig')
  const [søgeTekst, setSøgeTekst] = useState('')
  const søgeTimer = useRef(null)
  const [søgeResultater, setSøgeResultater] = useState([])
  const [søgerAktivt, setSøgerAktivt] = useState(false)

  useEffect(() => {
    supabase
      .from('recipes')
      .select('id, title, description, difficulty, prep_time, cook_time, tags, storage_image')
      .limit(300)
      .then(({ data }) => { setOpskrifter(data ?? []); setLoading(false) })
  }, [])

  function håndterSøg(tekst) {
    setSøgeTekst(tekst)
    if (søgeTimer.current) clearTimeout(søgeTimer.current)
    if (!tekst.trim()) { setSøgeResultater([]); setSøgerAktivt(false); return }
    setSøgerAktivt(true)
    søgeTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('recipes')
        .select('id, title, prep_time, cook_time, tags, storage_image')
        .ilike('title', `%${tekst.trim()}%`)
        .limit(20)
      setSøgeResultater(data ?? [])
    }, 250)
  }

  const aktiv = SEKTIONER.find(s => s.id === aktivSektion) ?? SEKTIONER[0]
  const visteListe = søgerAktivt
    ? søgeResultater
    : opskrifter.filter(r => aktiv.filter(r, brugerTags))

  return (
    <div style={s.page}>

      {/* Header */}
      <div style={s.header}>
        <button style={s.tilbage} onClick={() => navigate('/hjem')}>‹</button>
        <h1 style={s.titel}>Opskrifter</h1>
      </div>

      {/* Søgefelt */}
      <div style={s.søgeWrap}>
        <span style={s.søgeIkon}>🔍</span>
        <input
          type="search"
          value={søgeTekst}
          onChange={e => håndterSøg(e.target.value)}
          placeholder="Søg i alle opskrifter…"
          style={s.søgeInput}
        />
        {søgeTekst && (
          <button style={s.søgeRyd} onClick={() => { setSøgeTekst(''); setSøgeResultater([]); setSøgerAktivt(false) }}>✕</button>
        )}
      </div>

      {/* Kategori-chips */}
      {!søgerAktivt && (
        <div style={s.chips}>
          {SEKTIONER.map(sek => (
            <button
              key={sek.id}
              style={{ ...s.chip, ...(aktivSektion === sek.id ? s.chipAktiv : {}) }}
              onClick={() => setAktivSektion(sek.id)}
            >
              {sek.emoji} {sek.label}
            </button>
          ))}
        </div>
      )}

      {/* Sektion-overskrift */}
      {!søgerAktivt && (
        <div style={s.sektionHeader}>
          <span style={s.sektionEmoji}>{aktiv.emoji}</span>
          <h2 style={s.sektionTitel}>{aktiv.label}</h2>
          <span style={s.sektionAntal}>{visteListe.length} retter</span>
        </div>
      )}

      {søgerAktivt && (
        <p style={s.søgeTitel}>Resultater for "{søgeTekst}"</p>
      )}

      {/* Grid */}
      {loading ? (
        <div style={s.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={s.kortSkeleton} />
          ))}
        </div>
      ) : visteListe.length === 0 ? (
        <div style={s.tom}>
          <span style={{ fontSize: 40 }}>🍽️</span>
          <p style={s.tomTekst}>Ingen retter her endnu</p>
          {aktivSektion === 'til-dig' && brugerTags.length === 0 && (
            <p style={s.tomSub}>Tilføj tags på din profil for at se personlige forslag</p>
          )}
        </div>
      ) : (
        <div style={s.grid}>
          {visteListe.map(o => (
            <GalleriKort key={o.id} opskrift={o} onClick={() => navigate(`/opskrift/${o.id}`)} />
          ))}
        </div>
      )}

    </div>
  )
}

function GalleriKort({ opskrift, onClick }) {
  const imgUrl = billedeUrl(opskrift.storage_image)
  const farve  = opskriftFarve(opskrift.tags)
  const tid    = tidLabel(opskrift.prep_time, opskrift.cook_time)
  const sværhed = sværhedLabel(opskrift.difficulty)

  return (
    <button style={s.kort} onClick={onClick}>
      <div style={{ ...s.kortHero, background: grad(farve) }}>
        {imgUrl
          ? <img src={imgUrl} alt={opskrift.title} style={s.kortImg} />
          : <span style={s.kortInitial}>{opskrift.title.charAt(0)}</span>
        }
        {sværhed && <span style={s.kortBadge}>{sværhed}</span>}
      </div>
      <div style={s.kortBody}>
        <p style={s.kortTitel}>{opskrift.title}</p>
        {tid && <p style={s.kortMeta}>⏱ {tid}</p>}
      </div>
    </button>
  )
}

const s = {
  page: { maxWidth: 480, margin: '0 auto', padding: '0 0 120px', minHeight: '100%', background: colors.bg },

  header: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 8px', position: 'sticky', top: 'env(safe-area-inset-top, 0px)', background: colors.bg, zIndex: 10 },
  tilbage: { background: 'none', border: 'none', fontSize: 28, color: colors.green, padding: '0 6px 0 0', cursor: 'pointer', fontWeight: 700, lineHeight: 1 },
  titel: { fontFamily: font.display, fontWeight: 600, fontSize: 26, color: colors.text, margin: 0, letterSpacing: -0.5 },

  søgeWrap: { display: 'flex', alignItems: 'center', gap: 10, background: colors.card, borderRadius: 16, boxShadow: shadow.card, padding: '0 14px', margin: '4px 20px 12px', height: 48 },
  søgeIkon: { fontSize: 17, flexShrink: 0, opacity: 0.5 },
  søgeInput: { flex: 1, fontFamily: font.body, fontSize: 15, color: colors.text, background: 'transparent', border: 'none', outline: 'none', padding: '0 4px' },
  søgeRyd: { background: 'none', border: 'none', color: colors.mutedLight, fontSize: 14, cursor: 'pointer', padding: '0 2px', flexShrink: 0 },

  chips: { display: 'flex', gap: 8, overflowX: 'auto', padding: '0 20px 4px', scrollbarWidth: 'none' },
  chip: { flexShrink: 0, fontFamily: font.body, fontWeight: 700, fontSize: 13, color: colors.muted, background: colors.card, border: `1.5px solid ${colors.border}`, borderRadius: 999, padding: '8px 14px', cursor: 'pointer', whiteSpace: 'nowrap' },
  chipAktiv: { color: '#fff', background: colors.green, border: `1.5px solid ${colors.green}` },

  sektionHeader: { display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px 10px' },
  sektionEmoji: { fontSize: 20 },
  sektionTitel: { fontFamily: font.display, fontWeight: 600, fontSize: 18, color: colors.text, margin: 0, flex: 1 },
  sektionAntal: { fontFamily: font.body, fontSize: 13, color: colors.mutedLight, fontWeight: 600 },

  søgeTitel: { fontFamily: font.body, fontSize: 14, fontWeight: 700, color: colors.muted, padding: '12px 20px 6px', margin: 0 },

  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '0 20px' },

  kort: { background: colors.card, borderRadius: 18, boxShadow: shadow.card, border: 'none', padding: 0, overflow: 'hidden', textAlign: 'left', cursor: 'pointer' },
  kortSkeleton: { height: 190, borderRadius: 18, background: colors.border },
  kortHero: { height: 120, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  kortImg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  kortInitial: { fontSize: 44, fontFamily: font.display, fontWeight: 600, color: 'rgba(255,255,255,0.9)' },
  kortBadge: { position: 'absolute', bottom: 8, left: 8, fontFamily: font.body, fontSize: 11, fontWeight: 700, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)', color: '#fff', padding: '3px 8px', borderRadius: 999 },
  kortBody: { padding: '10px 12px 14px' },
  kortTitel: { fontFamily: font.body, fontWeight: 700, fontSize: 14, color: colors.text, margin: '0 0 4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  kortMeta: { fontFamily: font.body, fontSize: 12, color: colors.muted, margin: 0 },

  tom: { textAlign: 'center', padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  tomTekst: { fontFamily: font.display, fontWeight: 600, fontSize: 18, color: colors.text, margin: 0 },
  tomSub: { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: 0, lineHeight: 1.5, maxWidth: 260 },
}
