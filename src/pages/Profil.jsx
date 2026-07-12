import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Bell, Globe, Shield, HelpCircle, Trash2, Heart, Camera, ShoppingBasket, UtensilsCrossed, Clock, ImagePlus,
  Leaf, Sprout, Fish, Dumbbell, Flame, Wheat, Zap, Home, BookOpen, Recycle, CalendarDays,
  Milk, ShieldCheck, PiggyBank, Apple, Utensils, Coffee, Salad, Bean, Beef, Sunrise,
} from 'lucide-react'

function tagIkon(id, size = 14) {
  const p = { size, strokeWidth: 2 }
  return {
    vegetar:          <Leaf {...p} />,
    veganer:          <Sprout {...p} />,
    kød:              <Beef {...p} />,
    fisk:             <Fish {...p} />,
    'mere-grønt':     <Salad {...p} />,
    bælgfrugter:      <Bean {...p} />,
    'low-carb':       <Leaf {...p} />,
    'protein-rig':    <Dumbbell {...p} />,
    'kalorie-fattig': <Flame {...p} />,
    fiberrig:         <Wheat {...p} />,
    'anti-inflam':    <Shield {...p} />,
    morgenmad:        <Coffee {...p} />,
    frokost:          <Utensils {...p} />,
    aftensmad:        <UtensilsCrossed {...p} />,
    hurtig:           <Zap {...p} />,
    'medium-tid':     <Clock {...p} />,
    weekend:          <Home {...p} />,
    'spise-sundere':  <Apple {...p} />,
    'spare-penge':    <PiggyBank {...p} />,
    'lær-nyt':        <BookOpen {...p} />,
    'spild-mindre':   <Recycle {...p} />,
    madplan:          <CalendarDays {...p} />,
    italiensk:        <Globe {...p} />,
    asiatisk:         <Globe {...p} />,
    mexicansk:        <Globe {...p} />,
    dansk:            <Globe {...p} />,
    indisk:           <Globe {...p} />,
    mellemøstlig:     <Globe {...p} />,
    laktosefri:       <Milk {...p} />,
    glutenfri:        <ShieldCheck {...p} />,
    nøddefri:         <ShieldCheck {...p} />,
  }[id] ?? <Leaf {...p} />
}
import { hentAutoLager, gemAutoLager } from '../data/lager'
import { databases, storage, DB_ID, COL, Query, ID, BUCKET_ID } from '../lib/appwrite'
import { hentAktivBruger, opdaterBruger, logUd } from '../data/auth'
import { ALLE_TAGS, TAG_KATEGORIER } from '../data/tags'
import { hentKreationer, sletKreation } from '../data/kreationer'
import { hentLikes, fjernLike } from '../data/likes'
import { hentGemte, toggleGemt } from '../data/gemte'
import { ALLE_BADGES, beregnOpnåedeBadges, synkBadges, hentBadgesDB } from '../data/badges'
import { billedeUrl, opskriftFarve, grad, tidLabel } from '../lib/recipeUtils'
import { hentVenner, hentVennerFraDB, tilføjVenDB, fjernVenDB, hentAntalFølgere, søgBrugere } from '../data/venner'
import { colors, shadow, radius, font } from '../data/theme'
import { useLang } from '../lib/lang'

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


const TILFØJ_VEN_KEY = 'profil_tilfoej_ven'

const NOTIF_KEY    = 'simmer_notif'
const PRIVATLIV_KEY = 'simmer_privatliv'
const DEFAULT_NOTIF = { daglige: true, venner: true, ugentlig: false }
const DEFAULT_PRIV  = { offentlig: true, aktivitet: true, streak: true }

function hentNotif()    { try { return { ...DEFAULT_NOTIF, ...JSON.parse(localStorage.getItem(NOTIF_KEY)) } } catch { return DEFAULT_NOTIF } }
function hentPrivatliv(){ try { return { ...DEFAULT_PRIV,  ...JSON.parse(localStorage.getItem(PRIVATLIV_KEY)) } } catch { return DEFAULT_PRIV } }

