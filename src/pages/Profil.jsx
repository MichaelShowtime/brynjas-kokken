import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { hentAktivBruger, opdaterBruger, logUd } from '../data/auth'
import { ALLE_TAGS, TAG_KATEGORIER } from '../data/tags'
import { hentKreationer } from '../data/kreationer'
import { hentLikes, fjernLike } from '../data/likes'
import { billedeUrl, opskriftFarve, grad, tidLabel } from '../lib/recipeUtils'
import { hentVenner, hentVennerFraDB, tilføjVenDB, fjernVenDB, hentAntalFølgere } from '../data/venner'
import { colors, shadow, radius, font } from '../data/theme'

const AVATARER = ['🧑‍🍳','👩‍🍳','👨‍🍳','🧑🏽‍🍳','👩🏽‍🍳','👨🏾‍🍳','🧑🏻‍🍳','👩🏿‍🍳','🐻','🦊','🐸','🌻']

function beregnStreak(kreationer) {
  if (!kreationer.length) return 0
  const datoer = new Set(kreationer.map((k) => k.dato?.slice(0, 10)).filter(Boolean))
  let streak = 0
  const dag = new Date()
  dag.setHours(0, 0, 0, 0)
  while (datoer.has(dag.toISOString().slice(0, 10))) {
    streak++
    dag.setDate(dag.getDate() - 1)
  }
  return streak
}

function beregnGnsTid(kreationer) {
  const tider = kreationer
    .map((k) => parseInt(k.tidBrugt))
    .filter((n) => !isNaN(n) && n > 0)
  if (!tider.length) return null
  return Math.round(tider.reduce((a, b) => a + b, 0) / tider.length)
}

const ACHIEVEMENTS = [
  { emoji: '🔥', titel: '12 dages streak',  beskrivelse: 'Kogt 12 dage i træk',    opnået: true  },
  { emoji: '👨‍🍳', titel: 'Første ret',       beskrivelse: 'Lavede din første ret',  opnået: true  },
  { emoji: '⭐', titel: 'Madsniffer',        beskrivelse: 'Gemte 10+ opskrifter',   opnået: true  },
  { emoji: '🌿', titel: 'Grøn uge',          beskrivelse: 'Kun vegetar i 7 dage',   opnået: false },
  { emoji: '🍕', titel: 'Weekendkok',        beskrivelse: 'Lavet mad 4 lørdage',    opnået: false },
  { emoji: '🏆', titel: 'Mesterkok',         beskrivelse: 'Lavet 100 retter',       opnået: false },
]

const TILFØJ_VEN_KEY = 'profil_tilfoej_ven'

const NOTIF_KEY    = 'simmer_notif'
const PRIVATLIV_KEY = 'simmer_privatliv'
const DEFAULT_NOTIF = { daglige: true, venner: true, ugentlig: false }
const DEFAULT_PRIV  = { offentlig: true, aktivitet: true, streak: true }

function hentNotif()    { try { return { ...DEFAULT_NOTIF, ...JSON.parse(localStorage.getItem(NOTIF_KEY)) } } catch { return DEFAULT_NOTIF } }
function hentPrivatliv(){ try { return { ...DEFAULT_PRIV,  ...JSON.parse(localStorage.getItem(PRIVATLIV_KEY)) } } catch { return DEFAULT_PRIV } }

// ── Tilføj ven-dialog ────────────────────────────────────────────────────────
function TilføjVenDialog({ brugerEmail, onLuk, onTilføjet }) {
  const [input, setInput] = useState('')
  const [fejl, setFejl] = useState('')
  const [loading, setLoading] = useState(false)

  async function håndter() {
    if (!input.trim()) return
    setLoading(true)
    setFejl('')
    const res = await tilføjVenDB(brugerEmail, input)
    setLoading(false)
    if (!res.ok) { setFejl(res.fejl); return }
    onTilføjet(res.ven)
    onLuk()
  }

  return (
    <div style={s.overlay} onClick={onLuk}>
      <div style={s.dialog} onClick={e => e.stopPropagation()}>
        <p style={s.dialogTitel}>Tilføj ven</p>
        <p style={s.dialogTekst}>Indtast en vens e-mailadresse for at tilføje dem.</p>
        <input
          type="email"
          value={input}
          onChange={e => { setInput(e.target.value); setFejl('') }}
          placeholder="fx. sofie@mail.dk"
          style={{ ...s.input, marginBottom: fejl ? 6 : 14 }}
          autoFocus
          onKeyDown={e => e.key === 'Enter' && håndter()}
        />
        {fejl && <p style={{ fontFamily: font.body, fontSize: 12.5, color: colors.red, margin: '0 0 12px' }}>{fejl}</p>}
        <button style={{ ...s.dialogBekræft, background: colors.green, opacity: loading ? 0.7 : 1 }}
          onClick={håndter} disabled={loading}>
          {loading ? 'Søger…' : 'Tilføj'}
        </button>
        <button style={s.dialogAnnuller} onClick={onLuk}>Annullér</button>
      </div>
    </div>
  )
}

const FAQ = [
  { q: 'Hvordan tilføjer jeg råvarer til mit lager?', a: 'Gå til "Lager" og tryk "+ Tilføj".' },
  { q: 'Hvordan virker Mad-match?', a: 'Swipe til højre for at gemme, til venstre for at springe over. Aktiver "Matcher mit lager" for retter du kan lave nu.' },
  { q: 'Hvad gør Opret-funktionen?', a: 'Tag et billede af dine råvarer og lad AI finde en opskrift til dig.' },
  { q: 'Kan jeg bruge appen offline?', a: 'Ja, dine data gemmes lokalt på enheden.' },
]

