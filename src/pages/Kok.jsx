import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { billedeUrl, opskriftFarve, tidLabel, grad } from '../lib/recipeUtils'
import { gemKreation } from '../data/kreationer'
import { matchIngredienserMedLager, fjernFraLagerVedIds, hentAutoLager } from '../data/lager'
import { hentAktivBruger } from '../data/auth'
import { hentNote } from '../data/noter'
import { colors, shadow, radius, font } from '../data/theme'
import { useLang } from '../lib/lang'

// ── Timer-hook ──────────────────────────────────────────────────────────────

function useTimer() {
  const [sekunder, setSekunder] = useState(0)
  const [kører, setKører] = useState(false)
  const intervalRef = useRef(null)
  const kørerRef = useRef(false) // ref undgår stale-closure i start/pause

  const start = useCallback(() => {
    if (kørerRef.current) return
    kørerRef.current = true
    setKører(true)
    intervalRef.current = setInterval(() => setSekunder((s) => s + 1), 1000)
  }, []) // stabil — ingen dependencies

  const pause = useCallback(() => {
    clearInterval(intervalRef.current)
    intervalRef.current = null
    kørerRef.current = false
    setKører(false)
  }, [])

  const stop = useCallback(() => {
    clearInterval(intervalRef.current)
    intervalRef.current = null
    kørerRef.current = false
    setKører(false)
    setSekunder(0)
  }, [])

  useEffect(() => () => clearInterval(intervalRef.current), [])

  const format = (s) => {
    const t = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (t > 0) return `${t}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  return { sekunder, kører, start, pause, stop, format }
}

// ── Wake Lock ───────────────────────────────────────────────────────────────

function useWakeLock() {
  const lockRef = useRef(null)

  useEffect(() => {
    if (!navigator.wakeLock) return
    navigator.wakeLock.request('screen').then((lock) => {
      lockRef.current = lock
    }).catch(() => {})

    const generhvil = () => {
      if (document.visibilityState === 'visible' && navigator.wakeLock) {
        navigator.wakeLock.request('screen').then((lock) => {
          lockRef.current = lock
        }).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', generhvil)
    return () => {
      lockRef.current?.release()
      document.removeEventListener('visibilitychange', generhvil)
    }
  }, [])
}

// ── Afslut-modal ────────────────────────────────────────────────────────────

function AfslutModal({ opskrift, tidBrugt, onGem, onFortsæt, t }) {
  const [foto, setFoto] = useState(null)
  const [fotoUrl, setFotoUrl] = useState(null)
  const [citat, setCitat] = useState('')
  const [del, setDel] = useState(false)
  const [uploader, setUploader] = useState(false)
  const [uploadFejl, setUploadFejl] = useState(null)
  const kameraRef  = useRef(null)
  const galleriRef = useRef(null)

  function vælgFoto(e) {
    const fil = e.target.files?.[0]
    if (!fil) return
    setFoto(fil)
    setFotoUrl(URL.createObjectURL(fil))
    setDel(true)
    setUploadFejl(null)
  }

  async function gem() {
    setUploader(true)
    setUploadFejl(null)
    const bruger = hentAktivBruger()
    let publicUrl = null
    if (foto && bruger?.id) {
      const ext  = foto.name.split('.').pop().toLowerCase() || 'jpg'
      // UUID first in filename — matches the Storage policy that works for avatars
      const navn = `avatarer/${bruger.id}_kreation_${Date.now()}.${ext}`
      const { data, error } = await supabase.storage
        .from('recipes').upload(navn, foto, { cacheControl: '3600', upsert: true })
      if (error) {
        setUploadFejl(t('kok.modal.fejl'))
        setUploader(false)
        return
      }
      if (data?.path) {
        const { data: urlData } = supabase.storage.from('recipes').getPublicUrl(data.path)
        publicUrl = urlData?.publicUrl ?? null
      }
    }
    const noter = await hentNote(opskrift.id)
    gemKreation({
      id:         Date.now().toString(),
      titel:      opskrift.title,
      opskriftId: opskrift.id,
      tidBrugt,
      dato:       new Date().toISOString(),
      foto:       publicUrl,
      bruger:     bruger?.navn ?? 'Anonym',
      noter:      noter || null,
    })

    if (del && bruger) {
      await supabase.from('posts').insert({
        user_id:        bruger.id,
        bruger_email:   bruger.email,
        bruger_navn:    bruger.navn,
        bruger_avatar:  bruger.avatar ?? '🧑‍🍳',
        opskrift_id:    String(opskrift.id),
        opskrift_titel: opskrift.title,
        foto_path:      publicUrl,
        citat:          citat.trim() || null,
      })
    }

    setUploader(false)
    onGem(publicUrl ?? fotoUrl)
  }

  return (
    <div style={m.overlay}>
      <div style={m.kort}>
        <div style={m.emoji}>🎉</div>
        <h2 style={m.titel}>{t('kok.modal.titel')}</h2>
        <p style={m.tekst}>
          {t('kok.modal.brugte')} <strong>{tidBrugt}</strong> {t('kok.modal.på')} {opskrift.title}.
        </p>

        {/* Foto — preview eller to knapper */}
        {fotoUrl ? (
          <div style={m.fotoPreviewWrap}>
            <img src={fotoUrl} alt="Madfoto" style={m.fotoPreview} />
            <div style={m.fotoActions}>
              <button style={m.fotoActionKnap} onClick={() => kameraRef.current?.click()}>
                {t('kok.modal.tagIgen')}
              </button>
              <button style={m.fotoActionKnap} onClick={() => galleriRef.current?.click()}>
                {t('kok.modal.skiftBill')}
              </button>
            </div>
          </div>
        ) : (
          <div style={m.fotoValg}>
            <button style={m.fotoValgKnap} onClick={() => kameraRef.current?.click()}>
              <span style={{ fontSize: 22 }}>📷</span>
              <span style={m.fotoValgLabel}>{t('kok.modal.tagFoto')}</span>
            </button>
            <button style={m.fotoValgKnap} onClick={() => galleriRef.current?.click()}>
              <span style={{ fontSize: 22 }}>🖼️</span>
              <span style={m.fotoValgLabel}>{t('kok.modal.upload')}</span>
            </button>
          </div>
        )}
        <input ref={kameraRef}  type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={vælgFoto} />
        <input ref={galleriRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={vælgFoto} />

        {uploadFejl && (
          <p style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: 13, color: '#C0392B', margin: '4px 0 0', textAlign: 'center' }}>
            {uploadFejl}
          </p>
        )}

        {/* Del med fællesskabet */}
        <div style={m.delRække}>
          <span style={m.delLabel}>{t('kok.modal.del')}</span>
          <button
            role="switch" aria-checked={del}
            onClick={() => setDel((v) => !v)}
            style={{ ...m.toggle, background: del ? colors.green : colors.mutedLight }}
          >
            <span style={{ ...m.toggleKnob, transform: del ? 'translateX(22px)' : 'translateX(0)' }} />
          </button>
        </div>

        {del && (
          <textarea
            value={citat}
            onChange={(e) => setCitat(e.target.value)}
            placeholder={t('kok.modal.citatPh')}
            style={m.citatInput}
            maxLength={200}
          />
        )}

        <div style={m.knapper}>
          <button style={m.sekundærKnap} onClick={onFortsæt}>{t('kok.modal.fortsæt')}</button>
          <button style={m.primærKnap} onClick={gem} disabled={uploader}>
            {uploader ? t('kok.modal.gemmer') : del ? t('kok.modal.gemDel') : t('kok.modal.arkiv')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Hoved-komponent ──────────────────────────────────────────────────────────

export default function Kok() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useLang()
  const [opskrift, setOpskrift] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tjeklisteMarkeret, setTjeklisteMarkeret] = useState({})
  const [visAfslut, setVisAfslut] = useState(false)
  const [færdig, setFærdig] = useState(false)
  const [lagerMatches, setLagerMatches] = useState(null)
  const { sekunder, kører, start, pause, stop, format } = useTimer()

  useWakeLock()

  useEffect(() => {
    supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setOpskrift(data)
        setLoading(false)
        // Start timer automatisk
        setTimeout(() => start(), 300)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function toggleTrin(idx) {
    setTjeklisteMarkeret((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  const antalTrin = opskrift?.steps?.length ?? 0
  const antalMarkeret = Object.values(tjeklisteMarkeret).filter(Boolean).length
  const fremgang = antalTrin > 0 ? antalMarkeret / antalTrin : 0

  function handleAfslut() {
    pause()
    setVisAfslut(true)
  }

  function handleGem(fotoUrl) {
    setVisAfslut(false)
    stop()
    const ingredienser = opskrift?.ingredients ?? []
    if (ingredienser.length > 0) {
      const matches = matchIngredienserMedLager(ingredienser)
      if (matches.length > 0) {
        if (hentAutoLager()) {
          fjernFraLagerVedIds(matches.map((m) => m.lagerItem.id))
          setFærdig(true)
        } else {
          setLagerMatches(matches)
        }
        return
      }
    }
    setFærdig(true)
  }

  if (loading || !opskrift) {
    return (
      <div style={s.loadPage}>
        <div style={{ fontSize: 48 }}>🍳</div>
        <p style={s.loadTekst}>{loading ? t('kok.henter') : t('kok.ikkeFundet')}</p>
      </div>
    )
  }

  const imgUrl = billedeUrl(opskrift.storage_image, opskrift.image_url)
  const farve = opskriftFarve(opskrift.tags ?? [])
  const tid = tidLabel(opskrift.prep_time, opskrift.cook_time)
  const ingredienser = opskrift.ingredients ?? []
  const trin = opskrift.steps ?? []

  return (
    <div style={s.page}>
      {/* Header med hero-gradient */}
      <div style={{ ...s.hero, background: grad(farve) }}>
        {imgUrl && <img src={imgUrl} alt={opskrift.title} style={s.heroImg} />}
        <div style={s.heroOverlay} />
        <button style={s.backBtn} onClick={() => navigate(-1)}>←</button>
        <div style={s.heroBund}>
          <h1 style={s.heroTitel}>{opskrift.title}</h1>
          {tid && <span style={s.heroTid}>⏱ {tid}</span>}
        </div>
      </div>

      {/* Timer */}
      <div style={s.timerBoks}>
        <span style={s.timerDisplay}>{format(sekunder)}</span>
        <div style={s.timerKnapper}>
          {kører
            ? <button style={s.timerKnap} onClick={pause}>{t('kok.pause')}</button>
            : <button style={{ ...s.timerKnap, background: colors.green, color: '#fff' }} onClick={start}>{t('kok.start')}</button>
          }
          <button style={{ ...s.timerKnap, opacity: sekunder === 0 ? 0.3 : 1 }} onClick={stop} disabled={sekunder === 0}>
            {t('kok.nulstil')}
          </button>
        </div>
      </div>

      {/* Fremgangsbjælke */}
      {antalTrin > 0 && (
        <div style={s.fremgangWrap}>
          <div style={s.fremgangBar}>
            <div style={{ ...s.fremgangFill, width: `${fremgang * 100}%` }} />
          </div>
          <span style={s.fremgangTekst}>{antalMarkeret}/{antalTrin} {t('kok.trin').toLowerCase()}</span>
        </div>
      )}

      <div style={s.body}>
        {/* Ingredienser — kompakt */}
        {ingredienser.length > 0 && (
          <section style={s.sektion}>
            <h2 style={s.sektionTitel}>{t('kok.ingredienser')}</h2>
            <div style={s.ingrediensGitter}>
              {ingredienser.map((i, idx) => (
                <div key={idx} style={s.ingrediensBrik}>
                  <span style={s.ingrediensNavn}>{i.name}</span>
                  {(i.amount || i.unit) && (
                    <span style={s.ingrediensMeta}>{[i.amount, i.unit].filter(Boolean).join(' ')}</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trin-tjekliste */}
        {trin.length > 0 && (
          <section style={s.sektion}>
            <h2 style={s.sektionTitel}>{t('op.fremgangsmåde')}</h2>
            <div style={s.trinListe}>
              {trin.map((tekst, idx) => {
                const gjort = !!tjeklisteMarkeret[idx]
                return (
                  <button
                    key={idx}
                    style={{ ...s.trinItem, ...(gjort ? s.trinGjort : {}) }}
                    onClick={() => toggleTrin(idx)}
                  >
                    <div style={{ ...s.trinNr, background: gjort ? colors.green : colors.bg }}>
                      {gjort ? <CheckIcon /> : <span style={{ fontFamily: font.display, fontWeight: 600, fontSize: 14, color: colors.muted }}>{idx + 1}</span>}
                    </div>
                    <p style={{ ...s.trinTekst, opacity: gjort ? 0.45 : 1, textDecoration: gjort ? 'line-through' : 'none' }}>
                      {tekst}
                    </p>
                  </button>
                )
              })}
            </div>
          </section>
        )}
      </div>

      {/* Afslut-knap */}
      {!færdig && (
        <div style={s.afslutBar}>
          <button style={s.afslutKnap} onClick={handleAfslut}>
            {t('kok.afslut')}
          </button>
        </div>
      )}

      {/* Succes-besked */}
      {færdig && (
        <div style={s.succesBesked}>
          <span style={{ fontSize: 28 }}>🎉</span>
          <span style={s.succesTekst}>{t('kok.færdig.titel')}</span>
          <button style={s.tilbageKnap} onClick={() => navigate(-1)}>{t('kok.færdig.tilbage')}</button>
        </div>
      )}

      {/* Afslut-modal */}
      {visAfslut && (
        <AfslutModal
          opskrift={opskrift}
          tidBrugt={format(sekunder)}
          onGem={handleGem}
          onFortsæt={() => { setVisAfslut(false); start() }}
          t={t}
        />
      )}

      {/* Lager-opdaterings-prompt */}
      {lagerMatches && (
        <LagerOpdateringsPrompt
          matches={lagerMatches}
          t={t}
          onJa={(ids) => {
            fjernFraLagerVedIds(ids)
            setLagerMatches(null)
            setFærdig(true)
          }}
          onNej={() => { setLagerMatches(null); setFærdig(true) }}
        />
      )}
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function LagerOpdateringsPrompt({ matches, t, onJa, onNej }) {
  const [valgte, setValgte] = useState(() => new Set(matches.map((m) => m.lagerItem.id)))

  function toggle(id) {
    setValgte((prev) => {
      const ny = new Set(prev)
      ny.has(id) ? ny.delete(id) : ny.add(id)
      return ny
    })
  }

  return (
    <div style={m.overlay}>
      <div style={{ ...m.kort, gap: 14, alignItems: 'stretch' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 6 }}>🧺</div>
          <h2 style={{ ...m.titel, fontSize: 20 }}>{t('kok.lager.titel')}</h2>
          <p style={{ ...m.tekst, marginTop: 4 }}>{t('kok.lager.sub')}</p>
        </div>

        <div style={lp.liste}>
          {matches.map(({ lagerItem, opskriftIng }) => {
            const aktiv = valgte.has(lagerItem.id)
            return (
              <button
                key={lagerItem.id}
                style={{ ...lp.item, background: aktiv ? 'rgba(47,107,79,0.08)' : colors.bg, border: `1.5px solid ${aktiv ? colors.green : colors.border}` }}
                onClick={() => toggle(lagerItem.id)}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>{lagerItem.emoji}</span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <p style={lp.navn}>{lagerItem.navn}</p>
                  {opskriftIng.amount && (
                    <p style={lp.meta}>{opskriftIng.amount} {opskriftIng.unit}</p>
                  )}
                </div>
                <div style={{ ...lp.check, background: aktiv ? colors.green : 'transparent', border: `2px solid ${aktiv ? colors.green : colors.border}` }}>
                  {aktiv && <CheckIcon />}
                </div>
              </button>
            )
          })}
        </div>

        <div style={{ ...m.knapper, marginTop: 4 }}>
          <button style={m.sekundærKnap} onClick={onNej}>{t('kok.lager.nej')}</button>
          <button
            style={{ ...m.primærKnap, opacity: valgte.size === 0 ? 0.4 : 1 }}
            disabled={valgte.size === 0}
            onClick={() => onJa([...valgte])}
          >
            {t('kok.lager.ja')}
          </button>
        </div>
      </div>
    </div>
  )
}

const lp = {
  liste: { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' },
  item: { display: 'flex', alignItems: 'center', gap: 12, borderRadius: 14, padding: '11px 14px', border: 'none', cursor: 'pointer', transition: 'all 0.15s' },
  navn: { fontFamily: font.body, fontWeight: 700, fontSize: 14.5, color: colors.text, margin: 0 },
  meta: { fontFamily: font.body, fontSize: 12.5, color: colors.muted, margin: '2px 0 0' },
  check: { width: 22, height: 22, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' },
}

const s = {
  page: { maxWidth: 480, margin: '0 auto', minHeight: '100%', paddingBottom: 100, background: colors.bg },

  loadPage: {
    maxWidth: 480, margin: '0 auto', minHeight: '60vh',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 12, padding: 24,
  },
  loadTekst: { fontFamily: font.body, fontSize: 16, color: colors.muted, margin: 0 },

  hero: { width: '100%', height: 220, position: 'relative', overflow: 'hidden' },
  heroImg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  heroOverlay: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 100%)',
  },
  backBtn: {
    position: 'absolute', top: 16, left: 16, width: 40, height: 40, borderRadius: 999,
    background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(8px)',
    border: 'none', color: '#fff', fontSize: 20, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2, cursor: 'pointer',
  },
  heroBund: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 20px 16px', zIndex: 2,
  },
  heroTitel: {
    fontFamily: font.display, fontWeight: 600, fontSize: 24, color: '#fff',
    margin: 0, letterSpacing: -0.5, textShadow: '0 1px 6px rgba(0,0,0,0.3)',
  },
  heroTid: {
    fontFamily: font.body, fontSize: 13, color: 'rgba(255,255,255,0.82)', fontWeight: 600,
    display: 'block', marginTop: 4,
  },

  timerBoks: {
    background: colors.card, margin: '16px 20px 0',
    borderRadius: radius.card, boxShadow: shadow.card,
    padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16,
  },
  timerDisplay: {
    fontFamily: font.display, fontWeight: 600, fontSize: 36, letterSpacing: 2,
    color: colors.text, flex: 1, fontVariantNumeric: 'tabular-nums',
  },
  timerKnapper: { display: 'flex', gap: 8 },
  timerKnap: {
    fontFamily: font.body, fontSize: 13, fontWeight: 700, color: colors.muted,
    background: colors.bg, border: 'none', borderRadius: radius.button,
    padding: '9px 14px', cursor: 'pointer',
  },

  fremgangWrap: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px 0',
  },
  fremgangBar: {
    flex: 1, height: 6, background: colors.border, borderRadius: 999, overflow: 'hidden',
  },
  fremgangFill: {
    height: '100%', background: colors.green, borderRadius: 999,
    transition: 'width 0.3s ease',
  },
  fremgangTekst: {
    fontFamily: font.body, fontSize: 12, fontWeight: 700, color: colors.muted, flexShrink: 0,
  },

  body: { padding: '20px 20px 0' },

  sektion: { marginBottom: 24 },
  sektionTitel: {
    fontFamily: font.display, fontWeight: 600, fontSize: 18,
    color: colors.text, margin: '0 0 12px', letterSpacing: -0.3,
  },

  ingrediensGitter: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
  },
  ingrediensBrik: {
    background: colors.card, borderRadius: 12, boxShadow: shadow.card,
    padding: '10px 13px',
  },
  ingrediensNavn: {
    fontFamily: font.body, fontSize: 13.5, fontWeight: 600, color: colors.text,
    display: 'block', lineHeight: 1.2,
  },
  ingrediensMeta: {
    fontFamily: font.body, fontSize: 12, color: colors.muted, display: 'block', marginTop: 2,
  },

  trinListe: { display: 'flex', flexDirection: 'column', gap: 10 },
  trinItem: {
    display: 'flex', gap: 14, alignItems: 'flex-start',
    background: colors.card, borderRadius: 16, boxShadow: shadow.card,
    padding: '14px 16px', border: 'none', textAlign: 'left', cursor: 'pointer',
    width: '100%',
  },
  trinGjort: { background: `${colors.card}cc` },
  trinNr: {
    width: 32, height: 32, borderRadius: 999, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.2s',
  },
  trinTekst: {
    fontFamily: font.body, fontSize: 14.5, lineHeight: 1.5, color: colors.text,
    margin: '3px 0 0', flex: 1, transition: 'opacity 0.2s',
  },

  afslutBar: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    padding: '16px 20px', background: colors.bg,
    borderTop: `1px solid ${colors.border}`,
  },
  afslutKnap: {
    width: '100%', maxWidth: 480, display: 'block', margin: '0 auto',
    padding: '16px 0', fontFamily: font.body, fontSize: 16, fontWeight: 800,
    color: '#fff', background: colors.green, border: 'none',
    borderRadius: radius.button, cursor: 'pointer', boxShadow: shadow.fab,
  },

  succesBesked: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    padding: '20px', background: colors.card,
    borderTop: `1px solid ${colors.border}`,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  },
  succesTekst: {
    fontFamily: font.display, fontWeight: 600, fontSize: 18, color: colors.text,
  },
  tilbageKnap: {
    fontFamily: font.body, fontSize: 14, fontWeight: 700, color: colors.green,
    background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer',
  },
}

// ── Afslut-modal styles ───────────────────────────────────────────────────────

const m = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.52)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    zIndex: 100, padding: 16,
  },
  kort: {
    background: colors.card, borderRadius: 28, padding: '28px 24px 32px',
    width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 10, boxShadow: '0 -4px 40px rgba(0,0,0,0.18)',
  },
  emoji: { fontSize: 48 },
  titel: {
    fontFamily: font.display, fontWeight: 600, fontSize: 24, color: colors.text, margin: 0,
  },
  tekst: {
    fontFamily: font.body, fontSize: 15, color: colors.muted, textAlign: 'center', margin: 0,
    lineHeight: 1.5,
  },
  fotoPreviewWrap: { width: '100%', display: 'flex', flexDirection: 'column', gap: 8 },
  fotoPreview: { width: '100%', height: 140, objectFit: 'cover', borderRadius: 16, display: 'block' },
  fotoActions: { display: 'flex', gap: 8 },
  fotoActionKnap: {
    flex: 1, padding: '9px 0', fontFamily: font.body, fontSize: 13, fontWeight: 600,
    color: colors.muted, background: colors.bg, border: `1px solid ${colors.border}`,
    borderRadius: 12, cursor: 'pointer',
  },
  fotoLabel: { fontFamily: font.body, fontSize: 14, fontWeight: 600, color: colors.muted },
  fotoValg: { display: 'flex', gap: 10, width: '100%' },
  fotoValgKnap: {
    flex: 1, height: 80, borderRadius: 16, border: `2px dashed ${colors.border}`,
    background: colors.bg, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 5, cursor: 'pointer', padding: 0,
  },
  fotoValgLabel: { fontFamily: font.body, fontSize: 13, fontWeight: 600, color: colors.muted },
  delRække: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '6px 0' },
  delLabel: { fontFamily: font.body, fontSize: 14, fontWeight: 700, color: colors.text },
  toggle: { position: 'relative', width: 48, height: 26, borderRadius: 999, border: 'none', padding: 0, flexShrink: 0, transition: 'background 0.2s', cursor: 'pointer' },
  toggleKnob: { position: 'absolute', top: 3, left: 3, width: 20, height: 20, borderRadius: 999, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'transform 0.2s', display: 'block' },
  citatInput: { width: '100%', padding: '11px 13px', fontFamily: font.body, fontSize: 14, color: colors.text, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, outline: 'none', resize: 'none', boxSizing: 'border-box', height: 72 },
  knapper: { display: 'flex', gap: 10, width: '100%', marginTop: 6 },
  sekundærKnap: {
    flex: 1, padding: '14px 0', fontFamily: font.body, fontSize: 15, fontWeight: 700,
    color: colors.muted, background: colors.bg, border: 'none', borderRadius: radius.button,
    cursor: 'pointer',
  },
  primærKnap: {
    flex: 2, padding: '14px 0', fontFamily: font.body, fontSize: 15, fontWeight: 700,
    color: '#fff', background: colors.green, border: 'none', borderRadius: radius.button,
    cursor: 'pointer',
  },
}
