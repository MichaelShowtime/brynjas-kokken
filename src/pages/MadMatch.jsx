import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import SwipeCard from '../components/SwipeCard'
import { supabase } from '../lib/supabase'
import { tidMinutter } from '../lib/recipeUtils'
import { hentLager, byggLagerOpslag } from '../data/lager'
import { addGemt, removeGemt } from '../data/gemte'
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
  const [kunKanLaves, setKunKanLaves] = useState(false)
  const [shuffled, setShuffled] = useState([])

  const [index, setIndex] = useState(0)
  const [gemte, setGemte] = useState([])
  const [animating, setAnimating] = useState(false)
  const topCardRef = useRef(null)
  // { active, startX, startY, startTime, x, y }
  const dragState = useRef({ active: false, startX: 0, startY: 0, startTime: 0, x: 0, y: 0 })
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
      .select('id, title, difficulty, prep_time, cook_time, tags, storage_image, image_url, ingredients, source')
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
      if (kunKanLaves) {
        liste = liste.filter((o) => analyser(o).kanLaves)
      }
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
  }, [brugLager, kunKanLaves, shuffled, tagFilter, mealFilter, under30, analyser, afviste, brugerTags])

  // Nulstil top-kortets inline transform når index skifter (inkl. fortryd)
  useEffect(() => {
    requestAnimationFrame(() => {
      const el = topCardRef.current
      if (!el) return
      el.style.transition = 'none'
      el.style.transform = ''
      const likeEl = el.querySelector('[data-stamp="like"]')
      const nopeEl = el.querySelector('[data-stamp="nope"]')
      if (likeEl) likeEl.style.opacity = '0'
      if (nopeEl) nopeEl.style.opacity = '0'
    })
  }, [index])

  function nulstilStak() {
    setIndex(0)
    setGemte([])
    setAfviste(rydOgHent())
    dragState.current = { active: false, startX: 0, startY: 0, startTime: 0, x: 0, y: 0 }
    setAnimating(false)
    setHistorik([])
  }

  function skiftTilstand() {
    const næste = !brugLager
    setBrugLager(næste)
    if (!næste) { setShuffled(bland(alleOpskrifter)); setKunKanLaves(false) }
    nulstilStak()
  }

  const fuldførSwipe = useCallback(
    (retning) => {
      const aktuel = kort[index]
      if (!aktuel) return
      dragState.current.active = false
      setAnimating(true)

      // Animér kortet ud direkte på DOM — ingen React-re-render under flight
      const el = topCardRef.current
      if (el) {
        el.style.transition = 'transform 0.28s ease-out'
        el.style.transform = `translate(${retning === 'right' ? 700 : -700}px, 40px) rotate(${retning === 'right' ? 20 : -20}deg)`
        const likeEl = el.querySelector('[data-stamp="like"]')
        const nopeEl = el.querySelector('[data-stamp="nope"]')
        if (retning === 'right' && likeEl) likeEl.style.opacity = '1'
        if (retning === 'left' && nopeEl) nopeEl.style.opacity = '1'
      }

      if (retning === 'right') {
        setGemte((g) => [...g, aktuel])
        addGemt(aktuel.id)
        const bruger = hentAktivBruger()
        if (bruger?.id) {
          supabase.from('saved_recipes')
            .upsert({ user_id: bruger.id, recipe_id: aktuel.id }, { onConflict: 'user_id,recipe_id' })
            .then()
        }
      }
      if (retning === 'left') {
        gemAfvist(aktuel.id)
        // setAfviste udelades bevidst — det ville reberegne `kort` og forskyde
        // index mens animationen kører, og dermed springe det næste kort over.
        // Persistens sker via gemAfvist (localStorage); afviste state opdateres
        // kun ved nulstilStak så `kort` forbliver stabilt under en session.
      }
      setHistorik((h) => [...h, { opskrift: aktuel, retning }])

      window.setTimeout(() => {
        setAnimating(false)
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
      removeGemt(sidst.opskrift.id)
      const bruger = hentAktivBruger()
      if (bruger?.id) {
        supabase.from('saved_recipes')
          .delete().eq('user_id', bruger.id).eq('recipe_id', sidst.opskrift.id)
          .then()
      }
    }
    if (sidst.retning === 'left') {
      // Fjern fra localStorage — afviste state opdateres IKKE her, fordi opskriften
      // aldrig blev tilføjet til state under swipe (se fuldförSwipe). Indeks
      // dekrementeres nedenfor, og kortet er stadig i `kort`-arrayet.
      const råAfviste = JSON.parse(localStorage.getItem('brynjas_afviste') ?? '{}')
      delete råAfviste[String(sidst.opskrift.id)]
      localStorage.setItem('brynjas_afviste', JSON.stringify(råAfviste))
    }
    setHistorik((h) => h.slice(0, -1))
    setIndex((i) => Math.max(0, i - 1))
  }

  function onPointerDown(e) {
    if (animating) return
    const el = topCardRef.current
    if (!el) return
    dragState.current = { active: true, startX: e.clientX, startY: e.clientY, startTime: Date.now(), x: 0, y: 0 }
    el.style.transition = 'none'
    el.setPointerCapture?.(e.pointerId)
  }

  function onPointerMove(e) {
    const d = dragState.current
    if (!d.active) return
    d.x = e.clientX - d.startX
    d.y = e.clientY - d.startY
    const rotate = Math.max(-15, Math.min(15, d.x / 20))
    const el = topCardRef.current
    if (!el) return
    // Direkte DOM-opdatering — ingen setState, ingen re-render
    el.style.transform = `translate(${d.x}px, ${d.y}px) rotate(${rotate}deg)`
    const likeEl = el.querySelector('[data-stamp="like"]')
    const nopeEl = el.querySelector('[data-stamp="nope"]')
    if (likeEl) likeEl.style.opacity = Math.min(Math.max(d.x / SWIPE_THRESHOLD, 0), 1)
    if (nopeEl) nopeEl.style.opacity = Math.min(Math.max(-d.x / SWIPE_THRESHOLD, 0), 1)
  }

  function onPointerUp() {
    const d = dragState.current
    if (!d.active) return
    d.active = false
    const velocity = Math.abs(d.x) / Math.max(Date.now() - d.startTime, 1)
    if (Math.abs(d.x) > SWIPE_THRESHOLD || velocity > 0.5) {
      return fuldførSwipe(d.x > 0 ? 'right' : 'left')
    }
    // Ikke langt nok — animér tilbage til center
    const el = topCardRef.current
    if (el) {
      el.style.transition = 'transform 0.25s ease-out'
      el.style.transform = 'translate(0px, 0px) rotate(0deg)'
      const likeEl = el.querySelector('[data-stamp="like"]')
      const nopeEl = el.querySelector('[data-stamp="nope"]')
      if (likeEl) likeEl.style.opacity = '0'
      if (nopeEl) nopeEl.style.opacity = '0'
    }
  }

  function onPointerCancel() {
    const d = dragState.current
    if (!d.active) return
    d.active = false
    const el = topCardRef.current
    if (el) {
      el.style.transition = 'transform 0.25s ease-out'
      el.style.transform = 'translate(0px, 0px) rotate(0deg)'
    }
  }

  const synlige = kort.slice(index, index + 3)
  const slut = !loading && index >= kort.length
  const harAktiveFiltre = !!(tagFilter || mealFilter || under30 || kunKanLaves)
  const lagerErTomt = brugLager && hentLager().length === 0

  function fjernAlleFiltre() {
    setTagFilter(null)
    setMealFilter(null)
    setUnder30(false)
    setKunKanLaves(false)
    nulstilStak()
  }

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

      {/* Filter-chips — række 1b: kan laves nu (kun synlig når lager-filter er aktivt) */}
      {brugLager && (
        <div style={{ ...styles.filterRow, marginTop: 4 }}>
          <button
            style={{ ...styles.filterChip, ...(kunKanLaves ? styles.filterChipAktiv : null) }}
            onClick={() => { setKunKanLaves((v) => !v); nulstilStak() }}
          >
            {t('mm.kunKanLaves')}
          </button>
        </div>
      )}

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
          <TomStak antalGemte={gemte.length} onForfra={nulstilStak} onFjernFiltre={fjernAlleFiltre} harFiltre={harAktiveFiltre} lagerErTomt={lagerErTomt} t={t} />
        ) : (
          synlige
            .map((opskrift, i) => {
              const isTop = i === 0
              const dybde = i
              const cardStyle = isTop
                ? { willChange: 'transform', cursor: 'grab', zIndex: 10 }
                : {
                    transform: `translateY(${dybde * 12}px) scale(${1 - dybde * 0.05}) rotate(${dybde === 1 ? -2 : 2}deg)`,
                    transition: 'transform 0.28s ease-out',
                    zIndex: 10 - dybde,
                    pointerEvents: 'none',
                    opacity: 0.85,
                  }
              return (
                <SwipeCard
                  key={opskrift.id}
                  opskrift={opskrift}
                  analyse={analyser(opskrift)}
                  cardStyle={cardStyle}
                  innerRef={isTop ? topCardRef : null}
                  pointerHandlers={isTop ? { onPointerDown, onPointerMove, onPointerUp, onPointerCancel } : {}}
                  onKlik={isTop && !animating ? () => navigate(`/opskrift/${opskrift.id}`) : () => {}}
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
            disabled={animating}
            style={{ ...styles.actionBtn, ...styles.nopeBtn }}
            aria-label="Spring over"
          >
            <CrossIcon />
          </button>

          {/* Fortryd — kun synlig hvis der er historik */}
          <button
            onClick={fortryd}
            disabled={historik.length === 0 || animating}
            style={{
              ...styles.actionBtn,
              opacity: historik.length === 0 || animating ? 0.3 : 1,
              width: 48, height: 48,
            }}
            aria-label="Fortryd"
          >
            <UndoIcon />
          </button>

          <button
            onClick={() => fuldførSwipe('right')}
            disabled={animating}
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

function TomStak({ antalGemte, onForfra, onFjernFiltre, harFiltre, lagerErTomt, t }) {
  if (lagerErTomt) {
    return (
      <div style={styles.tom}>
        <div style={styles.tomEmoji}>🧺</div>
        <h2 style={styles.tomTitel}>Dit lager er tomt</h2>
        <p style={styles.tomTekst}>Tilføj råvarer til dit lager for at se hvilke retter du kan lave nu.</p>
        <button onClick={onFjernFiltre} style={styles.forfraBtn}>Vis alle retter i stedet</button>
      </div>
    )
  }
  if (harFiltre) {
    return (
      <div style={styles.tom}>
        <div style={styles.tomEmoji}>🔍</div>
        <h2 style={styles.tomTitel}>Ingen retter matcher dine filtre</h2>
        <p style={styles.tomTekst}>Prøv at fjerne et eller flere filtre for at se flere retter.</p>
        <button onClick={onFjernFiltre} style={styles.forfraBtn}>Fjern filtre og start forfra</button>
      </div>
    )
  }
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
  return <Heart size={26} fill={colors.green} color={colors.green} />
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
    fontFamily: font.display, fontWeight: 600, fontSize: 32, lineHeight: 1.1,
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
    fontFamily: font.display, fontWeight: 600, fontSize: 26,
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
