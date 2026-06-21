import { billedeUrl, opskriftFarve, tidLabel, grad } from '../lib/recipeUtils'
import { colors, shadow, radius, font } from '../data/theme'

export default function SwipeCard({
  opskrift,
  analyse,
  cardStyle,
  likeOpacity = 0,
  nopeOpacity = 0,
  pointerHandlers = {},
  innerRef,
  onKlik = () => {},
}) {
  const { har, mangler } = analyse
  const total = opskrift.ingredients?.length ?? 0
  const manglerTekst = mangler.length > 0 ? `${har.length}/${total} ingredienser` : 'Du har alt'

  const imgUrl = billedeUrl(opskrift.storage_image)
  const farve = opskriftFarve(opskrift.tags)
  const tid = tidLabel(opskrift.prep_time, opskrift.cook_time)
  const visibleTags = (opskrift.tags ?? []).slice(0, 2)

  return (
    <div ref={innerRef} style={{ ...styles.card, ...cardStyle }} {...pointerHandlers}>
      {/* Stempler */}
      <div style={{ ...styles.stamp, ...styles.likeStamp, opacity: likeOpacity }}>GEM</div>
      <div style={{ ...styles.stamp, ...styles.nopeStamp, opacity: nopeOpacity }}>SPRING OVER</div>

      {/* Hero — klikbar → navigerer til opskrift */}
      <button
        type="button"
        style={{ ...styles.hero, background: grad(farve) }}
        onClick={onKlik}
        aria-label="Se opskrift"
      >
        {imgUrl && <img src={imgUrl} alt={opskrift.title} style={styles.heroImg} />}

        {/* Ingrediens-status */}
        <span style={{
          ...styles.ingrediensBadge,
          background: mangler.length === 0 ? 'rgba(47,107,79,0.82)' : 'rgba(0,0,0,0.42)',
        }}>
          {manglerTekst}{mangler.length === 0 ? ' ✓' : ''}
        </span>
      </button>

      {/* Indhold */}
      <div style={styles.body}>
        {visibleTags.length > 0 && (
          <div style={styles.tags}>
            {visibleTags.map((t) => (
              <span key={t} style={styles.tag}>{t}</span>
            ))}
            {tid && <span style={styles.tag}>⏱ {tid}</span>}
          </div>
        )}

        <h2 style={styles.titel}>{opskrift.title}</h2>

        <div style={styles.meta}>
          {mangler.length > 0
            ? <span style={{ ...styles.manglerTekst, color: colors.terracotta }}>
                {mangler.length} ingredienser mangler
              </span>
            : <span style={{ ...styles.manglerTekst, color: colors.green }}>
                Alt er på lager ✓
              </span>
          }
        </div>
      </div>
    </div>
  )
}

const styles = {
  card: {
    position: 'absolute', top: 0, left: 0, right: 0,
    background: colors.card, borderRadius: radius.card,
    boxShadow: shadow.card, overflow: 'hidden',
    touchAction: 'none', userSelect: 'none',
  },

  stamp: {
    position: 'absolute', top: 22, fontFamily: font.display, fontWeight: 600,
    fontSize: 26, letterSpacing: 1, padding: '6px 14px', borderRadius: 12,
    border: '4px solid', zIndex: 5, pointerEvents: 'none',
  },
  likeStamp: { left: 18, color: colors.green, borderColor: colors.green, transform: 'rotate(-14deg)' },
  nopeStamp: { right: 18, color: colors.red, borderColor: colors.red, transform: 'rotate(14deg)' },

  hero: {
    width: '100%', height: 360, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
    border: 'none', padding: 0, cursor: 'pointer', color: '#fff', overflow: 'hidden',
  },
  heroImg: {
    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
  },

  ingrediensBadge: {
    position: 'absolute', bottom: 14, right: 14, fontFamily: font.body, fontSize: 13,
    fontWeight: 700, backdropFilter: 'blur(6px)', color: '#fff',
    padding: '7px 13px', borderRadius: radius.pill, letterSpacing: 0.2, zIndex: 1,
  },

  body: { padding: '18px 16px 20px' },

  tags: { display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  tag: {
    fontFamily: font.body, fontSize: 12.5, fontWeight: 700, color: colors.text,
    background: colors.bg, padding: '6px 12px', borderRadius: radius.pill,
  },

  titel: {
    fontFamily: font.display, fontWeight: 600, fontSize: 26, color: colors.text,
    margin: '0 0 8px', letterSpacing: -0.5, lineHeight: 1.15,
  },

  meta: { display: 'flex', alignItems: 'center', gap: 8 },
  manglerTekst: { fontFamily: font.body, fontSize: 13.5, fontWeight: 700 },
}