// ── Tilføj ven-dialog ────────────────────────────────────────────────────────
function TilføjVenDialog({ brugerId, onLuk, onTilføjet }) {
  const { t } = useLang()
  const [input, setInput] = useState('')
  const [resultater, setResultater] = useState([])
  const [valgt, setValgt] = useState(null)
  const [fejl, setFejl] = useState('')
  const [loading, setLoading] = useState(false)
  const søgeTimer = useRef(null)

  function håndterInput(tekst) {
    setInput(tekst)
    setValgt(null)
    setFejl('')
    if (søgeTimer.current) clearTimeout(søgeTimer.current)
    if (tekst.trim().length < 2) { setResultater([]); return }
    søgeTimer.current = setTimeout(async () => {
      const data = await søgBrugere(tekst.trim())
      setResultater(data)
    }, 200)
  }

  async function håndterTilføj() {
    const username = valgt?.username ?? input.trim()
    if (!username) return
    setLoading(true)
    setFejl('')
    const res = await tilføjVenDB(brugerId, username)
    setLoading(false)
    if (!res.ok) { setFejl(res.fejl); return }
    onTilføjet(res.ven)
    onLuk()
  }

  return (
    <div style={s.overlay} onClick={onLuk}>
      <div style={s.dialog} onClick={e => e.stopPropagation()}>
        <p style={s.dialogTitel}>{t('pf.tv.titel')}</p>
        <p style={s.dialogTekst}>{t('pf.tv.tekst')}</p>

        <div style={{ position: 'relative', marginBottom: 6 }}>
          <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontFamily: font.body, fontSize: 15, color: colors.mutedLight, pointerEvents: 'none' }}>@</span>
          <input
            value={input}
            onChange={e => håndterInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="brugernavn"
            style={{ ...s.input, paddingLeft: 28, marginBottom: 0 }}
            autoFocus
          />
        </div>

        {resultater.length > 0 && !valgt && (
          <div style={{ background: colors.bg, borderRadius: 12, overflow: 'hidden', marginBottom: 10, border: `1px solid ${colors.border}` }}>
            {resultater.map((r) => (
              <button key={r.user_id} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: `1px solid ${colors.border}`, cursor: 'pointer' }}
                onClick={() => { setValgt(r); setInput(r.username); setResultater([]) }}>
                <span style={{ fontSize: 22 }}>{r.avatar ?? '🧑‍🍳'}</span>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontFamily: font.body, fontWeight: 700, fontSize: 14, color: colors.text, margin: 0 }}>{r.first_name} {r.last_name}</p>
                  <p style={{ fontFamily: font.body, fontSize: 12.5, color: colors.mutedLight, margin: 0 }}>@{r.username}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {fejl && <p style={{ fontFamily: font.body, fontSize: 12.5, color: colors.red, margin: '0 0 10px' }}>{fejl}</p>}

        <button style={{ ...s.dialogBekræft, background: colors.green, opacity: loading ? 0.7 : 1 }}
          onClick={håndterTilføj} disabled={loading}>
          {loading ? t('pf.tv.tilføjer') : t('pf.tv.følg')}
        </button>
        <button style={s.dialogAnnuller} onClick={onLuk}>{t('pf.tv.annuller')}</button>
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
  const { t } = useLang()
  const [visning, setVisning] = useState('hoved')
  const [bruger, setBruger] = useState(hentAktivBruger)
  const [aktivTab, setAktivTab] = useState('likes')
  const [kreationer, setKreationer] = useState([])
  const [likes, setLikes] = useState([])
  const [gemteIds, setGemteIds] = useState(() => hentGemte())
  const [gemteOpskrifter, setGemteOpskrifter] = useState([])
  const [venner, setVenner] = useState(() => hentVenner())
  const [antalFølgere, setAntalFølgere] = useState(0)
  const [logUdDialog, setLogUdDialog] = useState(false)
  const [searchParams] = useSearchParams()
  const [tilføjVenÅben, setTilføjVenÅben] = useState(() => searchParams.get('tilføj') === '1')
  const [autoLager, setAutoLagerState] = useState(hentAutoLager)
  const [standardPortioner, setStandardPortioner] = useState(() => hentAktivBruger()?.standardPortioner ?? null)
  const [uploadLoader, setUploadLoader] = useState(false)
  const [opnåedeBadges, setOpnåedeBadges] = useState(new Set())
  const avatarInputRef = useRef(null)
  const streak = beregnStreak(kreationer)
  const gnsTid = beregnGnsTid(kreationer)

  async function loadGemte() {
    let ids = hentGemte()

    // Hent fra Supabase saved_recipes og merge med localStorage
    if (bruger?.id) {
      const res = await databases.listDocuments(DB_ID, COL.saved_recipes, [
        Query.equal('user_id', bruger.id), Query.limit(200),
      ])
      if (res.documents.length) {
        const dbIds = res.documents.map(r => r.recipe_id)
        ids = [...new Set([...dbIds, ...ids])]
        try { localStorage.setItem('simmer_gemte_v1', JSON.stringify(ids)) } catch {}
      }
    }

    setGemteIds(ids)
    if (!ids.length) { setGemteOpskrifter([]); return }
    databases.listDocuments(DB_ID, COL.recipes, [Query.equal('$id', ids), Query.limit(ids.length)])
      .then(({ documents }) => {
        const sorted = documents.map(d => ({ ...d, id: d.$id }))
          .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
        setGemteOpskrifter(sorted)
      })
  }

  useEffect(() => {
    setKreationer(hentKreationer())
    setLikes(hentLikes())
    loadGemte()
  }, [])

  // Hent rigtige venner + følgere fra Supabase
  useEffect(() => {
    if (bruger?.id) {
      hentVennerFraDB(bruger.id).then((liste) => { if (liste.length) setVenner(liste) })
      hentAntalFølgere(bruger.id).then(setAntalFølgere)
    }
  }, [bruger?.id])

  // Beregn + synk badges når data er klar
  useEffect(() => {
    if (!bruger?.id) return
    const opnåede = beregnOpnåedeBadges({
      kreationer,
      gemteAntal: gemteIds.length,
      vennerAntal: venner.length,
      streak,
    })
    synkBadges(bruger.id, opnåede).then(setOpnåedeBadges)
  }, [bruger?.id, kreationer.length, gemteIds.length, venner.length, streak])

  useEffect(() => {
    if (visning === 'hoved') {
      setBruger(hentAktivBruger())
      setLikes(hentLikes())
      setKreationer(hentKreationer())
      loadGemte()
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

  const [shareToast, setShareToast] = useState(false)
  function håndterShare() {
    if (navigator.share) {
      navigator.share({ title: 'Brynjas Køkken', text: `Tjek ${bruger.navn} på Brynjas Køkken!`, url: window.location.href })
    } else {
      navigator.clipboard?.writeText(window.location.href)
      setShareToast(true)
      setTimeout(() => setShareToast(false), 2500)
    }
  }

  async function håndterLogUd() {
    setLogUdDialog(false)
    await logUd()
    navigate('/login', { replace: true })
  }

  async function håndterAvatarUpload(e) {
    const fil = e.target.files?.[0]
    if (!fil || !bruger?.id) return
    if (!fil.type.startsWith('image/')) {
      alert('Vælg venligst et billede (jpg, png, webp)')
      return
    }
    if (fil.size > 5_000_000) {
      alert('Billedet er for stort — maks 5 MB')
      return
    }
    setUploadLoader(true)
    try {
      const fileId = ID.unique()
      await storage.createFile(BUCKET_ID, fileId, fil)
      const publicUrl = storage.getFileView(BUCKET_ID, fileId).href
      opdater({ avatarUrl: publicUrl })
    } catch (e) {
      const msg = e.message ?? ''
      if (msg.includes('too large') || msg.includes('413')) alert('Billedet er for stort — prøv et mindre billede (maks 5 MB)')
      else if (msg.includes('403') || msg.includes('unauthorized')) alert('Ingen upload-adgang — prøv at logge ud og ind igen')
      else if (msg === 'Failed to fetch') alert('Ingen forbindelse til serveren. Prøv igen.')
      else alert('Upload fejlede: ' + msg)
    }
    setUploadLoader(false)
  }

  // ── Sub-side routing ─────────────────────────────────────────────────────
  if (visning === 'rediger')         return <RedigerProfil bruger={bruger} onGem={(d) => { opdater(d); setVisning('hoved') }} onTilbage={() => setVisning('hoved')} />
  if (visning === 'tags')            return <TagsSide bruger={bruger} onGem={(d) => { opdater(d); setVisning('hoved') }} onTilbage={() => setVisning('hoved')} />
  if (visning === 'notifikationer')  return <NotifikationerSide onTilbage={() => setVisning('hoved')} />
  if (visning === 'sprog')           return <SprogSide onTilbage={() => setVisning('hoved')} />
  if (visning === 'privatliv')       return <PrivatlivSide onTilbage={() => setVisning('hoved')} />
  if (visning === 'hjælp')           return <HjælpSide onTilbage={() => setVisning('hoved')} />

  // Translated settings items (defined here so t() is in scope)
  const INDST = [
    { icon: <Bell size={20} />,       labelKey: 'pf.notif',    subKey: 'pf.notifSub',    side: 'notifikationer' },
    { icon: <Globe size={20} />,      labelKey: 'pf.sprog',    subKey: 'pf.sprogsub',    side: 'sprog' },
    { icon: <Shield size={20} />,     labelKey: 'pf.privatliv', subKey: 'pf.privatlivSub', side: 'privatliv' },
    { icon: <HelpCircle size={20} />, labelKey: 'pf.hjælp',    subKey: null,             side: 'hjælp' },
  ]

  // ── Hoved-profil ─────────────────────────────────────────────────────────
  if (!bruger) return null

  return (
    <div style={s.page}>

      {shareToast && (
        <div style={{ position: 'fixed', top: 14, left: '50%', transform: 'translateX(-50%)', background: colors.green, color: '#fff', borderRadius: 999, padding: '10px 20px', fontFamily: font.body, fontSize: 14, fontWeight: 600, zIndex: 500, whiteSpace: 'nowrap', boxShadow: shadow.fab }}>
          Link kopieret! 🔗
        </div>
      )}

      {/* Hero */}
      <div style={s.hero}>
        <div style={s.avatarWrap}>
          <div style={s.avatar}>
            {bruger.avatarUrl
              ? <img src={bruger.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 999 }} />
              : bruger.avatar}
          </div>
          <button
            style={s.avatarUploadBtn}
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadLoader}
            aria-label="Skift profilbillede"
          >
            {uploadLoader ? '…' : <ImagePlus size={13} color="#fff" />}
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" onChange={håndterAvatarUpload} style={{ display: 'none' }} />
          {streak > 0 && <div style={s.streakBadge}>🔥 {streak}</div>}
        </div>
        <h1 style={s.navn}>{bruger.navn} {bruger.efternavn}</h1>
        <p style={s.brugernavn}>{bruger.username ? `@${bruger.username}` : bruger.email}</p>
        {bruger.bio && <p style={s.bio}>{bruger.bio}</p>}

        <div style={s.statsRow}>
          <Stat tal={kreationer.length} label={t('pf.retter')} /><div style={s.statDiv} />
          <Stat tal={antalFølgere} label={t('pf.følgere')} /><div style={s.statDiv} />
          <Stat tal={venner.length} label={t('pf.følger')} />
        </div>

        <div style={s.btnRow}>
          <button style={s.editBtn} onClick={() => setVisning('rediger')}>{t('pf.redigerProfil')}</button>
          <button style={s.shareBtn} onClick={håndterShare}><ShareIcon /></button>
        </div>
      </div>

      {/* Tags */}
      <div style={s.sektion}>
        <div style={s.sektionHeader}>
          <h2 style={s.sektionTitel}>{t('pf.mineTags')}</h2>
          <button style={s.redigerTagsBtn} onClick={() => setVisning('tags')}>{t('pf.rediger')}</button>
        </div>
        <p style={s.sektionHint}>{t('pf.tagsHint')}</p>
        {bruger.tags.length === 0 ? (
          <button style={s.tilføjTagsBtn} onClick={() => setVisning('tags')}>{t('pf.tilføjTags')}</button>
        ) : (
          <div style={s.tagGrid}>
            {bruger.tags.map((id) => {
              const tag = ALLE_TAGS.find((t) => t.id === id)
              return tag ? (
                <div key={id} style={s.tagChip}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>{tagIkon(tag.id)}</span> {tag.label}
                </div>
              ) : null
            })}
          </div>
        )}
      </div>

      {/* Venner */}
      <div style={s.kort}>
        <div style={s.kortHeader}>
          <p style={s.kortTitel}>{t('pf.madvenner')} {venner.length > 0 ? `(${venner.length})` : ''}</p>
          {venner.length > 0 && <button style={s.seeAll} onClick={() => setTilføjVenÅben(true)}>{t('pf.tilføj')}</button>}
        </div>
        {venner.length === 0 ? (
          <div style={s.inviterBoks}>
            <span style={{ fontSize: 32 }}>👥</span>
            <p style={s.inviterTekst}>{t('pf.inviterTekst')}</p>
            <button style={s.inviterKnap} onClick={() => setTilføjVenÅben(true)}>{t('pf.tilføjFørste')}</button>
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
        <p style={{ ...s.kortTitel, marginBottom: 14 }}>{t('pf.statistik')}</p>
        <div style={s.statGrid}>
          <div style={s.statBox}>
            <span style={s.statBoxTal}>{streak}</span>
            <span style={s.statBoxLabel}>{t('pf.streak')}</span>
          </div>
          <div style={s.statBox}>
            <span style={s.statBoxTal}>{kreationer.length}</span>
            <span style={{ ...s.statBoxLabel, display: 'flex', alignItems: 'center', gap: 4 }}>
              <UtensilsCrossed size={11} strokeWidth={2.5} /> {t('pf.retterLavet')}
            </span>
          </div>
          <div style={s.statBox}>
            <span style={s.statBoxTal}>{gnsTid ? `${gnsTid}m` : '—'}</span>
            <span style={{ ...s.statBoxLabel, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} strokeWidth={2.5} /> {t('pf.gnsTid')}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {[
          { id: 'likes',      children: <><Heart size={13} fill="currentColor" style={{ verticalAlign: '-2px' }} /> Gemte ({gemteIds.length})</> },
          { id: 'kreationer', children: <>{t('pf.kreationer')} ({kreationer.length})</> },
          { id: 'badges',     children: <>{t('pf.badges')}</> },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setAktivTab(tab.id)}
            style={{ ...s.tab, ...(aktivTab === tab.id ? s.tabAktiv : {}) }}>
            {tab.children}
          </button>
        ))}
      </div>

      {/* Gemte-tab */}
      {aktivTab === 'likes' && (
        <div style={s.tabIndhold}>
          {gemteOpskrifter.length === 0
            ? <TomTab icon={<Heart size={36} color={colors.mutedLight} />} tekst="Tryk 🔖 på en opskrift for at gemme den her" knap="Se opskrifter" onKnap={() => navigate('/galleri')} />
            : (
              <div style={s.grid2}>
                {gemteOpskrifter.map((o) => {
                  const farve = opskriftFarve(o.tags ?? [])
                  const imgUrl = billedeUrl(o.storage_image, o.image_url)
                  const tid = tidLabel(o.prep_time, o.cook_time)
                  return (
                    <div key={o.id} style={s.opskriftKort} onClick={() => navigate(`/opskrift/${o.id}`)}>
                      <div style={{ ...s.opskriftHero, background: grad(farve), position: 'relative', overflow: 'hidden' }}>
                        {imgUrl && <img src={imgUrl} alt={o.title} style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover' }} />}
                        <button style={s.fjernBtn} onClick={(e) => {
                          e.stopPropagation()
                          toggleGemt(o.id)
                          const nyIds = hentGemte()
                          setGemteIds(nyIds)
                          setGemteOpskrifter(prev => prev.filter(x => x.id !== o.id))
                          if (bruger?.id) {
                            databases.listDocuments(DB_ID, COL.saved_recipes, [
                              Query.equal('user_id', bruger.id),
                              Query.equal('recipe_id', o.id),
                              Query.limit(1),
                            ]).then(({ documents }) => {
                              if (documents[0]) databases.deleteDocument(DB_ID, COL.saved_recipes, documents[0].$id)
                            }).catch(() => {})
                          }
                        }}>✕</button>
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
            ? <TomTab icon={<Camera size={36} color={colors.mutedLight} />} tekst={t('pf.tagBillede')} knap={t('pf.gåTilOpret')} onKnap={() => navigate('/opret')} />
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
                    {k.noter && <p style={s.kreationNoter}>📝 {k.noter}</p>}
                  </div>
                  <button
                    style={s.kreationSletBtn}
                    onClick={() => setKreationer(sletKreation(k.id))}
                    aria-label="Slet kreation"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )
            })
          }
        </div>
      )}

      {/* Badges-tab */}
      {aktivTab === 'badges' && (
        <div style={{ ...s.tabIndhold, padding: '12px 16px 16px' }}>
          <p style={{ fontFamily: font.body, fontSize: 12.5, color: colors.muted, margin: '0 0 14px', textAlign: 'center' }}>
            {opnåedeBadges.size} / {ALLE_BADGES.length} badges optjent
          </p>
          {/* Optjente badges først */}
          {opnåedeBadges.size > 0 && (
            <>
              <p style={s.badgeGruppeLabel}>Optjent ✨</p>
              <div style={s.grid3}>
                {ALLE_BADGES.filter(b => opnåedeBadges.has(b.id)).map(b => (
                  <div key={b.id} style={s.badge}>
                    <span style={{ fontSize: 28 }}>{b.emoji}</span>
                    <p style={s.badgeTitel}>{b.titel}</p>
                    <p style={s.badgeDesc}>{b.beskrivelse}</p>
                  </div>
                ))}
              </div>
              <p style={{ ...s.badgeGruppeLabel, marginTop: 20 }}>Ikke optjent endnu 🔒</p>
            </>
          )}
          {/* Låste badges */}
          <div style={s.grid3}>
            {ALLE_BADGES.filter(b => !opnåedeBadges.has(b.id)).map(b => (
              <div key={b.id} style={{ ...s.badge, ...s.badgeLocked }}>
                <span style={{ fontSize: 28 }}>🔒</span>
                <p style={s.badgeTitel}>{b.titel}</p>
                <p style={s.badgeDesc}>{b.beskrivelse}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Indstillinger */}
      <div style={s.sektion}>
        <h2 style={s.sektionTitel}>{t('pf.indstillinger')}</h2>
        {INDST.map((item) => (
          <button key={item.side} style={s.indstRække} onClick={() => setVisning(item.side)}>
            <span style={s.indstEmoji}>{item.icon}</span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={s.indstLabel}>{t(item.labelKey)}</p>
              {item.subKey && <p style={s.indstSub}>{t(item.subKey)}</p>}
            </div>
            <span style={s.indstPil}>›</span>
          </button>
        ))}

        {/* Auto-opdater lager toggle */}
        <div style={{ ...s.indstRække, cursor: 'default' }}>
          <span style={s.indstEmoji}><ShoppingBasket size={20} /></span>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <p style={s.indstLabel}>{t('pf.autoLager')}</p>
            <p style={s.indstSub}>{t('pf.autoLagerSub')}</p>
          </div>
          <Toggle
            on={autoLager}
            onToggle={() => {
              const ny = !autoLager
              setAutoLagerState(ny)
              gemAutoLager(ny)
            }}
          />
        </div>

        {/* Standard portioner */}
        <div style={{ ...s.indstRække, cursor: 'default' }}>
          <span style={s.indstEmoji}>🍽️</span>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <p style={s.indstLabel}>Standard portioner</p>
            <p style={s.indstSub}>Startværdi når du åbner en opskrift</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              style={{ width: 30, height: 30, borderRadius: 999, border: `1.5px solid ${colors.border}`, background: colors.bg, fontFamily: font.body, fontWeight: 700, fontSize: 16, color: colors.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => { const ny = Math.max(1, (standardPortioner ?? 4) - 1); setStandardPortioner(ny); opdaterBruger({ standardPortioner: ny }) }}
            >−</button>
            <span style={{ fontFamily: font.body, fontWeight: 700, fontSize: 15, color: colors.text, minWidth: 24, textAlign: 'center' }}>
              {standardPortioner ?? '—'}
            </span>
            <button
              style={{ width: 30, height: 30, borderRadius: 999, border: `1.5px solid ${colors.border}`, background: colors.bg, fontFamily: font.body, fontWeight: 700, fontSize: 16, color: colors.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => { const ny = Math.min(12, (standardPortioner ?? 4) + 1); setStandardPortioner(ny); opdaterBruger({ standardPortioner: ny }) }}
            >+</button>
          </div>
        </div>
      </div>

      <button style={s.logUdBtn} onClick={() => setLogUdDialog(true)}>{t('pf.logUd')}</button>

      {logUdDialog && (
        <div style={s.overlay} onClick={() => setLogUdDialog(false)}>
          <div style={s.dialog} onClick={(e) => e.stopPropagation()}>
            <p style={s.dialogTitel}>{t('pf.logUdTitel')}</p>
            <p style={s.dialogTekst}>{t('pf.logUdTekst')}</p>
            <button style={s.dialogBekræft} onClick={håndterLogUd}>{t('pf.logUdBekræft')}</button>
            <button style={s.dialogAnnuller} onClick={() => setLogUdDialog(false)}>{t('pf.annuller')}</button>
          </div>
        </div>
      )}

      {tilføjVenÅben && (
        <TilføjVenDialog
          brugerId={bruger.id}
          onLuk={() => setTilføjVenÅben(false)}
          onTilføjet={(nyVen) => setVenner((prev) => [...prev, nyVen])}
        />
      )}
    </div>
  )
}

// ─── Rediger profil ─────────────────────────────────────────────────────────

function RedigerProfil({ bruger, onGem, onTilbage }) {
  const { t } = useLang()
  const [avatar, setAvatar] = useState(bruger.avatar)
  const [navn, setNavn] = useState(bruger.navn || '')
  const [efternavn, setEfternavn] = useState(bruger.efternavn || '')
  const [bio, setBio] = useState(bruger.bio || '')
  const [telefon, setTelefon] = useState(bruger.telefon || '')
  const [username, setUsername] = useState(bruger.username || '')
  const [brugernavnFejl, setBrugernavnFejl] = useState('')
  const [avatarFil, setAvatarFil] = useState(null)
  const [avatarFotoUrl, setAvatarFotoUrl] = useState(bruger.avatarUrl || null)
  const [gemmer, setGemmer] = useState(false)
  const uploadRef = useRef(null)
  const kameraRef = useRef(null)

  function vælgFoto(e) {
    const fil = e.target.files?.[0]
    if (!fil) return
    setAvatarFil(fil)
    setAvatarFotoUrl(URL.createObjectURL(fil))
    e.target.value = ''
  }

  async function gem() {
    const normUsername = username.trim().toLowerCase()
    if (normUsername.length > 0 && normUsername.length < 3) {
      setBrugernavnFejl(t('pf.re.usernavnFejl'))
      return
    }
    setGemmer(true)
    let nyAvatarUrl = bruger.avatarUrl || null
    if (avatarFil) {
      try {
        const fileId = ID.unique()
        await storage.createFile(BUCKET_ID, fileId, avatarFil)
        nyAvatarUrl = storage.getFileView(BUCKET_ID, fileId).href
      } catch (e) {
        setGemmer(false)
        const msg = e.message ?? ''
        if (msg.includes('too large') || msg.includes('413')) alert('Billedet er for stort — prøv et mindre billede (maks 5 MB)')
        else if (msg.includes('403') || msg.includes('unauthorized')) alert('Ingen upload-adgang — prøv at logge ud og ind igen')
        else if (msg === 'Failed to fetch') alert('Ingen forbindelse til serveren. Prøv igen.')
        else alert('Billedet kunne ikke uploades: ' + msg)
        return
      }
    }
    setGemmer(false)
    onGem({ avatar, navn, efternavn, bio, telefon, username: normUsername || bruger.username, avatarUrl: nyAvatarUrl })
  }

  return (
    <div style={s.subSide}>
      <SubHeader titel={t('pf.re.titel')} onTilbage={onTilbage} />
      <div style={s.subIndhold}>

        <div style={s.læsOnlyFelt}>
          <span style={s.læsOnlyLabel}>{t('pf.re.email')}</span>
          <span style={s.læsOnlyVærdi}>{bruger.email}</span>
        </div>

        <label style={s.feltLabel}>{t('pf.re.fornavn')}</label>
        <input value={navn} onChange={(e) => setNavn(e.target.value)}
          placeholder={t('pf.re.fornavn')} style={s.input} />

        <label style={s.feltLabel}>{t('pf.re.efternavn')}</label>
        <input value={efternavn} onChange={(e) => setEfternavn(e.target.value)}
          placeholder={t('pf.re.efternavn')} style={s.input} />

        <label style={s.feltLabel}>{t('pf.re.brugernavn')}</label>
        <div style={{ position: 'relative', marginBottom: brugernavnFejl ? 4 : 16 }}>
          <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontFamily: font.body, fontSize: 15, color: colors.mutedLight, pointerEvents: 'none' }}>@</span>
          <input
            value={username}
            onChange={(e) => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setBrugernavnFejl('') }}
            placeholder="ditbrugernavn"
            style={{ ...s.input, paddingLeft: 28, marginBottom: 0 }}
          />
        </div>
        {brugernavnFejl && <p style={{ fontFamily: font.body, fontSize: 12.5, color: colors.red, margin: '0 0 14px' }}>{brugernavnFejl}</p>}

        <label style={s.feltLabel}>{t('pf.re.telefon')}</label>
        <input value={telefon} onChange={(e) => setTelefon(e.target.value)}
          placeholder="+45 12 34 56 78" style={s.input} />

        <label style={s.feltLabel}>{t('pf.re.bio')}</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)}
          placeholder={t('pf.re.bioPh')}
          style={{ ...s.input, height: 80, resize: 'none' }} />

        <label style={s.feltLabel}>{t('pf.re.billede')}</label>
        <input ref={uploadRef} type="file" accept="image/*" onChange={vælgFoto} style={{ display: 'none' }} />
        <input ref={kameraRef} type="file" accept="image/*" capture="environment" onChange={vælgFoto} style={{ display: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 72, height: 72, borderRadius: 999, overflow: 'hidden', background: colors.bg, border: `2px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, flexShrink: 0 }}>
            {avatarFotoUrl
              ? <img src={avatarFotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : avatar}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button style={{ ...s.sekundærBtn, width: 'auto', marginTop: 0, padding: '9px 14px', fontSize: 13 }}
              onClick={() => uploadRef.current?.click()}>
              {t('pf.re.uploadFoto')}
            </button>
            <button style={{ ...s.sekundærBtn, width: 'auto', marginTop: 0, padding: '9px 14px', fontSize: 13 }}
              onClick={() => kameraRef.current?.click()}>
              {t('pf.re.tagFoto')}
            </button>
          </div>
        </div>

        <label style={s.feltLabel}>{t('pf.re.ellerEmoji')}</label>
        <div style={s.avatarGrid}>
          {AVATARER.map((a) => (
            <button key={a} onClick={() => { setAvatar(a); setAvatarFil(null); setAvatarFotoUrl(null) }}
              style={{ ...s.avatarValg, ...(avatar === a && !avatarFotoUrl ? s.avatarAktiv : {}) }}>
              {a}
            </button>
          ))}
        </div>

        <button style={{ ...s.primærBtn, opacity: gemmer ? 0.7 : 1 }} onClick={gem} disabled={gemmer}>
          {gemmer ? t('pf.re.gemmer') : t('pf.re.gem')}
        </button>
        <button style={s.sekundærBtn} onClick={onTilbage}>{t('pf.re.annuller')}</button>
      </div>
    </div>
  )
}

// ─── Tags-side ───────────────────────────────────────────────────────────────

function TagsSide({ bruger, onGem, onTilbage }) {
  const { t } = useLang()
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
      <SubHeader titel={t('pf.ts.titel')} onTilbage={onTilbage} />
      <div style={s.subIndhold}>
        <p style={s.subBeskrivelse}>{t('pf.ts.beskrivelse')}</p>

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
                      <span style={{ display: 'flex', alignItems: 'center' }}>{tagIkon(tag.id)}</span> {tag.label}
                      {aktiv && <span style={{ marginLeft: 4, color: colors.green }}>✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        <button style={s.primærBtn} onClick={() => onGem({ tags: [...tags] })}>
          {t('pf.ts.gemTags')} ({tags.size} {t('pf.ts.valgt')})
        </button>
        <button style={s.sekundærBtn} onClick={onTilbage}>{t('pf.ts.annuller')}</button>
      </div>
    </div>
  )
}

// ─── Notifikationer ──────────────────────────────────────────────────────────

function NotifikationerSide({ onTilbage }) {
  const { t } = useLang()
  const [notif, setNotif] = useState(hentNotif)
  function toggle(key) {
    const ny = { ...notif, [key]: !notif[key] }
    setNotif(ny)
    try { localStorage.setItem(NOTIF_KEY, JSON.stringify(ny)) } catch {}
  }
  return (
    <div style={s.subSide}>
      <SubHeader titel={t('pf.no.titel')} onTilbage={onTilbage} />
      <div style={s.subIndhold}>
        <p style={s.subBeskrivelse}>{t('pf.no.beskrivelse')}</p>
        {[
          { key: 'daglige',  label: t('pf.no.daglige'),  sub: t('pf.no.dagligeSub') },
          { key: 'venner',   label: t('pf.no.venner'),   sub: t('pf.no.vennerSub') },
          { key: 'ugentlig', label: t('pf.no.ugentlig'), sub: t('pf.no.ugentligSub') },
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
  const { lang, setLang, t } = useLang()
  const SPROG = [
    { kode: 'da', label: t('pf.sp.dansk'),   flag: '🇩🇰' },
    { kode: 'en', label: t('pf.sp.english'), flag: '🇬🇧' },
  ]
  return (
    <div style={s.subSide}>
      <SubHeader titel={t('pf.sp.titel')} onTilbage={onTilbage} />
      <div style={s.subIndhold}>
        <p style={s.subBeskrivelse}>{t('pf.sp.vælg')}</p>
        {SPROG.map((sp) => (
          <button key={sp.kode} onClick={() => setLang(sp.kode)}
            style={{ ...s.valgRække, ...(lang === sp.kode ? s.valgRækkeAktiv : {}) }}>
            <span style={{ fontSize: 22 }}>{sp.flag}</span>
            <span style={{ ...s.indstLabel, flex: 1, textAlign: 'left' }}>{sp.label}</span>
            {lang === sp.kode && <span style={{ color: colors.green, fontWeight: 800 }}>✓</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Privatliv ────────────────────────────────────────────────────────────────

function PrivatlivSide({ onTilbage }) {
  const { t } = useLang()
  const [priv, setPriv] = useState(hentPrivatliv)
  function toggle(key) {
    const ny = { ...priv, [key]: !priv[key] }
    setPriv(ny)
    try { localStorage.setItem(PRIVATLIV_KEY, JSON.stringify(ny)) } catch {}
  }
  return (
    <div style={s.subSide}>
      <SubHeader titel={t('pf.pv.titel')} onTilbage={onTilbage} />
      <div style={s.subIndhold}>
        <p style={s.subBeskrivelse}>{t('pf.pv.beskrivelse')}</p>
        {[
          { key: 'offentlig', label: t('pf.pv.offentlig'), sub: t('pf.pv.offentligSub') },
          { key: 'aktivitet', label: t('pf.pv.aktivitet'), sub: t('pf.pv.aktivitetSub') },
          { key: 'streak',    label: t('pf.pv.streak'),    sub: t('pf.pv.streakSub') },
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
  const { t } = useLang()
  const [åben, setÅben] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [sendt, setSendt] = useState(false)
  const FAQ_T = [
    { q: t('pf.hj.faq0q'), a: t('pf.hj.faq0a') },
    { q: t('pf.hj.faq1q'), a: t('pf.hj.faq1a') },
    { q: t('pf.hj.faq2q'), a: t('pf.hj.faq2a') },
    { q: t('pf.hj.faq3q'), a: t('pf.hj.faq3a') },
  ]
  return (
    <div style={s.subSide}>
      <SubHeader titel={t('pf.hj.titel')} onTilbage={onTilbage} />
      <div style={s.subIndhold}>
        <h3 style={s.subSektionTitel}>{t('pf.hj.faqTitel')}</h3>
        {FAQ_T.map((f, i) => (
          <div key={i} style={s.faqItem}>
            <button style={s.faqQ} onClick={() => setÅben(åben === i ? null : i)}>
              <span style={{ flex: 1, textAlign: 'left' }}>{f.q}</span>
              <span style={{ color: colors.mutedLight, transform: åben === i ? 'rotate(90deg)' : 'none', transition: '0.2s' }}>›</span>
            </button>
            {åben === i && <p style={s.faqA}>{f.a}</p>}
          </div>
        ))}
        <h3 style={{ ...s.subSektionTitel, marginTop: 28 }}>{t('pf.hj.feedbackTitel')}</h3>
        {sendt
          ? <div style={s.infoBox}>{t('pf.hj.tak')}</div>
          : <>
              <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)}
                placeholder={t('pf.hj.feedbackPh')}
                style={{ ...s.input, height: 100, resize: 'none' }} />
              <button style={s.primærBtn} onClick={() => feedback.trim() && setSendt(true)}>{t('pf.hj.send')}</button>
            </>
        }
        <div style={{ ...s.infoBox, marginTop: 20, textAlign: 'center' }}>
          <p style={{ margin: 0, fontWeight: 700, color: colors.text }}>{t('pf.hj.version')}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Delte hjælpekomponenter ─────────────────────────────────────────────────

function SubHeader({ titel, onTilbage }) {
  const { t } = useLang()
  return (
    <div style={s.subHeader}>
      <button style={s.tilbageBtn} onClick={onTilbage}>‹ {t('nav.profil')}</button>
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

function TomTab({ icon, tekst, knap, onKnap }) {
  return (
    <div style={s.tomTab}>
      {icon}
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
  avatar: { width: 88, height: 88, borderRadius: 999, background: colors.bg, border: `3px solid ${colors.border}`, fontSize: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: shadow.card, overflow: 'hidden' },
  avatarUploadBtn: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 999, background: colors.green, border: `2px solid ${colors.card}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: shadow.card },
  streakBadge: { position: 'absolute', bottom: -6, right: -8, background: colors.card, border: `2px solid ${colors.border}`, borderRadius: 999, fontSize: 12, fontFamily: font.body, fontWeight: 800, color: colors.text, padding: '3px 8px', boxShadow: shadow.card },
  navn: { fontFamily: font.display, fontWeight: 600, fontSize: 22, color: colors.text, margin: 0, letterSpacing: -0.4 },
  brugernavn: { fontFamily: font.body, fontSize: 13, fontWeight: 500, color: colors.mutedLight, margin: '3px 0 8px' },
  bio: { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: '0 0 14px', textAlign: 'center', lineHeight: 1.5, maxWidth: 300 },
  statsRow: { display: 'flex', alignItems: 'center', gap: 24, marginBottom: 18 },
  statTal: { fontFamily: font.display, fontWeight: 600, fontSize: 20, color: colors.text, margin: 0 },
  statLabel: { fontFamily: font.body, fontSize: 12, color: colors.muted, margin: '2px 0 0', fontWeight: 500 },
  statDiv: { width: 1, height: 28, background: colors.border },
  btnRow: { display: 'flex', gap: 10 },
  editBtn: { flex: 1, padding: '11px 20px', fontFamily: font.body, fontWeight: 700, fontSize: 14, color: colors.text, background: colors.bg, border: `1.5px solid ${colors.border}`, borderRadius: radius.button },
  shareBtn: { width: 44, height: 44, borderRadius: radius.button, background: colors.bg, border: `1.5px solid ${colors.border}`, color: colors.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' },

  sektion: { padding: '20px 16px' },
  sektionHeader: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 },
  sektionTitel: { fontFamily: font.display, fontWeight: 600, fontSize: 18, color: colors.text, margin: 0, letterSpacing: -0.3 },
  sektionHint: { fontFamily: font.body, fontSize: 13, color: colors.mutedLight, margin: '0 0 14px' },
  redigerTagsBtn: { fontFamily: font.body, fontSize: 13, fontWeight: 700, color: colors.green, background: 'none', border: 'none', padding: 0 },
  tilføjTagsBtn: { fontFamily: font.body, fontSize: 14, fontWeight: 700, color: colors.green, background: 'rgba(47,107,79,0.08)', border: 'none', borderRadius: radius.pill, padding: '10px 16px' },
  tagGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  tagChip: { display: 'flex', alignItems: 'center', gap: 6, fontFamily: font.body, fontSize: 13, fontWeight: 700, color: colors.text, background: colors.card, border: `1.5px solid ${colors.border}`, padding: '8px 13px', borderRadius: radius.pill, boxShadow: shadow.card },

  kort: { background: colors.card, borderRadius: radius.card, boxShadow: shadow.card, padding: 16, margin: '0 16px 12px' },
  kortHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 },
  kortTitel: { fontFamily: font.display, fontWeight: 600, fontSize: 16, color: colors.text, margin: 0 },
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
  statBoxTal: { fontFamily: font.display, fontWeight: 600, fontSize: 22, color: colors.text },
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
  kreationNoter: { fontFamily: font.body, fontSize: 12, color: colors.muted, margin: '5px 0 0', fontStyle: 'italic', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  kreationSletBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', opacity: 0.5, flexShrink: 0, display: 'flex', alignItems: 'center', color: colors.muted },

  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 },
  badge: { background: colors.card, borderRadius: 16, boxShadow: shadow.card, padding: '16px 10px', textAlign: 'center' },
  badgeLocked: { opacity: 0.38 },
  badgeTitel: { fontFamily: font.body, fontWeight: 700, fontSize: 12, color: colors.text, margin: '8px 0 3px', lineHeight: 1.2 },
  badgeDesc: { fontFamily: font.body, fontSize: 10.5, color: colors.muted, margin: 0, lineHeight: 1.3 },
  badgeGruppeLabel: { fontFamily: font.body, fontWeight: 700, fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 10px' },

  tomTab: { textAlign: 'center', padding: '36px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  tomTabTekst: { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: 0, lineHeight: 1.5, maxWidth: 260 },

  indstRække: { width: '100%', display: 'flex', alignItems: 'center', gap: 14, background: colors.card, border: 'none', borderRadius: 14, boxShadow: shadow.card, padding: '13px 14px', marginBottom: 8 },
  indstEmoji: { width: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.muted },
  indstLabel: { fontFamily: font.body, fontWeight: 700, fontSize: 14.5, color: colors.text, margin: 0 },
  indstSub: { fontFamily: font.body, fontSize: 12.5, color: colors.mutedLight, margin: '2px 0 0' },
  indstPil: { fontSize: 22, color: colors.mutedLight, flexShrink: 0 },
  logUdBtn: { margin: '4px 16px 0', width: 'calc(100% - 32px)', padding: 14, fontFamily: font.body, fontWeight: 700, fontSize: 15, color: colors.red, background: 'rgba(194,91,74,0.08)', border: 'none', borderRadius: radius.button },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(31,36,33,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200, padding: 16 },
  dialog: { background: colors.card, borderRadius: radius.card, width: '100%', maxWidth: 440, padding: '24px 20px 20px' },
  dialogTitel: { fontFamily: font.display, fontWeight: 600, fontSize: 20, color: colors.text, margin: '0 0 8px', textAlign: 'center' },
  dialogTekst: { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: '0 0 20px', textAlign: 'center', lineHeight: 1.5 },
  dialogBekræft: { width: '100%', padding: 14, fontFamily: font.body, fontWeight: 700, fontSize: 15, color: '#fff', background: colors.red, border: 'none', borderRadius: radius.button, marginBottom: 8 },
  dialogAnnuller: { width: '100%', padding: 13, fontFamily: font.body, fontWeight: 700, fontSize: 15, color: colors.muted, background: 'transparent', border: 'none', borderRadius: radius.button },

  subHeader: { background: colors.card, borderBottom: `1px solid ${colors.border}`, padding: '14px 16px 12px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 'env(safe-area-inset-top, 0px)', zIndex: 10 },
  tilbageBtn: { fontFamily: font.body, fontSize: 14, fontWeight: 700, color: colors.green, background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 },
  subTitel: { fontFamily: font.display, fontWeight: 600, fontSize: 18, color: colors.text, margin: 0, letterSpacing: -0.3 },
  subIndhold: { padding: '20px 16px 120px' },
  subBeskrivelse: { fontFamily: font.body, fontSize: 14, color: colors.muted, margin: '0 0 20px', lineHeight: 1.5 },
  subSektionTitel: { fontFamily: font.display, fontWeight: 600, fontSize: 16, color: colors.text, margin: '0 0 12px' },

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
