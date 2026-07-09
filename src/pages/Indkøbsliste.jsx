import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  hentIndkøbsliste, gemIndkøbsliste,
  toggleTjekket, rydTjekkede, flytTjekkede,
  tilføjTilIndkøbsliste,
} from '../data/indkøbsliste'
import { tilføjTilLager } from '../data/lager'
import { useLang } from '../lib/lang'
import { colors, shadow, radius, font } from '../data/theme'
import { gætEmoji, gætKategori, gætEnhed } from '../lib/ingrediensUtils'

const KAT_RÆKKEFØLGE = ['grønt', 'køl', 'frys', 'tørvarer', 'krydderier']
const KAT_LABELS = { grønt: 'Grønt & Frugt', køl: 'Køl', frys: 'Frys', tørvarer: 'Tørvarer', krydderier: 'Krydderier' }
const KAT_EMOJI  = { grønt: '🥦', køl: '❄️', frys: '🧊', tørvarer: '🥫', krydderier: '🧂' }

export default function Indkøbsliste() {
  const navigate = useNavigate()
  const { t } = useLang()
  const [liste, setListe] = useState(hentIndkøbsliste)
  const [toast, setToast] = useState(null)
  const [manuelÅben, setManuelÅben] = useState(false)
  const [manuelNavn, setManuelNavn] = useState('')
  const [flyttes, setFlyttes] = useState(false)

  function opdater(nyListe) { setListe(nyListe); gemIndkøbsliste(nyListe) }

  function håndterToggle(id) { opdater(toggleTjekket(id)) }

  function håndterRydTjekkede() { opdater(rydTjekkede()) }

  async function håndterFlyt() {
    setFlyttes(true)
    try {
      const resultat = flytTjekkede()
      if (!resultat) { visToast('Ingen tjekkede varer at flytte'); setFlyttes(false); return }
      const { ryddet, lagerVarer } = resultat
      for (const v of lagerVarer) tilføjTilLager(v)
      setListe(ryddet)
      const antal = lagerVarer.length
      visToast(`${antal} ${antal === 1 ? t('il.flytToastEn') : t('il.flytToast')}`)
    } catch {
      visToast('Noget gik galt — prøv igen')
    } finally {
      setFlyttes(false)
    }
  }

  function tilføjManuelt() {
    const navn = manuelNavn.trim()
    if (!navn) return
    const ny = tilføjTilIndkøbsliste([{
      navn,
      emoji: gætEmoji(navn),
      kategori: gætKategori(navn),
      enhed: gætEnhed(navn),
    }])
    setListe(ny)
    setManuelNavn('')
    setManuelÅben(false)
  }

  function visToast(tekst) {
    setToast(tekst)
    setTimeout(() => setToast(null), 3000)
  }

  const ikkeTjekkede = liste.filter((v) => !v.tjekket)
  const tjekkede     = liste.filter((v) => v.tjekket)
  const harTjekkede  = tjekkede.length > 0

  // Grupper utjekkede per kategori
  const grupper = useMemo(() => {
    const map = {}
    for (const v of ikkeTjekkede) {
      const k = v.kategori ?? 'tørvarer'
      if (!map[k]) map[k] = []
      map[k].push(v)
    }
    return KAT_RÆKKEFØLGE.filter((k) => map[k]?.length > 0).map((k) => ({ id: k, varer: map[k] }))
  }, [ikkeTjekkede])

  return (
    <div style={s.page}>
      {/* Toast */}
      {toast && <div style={s.toast}>{toast}</div>}

      {/* Header */}
      <header style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>←</button>
        <h1 style={s.titel}>{t('il.titel')}</h1>
        {harTjekkede && (
          <button style={s.rydBtn} onClick={håndterRydTjekkede}>
            {t('il.rydTjekkede')}
          </button>
        )}
      </header>

      {liste.length === 0 ? (
        <div style={s.tom}>
          <span style={{ fontSize: 52 }}>🛒</span>
          <p style={s.tomTitel}>{t('il.tom')}</p>
          <p style={s.tomSub}>{t('il.tomSub')}</p>
          <button style={s.tomKnap} onClick={() => navigate('/madmatch')}>
            🔍 Find en opskrift
          </button>
        </div>
      ) : (
        <>
          {/* Utjekkede — grupperet per kategori */}
          {grupper.map((g) => (
            <div key={g.id} style={s.gruppe}>
              <p style={s.gruppeLabel}>
                {KAT_EMOJI[g.id]} {KAT_LABELS[g.id]?.toUpperCase()}
              </p>
              <div style={s.kortBoks}>
                {g.varer.map((v, i) => (
                  <VareRæk
                    key={v.id}
                    vare={v}
                    onToggle={() => håndterToggle(v.id)}
                    erSidst={i === g.varer.length - 1}
                    t={t}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Tjekkede varer */}
          {tjekkede.length > 0 && (
            <div style={s.gruppe}>
              <p style={s.gruppeLabel}>✓ TJEKKEDE ({tjekkede.length})</p>
              <div style={s.kortBoks}>
                {tjekkede.map((v, i) => (
                  <VareRæk
                    key={v.id}
                    vare={v}
                    onToggle={() => håndterToggle(v.id)}
                    erSidst={i === tjekkede.length - 1}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Manuel tilføj */}
      {manuelÅben ? (
        <div style={s.manuelBoks}>
          <input
            autoFocus
            style={s.manuelInput}
            placeholder={t('il.vareNavnPh')}
            value={manuelNavn}
            onChange={(e) => setManuelNavn(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') tilføjManuelt() }}
          />
          <div style={s.manuelKnapper}>
            <button style={s.manuelGem} onClick={tilføjManuelt}>{t('il.tilføj')}</button>
            <button style={s.manuelAnnuller} onClick={() => { setManuelÅben(false); setManuelNavn('') }}>
              {t('il.annuller')}
            </button>
          </div>
        </div>
      ) : (
        <button style={s.tilføjManuelBtn} onClick={() => setManuelÅben(true)}>
          {t('il.tilføjManuelt')}
        </button>
      )}

      {/* Flyt til lager — sticky bund */}
      {harTjekkede && (
        <div style={s.flytBar}>
          <button style={s.flytKnap} onClick={håndterFlyt} disabled={flyttes}>
            {flyttes ? t('il.flyttes') : `${t('il.flytTilLager')} (${tjekkede.length})`}
          </button>
        </div>
      )}
    </div>
  )
}

function VareRæk({ vare, onToggle, erSidst, t }) {
  const refs = vare.opskriftRefs?.length > 0
    ? vare.opskriftRefs
    : vare.opskriftTitel
      ? [{ titel: vare.opskriftTitel, id: vare.opskriftId }]
      : []

  return (
    <button
      style={{
        ...s.vareRæk,
        borderBottom: erSidst ? 'none' : `1px solid ${colors.border}`,
        opacity: vare.tjekket ? 0.5 : 1,
      }}
      onClick={onToggle}
    >
      {/* Checkbox */}
      <div style={{ ...s.checkBox, ...(vare.tjekket ? s.checkBoxTjekket : {}) }}>
        {vare.tjekket && <span style={s.checkMærke}>✓</span>}
      </div>

      {/* Emoji + info */}
      <span style={s.emoji}>{vare.emoji}</span>
      <div style={s.info}>
        <span style={{ ...s.navn, textDecoration: vare.tjekket ? 'line-through' : 'none' }}>
          {vare.navn}
        </span>
        {(vare.mængde || vare.enhed) && (
          <span style={s.mængde}>
            {[vare.mængde, vare.enhed].filter(Boolean).join(' ')}
          </span>
        )}
        {refs.length > 0 && (
          <span style={s.opskriftRef}>
            {t('il.fraOpskrift')} {refs.map((r) => r.titel).join(', ')}
          </span>
        )}
      </div>
    </button>
  )
}

const s = {
  page: {
    maxWidth: 480, margin: '0 auto',
    padding: '0 0 160px', minHeight: '100%',
    background: colors.bg,
  },
  toast: {
    position: 'fixed', top: 14, left: '50%', transform: 'translateX(-50%)',
    background: colors.green, color: '#fff', borderRadius: 999,
    padding: '10px 20px', fontFamily: font.body, fontSize: 14, fontWeight: 600,
    zIndex: 500, whiteSpace: 'nowrap', boxShadow: shadow.fab,
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '20px 20px 16px',
    position: 'sticky', top: 'env(safe-area-inset-top, 0px)', background: colors.bg, zIndex: 10,
  },
  backBtn: {
    background: 'none', border: 'none', fontSize: 22,
    color: colors.green, cursor: 'pointer', padding: '4px 6px', lineHeight: 1,
  },
  titel: {
    fontFamily: font.display, fontWeight: 600, fontSize: 24,
    color: colors.text, margin: 0, letterSpacing: -0.4, flex: 1,
  },
  rydBtn: {
    fontFamily: font.body, fontSize: 12.5, fontWeight: 700,
    color: colors.muted, background: 'none', border: 'none',
    cursor: 'pointer', padding: '4px 0', whiteSpace: 'nowrap',
  },
  tom: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 12, padding: '60px 32px', textAlign: 'center',
  },
  tomTitel: {
    fontFamily: font.display, fontWeight: 600, fontSize: 19,
    color: colors.text, margin: 0, letterSpacing: -0.3,
  },
  tomSub: {
    fontFamily: font.body, fontSize: 14, color: colors.muted,
    margin: 0, lineHeight: 1.55, maxWidth: 280,
  },
  tomKnap: {
    fontFamily: font.body, fontWeight: 700, fontSize: 14,
    color: '#fff', background: colors.green, border: 'none',
    borderRadius: radius.button, padding: '12px 24px', cursor: 'pointer',
    marginTop: 8,
  },
  gruppe: { marginBottom: 8 },
  gruppeLabel: {
    fontFamily: font.body, fontSize: 11, fontWeight: 700,
    color: colors.mutedLight, letterSpacing: 1.1,
    padding: '12px 20px 6px', margin: 0,
  },
  kortBoks: {
    background: colors.card, marginInline: 16,
    borderRadius: radius.card, boxShadow: shadow.card, overflow: 'hidden',
  },
  vareRæk: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '13px 16px', width: '100%',
    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
    transition: 'opacity 0.2s',
  },
  checkBox: {
    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
    border: `2px solid ${colors.border}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  },
  checkBoxTjekket: {
    background: colors.green, borderColor: colors.green,
  },
  checkMærke: { color: '#fff', fontSize: 13, fontWeight: 700, lineHeight: 1 },
  emoji: { fontSize: 22, flexShrink: 0 },
  info: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 },
  navn: {
    fontFamily: font.body, fontWeight: 600, fontSize: 15,
    color: colors.text, transition: 'all 0.2s',
  },
  mængde: {
    fontFamily: font.body, fontSize: 12.5, color: colors.muted,
  },
  opskriftRef: {
    fontFamily: font.body, fontSize: 11.5, color: colors.terracotta,
    fontStyle: 'italic',
  },
  tilføjManuelBtn: {
    display: 'block', width: 'calc(100% - 32px)', margin: '8px 16px 0',
    fontFamily: font.body, fontSize: 14, fontWeight: 700,
    color: colors.green, background: 'rgba(47,107,79,0.08)',
    border: `1.5px dashed ${colors.green}`, borderRadius: radius.card,
    padding: '14px', cursor: 'pointer', textAlign: 'center',
  },
  manuelBoks: {
    background: colors.card, marginInline: 16, marginTop: 8,
    borderRadius: radius.card, boxShadow: shadow.card, padding: '16px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  manuelInput: {
    fontFamily: font.body, fontSize: 15, color: colors.text,
    border: `1.5px solid ${colors.border}`, borderRadius: 12,
    padding: '11px 14px', outline: 'none', background: colors.bg,
    width: '100%', boxSizing: 'border-box',
  },
  manuelKnapper: { display: 'flex', gap: 8 },
  manuelGem: {
    flex: 1, fontFamily: font.body, fontWeight: 700, fontSize: 14,
    color: '#fff', background: colors.green, border: 'none',
    borderRadius: 12, padding: '11px', cursor: 'pointer',
  },
  manuelAnnuller: {
    fontFamily: font.body, fontWeight: 600, fontSize: 14,
    color: colors.muted, background: colors.border,
    border: 'none', borderRadius: 12, padding: '11px 16px', cursor: 'pointer',
  },
  flytBar: {
    position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
    width: 'min(448px, calc(100vw - 32px))',
    zIndex: 100,
  },
  flytKnap: {
    width: '100%', fontFamily: font.body, fontWeight: 700, fontSize: 15,
    color: '#fff', background: colors.green, border: 'none',
    borderRadius: radius.card, padding: '16px', cursor: 'pointer',
    boxShadow: shadow.fab,
  },
}
