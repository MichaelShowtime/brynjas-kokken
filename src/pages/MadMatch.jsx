import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SwipeCard from '../components/SwipeCard'
import { supabase } from '../lib/supabase'
import { tidMinutter } from '../lib/recipeUtils'
import { hentLager, byggLagerOpslag } from '../data/lager'
import { gemLike, fjernLike } from '../data/likes'
import { gemAfvist, rydOgHent } from '../data/afviste'
import { colors, shadow, radius, font } from '../data/theme'
import { hentAktivBruger } from '../data/auth'
import { useLang } from '../lib/lang'

const SWIPE_THRESHOLD = 110

function bland(liste) {
  const a = [...liste]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function MadMatch() {
  const navigate = useNavigate()
  const { t } = useLang()
  const [alleOpskrifter, setAlleOpskrifter] = useState([])
  const [loading, setLoading] = useState(true)
  const [brugLager, setBrugLager] = useState(true)
  const [shuffled, setShuffled] = useState([])

  const [index, setIndex] = useState(0)
  const [gemte, setGemte] = useState([])
  const [drag, setDrag] = useState({ x: 0, y: 0 })
  const [animer, setAnimer] = useState(false)
  const startRef = useRef(null)
  // historik: [{opskrift, retning}] — bruges til fortryd
  const [historik, setHistorik] = useState([])

  // Filtre
  const [tagFilter, setTagFilter] = useState(null)
  const [under30, setUnder30] = useState(false)
  const [mealFilter, setMealFilter] = useState(null) // morgenmad | frokost | aftensmad

  // Afviste retter (nej-swipes huskes i 7 dage)
  const [afviste, setAfviste] = useState(() => rydOgHent())

  useEffect(() => {
    supabase
      .from('recipes')
      .select('id, title, difficulty, prep_time, cook_time, tags, storage_image, ingredients, source')
      .then(({ data }) => {
        const liste = data ?? []
        setAlleOpskrifter(liste)
        setShuffled(bland(liste))
        setLoading(false)
      })
  }, [])

  const lagerOpslag = useMemo(() => byggLagerOpslag(hentLager()), [])
  const brugerTags = useMemo(() => new Set(hentAktivBruger()?.tags ?? []), [])

  const analyser = useCallback(
    (opskrift) => {
      const ingredienser = opskrift.ingredients ?? []
      const har = []
      const mangler = []
      for (const i of ingredienser) {
        const { fundet, nok } = lagerOpslag.harNok(i.name, i.amount, i.unit)
        ;(fundet && nok ? har : mangler).push(i)
      }
      return { har, mangler, kanLaves: mangler.length === 0 }
    },
    [lagerOpslag]
  )

  const kort = useMemo(() => {
    // Start med shuffled liste som base — det sikrer tilfældig rækkefølge også med filtre
    let liste = [...shuffled]

    // Fjern ikke-retter (0 ingredienser) og afviste (nej inden for 7 dage)
    liste = liste.filter((o) => (o.ingredients?.length ?? 0) > 0 && !afviste.has(o.id))

    // Anvend filtre
    if (tagFilter) liste = liste.filter((o) => o.tags?.includes(tagFilter))
    if (mealFilter) liste = liste.filter((o) => o.tags?.includes(mealFilter))
    if (under30) liste = liste.filter((o) => {
      const min = tidMinutter(o.prep_time, o.cook_time)
      return min > 0 && min <= 30
    })

    // Præference-score: antal af brugerens tags der matcher opskriftens tags
    const pScore = (o) => (o.tags ?? []).filter((t) => brugerTags.has(t)).length

    if (brugLager) {
      // Primær: færreste manglende ingredienser. Sekundær: præference-match
      liste.sort((a, b) => {
        const mDiff = analyser(a).mangler.length - analyser(b).mangler.length
        return mDiff !== 0 ? mDiff : pScore(b) - pScore(a)
      })
    } else if (brugerTags.size > 0) {
      // Uden lager: præference-sort, tilfældig rækkefølge inden for samme score
      liste.sort((a, b) => pScore(b) - pScore(a))
    }

    return liste
  }, [brugLager, shuffled, tagFilter, mealFilter, under30, analyser, afviste, brugerTags])

  function nulstilStak() {
    setIndex(0)
    setGemte([])
    setDrag({ x: 0, y: 0 })
    setAnimer(false)
    setHistorik([])
  }

  function skiftTilstand() {
    const næste = !brugLager
    setBrugLager(næste)
    if (!næste) setShuffled(bland(alleOpskrifter))
    nulstilStak()
  }

  const fuldførSwipe = useCallback(
    (retning) => {
      const aktuel = kort[index]
      if (!aktuel) return
      if (retning === 'right') {
        setGemte((g) => [...g, aktuel])
        gemLike(aktuel)
      }
      if (retning === 'left') {
        gemAfvist(aktuel.id)
        setAfviste((prev) => new Set([...prev, aktuel.id]))
      }
      setHistorik((h) => [...h, { opskrift: aktuel, retning }])
      setAnimer(true)
      setDrag({ x: retning === 'right' ? 600 : -600, y: 40 })
      window.setTimeout(() => {
        setAnimer(false)
        setDrag({ x: 0, y: 0 })
        setIndex((i) => i + 1)
      }, 280)
    },
    [kort, index]
  )

  function fortryd() {
    if (historik.length === 0) return
    const sidst = historik[historik.length - 1]
    // Fortryd effekter
    if (sidst.retning === 'right') {
      setGemte((g) => g.filter((o) => o.id !== sidst.opskrift.id))
      fjernLike(sidst.opskrift.id)
    }
    if (sidst.retning === 'left') {
      // Fjern fra afviste
      const råAfviste = JSON.parse(localStorage.getItem('brynjas_afviste') ?? '{}')
      delete råAfviste[String(sidst.opskrift.id)]
      localStorage.setItem('brynjas_afviste', JSON.stringify(råAfviste))
      setAfviste((prev) => {
        const næste = new Set(prev)
        næste.delete(sidst.opskrift.id)
        return næste
      })
    }
    setHistorik((h) => h.slice(0, -1))
    setIndex((i) => Math.max(0, i - 1))
  }

  function onPointerDown(e) {
    if (animer) return
    startRef.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function onPointerMove(e) {
    if (!startRef.current) return
    setDrag({ x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y })
  }

  function onPointerUp() {
    if (!startRef.current) return
    startRef.current = null
    if (drag.x > SWIPE_THRESHOLD) return fuldførSwipe('right')
    if (drag.x < -SWIPE_THRESHOLD) return fuldførSwipe('left')
    setAnimer(true)
    setDrag({ x: 0, y: 0 })
  }

  const synlige = kort.slice(index, index + 3)
  const slut = !loading && index >= kort.length
  const likeOpacity = Math.min(Math.max(drag.x / SWIPE_THRESHOLD, 0), 1)
  const nopeOpacity = Math.min(Math.max(-drag.x / SWIPE_THRESHOLD, 0), 1)

  const toggleTag = (tag) => {
    setTagFilter((t) => (t === tag ? null : tag))
    nulstilStak()
  }

  const toggleMeal = (meal) => {
    setMealFilter((m) => (m === meal ? null : meal))
    nulstilStak()
  }

  const MEAL_FILTERS = [
    { key: 'morgenmad', label: t('mm.morgen') },
    { key: 'frokost',   label: t('mm.frokost') },
    { key: 'aftensmad', label: t('mm.aftensmad') },
  ]

  const TAG_LABELS = {
    vegetar: t('mm.vegetar'),
    kød:     t('mm.kød'),
    fisk:    t('mm.fisk'),
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>{t('mm.titel')}</h1>
        <p style={styles.subtitle}>{t('mm.subtitle')}</p>
      </header>

      {/* Filter-chips — række 1 */}
      <div style={styles.filterRow}>
        <button
          style={{ ...styles.filterChip, ...(brugLager ? styles.filterChipAktiv : null) }}
          onClick={skiftTilstand}
        >
          {t('mm.mitLager')}
        </button>
        {['vegetar', 'kød', 'fisk'].map((tag) => (
          <button
            key={tag}
            style={{ ...styles.filterChip, ...(tagFilter === tag ? styles.filterChipAktiv : null) }}
            onClick={() => toggleTag(tag)}
          >
            {TAG_LABELS[tag]}
          </button>
        ))}
        <button
          style={{ ...styles.filterChip, ...(under30 ? styles.filterChipAktiv : null) }}
          onClick={() => { setUnder30((v) => !v); nulstilStak() }}
        >
          {t('mm.under30')}
        </button>
      </div>

      {/* Filter-chips — række 2: måltidstype */}
      <div style={{ ...styles.filterRow, marginTop: 6 }}>
        {MEAL_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            style={{ ...styles.filterChip, ...(mealFilter === key ? styles.filterChipAktiv : null) }}
            onClick={() => toggleMeal(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Kortstak */}
      <div style={styles.deck}>
        {loading ? (
          <div style={styles.loadCard}>
            <span style={{ fontSize: 48 }}>🍳</span>
            <p style={styles.loadTekst}>{t('mm.henter')}</p>
          </div>
        ) : slut ? (
          <TomStak antalGemte={gemte.length} onForfra={nulstilStak} t={t} />
        ) : (
          synlige
            .map((opskrift, i) => {
              const isTop = i === 0
              const dybde = i
              const cardStyle = isTop
                ? {
                    transform: `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 22}deg)`,
                    transition: animer ? 'transform 0.28s ease-out' : 'none',
                    cursor: 'grab',
                    zIndex: 10,
                  }
                : {
                    transform: `translateY(${dybde * 12}px) scale(${1 - dybde * 0.05})`,
                    transition: 'transform 0.28s ease-out',
                    zIndex: 10 - dybde,
                  }
              return (
                <SwipeCard
                  key={opskrift.id}
                  opskrift={opskrift}
                  analyse={analyser(opskrift)}
                  cardStyle={cardStyle}
                  likeOpacity={isTop ? likeOpacity : 0}
                  nopeOpacity={isTop ? nopeOpacity : 0}
                  pointerHandlers={isTop ? { onPointerDown, onPointerMove, onPointerUp } : {}}
                  onKlik={isTop ? () => navigate(`/opskrift/${opskrift.id}`) : () => {}}
                />
              )
            })
            .reverse()
        )}
      </div>

      {/* Handlingsknapper */}
      {!loading && !slut && (
        <div style={styles.actions}>
          <button
            onClick={() => fuldførSwipe('left')}
            style={{ ...styles.actionBtn, ...styles.nopeBtn }}
            aria-label="Spring over"
          >
            <CrossIcon />
          </button>

          {/* Fortryd — kun synlig hvis der er historik */}
          <button
            onClick={fortryd}
            disabled={historik.length === 0}
            style={{
              ...styles.actionBtn,
              opacity: historik.length === 0 ? 0.3 : 1,
              width: 48, height: 48,
            }}
            aria-label="Fortryd"
          >
            <UndoIcon />
          </button>

          <button
            onClick={() => fuldførSwipe('right')}
            style={{ ...styles.actionBtn, ...styles.likeBtn }}
            aria-label="Gem ret"
          >
            <HeartIcon />
          </button>
        </div>
      )}
    </div>
  )
}

function TomStak({ antalGemte, onForfra, t }) {
  return (
    <div style={styles.tom}>
      <div style={styles.tomEmoji}>{antalGemte > 0 ? '🎉' : '🤔'}</div>
      <h2 style={styles.tomTitel}>{t('mm.tomTitel')}</h2>
      <p style={styles.tomTekst}>{t('mm.tomGemte')} {antalGemte} {antalGemte === 1 ? t('mm.tomRet') : t('mm.tomRetter')}.</p>
      <button onClick={onForfra} style={styles.forfraBtn}>{t('mm.tomForfra')}</button>
    </div>
  )
}

function CrossIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={colors.red}
      strokeWidth="2.6" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill={colors.green}>
      <path d="M12 21s-7.5-4.6-10-9.2C.6 9 1.8 5.5 5 5.1c2-.3 3.4 1 4 2.1.6-1.1 2-2.4 4-2.1 3.2.4 4.4 3.9 3 6.7C19.5 16.4 12 21 12 21Z" />
    </svg>
  )
}

function UndoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.muted}
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6" />
      <path d="M3 13C5.5 7.5 11 5 16 6.5c3.5 1 6 4 6 7.5a8 8 0 0 1-8 8c-3 0-5.7-1.5-7.3-4" />
    </svg>
  )
}

