import { Bookmark, BookmarkCheck } from 'lucide-react'
import { billedeUrl, opskriftFarve, grad } from '../lib/recipeUtils'
import { colors, shadow, font } from '../data/theme'

// Delt gitter-/scroll-kort til en opskrift: billede-hero (med farvet fallback),
// titel, valgfri meta-linje, valgfri "gemt"-bogmærke. Bruges hvor opskrifter
// vises som klikbare thumbnails (hjemmesiden og søgeresultater).
export default function RecipeThumbCard({ opskrift, onClick, meta, credit, gemt, onToggleGem, compact = false, width }) {
  const imgUrl = billedeUrl(opskrift.storage_image, opskrift.image_url)
  const farve = opskriftFarve(opskrift.tags)
  const s = compact ? compactStyles : normalStyles

  return (
    <div style={{ ...s.wrap, ...(width ? { width } : {}) }}>
      <button style={s.btn} onClick={onClick}>
        <div style={{ ...s.hero, background: grad(farve) }}>
          {imgUrl ? (
            <img src={imgUrl} alt={opskrift.title} loading="lazy" style={s.img} />
          ) : (
            <span style={s.initial}>{opskrift.title.charAt(0)}</span>
          )}
        </div>
        <div style={s.body}>
          <p style={s.titel}>{opskrift.title}</p>
          {meta && <p style={s.meta}>{meta}</p>}
          {credit && <p style={s.credit}>{credit}</p>}
        </div>
      </button>
      {onToggleGem && (
        <button
          style={s.gemBtn}
          aria-label={gemt ? 'Fjern bogmærke' : 'Gem opskrift'}
          onClick={(e) => { e.stopPropagation(); onToggleGem(opskrift.id) }}
        >
          {gemt
            ? <BookmarkCheck size={s.ikonSize} color={colors.green} />
            : <Bookmark size={s.ikonSize} color={colors.muted} />}
        </button>
      )}
    </div>
  )
}

const gemBtnBase = {
  position: 'absolute', background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: 999,
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)',
}

const normalStyles = {
  wrap: { width: 160, flexShrink: 0, position: 'relative', scrollSnapAlign: 'start' },
  btn: { display: 'block', width: '100%', background: colors.card, borderRadius: 18, boxShadow: shadow.card, border: 'none', padding: 0, overflow: 'hidden', textAlign: 'left', cursor: 'pointer' },
  hero: { height: 110, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  img: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  initial: { fontSize: 42, fontFamily: font.display, fontWeight: 600, color: 'rgba(255,255,255,0.9)', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))' },
  body: { padding: '10px 12px 14px' },
  titel: { fontFamily: font.body, fontWeight: 700, fontSize: 14.5, color: colors.text, margin: '0 0 4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  meta: { fontFamily: font.body, fontSize: 12, color: colors.muted, margin: 0 },
  credit: { fontFamily: font.body, fontSize: 10.5, color: colors.green, margin: '2px 0 0', fontWeight: 600 },
  gemBtn: { ...gemBtnBase, top: 8, right: 8, width: 30, height: 30 },
  ikonSize: 15,
}

const compactStyles = {
  wrap: { position: 'relative', background: colors.card, borderRadius: 16, boxShadow: shadow.card, overflow: 'hidden' },
  btn: { display: 'block', width: '100%', border: 'none', padding: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer' },
  hero: { height: 110, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  img: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  initial: { fontSize: 36, fontFamily: font.display, fontWeight: 600, color: 'rgba(255,255,255,0.9)', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))' },
  body: { padding: '9px 11px 12px' },
  titel: { fontFamily: font.body, fontWeight: 700, fontSize: 13.5, color: colors.text, margin: '0 0 3px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 },
  meta: { fontFamily: font.body, fontSize: 11.5, color: colors.muted, margin: 0 },
  credit: null,
  gemBtn: { ...gemBtnBase, top: 7, right: 7, width: 28, height: 28 },
  ikonSize: 14,
}
