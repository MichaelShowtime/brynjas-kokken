import { useState, useRef, useMemo, useCallback } from 'react'
import SwipeCard from '../components/SwipeCard'
import { opskrifter } from '../data/opskrifter'
import { hentLager } from '../data/lager'
import { gemLike } from '../data/likes'
import { colors, shadow, radius, font } from '../data/theme'

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
  const [brugLager, setBrugLager] = useState(true)
  const [tilfældig, setTilfældig] = useState(() => bland(opskrifter))

  const [index, setIndex] = useState(0)
  const [gemte, setGemte] = useState([])
  const [drag, setDrag] = useState({ x: 0, y: 0 })
  const [animer, setAnimer] = useState(false)
  const startRef = useRef(null)

  // Filtre
  const [kategori, setKategori] = useState(null) // "Vegetar", "Kød", "Fisk"
  const [under30, setUnder30] = useState(false)

  // Modal
  const [modalOpskrift, setModalOpskrift] = useState(null)

  const lagerNavne = useMemo(
    () => new Set(hentLager().map((r) => r.navn.toLowerCase())),
    []
  )

  const analyser = useCallback(
    (opskrift) => {
      const har = []
      const mangler = []
      for (const i of opskrift.ingredienser) {
        ;(lagerNavne.has(i.navn.toLowerCase()) ? har : mangler).push(i)
      }
      return { har, mangler, kanLaves: mangler.length === 0 }
    },
    [lagerNavne]
  )

  // Anvend filtre
  const kort = useMemo(() => {
    let liste = brugLager
      ? [...opskrifter].sort((a, b) => analyser(a).mangler.length - analyser(b).mangler.length)
      : tilfældig

    // Anvend kategori-filter
    if (kategori) {
      liste = liste.filter((o) => o.kategori === kategori)
    }

    // Anvend tids-filter
    if (under30) {
      liste = liste.filter((o) => o.tid < 30)
    }

    return liste
  }, [brugLager, tilfældig, kategori, under30, analyser])

  function nulstilStak() {
    setIndex(0)
    setGemte([])
    setDrag({ x: 0, y: 0 })
    setAnimer(false)
  }

  function skiftTilstand() {
    const næste = !brugLager
    setBrugLager(næste)
    if (!næste) setTilfældig(bland(opskrifter))
    nulstilStak()
  }

  const fuldførSwipe = useCallback(
    (retning) => {
      const aktuel = kort[index]
      if (retning === 'right' && aktuel) {
        setGemte((g) => [...g, aktuel])
        gemLike(aktuel)
      }
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

  function onPointerDown(e) {
    if (animer) return
    startRef.current = { x: e.clientX, y: e.clientY }
    setAnimer(false)
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
  const slut = index >= kort.length
  const likeOpacity = Math.min(Math.max(drag.x / SWIPE_THRESHOLD, 0), 1)
  const nopeOpacity = Math.min(Math.max(-drag.x / SWIPE_THRESHOLD, 0), 1)

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Mad-match</h1>
        <p style={styles.subtitle}>Swipe dig til aftensmaden</p>
      </header>

      {/* Filter-chips */}
      <div style={styles.filterRow}>
        <button
          style={{
            ...styles.filterChip,
            ...(brugLager ? styles.filterChipAktiv : null),
          }}
          onClick={() => setBrugLager(!brugLager)}
        >
          🧺 Matcher mit lager
        </button>
        <button
          style={{
            ...styles.filterChip,
            ...(kategori === 'Vegetar' ? styles.filterChipAktiv : null),
          }}
          onClick={() => setKategori(kategori === 'Vegetar' ? null : 'Vegetar')}
        >
          Vegetar
        </button>
        <button
          style={{
            ...styles.filterChip,
            ...(kategori === 'Kød' ? styles.filterChipAktiv : null),
          }}
          onClick={() => setKategori(kategori === 'Kød' ? null : 'Kød')}
        >
          Kød
        </button>
        <button
          style={{
            ...styles.filterChip,
            ...(kategori === 'Fisk' ? styles.filterChipAktiv : null),
          }}
          onClick={() => setKategori(kategori === 'Fisk' ? null : 'Fisk')}
        >
          Fisk
        </button>
        <button
          style={{
            ...styles.filterChip,
            ...(under30 ? styles.filterChipAktiv : null),
          }}
          onClick={() => setUnder30(!under30)}
        >
          Under 30 min
        </button>
      </div>

      {/* Kortstak */}
      <div style={styles.deck}>
        {slut ? (
          <TomStak brugLager={brugLager} antalGemte={gemte.length} onForfra={nulstilStak} />
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
                  onKlik={isTop ? () => setModalOpskrift(opskrift) : () => {}}
                />
              )
            })
            .reverse()
        )}
      </div>

      {/* Handlingsknapper */}
      {!slut && (
        <div style={styles.actions}>
          <button
            onClick={() => fuldførSwipe('left')}
            style={{ ...styles.actionBtn, ...styles.nopeBtn }}
            aria-label="Spring over"
          >
            <CrossIcon />
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

      {/* Modal med detaljer */}
      {modalOpskrift && (
        <Modal
          opskrift={modalOpskrift}
          analyse={analyser(modalOpskrift)}
          onLuk={() => setModalOpskrift(null)}
        />
      )}
    </div>
  )
}