// ─── Hoved-komponent ────────────────────────────────────────────────────────

export default function Profil() {
  const navigate = useNavigate()
  const [visning, setVisning] = useState('hoved')
  const [bruger, setBruger] = useState(hentAktivBruger)
  const [aktivTab, setAktivTab] = useState('likes')
  const [kreationer, setKreationer] = useState([])
  const [likes, setLikes] = useState([])
  const [venner, setVenner] = useState(() => hentVenner())
  const [antalFølgere, setAntalFølgere] = useState(0)
  const [logUdDialog, setLogUdDialog] = useState(false)
  const [tilføjVenÅben, setTilføjVenÅben] = useState(false)
  const streak = beregnStreak(kreationer)
  const gnsTid = beregnGnsTid(kreationer)

  useEffect(() => {
    setKreationer(hentKreationer())
    setLikes(hentLikes())
  }, [])

  // Hent rigtige venner + følgere fra Supabase
  useEffect(() => {
    if (bruger?.email) {
      hentVennerFraDB(bruger.email).then((liste) => { if (liste.length) setVenner(liste) })
      hentAntalFølgere(bruger.email).then(setAntalFølgere)
    }
  }, [bruger?.email])

  useEffect(() => {
    if (visning === 'hoved') {
      setBruger(hentAktivBruger())
      setLikes(hentLikes())
      setKreationer(hentKreationer())
    }
  }, [visning])

  function opdater(data) {
    const ny = opdaterBruger(data)
    if (ny) setBruger(ny)
  }

  function toggleTag(id) {
    const tags = bruger.tags.includes(id)
      ? bruger.tags.filter((t) => t !== id)
      : [...bruger.tags, id]
    opdater({ tags })
  }

  function håndterShare() {
    if (navigator.share) {
      navigator.share({ title: 'Brynjas Køkken', text: `Tjek ${bruger.navn} på Brynjas Køkken!`, url: window.location.href })
    } else {
      navigator.clipboard?.writeText(window.location.href)
      alert('Link kopieret!')
    }
  }

  function håndterLogUd() {
    setLogUdDialog(false)
    logUd()
    navigate('/login', { replace: true })
  }

  // ── Sub-side routing ─────────────────────────────────────────────────────
  if (visning === 'rediger')         return <RedigerProfil bruger={bruger} onGem={(d) => { opdater(d); setVisning('hoved') }} onTilbage={() => setVisning('hoved')} />
  if (visning === 'tags')            return <TagsSide bruger={bruger} onGem={(d) => { opdater(d); setVisning('hoved') }} onTilbage={() => setVisning('hoved')} />
  if (visning === 'notifikationer')  return <NotifikationerSide onTilbage={() => setVisning('hoved')} />
  if (visning === 'sprog')           return <SprogSide onTilbage={() => setVisning('hoved')} />
  if (visning === 'privatliv')       return <PrivatlivSide onTilbage={() => setVisning('hoved')} />
  if (visning === 'hjælp')           return <HjælpSide onTilbage={() => setVisning('hoved')} />

  // ── Hoved-profil ─────────────────────────────────────────────────────────
  if (!bruger) return null

  return (
    <div style={s.page}>

      {/* Hero */}
      <div style={s.hero}>
        <div style={s.avatarWrap}>
          <div style={s.avatar}>
            {bruger.avatarUrl
              ? <img src={bruger.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 999 }} />
              : bruger.avatar}
          </div>
          {streak > 0 && <div style={s.streakBadge}>🔥 {streak}</div>}
        </div>
        <h1 style={s.navn}>{bruger.navn} {bruger.efternavn}</h1>
        <p style={s.brugernavn}>{bruger.email}</p>
        {bruger.bio && <p style={s.bio}>{bruger.bio}</p>}

        <div style={s.statsRow}>
          <Stat tal={kreationer.length} label="retter" /><div style={s.statDiv} />
          <Stat tal={antalFølgere} label="følgere" /><div style={s.statDiv} />
          <Stat tal={venner.length} label="følger" />
        </div>

        <div style={s.btnRow}>
          <button style={s.editBtn} onClick={() => setVisning('rediger')}>Rediger profil</button>
          <button style={s.shareBtn} onClick={håndterShare}><ShareIcon /></button>
        </div>
      </div>

      {/* Tags */}
      <div style={s.sektion}>
        <div style={s.sektionHeader}>
          <h2 style={s.sektionTitel}>Mine tags</h2>
          <button style={s.redigerTagsBtn} onClick={() => setVisning('tags')}>Rediger</button>
        </div>
        <p style={s.sektionHint}>Bruges til at skræddersy Mad-match og forslag</p>
        {bruger.tags.length === 0 ? (
          <button style={s.tilføjTagsBtn} onClick={() => setVisning('tags')}>+ Tilføj dine første tags</button>
        ) : (
          <div style={s.tagGrid}>
            {bruger.tags.map((id) => {
              const tag = ALLE_TAGS.find((t) => t.id === id)
              return tag ? (
                <div key={id} style={s.tagChip}>
                  <span>{tag.emoji}</span> {tag.label}
                </div>
              ) : null
            })}
          </div>
        )}
      </div>

      {/* Venner */}
      <div style={s.kort}>
        <div style={s.kortHeader}>
          <p style={s.kortTitel}>Madvenner {venner.length > 0 ? `(${venner.length})` : ''}</p>
          {venner.length > 0 && <button style={s.seeAll} onClick={() => setTilføjVenÅben(true)}>+ Tilføj</button>}
        </div>
        {venner.length === 0 ? (
          <div style={s.inviterBoks}>
            <span style={{ fontSize: 32 }}>👥</span>
            <p style={s.inviterTekst}>Invitér dine venner til Brynjas Køkken og del madoplevelser!</p>
            <button style={s.inviterKnap} onClick={() => setTilføjVenÅben(true)}>+ Tilføj din første ven</button>
          </div>
        ) : (
          <div style={s.vennerRække}>
            {venner.map((v) => (
              <div key={v.id} style={s.vennerItem}>
                <div style={{ ...s.vennerRing, background: v.live ? `linear-gradient(135deg, ${colors.terracotta}, ${colors.red})` : colors.border }}>
                  <div style={s.vennerAvatar}>{v.emoji}</div>
                </div>
                <span style={s.vennerNavn}>{v.navn}</span>
              </div>
            ))}
            <div style={s.vennerItem} onClick={() => setTilføjVenÅben(true)}>
              <div style={{ ...s.vennerRing, background: colors.border }}>
                <div style={{ ...s.vennerAvatar, fontSize: 22, color: colors.green }}>+</div>
              </div>
              <span style={s.vennerNavn}>Tilføj</span>
            </div>
          </div>
        )}
      </div>

      {/* Statistik */}
      <div style={s.kort}>
        <p style={{ ...s.kortTitel, marginBottom: 14 }}>Din madstatistik</p>
        <div style={s.statGrid}>
          <div style={s.statBox}>
            <span style={s.statBoxTal}>{streak}</span>
            <span style={s.statBoxLabel}>🔥 Dages streak</span>
          </div>
          <div style={s.statBox}>
            <span style={s.statBoxTal}>{kreationer.length}</span>
            <span style={s.statBoxLabel}>🍽️ Retter lavet</span>
          </div>
          <div style={s.statBox}>
            <span style={s.statBoxTal}>{gnsTid ? `${gnsTid}m` : '—'}</span>
            <span style={s.statBoxLabel}>⏱ Gns. tid</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {[
          { id: 'likes',     label: `❤️ Likes (${likes.length})` },
          { id: 'kreationer', label: `Kreationer (${kreationer.length})` },
          { id: 'badges',    label: 'Badges' },
        ].map((t) => (
          <button key={t.id} onClick={() => setAktivTab(t.id)}
            style={{ ...s.tab, ...(aktivTab === t.id ? s.tabAktiv : {}) }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Likes-tab */}
      {aktivTab === 'likes' && (
        <div style={s.tabIndhold}>
          {likes.length === 0
            ? <TomTab emoji="❤️" tekst="Swipe højre i Mad-match for at gemme retter her." knap="Åbn Mad-match" onKnap={() => navigate('/madmatch')} />
            : (
              <div style={s.grid2}>
                {likes.map((o) => {
                  const farve = opskriftFarve(o.tags ?? [])
                  const imgUrl = billedeUrl(o.storage_image)
                  const tid = tidLabel(o.prep_time, o.cook_time)
                  return (
                    <div key={o.id} style={s.opskriftKort} onClick={() => navigate(`/opskrift/${o.id}`)}>
                      <div style={{ ...s.opskriftHero, background: grad(farve), position: 'relative', overflow: 'hidden' }}>
                        {imgUrl && <img src={imgUrl} alt={o.title} style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover' }} />}
                        <button style={s.fjernBtn} onClick={(e) => { e.stopPropagation(); setLikes(fjernLike(o.id)) }}>✕</button>
                      </div>
                      <div style={s.opskriftBody}>
                        <p style={s.opskriftTitel}>{o.title}</p>
                        {tid && <p style={s.opskriftMeta}>⏱ {tid}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>
      )}

      {/* Kreationer-tab */}
      {aktivTab === 'kreationer' && (
        <div style={s.tabIndhold}>
          {kreationer.length === 0
            ? <TomTab emoji="📸" tekst="Tag et billede og skab din første kreation." knap="Gå til Opret" onKnap={() => navigate('/opret')} />
            : kreationer.map((k) => {
              const fotoSrc = k.foto
                ? (k.foto.startsWith('blob:') ? k.foto : billedeUrl(k.foto))
                : null
              const titel = k.titel ?? k.navn ?? 'Kreation'
              const dato = k.dato ? new Date(k.dato).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }) : ''
              const tidBrugt = k.tidBrugt ? ` · ⏱ ${k.tidBrugt}` : ''
              return (
                <div key={k.id} style={s.kreationItem}>
                  {fotoSrc
                    ? <img src={fotoSrc} alt="" style={s.kreationThumb} />
                    : <div style={{ ...s.kreationThumb, ...s.kreationThumbTom }}>🍽️</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={s.kreationNavn}>{titel}</p>
                    <p style={s.kreationMeta}>{dato}{tidBrugt}</p>
                  </div>
                </div>
              )
            })
          }
        </div>
      )}

      {/* Badges-tab */}
      {aktivTab === 'badges' && (
        <div style={{ ...s.tabIndhold, padding: 16 }}>
          <div style={s.grid3}>
            {ACHIEVEMENTS.map((a, i) => (
              <div key={i} style={{ ...s.badge, ...(a.opnået ? {} : s.badgeLocked) }}>
                <span style={{ fontSize: 28 }}>{a.opnået ? a.emoji : '🔒'}</span>
                <p style={s.badgeTitel}>{a.titel}</p>
                <p style={s.badgeDesc}>{a.beskrivelse}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Indstillinger */}
      <div style={s.sektion}>
        <h2 style={s.sektionTitel}>Indstillinger</h2>
        {[
          { emoji: '🔔', label: 'Notifikationer', sub: 'Daglige forslag kl. 17:00', side: 'notifikationer' },
          { emoji: '🌍', label: 'Sprog',           sub: 'Dansk',                    side: 'sprog' },
          { emoji: '🛡️', label: 'Privatliv',       sub: 'Offentlig profil',         side: 'privatliv' },
          { emoji: '❓', label: 'Hjælp & feedback', sub: null,                       side: 'hjælp' },
        ].map((item) => (
          <button key={item.side} style={s.indstRække} onClick={() => setVisning(item.side)}>
            <span style={s.indstEmoji}>{item.emoji}</span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={s.indstLabel}>{item.label}</p>
              {item.sub && <p style={s.indstSub}>{item.sub}</p>}
            </div>
            <span style={s.indstPil}>›</span>
          </button>
        ))}
      </div>

      <button style={s.logUdBtn} onClick={() => setLogUdDialog(true)}>Log ud</button>

      {logUdDialog && (
        <div style={s.overlay} onClick={() => setLogUdDialog(false)}>
          <div style={s.dialog} onClick={(e) => e.stopPropagation()}>
            <p style={s.dialogTitel}>Log ud?</p>
            <p style={s.dialogTekst}>Du kan altid logge ind igen med din e-mail og adgangskode.</p>
            <button style={s.dialogBekræft} onClick={håndterLogUd}>Log ud</button>
            <button style={s.dialogAnnuller} onClick={() => setLogUdDialog(false)}>Annullér</button>
          </div>
        </div>
      )}

      {tilføjVenÅben && (
        <TilføjVenDialog
          brugerEmail={bruger.email}
          onLuk={() => setTilføjVenÅben(false)}
          onTilføjet={(nyVen) => setVenner((prev) => [...prev, nyVen])}
        />
      )}
    </div>
  )
}

// ─── Rediger profil ─────────────────────────────────────────────────────────

function RedigerProfil({ bruger, onGem, onTilbage }) {
  const [avatar, setAvatar] = useState(bruger.avatar)
  const [navn, setNavn] = useState(bruger.navn || '')
  const [efternavn, setEfternavn] = useState(bruger.efternavn || '')
  const [bio, setBio] = useState(bruger.bio || '')
  const [telefon, setTelefon] = useState(bruger.telefon || '')
  const [avatarFil, setAvatarFil] = useState(null)
  const [avatarFotoUrl, setAvatarFotoUrl] = useState(bruger.avatarUrl || null)
  const [gemmer, setGemmer] = useState(false)
  const fotoInputRef = useRef(null)

  function vælgFoto(e) {
    const fil = e.target.files?.[0]
    if (!fil) return
    setAvatarFil(fil)
    setAvatarFotoUrl(URL.createObjectURL(fil))
  }

  async function gem() {
    setGemmer(true)
    let nyAvatarUrl = bruger.avatarUrl || null
    if (avatarFil) {
      try {
        const ext = avatarFil.name.split('.').pop() || 'jpg'
        const sti = `avatarer/${bruger.email.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${ext}`
        const { data, error } = await supabase.storage.from('recipes').upload(sti, avatarFil, { upsert: true })
        if (!error && data?.path) {
          const { data: urlData } = supabase.storage.from('recipes').getPublicUrl(data.path)
          nyAvatarUrl = urlData.publicUrl
        }
      } catch {}
    }
    setGemmer(false)
    onGem({ avatar, navn, efternavn, bio, telefon, avatarUrl: nyAvatarUrl })
  }

  return (
    <div style={s.subSide}>
      <SubHeader titel="Rediger profil" onTilbage={onTilbage} />
      <div style={s.subIndhold}>

        <div style={s.læsOnlyFelt}>
          <span style={s.læsOnlyLabel}>E-mail</span>
          <span style={s.læsOnlyVærdi}>{bruger.email}</span>
        </div>

        <label style={s.feltLabel}>Fornavn</label>
        <input value={navn} onChange={(e) => setNavn(e.target.value)}
          placeholder="Fornavn" style={s.input} />

        <label style={s.feltLabel}>Efternavn</label>
        <input value={efternavn} onChange={(e) => setEfternavn(e.target.value)}
          placeholder="Efternavn" style={s.input} />

        <label style={s.feltLabel}>Telefonnummer</label>
        <input value={telefon} onChange={(e) => setTelefon(e.target.value)}
          placeholder="+45 12 34 56 78" style={s.input} />

        <label style={s.feltLabel}>Bio</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)}
          placeholder="Fortæl lidt om din madstil…"
          style={{ ...s.input, height: 80, resize: 'none' }} />

        <label style={s.feltLabel}>Profilbillede</label>
        <input ref={fotoInputRef} type="file" accept="image/*" onChange={vælgFoto} style={{ display: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{ width: 72, height: 72, borderRadius: 999, overflow: 'hidden', background: s.avatar.background, border: `2px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, flexShrink: 0 }}>
            {avatarFotoUrl
              ? <img src={avatarFotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : avatar}
          </div>
          <button style={{ ...s.sekundærBtn, width: 'auto', marginTop: 0, padding: '10px 16px' }}
            onClick={() => fotoInputRef.current?.click()}>
            📷 Upload foto
          </button>
          {avatarFotoUrl && bruger.avatarUrl !== avatarFotoUrl && (
            <button style={{ background: 'none', border: 'none', color: colors.muted, fontSize: 13, padding: 0, cursor: 'pointer' }}
              onClick={() => { setAvatarFil(null); setAvatarFotoUrl(bruger.avatarUrl || null) }}>
              Fortryd
            </button>
          )}
        </div>

        <label style={s.feltLabel}>Eller vælg emoji-avatar</label>
        <div style={s.avatarGrid}>
          {AVATARER.map((a) => (
            <button key={a} onClick={() => { setAvatar(a); setAvatarFil(null); setAvatarFotoUrl(null) }}
              style={{ ...s.avatarValg, ...(avatar === a && !avatarFotoUrl ? s.avatarAktiv : {}) }}>
              {a}
            </button>
          ))}
        </div>

        <button style={{ ...s.primærBtn, opacity: gemmer ? 0.7 : 1 }} onClick={gem} disabled={gemmer}>
          {gemmer ? 'Gemmer…' : 'Gem ændringer'}
        </button>
        <button style={s.sekundærBtn} onClick={onTilbage}>Annullér</button>
      </div>
    </div>
  )
}

// ─── Tags-side ───────────────────────────────────────────────────────────────

function TagsSide({ bruger, onGem, onTilbage }) {
  const [tags, setTags] = useState(new Set(bruger.tags))

  function toggle(id) {
    setTags((prev) => {
      const ny = new Set(prev)
      ny.has(id) ? ny.delete(id) : ny.add(id)
      return ny
    })
  }

  return (
    <div style={s.subSide}>
      <SubHeader titel="Mine tags" onTilbage={onTilbage} />
      <div style={s.subIndhold}>
        <p style={s.subBeskrivelse}>Vælg tags der passer til dig — de bruges til at skræddersy Mad-match og dine daglige forslag.</p>

        {TAG_KATEGORIER.map((kat) => {
          const katTags = ALLE_TAGS.filter((t) => t.kategori === kat.id)
          return (
            <div key={kat.id} style={{ marginBottom: 24 }}>
              <p style={s.tagKatLabel}>{kat.label}</p>
              <div style={s.tagGrid}>
                {katTags.map((tag) => {
                  const aktiv = tags.has(tag.id)
                  return (
                    <button key={tag.id} onClick={() => toggle(tag.id)}
                      style={{ ...s.tagValgChip, ...(aktiv ? s.tagValgAktiv : {}) }}>
                      <span>{tag.emoji}</span> {tag.label}
                      {aktiv && <span style={{ marginLeft: 4, color: colors.green }}>✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        <button style={s.primærBtn} onClick={() => onGem({ tags: [...tags] })}>
          Gem tags ({tags.size} valgt)
        </button>
        <button style={s.sekundærBtn} onClick={onTilbage}>Annullér</button>
      </div>
    </div>
  )
}

// ─── Notifikationer ──────────────────────────────────────────────────────────

function NotifikationerSide({ onTilbage }) {
  const [notif, setNotif] = useState(hentNotif)
  function toggle(key) {
    const ny = { ...notif, [key]: !notif[key] }
    setNotif(ny)
    try { localStorage.setItem(NOTIF_KEY, JSON.stringify(ny)) } catch {}
  }
  return (
    <div style={s.subSide}>
      <SubHeader titel="Notifikationer" onTilbage={onTilbage} />
      <div style={s.subIndhold}>
        <p style={s.subBeskrivelse}>Vælg hvornår Brynjas Køkken må sende dig beskeder.</p>
        {[
          { key: 'daglige', label: 'Daglige madforslag', sub: 'Kl. 17:00 hver dag' },
          { key: 'venner',  label: 'Venners aktivitet',  sub: 'Når nogen i dit netværk laver noget' },
          { key: 'ugentlig',label: 'Ugentlig madplan',   sub: 'Mandag morgen' },
        ].map((item) => (
          <div key={item.key} style={s.toggleRække}>
            <div style={{ flex: 1 }}>
              <p style={s.indstLabel}>{item.label}</p>
              <p style={s.indstSub}>{item.sub}</p>
            </div>
            <Toggle on={notif[item.key]} onToggle={() => toggle(item.key)} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Sprog ────────────────────────────────────────────────────────────────────

function SprogSide({ onTilbage }) {
  const [valgt, setValgt] = useState('da')
  return (
    <div style={s.subSide}>
      <SubHeader titel="Sprog" onTilbage={onTilbage} />
      <div style={s.subIndhold}>
        <p style={s.subBeskrivelse}>Vælg dit foretrukne sprog.</p>
        {[{ kode: 'da', label: 'Dansk', flag: '🇩🇰' }, { kode: 'en', label: 'English', flag: '🇬🇧' }, { kode: 'no', label: 'Norsk', flag: '🇳🇴' }, { kode: 'sv', label: 'Svenska', flag: '🇸🇪' }].map((sp) => (
          <button key={sp.kode} onClick={() => setValgt(sp.kode)}
            style={{ ...s.valgRække, ...(valgt === sp.kode ? s.valgRækkeAktiv : {}) }}>
            <span style={{ fontSize: 22 }}>{sp.flag}</span>
            <span style={{ ...s.indstLabel, flex: 1, textAlign: 'left' }}>{sp.label}</span>
            {valgt === sp.kode && <span style={{ color: colors.green, fontWeight: 800 }}>✓</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Privatliv ────────────────────────────────────────────────────────────────

function PrivatlivSide({ onTilbage }) {
  const [priv, setPriv] = useState(hentPrivatliv)
  function toggle(key) {
    const ny = { ...priv, [key]: !priv[key] }
    setPriv(ny)
    try { localStorage.setItem(PRIVATLIV_KEY, JSON.stringify(ny)) } catch {}
  }
  return (
    <div style={s.subSide}>
      <SubHeader titel="Privatliv" onTilbage={onTilbage} />
      <div style={s.subIndhold}>
        <p style={s.subBeskrivelse}>Styr hvad andre kan se om dig.</p>
        {[
          { key: 'offentlig', label: 'Offentlig profil',           sub: 'Alle kan finde og se din profil' },
          { key: 'aktivitet', label: 'Del aktivitet med venner',   sub: 'Venner kan se hvad du laver' },
          { key: 'streak',    label: 'Vis streak offentligt',      sub: 'Din streak vises på din profil' },
        ].map((item) => (
          <div key={item.key} style={s.toggleRække}>
            <div style={{ flex: 1 }}>
              <p style={s.indstLabel}>{item.label}</p>
              <p style={s.indstSub}>{item.sub}</p>
            </div>
            <Toggle on={priv[item.key]} onToggle={() => toggle(item.key)} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Hjælp ────────────────────────────────────────────────────────────────────

function HjælpSide({ onTilbage }) {
  const [åben, setÅben] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [sendt, setSendt] = useState(false)
  return (
    <div style={s.subSide}>
      <SubHeader titel="Hjælp & feedback" onTilbage={onTilbage} />
      <div style={s.subIndhold}>
        <h3 style={s.subSektionTitel}>Ofte stillede spørgsmål</h3>
        {FAQ.map((f, i) => (
          <div key={i} style={s.faqItem}>
            <button style={s.faqQ} onClick={() => setÅben(åben === i ? null : i)}>
              <span style={{ flex: 1, textAlign: 'left' }}>{f.q}</span>
              <span style={{ color: colors.mutedLight, transform: åben === i ? 'rotate(90deg)' : 'none', transition: '0.2s' }}>›</span>
            </button>
            {åben === i && <p style={s.faqA}>{f.a}</p>}
          </div>
        ))}
        <h3 style={{ ...s.subSektionTitel, marginTop: 28 }}>Send feedback</h3>
        {sendt
          ? <div style={s.infoBox}>✅ Tak for din feedback!</div>
          : <>
              <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)}
                placeholder="Fortæl os hvad du synes…"
                style={{ ...s.input, height: 100, resize: 'none' }} />
              <button style={s.primærBtn} onClick={() => feedback.trim() && setSendt(true)}>Send</button>
            </>
        }
        <div style={{ ...s.infoBox, marginTop: 20, textAlign: 'center' }}>
          <p style={{ margin: 0, fontWeight: 700, color: colors.text }}>Brynjas Køkken · Version 0.1.0</p>
        </div>
      </div>
    </div>
  )
}

// ─── Delte hjælpekomponenter ─────────────────────────────────────────────────

function SubHeader({ titel, onTilbage }) {
  return (
    <div style={s.subHeader}>
      <button style={s.tilbageBtn} onClick={onTilbage}>‹ Profil</button>
      <h1 style={s.subTitel}>{titel}</h1>
    </div>
  )
}

function Toggle({ on, onToggle }) {
  return (
    <button role="switch" aria-checked={on} onClick={onToggle}
      style={{ ...s.toggleTrack, background: on ? colors.green : colors.mutedLight }}>
      <span style={{ ...s.toggleKnob, transform: on ? 'translateX(22px)' : 'translateX(0)' }} />
    </button>
  )
}

function Stat({ tal, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={s.statTal}>{tal}</p>
      <p style={s.statLabel}>{label}</p>
    </div>
  )
}

function TomTab({ emoji, tekst, knap, onKnap }) {
  return (
    <div style={s.tomTab}>
      <span style={{ fontSize: 36 }}>{emoji}</span>
      <p style={s.tomTabTekst}>{tekst}</p>
      <button style={s.primærBtn} onClick={onKnap}>{knap}</button>
    </div>
  )
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  page: { maxWidth: 480, margin: '0 auto', padding: '0 0 120px', minHeight: '100%' },
  subSide: { maxWidth: 480, margin: '0 auto', minHeight: '100%', background: colors.bg },

  hero: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 24px 24px', background: colors.card, boxShadow: shadow.card, marginBottom: 12 },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: { width: 88, height: 88, borderRadius: 999, background: colors.bg, border: `3px solid ${colors.border}`, fontSize: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: shadow.card },
  streakBadge: { position: 'absolute', bottom: -6, right: -8, background: colors.card, border: `2px solid ${colors.border}`, borderRadius: 999, fontSize: 12, fontFamily: font.body, fontWeight: 800, color: colors.text, padding: '3px 8px', boxShadow: shadow.card },
  navn: { fontFamily: font.display, fontWeight: 800, fontSize: 22, color: colors.text, margin: 0, letterSpacing: -0.4 },
  brugernavn: { fontFamily: font.body, fontSize: 13, fontWeight: 500, color: colors.mutedLight, margin: '3px 0 8px' },
  bio: { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: '0 0 14px', textAlign: 'center', lineHeight: 1.5, maxWidth: 300 },
  statsRow: { display: 'flex', alignItems: 'center', gap: 24, marginBottom: 18 },
  statTal: { fontFamily: font.display, fontWeight: 800, fontSize: 20, color: colors.text, margin: 0 },
  statLabel: { fontFamily: font.body, fontSize: 12, color: colors.muted, margin: '2px 0 0', fontWeight: 500 },
  statDiv: { width: 1, height: 28, background: colors.border },
  btnRow: { display: 'flex', gap: 10 },
  editBtn: { flex: 1, padding: '11px 20px', fontFamily: font.body, fontWeight: 700, fontSize: 14, color: colors.text, background: colors.bg, border: `1.5px solid ${colors.border}`, borderRadius: radius.button },
  shareBtn: { width: 44, height: 44, borderRadius: radius.button, background: colors.bg, border: `1.5px solid ${colors.border}`, color: colors.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' },

  sektion: { padding: '20px 16px' },
  sektionHeader: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 },
  sektionTitel: { fontFamily: font.display, fontWeight: 800, fontSize: 18, color: colors.text, margin: 0, letterSpacing: -0.3 },
  sektionHint: { fontFamily: font.body, fontSize: 13, color: colors.mutedLight, margin: '0 0 14px' },
  redigerTagsBtn: { fontFamily: font.body, fontSize: 13, fontWeight: 700, color: colors.green, background: 'none', border: 'none', padding: 0 },
  tilføjTagsBtn: { fontFamily: font.body, fontSize: 14, fontWeight: 700, color: colors.green, background: 'rgba(47,107,79,0.08)', border: 'none', borderRadius: radius.pill, padding: '10px 16px' },
  tagGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  tagChip: { display: 'flex', alignItems: 'center', gap: 6, fontFamily: font.body, fontSize: 13, fontWeight: 700, color: colors.text, background: colors.card, border: `1.5px solid ${colors.border}`, padding: '8px 13px', borderRadius: radius.pill, boxShadow: shadow.card },

  kort: { background: colors.card, borderRadius: radius.card, boxShadow: shadow.card, padding: 16, margin: '0 16px 12px' },
  kortHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 },
  kortTitel: { fontFamily: font.display, fontWeight: 800, fontSize: 16, color: colors.text, margin: 0 },
  seeAll: { fontFamily: font.body, fontSize: 13, fontWeight: 700, color: colors.green, background: 'none', border: 'none', padding: 0 },
  vennerRække: { display: 'flex', gap: 14, overflowX: 'auto', scrollbarWidth: 'none' },
  vennerItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 },
  vennerRing: { width: 52, height: 52, borderRadius: 999, padding: 3, display: 'flex' },
  vennerAvatar: { flex: 1, borderRadius: 999, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: `2px solid ${colors.card}` },
  vennerNavn: { fontFamily: font.body, fontSize: 11.5, fontWeight: 600, color: colors.text },
  inviterBoks: { textAlign: 'center', padding: '12px 8px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  inviterTekst: { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: 0, lineHeight: 1.5, maxWidth: 260 },
  inviterKnap: { fontFamily: font.body, fontWeight: 700, fontSize: 14, color: '#fff', background: colors.green, border: 'none', borderRadius: radius.pill, padding: '10px 20px', cursor: 'pointer' },
  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 },
  statBox: { background: colors.bg, borderRadius: 14, padding: '12px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  statBoxTal: { fontFamily: font.display, fontWeight: 800, fontSize: 22, color: colors.text },
  statBoxLabel: { fontFamily: font.body, fontSize: 11.5, fontWeight: 600, color: colors.muted, lineHeight: 1.3 },

  tabs: { display: 'flex', borderBottom: `1px solid ${colors.border}`, margin: '0 16px', overflowX: 'auto', scrollbarWidth: 'none' },
  tab: { flexShrink: 0, fontFamily: font.body, fontWeight: 700, fontSize: 13, color: colors.mutedLight, background: 'none', border: 'none', borderBottom: '2.5px solid transparent', padding: '12px 12px', whiteSpace: 'nowrap' },
  tabAktiv: { color: colors.green, borderBottom: `2.5px solid ${colors.green}` },
  tabIndhold: { padding: '0 0 8px' },

  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 16 },
  opskriftKort: { background: colors.card, borderRadius: 18, boxShadow: shadow.card, overflow: 'hidden' },
  opskriftHero: { height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  opskriftEmoji: { fontSize: 40, filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.2))' },
  fjernBtn: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 999, background: 'rgba(0,0,0,0.35)', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700 },
  opskriftBody: { padding: '10px 12px 13px' },
  opskriftTitel: { fontFamily: font.body, fontWeight: 700, fontSize: 13.5, color: colors.text, margin: '0 0 4px', lineHeight: 1.3 },
  opskriftMeta: { fontFamily: font.body, fontSize: 12, color: colors.muted, margin: 0 },

  kreationItem: { display: 'flex', alignItems: 'center', gap: 12, background: colors.card, borderRadius: 16, boxShadow: shadow.card, padding: 12, margin: '0 16px 10px' },
  kreationThumb: { width: 54, height: 54, borderRadius: 12, objectFit: 'cover', flexShrink: 0 },
  kreationThumbTom: { background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 },
  kreationNavn: { fontFamily: font.body, fontWeight: 700, fontSize: 14.5, color: colors.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  kreationMeta: { fontFamily: font.body, fontSize: 12.5, color: colors.muted, margin: '3px 0 0' },

  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 },
  badge: { background: colors.card, borderRadius: 16, boxShadow: shadow.card, padding: '16px 10px', textAlign: 'center' },
  badgeLocked: { opacity: 0.42 },
  badgeTitel: { fontFamily: font.body, fontWeight: 700, fontSize: 12, color: colors.text, margin: '8px 0 3px', lineHeight: 1.2 },
  badgeDesc: { fontFamily: font.body, fontSize: 10.5, color: colors.muted, margin: 0, lineHeight: 1.3 },

  tomTab: { textAlign: 'center', padding: '36px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  tomTabTekst: { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: 0, lineHeight: 1.5, maxWidth: 260 },

  indstRække: { width: '100%', display: 'flex', alignItems: 'center', gap: 14, background: colors.card, border: 'none', borderRadius: 14, boxShadow: shadow.card, padding: '13px 14px', marginBottom: 8 },
  indstEmoji: { fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 },
  indstLabel: { fontFamily: font.body, fontWeight: 700, fontSize: 14.5, color: colors.text, margin: 0 },
  indstSub: { fontFamily: font.body, fontSize: 12.5, color: colors.mutedLight, margin: '2px 0 0' },
  indstPil: { fontSize: 22, color: colors.mutedLight, flexShrink: 0 },
  logUdBtn: { margin: '4px 16px 0', width: 'calc(100% - 32px)', padding: 14, fontFamily: font.body, fontWeight: 700, fontSize: 15, color: colors.red, background: 'rgba(194,91,74,0.08)', border: 'none', borderRadius: radius.button },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(31,36,33,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200, padding: 16 },
  dialog: { background: colors.card, borderRadius: radius.card, width: '100%', maxWidth: 440, padding: '24px 20px 20px' },
  dialogTitel: { fontFamily: font.display, fontWeight: 800, fontSize: 20, color: colors.text, margin: '0 0 8px', textAlign: 'center' },
  dialogTekst: { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: '0 0 20px', textAlign: 'center', lineHeight: 1.5 },
  dialogBekræft: { width: '100%', padding: 14, fontFamily: font.body, fontWeight: 700, fontSize: 15, color: '#fff', background: colors.red, border: 'none', borderRadius: radius.button, marginBottom: 8 },
  dialogAnnuller: { width: '100%', padding: 13, fontFamily: font.body, fontWeight: 700, fontSize: 15, color: colors.muted, background: 'transparent', border: 'none', borderRadius: radius.button },

  subHeader: { background: colors.card, borderBottom: `1px solid ${colors.border}`, padding: '14px 16px 12px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 },
  tilbageBtn: { fontFamily: font.body, fontSize: 14, fontWeight: 700, color: colors.green, background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 },
  subTitel: { fontFamily: font.display, fontWeight: 800, fontSize: 18, color: colors.text, margin: 0, letterSpacing: -0.3 },
  subIndhold: { padding: '20px 16px 120px' },
  subBeskrivelse: { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: '0 0 20px', lineHeight: 1.5 },
  subSektionTitel: { fontFamily: font.display, fontWeight: 800, fontSize: 16, color: colors.text, margin: '0 0 12px' },

  toggleTrack: { position: 'relative', width: 48, height: 26, borderRadius: 999, border: 'none', padding: 0, flexShrink: 0, transition: 'background 0.2s' },
  toggleKnob: { position: 'absolute', top: 3, left: 3, width: 20, height: 20, borderRadius: 999, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'transform 0.2s', display: 'block' },
  toggleRække: { display: 'flex', alignItems: 'center', gap: 12, background: colors.card, borderRadius: 14, boxShadow: shadow.card, padding: '13px 14px', marginBottom: 8 },

  valgRække: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: colors.card, border: `1.5px solid ${colors.border}`, borderRadius: 14, padding: '13px 14px', marginBottom: 8, boxShadow: shadow.card },
  valgRækkeAktiv: { border: `1.5px solid ${colors.green}`, background: 'rgba(47,107,79,0.04)' },

  feltLabel: { display: 'block', fontFamily: font.body, fontSize: 12.5, fontWeight: 700, color: colors.mutedLight, margin: '16px 0 7px', letterSpacing: 0.3 },
  input: { width: '100%', padding: '12px 14px', fontFamily: font.body, fontSize: 15, color: colors.text, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, outline: 'none', boxSizing: 'border-box' },
  avatarGrid: { display: 'flex', flexWrap: 'wrap', gap: 10, margin: '0 0 12px' },
  avatarValg: { width: 48, height: 48, borderRadius: 12, fontSize: 26, background: colors.card, border: `2px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatarAktiv: { border: `2px solid ${colors.green}`, background: 'rgba(47,107,79,0.08)' },

  primærBtn: { width: '100%', marginTop: 14, padding: 14, fontFamily: font.body, fontWeight: 700, fontSize: 15, color: '#fff', background: colors.green, border: 'none', borderRadius: radius.button, cursor: 'pointer' },
  sekundærBtn: { width: '100%', marginTop: 8, padding: 13, fontFamily: font.body, fontWeight: 700, fontSize: 15, color: colors.muted, background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: radius.button, cursor: 'pointer' },

  infoBox: { background: 'rgba(47,107,79,0.08)', borderRadius: 14, padding: '13px 14px', fontFamily: font.body, fontSize: 13, color: colors.muted, lineHeight: 1.5, marginBottom: 16 },
  infoBoxTekst: { margin: 0, fontSize: 13, color: colors.muted },
  læsOnlyFelt: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: `1px solid ${colors.border}`, marginBottom: 4 },
  læsOnlyLabel: { fontFamily: font.body, fontSize: 13, fontWeight: 700, color: colors.mutedLight },
  læsOnlyVærdi: { fontFamily: font.body, fontSize: 14, color: colors.text },

  tagKatLabel: { fontFamily: font.body, fontSize: 12, fontWeight: 800, color: colors.mutedLight, letterSpacing: 0.8, margin: '0 0 10px', textTransform: 'uppercase' },
  tagValgChip: { display: 'flex', alignItems: 'center', gap: 6, fontFamily: font.body, fontSize: 13, fontWeight: 700, color: colors.muted, background: colors.card, border: `1.5px solid ${colors.border}`, padding: '9px 13px', borderRadius: radius.pill, boxShadow: shadow.card, cursor: 'pointer' },
  tagValgAktiv: { color: colors.text, background: 'rgba(47,107,79,0.08)', border: `1.5px solid ${colors.green}` },

  faqItem: { background: colors.card, borderRadius: 14, boxShadow: shadow.card, marginBottom: 8, overflow: 'hidden' },
  faqQ: { width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '13px 14px', background: 'transparent', border: 'none', fontFamily: font.body, fontWeight: 700, fontSize: 14, color: colors.text, textAlign: 'left', cursor: 'pointer' },
  faqA: { fontFamily: font.body, fontSize: 13.5, color: colors.muted, padding: '0 14px 14px', margin: 0, lineHeight: 1.55 },
}
