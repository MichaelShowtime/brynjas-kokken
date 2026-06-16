import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { hentKreationer } from '../data/kreationer'
import { hentLikes, fjernLike } from '../data/likes'
import { venner } from '../data/feed'
import { colors, shadow, radius, font } from '../data/theme'

// --- localStorage helpers til profil-data ---
const PROFIL_KEY = 'simmer_profil'
const DEFAULT_PROFIL = {
  navn: 'Brynja Kjartansdóttir',
  brugernavn: '@brynja',
  bio: 'Elsker mad der smager af noget 🍋 Koger helst fra bunden.',
  avatar: '🧑‍🍳',
  præferencer: ['vegetar', 'pasta', 'hurtig'],
}
function hentProfil() {
  try { return { ...DEFAULT_PROFIL, ...JSON.parse(localStorage.getItem(PROFIL_KEY)) } } catch { return DEFAULT_PROFIL }
}
function gemProfil(data) {
  try { localStorage.setItem(PROFIL_KEY, JSON.stringify(data)) } catch {}
}

const NOTIF_KEY = 'simmer_notif'
const DEFAULT_NOTIF = { daglige: true, venner: true, ugentlig: false }
function hentNotif() {
  try { return { ...DEFAULT_NOTIF, ...JSON.parse(localStorage.getItem(NOTIF_KEY)) } } catch { return DEFAULT_NOTIF }
}

const PRIVATLIV_KEY = 'simmer_privatliv'
const DEFAULT_PRIVATLIV = { offentlig: true, aktivitet: true, streak: true }
function hentPrivatliv() {
  try { return { ...DEFAULT_PRIVATLIV, ...JSON.parse(localStorage.getItem(PRIVATLIV_KEY)) } } catch { return DEFAULT_PRIVATLIV }
}

const PRÆFERENCER = [
  { id: 'vegetar', label: 'Vegetar', emoji: '🥦' },
  { id: 'kød', label: 'Kød', emoji: '🥩' },
  { id: 'fisk', label: 'Fisk & skaldyr', emoji: '🐟' },
  { id: 'pasta', label: 'Pasta', emoji: '🍝' },
  { id: 'hurtig', label: 'Under 30 min', emoji: '⚡' },
  { id: 'asiatisk', label: 'Asiatisk', emoji: '🥢' },
  { id: 'bagning', label: 'Bagning', emoji: '🍞' },
  { id: 'suppe', label: 'Suppe', emoji: '🍲' },
]

const AVATARER = ['🧑‍🍳','👩‍🍳','👨‍🍳','🧑🏽‍🍳','👩🏽‍🍳','👨🏾‍🍳','🧑🏻‍🍳','👩🏿‍🍳','🐻','🦊','🐸','🌻']

const ACHIEVEMENTS = [
  { emoji: '🔥', titel: '12 dages streak', beskrivelse: 'Kogt 12 dage i træk', opnået: true },
  { emoji: '👨‍🍳', titel: 'Første ret', beskrivelse: 'Lavede din første ret', opnået: true },
  { emoji: '⭐', titel: 'Madsniffer', beskrivelse: 'Gemte 10+ opskrifter', opnået: true },
  { emoji: '🌿', titel: 'Grøn uge', beskrivelse: 'Kun vegetar i 7 dage', opnået: false },
  { emoji: '🍕', titel: 'Weekendkok', beskrivelse: 'Lavet mad 4 lørdage', opnået: false },
  { emoji: '🏆', titel: 'Mesterkok', beskrivelse: 'Lavet 100 retter', opnået: false },
]

const SPROG_LISTE = [
  { kode: 'da', label: 'Dansk', flag: '🇩🇰' },
  { kode: 'en', label: 'English', flag: '🇬🇧' },
  { kode: 'no', label: 'Norsk', flag: '🇳🇴' },
  { kode: 'sv', label: 'Svenska', flag: '🇸🇪' },
]