function Modal({ opskrift, analyse, onLuk }) {
  const { har, mangler } = analyse

  return (
    <div style={styles.overlay} onClick={onLuk}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button style={styles.modalX} onClick={onLuk}>✕</button>

        <h2 style={styles.modalTitel}>{opskrift.titel}</h2>
        <p style={styles.modalMeta}>af {opskrift.kilde}</p>

        {/* Ingredienser */}
        <div style={styles.sektion}>
          <h3 style={styles.sektionTitel}>Ingredienser</h3>
          <div style={styles.ingrediensList}>
            {har.map((i) => (
              <div key={i.navn} style={styles.ingrediensItem}>
                <span style={{ color: colors.green, fontWeight: 700 }}>✓</span>
                <div>
                  <p style={styles.ingrediensNavn}>{i.navn}</p>
                  <p style={styles.ingrediensMængde}>{i.mængde}</p>
                </div>
              </div>
            ))}
            {mangler.map((i) => (
              <div key={i.navn} style={styles.ingrediensItem}>
                <span style={{ color: colors.terracotta, fontWeight: 700 }}>+</span>
                <div>
                  <p style={styles.ingrediensNavn}>{i.navn}</p>
                  <p style={styles.ingrediensMængde}>{i.mængde}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Venners reaktioner */}
        {opskrift.venner && opskrift.venner.length > 0 && (
          <div style={styles.sektion}>
            <h3 style={styles.sektionTitel}>Venners reaktioner</h3>
            <div style={styles.vennerList}>
              {opskrift.venner.map((v, i) => (
                <div key={i} style={styles.venner}>
                  <span style={{ fontSize: 20 }}>{v.emoji}</span>
                  <div>
                    <p style={styles.vennerNavn}>{v.navn}</p>
                    <p style={styles.vennerAction}>{v.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button style={styles.modalLuk} onClick={onLuk}>Luk</button>
      </div>
    </div>
  )
}

function TomStak({ brugLager, antalGemte, onForfra }) {
  return (
    <div style={styles.tom}>
      <div style={styles.tomEmoji}>{antalGemte > 0 ? '🎉' : '🤔'}</div>
      <h2 style={styles.tomTitel}>Det var dem!</h2>
      <p style={styles.tomTekst}>Du gemte {antalGemte} {antalGemte === 1 ? 'ret' : 'retter'}.</p>
      <button onClick={onForfra} style={styles.forfraBtn}>Start forfra</button>
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

const styles = {
  page: { maxWidth: 480, margin: '0 auto', padding: '20px 20px 120px', minHeight: '100%' },

  header: { marginBottom: 16 },
  title: {
    fontFamily: font.display, fontWeight: 800, fontSize: 32, lineHeight: 1.1,
    color: colors.text, margin: 0, letterSpacing: -0.5,
  },
  subtitle: { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: '6px 0 0' },

  filterRow: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    padding: '0 0 8px',
    margin: '0 -20px',
    paddingLeft: 20,
    paddingRight: 20,
    scrollbarWidth: 'none',
  },
  filterChip: {
    flexShrink: 0,
    fontFamily: font.body,
    fontSize: 13,
    fontWeight: 700,
    color: colors.muted,
    background: colors.card,
    border: `1px solid ${colors.border}`,
    padding: '8px 14px',
    borderRadius: radius.pill,
    boxShadow: shadow.card,
    transition: 'all 0.2s ease',
  },
  filterChipAktiv: {
    color: '#fff',
    background: colors.green,
    border: `1px solid ${colors.green}`,
  },

  deck: { position: 'relative', height: 520, margin: '16px 0' },

  actions: { display: 'flex', justifyContent: 'center', gap: 28, marginTop: 22 },
  actionBtn: {
    width: 64,
    height: 64,
    borderRadius: 999,
    background: colors.card,
    border: `1px solid ${colors.border}`,
    boxShadow: shadow.card,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(31,36,33,0.5)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 100,
    padding: 16,
  },
  modal: {
    background: colors.card,
    borderRadius: radius.card,
    boxShadow: shadow.card,
    width: '100%',
    maxWidth: 440,
    maxHeight: '85vh',
    padding: 20,
    overflowY: 'auto',
    position: 'relative',
  },
  modalX: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 999,
    background: colors.bg,
    border: 'none',
    fontSize: 18,
    fontWeight: 700,
    color: colors.text,
  },

  modalTitel: {
    fontFamily: font.display,
    fontWeight: 800,
    fontSize: 24,
    color: colors.text,
    margin: '0 0 4px',
    letterSpacing: -0.4,
    paddingRight: 40,
  },
  modalMeta: { fontFamily: font.body, fontSize: 13, color: colors.muted, margin: '0 0 20px' },

  sektion: { marginBottom: 22 },
  sektionTitel: {
    fontFamily: font.display,
    fontWeight: 800,
    fontSize: 16,
    color: colors.text,
    margin: '0 0 12px',
    letterSpacing: -0.2,
  },

  ingrediensList: { display: 'flex', flexDirection: 'column', gap: 10 },
  ingrediensItem: {
    display: 'flex',
    gap: 10,
    align: 'center',
  },
  ingrediensNavn: { fontFamily: font.body, fontSize: 14.5, fontWeight: 600, color: colors.text, margin: 0 },
  ingrediensMængde: { fontFamily: font.body, fontSize: 12.5, color: colors.muted, margin: '2px 0 0' },

  vennerList: { display: 'flex', flexDirection: 'column', gap: 10 },
  venner: { display: 'flex', alignItems: 'center', gap: 10 },
  vennerNavn: { fontFamily: font.body, fontSize: 14, fontWeight: 700, color: colors.text, margin: 0 },
  vennerAction: { fontFamily: font.body, fontSize: 12.5, color: colors.muted, margin: '2px 0 0' },

  modalLuk: {
    width: '100%',
    padding: '13px',
    fontFamily: font.body,
    fontSize: 15,
    fontWeight: 700,
    color: '#fff',
    background: colors.green,
    border: 'none',
    borderRadius: radius.button,
    marginTop: 14,
  },

  tom: {
    position: 'absolute',
    inset: 0,
    background: colors.card,
    borderRadius: radius.card,
    boxShadow: shadow.card,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: 28,
  },
  tomEmoji: { fontSize: 56 },
  tomTitel: {
    fontFamily: font.display,
    fontWeight: 800,
    fontSize: 26,
    color: colors.text,
    margin: '14px 0 8px',
  },
  tomTekst: {
    fontFamily: font.body,
    fontSize: 14.5,
    color: colors.muted,
    lineHeight: 1.5,
    margin: '0 0 22px',
  },
  forfraBtn: {
    padding: '13px 26px',
    fontFamily: font.body,
    fontSize: 15,
    fontWeight: 700,
    color: '#fff',
    background: colors.green,
    border: 'none',
    borderRadius: radius.button,
  },
}