const styles = {
  page: { maxWidth: 480, margin: '0 auto', padding: '20px 20px 120px', minHeight: '100%' },

  header: { marginBottom: 16 },
  title: {
    fontFamily: font.display, fontWeight: 800, fontSize: 32, lineHeight: 1.1,
    color: colors.text, margin: 0, letterSpacing: -0.5,
  },
  subtitle: { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: '6px 0 0' },

  filterRow: {
    display: 'flex', gap: 8, overflowX: 'auto', padding: '0 0 4px',
    margin: '0 -20px', paddingLeft: 20, paddingRight: 20, scrollbarWidth: 'none',
  },
  filterChip: {
    flexShrink: 0, fontFamily: font.body, fontSize: 13, fontWeight: 700,
    color: colors.muted, background: colors.card, border: `1px solid ${colors.border}`,
    padding: '8px 14px', borderRadius: radius.pill, boxShadow: shadow.card,
    cursor: 'pointer',
  },
  filterChipAktiv: {
    color: '#fff', background: colors.green, border: `1px solid ${colors.green}`,
  },

  deck: { position: 'relative', height: 520, margin: '14px 0' },

  loadCard: {
    position: 'absolute', inset: 0, background: colors.card, borderRadius: radius.card,
    boxShadow: shadow.card, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadTekst: { fontFamily: font.body, fontSize: 16, color: colors.muted, margin: 0 },

  actions: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 18 },
  actionBtn: {
    width: 64, height: 64, borderRadius: 999, background: colors.card,
    border: `1px solid ${colors.border}`, boxShadow: shadow.card,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
  },
  nopeBtn: {},
  likeBtn: {},

  tom: {
    position: 'absolute', inset: 0, background: colors.card, borderRadius: radius.card,
    boxShadow: shadow.card, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 28,
  },
  tomEmoji: { fontSize: 56 },
  tomTitel: {
    fontFamily: font.display, fontWeight: 800, fontSize: 26,
    color: colors.text, margin: '14px 0 8px',
  },
  tomTekst: {
    fontFamily: font.body, fontSize: 14.5, color: colors.muted, lineHeight: 1.5, margin: '0 0 22px',
  },
  forfraBtn: {
    padding: '13px 26px', fontFamily: font.body, fontSize: 15, fontWeight: 700,
    color: '#fff', background: colors.green, border: 'none', borderRadius: radius.button,
    cursor: 'pointer',
  },
}