const FAQ = [
  { spørgsmål: 'Hvordan tilføjer jeg råvarer til mit lager?', svar: 'Gå til "Lager" i bundmenuen og tryk på + knappen.' },
  { spørgsmål: 'Hvordan virker Mad-match?', svar: 'Swipe til højre for at gemme en ret, til venstre for at springe over. Aktiver "Matcher mit lager" for at se retter du kan lave nu.' },
  { spørgsmål: 'Hvad gør Opret-funktionen?', svar: 'Tag et billede af dine råvarer og lad AI finde en opskrift til dig.' },
  { spørgsmål: 'Kan jeg bruge appen offline?', svar: 'Ja, dine data gemmes lokalt på enheden.' },
]

function grad(c) {
  const n = parseInt(c.slice(1), 16)
  const f = 0.82
  return `linear-gradient(135deg, ${c}, rgb(${Math.round(((n >> 16) & 255) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)}))`
}

// ─── Hoved-komponent ────────────────────────────────────────────────────────

export default function Profil() {
  const navigate = useNavigate()

  // Sub-side: 'hoved' | 'rediger' | 'notifikationer' | 'sprog' | 'privatliv' | 'hjælp'
  const [visning, setVisning] = useState('hoved')

  // Profil-data fra localStorage
  const [profil, setProfil] = useState(hentProfil)

  const [aktivTab, setAktivTab] = useState('likes')
  const [kreationer, setKreationer] = useState([])
  const [likes, setLikes] = useState([])
  const [logUdDialog, setLogUdDialog] = useState(false)

  useEffect(() => {
    setKreationer(hentKreationer())
    setLikes(hentLikes())
  }, [])

  // Opdatér likes når man vender tilbage til hoved-siden
  useEffect(() => {
    if (visning === 'hoved') setLikes(hentLikes())
  }, [visning])

  function gemProfilOg(opdatering) {
    const ny = { ...profil, ...opdatering }
    setProfil(ny)
    gemProfil(ny)
  }

  function togglePræference(id) {
    const præf = profil.præferencer.includes(id)
      ? profil.præferencer.filter((x) => x !== id)
      : [...profil.præferencer, id]
    gemProfilOg({ præferencer: præf })
  }

  function håndterShare() {
    if (navigator.share) {
      navigator.share({ title: 'Simmer', text: `Tjek ${profil.navn} på Simmer!`, url: window.location.href })
    } else {
      navigator.clipboard?.writeText(window.location.href)
      alert('Link kopieret!')
    }
  }

  function håndterLogUd() {
    setLogUdDialog(false)
    // Ryd session-data (ikke profil-indstillinger)
    localStorage.removeItem('simmer_likes')
    localStorage.removeItem('simmer_kreationer')
    setLikes([])
    setKreationer([])
    alert('Du er nu logget ud.')
  }

  // ── Sub-side routing ──────────────────────────────────────────────────────

  if (visning === 'rediger') {
    return <RedigerProfil profil={profil} onGem={(data) => { gemProfilOg(data); setVisning('hoved') }} onTilbage={() => setVisning('hoved')} />
  }
  if (visning === 'notifikationer') {
    return <NotifikationerSide onTilbage={() => setVisning('hoved')} />
  }
  if (visning === 'sprog') {
    return <SprogSide onTilbage={() => setVisning('hoved')} />
  }
  if (visning === 'privatliv') {
    return <PrivatlivSide onTilbage={() => setVisning('hoved')} />
  }
  if (visning === 'hjælp') {
    return <HjælpSide onTilbage={() => setVisning('hoved')} />
  }

  // ── Hoved-profil ─────────────────────────────────────────────────────────

  return (
    <div style={s.page}>

      {/* Hero */}
      <div style={s.hero}>
        <div style={s.avatarWrap}>
          <div style={s.avatar}>{profil.avatar}</div>
          <div style={s.streakBadge}>🔥 12</div>
        </div>
        <h1 style={s.navn}>{profil.navn}</h1>
        <p style={s.brugernavn}>{profil.brugernavn}</p>
        <p style={s.bio}>{profil.bio}</p>

        <div style={s.statsRow}>
          <Stat tal={48} label="retter" />
          <div style={s.statDiv} />
          <Stat tal={134} label="følgere" />
          <div style={s.statDiv} />
          <Stat tal={61} label="følger" />
        </div>

        <div style={s.btnRow}>
          <button style={s.editBtn} onClick={() => setVisning('rediger')}>Rediger profil</button>
          <button style={s.shareBtn} onClick={håndterShare}><ShareIcon /></button>
        </div>
      </div>

      {/* Venner */}
      <div style={s.kort}>
        <div style={s.kortHeader}>
          <p style={s.kortTitel}>Dine madvenner</p>
          <button style={s.seeAll}>Se alle</button>
        </div>
        <div style={s.vennerRække}>
          {venner.map((v) => (
            <div key={v.id} style={s.vennerItem}>
              <div style={{ ...s.vennerRing, background: v.live ? `linear-gradient(135deg, ${colors.terracotta}, ${colors.red})` : colors.border }}>
                <div style={s.vennerAvatar}>{v.emoji}</div>
              </div>
              <span style={s.vennerNavn}>{v.navn}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Præferencer */}
      <div style={s.sektion}>
        <h2 style={s.sektionTitel}>Mine smagspræferencer</h2>
        <p style={s.sektionHint}>Bruges til at skræddersy dine forslag</p>
        <div style={s.præfGrid}>
          {PRÆFERENCER.map((p) => (
            <button key={p.id} onClick={() => togglePræference(p.id)}
              style={{ ...s.præfChip, ...(profil.præferencer.includes(p.id) ? s.præfAktiv : null) }}>
              <span style={{ fontSize: 17 }}>{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {[
          { id: 'likes', label: `❤️ Likes (${likes.length})` },
          { id: 'gemte', label: 'Gemte' },
          { id: 'kreationer', label: `Kreationer (${kreationer.length})` },
          { id: 'badges', label: 'Badges' },
        ].map((t) => (
          <button key={t.id} onClick={() => setAktivTab(t.id)}
            style={{ ...s.tab, ...(aktivTab === t.id ? s.tabAktiv : null) }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Likes fra Mad-match */}
      {aktivTab === 'likes' && (
        <div style={s.tabIndhold}>
          {likes.length === 0 ? (
            <TomTab emoji="❤️" tekst="Du har ikke swipet højre endnu. Gå til Mad-match og find retter du elsker!" knap="Åbn Mad-match" onKnap={() => navigate('/madmatch')} />
          ) : (
            <div style={s.grid2}>
              {likes.map((o) => (
                <div key={o.id} style={s.opskriftKort}>
                  <div style={{ ...s.opskriftHero, background: grad(o.farve) }}>
                    <span style={s.opskriftEmoji}>{o.emoji}</span>
                    <button style={s.fjernLikeBtn} onClick={() => setLikes(fjernLike(o.id))} aria-label="Fjern">✕</button>
                  </div>
                  <div style={s.opskriftBody}>
                    <p style={s.opskriftTitel}>{o.titel}</p>
                    <p style={s.opskriftMeta}>⏱ {o.tid} min · ⭐ {o.rating}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Gemte (statiske favoritter) */}
      {aktivTab === 'gemte' && (
        <div style={s.tabIndhold}>
          <TomTab emoji="🔖" tekst="Gem opskrifter fra Mad-match ved at swipe højre." knap="Gå til Mad-match" onKnap={() => navigate('/madmatch')} />
        </div>
      )}

      {/* Tab: Kreationer */}
      {aktivTab === 'kreationer' && (
        <div style={s.tabIndhold}>
          {kreationer.length === 0 ? (
            <TomTab emoji="📸" tekst="Tag et billede og skab din første kreation." knap="Gå til Opret" onKnap={() => navigate('/opret')} />
          ) : (
            kreationer.map((k) => (
              <div key={k.id} style={s.kreationItem}>
                {k.foto
                  ? <img src={k.foto} alt="" style={s.kreationThumb} />
                  : <div style={{ ...s.kreationThumb, ...s.kreationThumbTom }}>🍽️</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={s.kreationNavn}>{k.navn}</p>
                  <p style={s.kreationMeta}>
                    {new Date(k.dato).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })}
                    {k.referencer?.length ? ` · 🔗 ${k.referencer.length}` : ''}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Badges */}
      {aktivTab === 'badges' && (
        <div style={{ ...s.tabIndhold, padding: '16px' }}>
          <div style={s.grid3}>
            {ACHIEVEMENTS.map((a, i) => (
              <div key={i} style={{ ...s.badge, ...(a.opnået ? null : s.badgeLocked) }}>
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
          { emoji: '🌍', label: 'Sprog', sub: 'Dansk', side: 'sprog' },
          { emoji: '🛡️', label: 'Privatliv', sub: 'Offentlig profil', side: 'privatliv' },
          { emoji: '❓', label: 'Hjælp & feedback', sub: null, side: 'hjælp' },
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

      {/* Log ud bekræftelse */}
      {logUdDialog && (
        <div style={s.overlay} onClick={() => setLogUdDialog(false)}>
          <div style={s.dialog} onClick={(e) => e.stopPropagation()}>
            <p style={s.dialogTitel}>Log ud?</p>
            <p style={s.dialogTekst}>Dine likes og kreationer slettes fra denne enhed.</p>
            <button style={s.dialogBekræft} onClick={håndterLogUd}>Log ud</button>
            <button style={s.dialogAnnuller} onClick={() => setLogUdDialog(false)}>Annullér</button>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Rediger profil ──────────────────────────────────────────────────────────

function RedigerProfil({ profil, onGem, onTilbage }) {
  const [navn, setNavn] = useState(profil.navn)
  const [brugernavn, setBrugernavn] = useState(profil.brugernavn)
  const [bio, setBio] = useState(profil.bio)
  const [avatar, setAvatar] = useState(profil.avatar)

  return (
    <div style={s.subSide}>
      <SubHeader titel="Rediger profil" onTilbage={onTilbage} />

      <div style={s.subIndhold}>
        {/* Avatar-vælger */}
        <p style={s.feltLabel}>Vælg avatar</p>
        <div style={s.avatarGrid}>
          {AVATARER.map((a) => (
            <button key={a} onClick={() => setAvatar(a)}
              style={{ ...s.avatarValg, ...(avatar === a ? s.avatarValgAktiv : null) }}>
              {a}
            </button>
          ))}
        </div>

        <div style={s.valgtAvatar}>{avatar}</div>

        <label style={s.feltLabel}>Navn</label>
        <input value={navn} onChange={(e) => setNavn(e.target.value)} style={s.input} />

        <label style={s.feltLabel}>Brugernavn</label>
        <input value={brugernavn} onChange={(e) => setBrugernavn(e.target.value)} style={s.input} placeholder="@ditbrugernavn" />

        <label style={s.feltLabel}>Bio</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} style={{ ...s.input, height: 80, resize: 'none' }} />

        <button style={s.primærBtn} onClick={() => onGem({ navn, brugernavn, bio, avatar })}>
          Gem ændringer
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
        <p style={s.subBeskrivelse}>Vælg hvornår Simmer må sende dig beskeder.</p>
        {[
          { key: 'daglige', label: 'Daglige madforslag', sub: 'Kl. 17:00 hver dag' },
          { key: 'venner', label: 'Venners aktivitet', sub: 'Når nogen i dit netværk laver noget' },
          { key: 'ugentlig', label: 'Ugentlig madplan', sub: 'Mandag morgen' },
        ].map((item) => (
          <div key={item.key} style={s.toggleRække}>
            <div style={{ flex: 1 }}>
              <p style={s.indstLabel}>{item.label}</p>
              <p style={s.indstSub}>{item.sub}</p>
            </div>
            <Toggle on={notif[item.key]} onToggle={() => toggle(item.key)} />
          </div>
        ))}
        <div style={{ ...s.infoBox, marginTop: 16 }}>
          🔔 Push-notifikationer kræver at du giver Simmer tilladelse i telefonens indstillinger.
        </div>
      </div>
    </div>
  )
}

// ─── Sprog ───────────────────────────────────────────────────────────────────

function SprogSide({ onTilbage }) {
  const [valgt, setValgt] = useState('da')

  return (
    <div style={s.subSide}>
      <SubHeader titel="Sprog" onTilbage={onTilbage} />
      <div style={s.subIndhold}>
        <p style={s.subBeskrivelse}>Vælg dit foretrukne sprog i appen.</p>
        {SPROG_LISTE.map((sp) => (
          <button key={sp.kode} style={{ ...s.valgRække, ...(valgt === sp.kode ? s.valgRækkeAktiv : null) }}
            onClick={() => setValgt(sp.kode)}>
            <span style={{ fontSize: 22 }}>{sp.flag}</span>
            <span style={{ ...s.indstLabel, flex: 1, textAlign: 'left' }}>{sp.label}</span>
            {valgt === sp.kode && <span style={{ color: colors.green, fontWeight: 800 }}>✓</span>}
          </button>
        ))}
        <div style={s.infoBox}>
          🌍 Flere sprog er på vej. Fortæl os hvad du savner via Hjælp & feedback.
        </div>
      </div>
    </div>
  )
}

// ─── Privatliv ───────────────────────────────────────────────────────────────

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
          { key: 'offentlig', label: 'Offentlig profil', sub: 'Alle kan finde og se din profil' },
          { key: 'aktivitet', label: 'Del aktivitet med venner', sub: 'Venner kan se hvad du laver' },
          { key: 'streak', label: 'Vis streak offentligt', sub: 'Din streak vises på din profil' },
        ].map((item) => (
          <div key={item.key} style={s.toggleRække}>
            <div style={{ flex: 1 }}>
              <p style={s.indstLabel}>{item.label}</p>
              <p style={s.indstSub}>{item.sub}</p>
            </div>
            <Toggle on={priv[item.key]} onToggle={() => toggle(item.key)} />
          </div>
        ))}
        <button style={{ ...s.sekundærBtn, marginTop: 20, color: colors.red, border: `1px solid ${colors.red}` }}>
          Slet min konto
        </button>
      </div>
    </div>
  )
}

// ─── Hjælp ───────────────────────────────────────────────────────────────────

function HjælpSide({ onTilbage }) {
  const [åben, setÅben] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [sendt, setSendt] = useState(false)

  function sendFeedback() {
    if (!feedback.trim()) return
    setSendt(true)
    setFeedback('')
  }

  return (
    <div style={s.subSide}>
      <SubHeader titel="Hjælp & feedback" onTilbage={onTilbage} />
      <div style={s.subIndhold}>

        <h3 style={s.subSektionTitel}>Ofte stillede spørgsmål</h3>
        {FAQ.map((f, i) => (
          <div key={i} style={s.faqItem}>
            <button style={s.faqSpørgsmål} onClick={() => setÅben(åben === i ? null : i)}>
              <span style={{ flex: 1, textAlign: 'left' }}>{f.spørgsmål}</span>
              <span style={{ color: colors.mutedLight, fontSize: 18, transform: åben === i ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>›</span>
            </button>
            {åben === i && <p style={s.faqSvar}>{f.svar}</p>}
          </div>
        ))}

        <h3 style={{ ...s.subSektionTitel, marginTop: 28 }}>Send feedback</h3>
        {sendt ? (
          <div style={s.infoBox}>✅ Tak for din feedback! Vi læser alle beskeder.</div>
        ) : (
          <>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Fortæl os hvad du synes — hvad virker godt, hvad kan blive bedre?"
              style={{ ...s.input, height: 100, resize: 'none' }}
            />
            <button style={s.primærBtn} onClick={sendFeedback}>Send feedback</button>
          </>
        )}

        <div style={{ ...s.infoBox, marginTop: 20, textAlign: 'center' }}>
          <p style={{ margin: 0, fontWeight: 700, color: colors.text }}>Simmer</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.mutedLight }}>Version 0.1.0 · Bygget med ❤️ i Danmark</p>
        </div>
      </div>
    </div>
  )
}

// ─── Delte hjælpekomponenter ─────────────────────────────────────────────────

function SubHeader({ titel, onTilbage }) {
  return (
    <div style={s.subHeader}>
      <button style={s.tilbageBtn} onClick={onTilbage}>
        <span style={{ fontSize: 20 }}>‹</span> Profil
      </button>
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

  // Hero
  hero: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 24px 24px', background: colors.card, boxShadow: shadow.card, marginBottom: 12 },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: { width: 88, height: 88, borderRadius: 999, background: colors.bg, border: `3px solid ${colors.border}`, fontSize: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: shadow.card },
  streakBadge: { position: 'absolute', bottom: -6, right: -8, background: colors.card, border: `2px solid ${colors.border}`, borderRadius: 999, fontSize: 12, fontFamily: font.body, fontWeight: 800, color: colors.text, padding: '3px 8px', boxShadow: shadow.card },
  navn: { fontFamily: font.display, fontWeight: 800, fontSize: 22, color: colors.text, margin: 0, letterSpacing: -0.4 },
  brugernavn: { fontFamily: font.body, fontSize: 13.5, fontWeight: 600, color: colors.mutedLight, margin: '3px 0 10px' },
  bio: { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: '0 0 16px', textAlign: 'center', lineHeight: 1.5, maxWidth: 300 },
  statsRow: { display: 'flex', alignItems: 'center', gap: 24, marginBottom: 18 },
  statTal: { fontFamily: font.display, fontWeight: 800, fontSize: 20, color: colors.text, margin: 0 },
  statLabel: { fontFamily: font.body, fontSize: 12, color: colors.muted, margin: '2px 0 0', fontWeight: 500 },
  statDiv: { width: 1, height: 28, background: colors.border },
  btnRow: { display: 'flex', gap: 10 },
  editBtn: { flex: 1, padding: '11px 20px', fontFamily: font.body, fontWeight: 700, fontSize: 14, color: colors.text, background: colors.bg, border: `1.5px solid ${colors.border}`, borderRadius: radius.button },
  shareBtn: { width: 44, height: 44, borderRadius: radius.button, background: colors.bg, border: `1.5px solid ${colors.border}`, color: colors.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' },

  // Venner
  kort: { background: colors.card, borderRadius: radius.card, boxShadow: shadow.card, padding: '16px', margin: '0 16px 12px' },
  kortHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 },
  kortTitel: { fontFamily: font.display, fontWeight: 800, fontSize: 16, color: colors.text, margin: 0 },
  seeAll: { fontFamily: font.body, fontSize: 13, fontWeight: 700, color: colors.green, background: 'none', border: 'none', padding: 0 },
  vennerRække: { display: 'flex', gap: 14, overflowX: 'auto', scrollbarWidth: 'none' },
  vennerItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 },
  vennerRing: { width: 52, height: 52, borderRadius: 999, padding: 3, display: 'flex' },
  vennerAvatar: { flex: 1, borderRadius: 999, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: `2px solid ${colors.card}` },
  vennerNavn: { fontFamily: font.body, fontSize: 11.5, fontWeight: 600, color: colors.text },

  // Præferencer
  sektion: { padding: '20px 16px' },
  sektionTitel: { fontFamily: font.display, fontWeight: 800, fontSize: 18, color: colors.text, margin: '0 0 4px', letterSpacing: -0.3 },
  sektionHint: { fontFamily: font.body, fontSize: 13, color: colors.mutedLight, margin: '0 0 14px' },
  præfGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  præfChip: { display: 'flex', alignItems: 'center', gap: 7, fontFamily: font.body, fontSize: 13.5, fontWeight: 700, color: colors.muted, background: colors.card, border: `1.5px solid ${colors.border}`, padding: '9px 14px', borderRadius: radius.pill, boxShadow: shadow.card },
  præfAktiv: { color: '#fff', background: colors.green, border: `1.5px solid ${colors.green}` },

  // Tabs
  tabs: { display: 'flex', borderBottom: `1px solid ${colors.border}`, margin: '0 16px', overflowX: 'auto', scrollbarWidth: 'none' },
  tab: { flexShrink: 0, fontFamily: font.body, fontWeight: 700, fontSize: 13, color: colors.mutedLight, background: 'none', border: 'none', borderBottom: '2.5px solid transparent', padding: '12px 10px', whiteSpace: 'nowrap' },
  tabAktiv: { color: colors.green, borderBottom: `2.5px solid ${colors.green}` },
  tabIndhold: { padding: '0 0 8px' },

  // Likes / gemte opskrifter
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '16px' },
  opskriftKort: { background: colors.card, borderRadius: 18, boxShadow: shadow.card, overflow: 'hidden', position: 'relative' },
  opskriftHero: { height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  opskriftEmoji: { fontSize: 40, filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.2))' },
  fjernLikeBtn: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 999, background: 'rgba(0,0,0,0.35)', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  opskriftBody: { padding: '10px 12px 13px' },
  opskriftTitel: { fontFamily: font.body, fontWeight: 700, fontSize: 13.5, color: colors.text, margin: '0 0 4px', lineHeight: 1.3 },
  opskriftMeta: { fontFamily: font.body, fontSize: 12, color: colors.muted, margin: 0 },

  // Kreationer
  kreationItem: { display: 'flex', alignItems: 'center', gap: 12, background: colors.card, borderRadius: 16, boxShadow: shadow.card, padding: 12, margin: '0 16px 10px' },
  kreationThumb: { width: 54, height: 54, borderRadius: 12, objectFit: 'cover', flexShrink: 0 },
  kreationThumbTom: { background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 },
  kreationNavn: { fontFamily: font.body, fontWeight: 700, fontSize: 14.5, color: colors.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  kreationMeta: { fontFamily: font.body, fontSize: 12.5, color: colors.muted, margin: '3px 0 0' },

  // Badges
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 },
  badge: { background: colors.card, borderRadius: 16, boxShadow: shadow.card, padding: '16px 10px', textAlign: 'center' },
  badgeLocked: { opacity: 0.42 },
  badgeTitel: { fontFamily: font.body, fontWeight: 700, fontSize: 12, color: colors.text, margin: '8px 0 3px', lineHeight: 1.2 },
  badgeDesc: { fontFamily: font.body, fontSize: 10.5, color: colors.muted, margin: 0, lineHeight: 1.3 },

  // Tom tab
  tomTab: { textAlign: 'center', padding: '36px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  tomTabTekst: { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: 0, lineHeight: 1.5, maxWidth: 260 },

  // Indstillinger
  indstRække: { width: '100%', display: 'flex', alignItems: 'center', gap: 14, background: colors.card, border: 'none', borderRadius: 14, boxShadow: shadow.card, padding: '13px 14px', marginBottom: 8 },
  indstEmoji: { fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 },
  indstLabel: { fontFamily: font.body, fontWeight: 700, fontSize: 14.5, color: colors.text, margin: 0 },
  indstSub: { fontFamily: font.body, fontSize: 12.5, color: colors.mutedLight, margin: '2px 0 0' },
  indstPil: { fontSize: 22, color: colors.mutedLight, flexShrink: 0 },

  logUdBtn: { margin: '4px 16px 0', width: 'calc(100% - 32px)', padding: '14px', fontFamily: font.body, fontWeight: 700, fontSize: 15, color: colors.red, background: 'rgba(194,91,74,0.08)', border: 'none', borderRadius: radius.button },

  // Dialog
  overlay: { position: 'fixed', inset: 0, background: 'rgba(31,36,33,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200, padding: 16 },
  dialog: { background: colors.card, borderRadius: radius.card, width: '100%', maxWidth: 440, padding: '24px 20px 20px' },
  dialogTitel: { fontFamily: font.display, fontWeight: 800, fontSize: 20, color: colors.text, margin: '0 0 8px', textAlign: 'center' },
  dialogTekst: { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: '0 0 20px', textAlign: 'center', lineHeight: 1.5 },
  dialogBekræft: { width: '100%', padding: '14px', fontFamily: font.body, fontWeight: 700, fontSize: 15, color: '#fff', background: colors.red, border: 'none', borderRadius: radius.button, marginBottom: 8 },
  dialogAnnuller: { width: '100%', padding: '13px', fontFamily: font.body, fontWeight: 700, fontSize: 15, color: colors.muted, background: 'transparent', border: 'none', borderRadius: radius.button },

  // Sub-sider fælles
  subHeader: { background: colors.card, borderBottom: `1px solid ${colors.border}`, padding: '14px 16px 12px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 },
  tilbageBtn: { fontFamily: font.body, fontSize: 14, fontWeight: 700, color: colors.green, background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 },
  subTitel: { fontFamily: font.display, fontWeight: 800, fontSize: 18, color: colors.text, margin: 0, letterSpacing: -0.3 },
  subIndhold: { padding: '20px 16px 120px' },
  subBeskrivelse: { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: '0 0 20px', lineHeight: 1.5 },
  subSektionTitel: { fontFamily: font.display, fontWeight: 800, fontSize: 16, color: colors.text, margin: '0 0 12px', letterSpacing: -0.2 },

  // Toggle switch
  toggleTrack: { position: 'relative', width: 48, height: 26, borderRadius: 999, border: 'none', padding: 0, flexShrink: 0, transition: 'background 0.2s ease' },
  toggleKnob: { position: 'absolute', top: 3, left: 3, width: 20, height: 20, borderRadius: 999, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'transform 0.2s ease', display: 'block' },
  toggleRække: { display: 'flex', alignItems: 'center', gap: 12, background: colors.card, borderRadius: 14, boxShadow: shadow.card, padding: '13px 14px', marginBottom: 8 },

  // Sprog-valg
  valgRække: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: colors.card, border: `1.5px solid ${colors.border}`, borderRadius: 14, padding: '13px 14px', marginBottom: 8, boxShadow: shadow.card },
  valgRækkeAktiv: { border: `1.5px solid ${colors.green}`, background: 'rgba(47,107,79,0.04)' },

  // Rediger profil
  feltLabel: { display: 'block', fontFamily: font.body, fontSize: 12.5, fontWeight: 700, color: colors.mutedLight, margin: '16px 0 7px', letterSpacing: 0.3 },
  input: { width: '100%', padding: '12px 14px', fontFamily: font.body, fontSize: 15, color: colors.text, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, outline: 'none', boxSizing: 'border-box' },
  avatarGrid: { display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  avatarValg: { width: 48, height: 48, borderRadius: 12, fontSize: 26, background: colors.card, border: `2px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatarValgAktiv: { border: `2px solid ${colors.green}`, background: 'rgba(47,107,79,0.08)' },
  valgtAvatar: { fontSize: 60, textAlign: 'center', margin: '0 auto 8px' },

  primærBtn: { width: '100%', marginTop: 14, padding: '14px', fontFamily: font.body, fontWeight: 700, fontSize: 15, color: '#fff', background: colors.green, border: 'none', borderRadius: radius.button },
  sekundærBtn: { width: '100%', marginTop: 8, padding: '13px', fontFamily: font.body, fontWeight: 700, fontSize: 15, color: colors.muted, background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: radius.button },

  // FAQ
  faqItem: { background: colors.card, borderRadius: 14, boxShadow: shadow.card, marginBottom: 8, overflow: 'hidden' },
  faqSpørgsmål: { width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '13px 14px', background: 'transparent', border: 'none', fontFamily: font.body, fontWeight: 700, fontSize: 14, color: colors.text, textAlign: 'left' },
  faqSvar: { fontFamily: font.body, fontSize: 13.5, color: colors.muted, padding: '0 14px 14px', margin: 0, lineHeight: 1.55 },

  infoBox: { background: 'rgba(47,107,79,0.08)', borderRadius: 14, padding: '13px 14px', fontFamily: font.body, fontSize: 13, color: colors.muted, lineHeight: 1.5 },
}
