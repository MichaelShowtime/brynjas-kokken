// Auth via Appwrite Account — profil caches i localStorage for synkron adgang.

import { account, databases, DB_ID, COL, Query, ID } from '../lib/appwrite'

const SESSION_KEY = 'simmer_bruger_v2'

const BRUGER_KEYS = [
  SESSION_KEY,
  'simmer_likes',
  'simmer_kreationer',
  'brynjas_venner',
  'simmer_lager',
  'brynjas_afviste',
  'simmer_brugere',
  'simmer_session',
]

// ── Profil-cache ─────────────────────────────────────────────────────────────

export function hentAktivBruger() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) ?? null } catch { return null }
}

function gemBruger(bruger) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(bruger)) } catch {}
}

function fjernBruger() {
  try { BRUGER_KEYS.forEach((k) => localStorage.removeItem(k)) } catch {}
}

function bygBruger(userId, email, kunde) {
  const cached = hentAktivBruger()
  const bevar = cached?.id === userId ? cached : {}
  return {
    id:               userId,
    email,
    username:         kunde?.username       ?? null,
    navn:             kunde?.first_name     ?? email.split('@')[0],
    efternavn:        kunde?.last_name      ?? '',
    telefon:          kunde?.phone          ?? '',
    avatar:           kunde?.avatar         ?? '🧑‍🍳',
    tags:             kunde?.tags           ?? [],
    onboardingFærdig: (kunde?.tags ?? []).length > 0 || kunde?.onboarding_done === true,
    bio:              kunde?.bio            ?? '',
    avatarUrl:        kunde?.avatar_url     ?? null,
    standardPortioner: bevar?.standardPortioner ?? null,
  }
}

// ── Hent kundeprofil fra DB ───────────────────────────────────────────────────

async function hentKunde(userId) {
  try {
    const res = await databases.listDocuments(DB_ID, COL.customers, [
      Query.equal('user_id', userId),
      Query.limit(1),
    ])
    return res.documents[0] ?? null
  } catch { return null }
}

// ── Registrering ─────────────────────────────────────────────────────────────

export async function registrerBruger({ email, navn, efternavn, telefon, username, password }) {
  const normEmail    = email.trim().toLowerCase()
  const normUsername = username?.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') ?? ''

  if (!normEmail || !navn.trim() || !password)
    return { ok: false, fejl: 'Alle felter skal udfyldes.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail))
    return { ok: false, fejl: 'Indtast en gyldig e-mailadresse.' }
  if (normUsername.length < 3)
    return { ok: false, fejl: 'Brugernavn skal være mindst 3 tegn (kun bogstaver, tal og _).' }
  if (password.length < 6)
    return { ok: false, fejl: 'Adgangskoden skal være mindst 6 tegn.' }

  // Tjek om brugernavn er taget
  try {
    const existing = await databases.listDocuments(DB_ID, COL.customers, [
      Query.equal('username', normUsername), Query.limit(1),
    ])
    if (existing.total > 0) return { ok: false, fejl: 'Dette brugernavn er allerede taget.' }
  } catch {
    // Ignorer fejl her — unikhed håndteres af DB-index
  }

  // Opret Appwrite-bruger
  let user
  try {
    user = await account.create(ID.unique(), normEmail, password, navn.trim())
  } catch (e) {
    if (e.message?.toLowerCase().includes('already exists'))
      return { ok: false, fejl: 'Denne e-mail er allerede registreret.' }
    if (e.message === 'Failed to fetch' || e.type === 'general_network_error')
      return { ok: false, fejl: 'Ingen forbindelse til serveren. Prøv igen.' }
    return { ok: false, fejl: e.message }
  }

  // Log automatisk ind
  await account.createEmailPasswordSession(normEmail, password)

  // Opret kundeprofil
  await databases.createDocument(DB_ID, COL.customers, ID.unique(), {
    user_id:    user.$id,
    email:      normEmail,
    first_name: navn.trim(),
    last_name:  efternavn?.trim() ?? '',
    phone:      telefon?.trim() || null,
    username:   normUsername,
  })

  fjernBruger()
  const bruger = bygBruger(user.$id, normEmail, {
    first_name: navn.trim(),
    last_name:  efternavn?.trim() ?? '',
    phone:      telefon?.trim() || null,
    username:   normUsername,
  })
  gemBruger(bruger)
  return { ok: true, bruger }
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function logInd({ email, password }) {
  const normEmail = email.trim().toLowerCase()

  try {
    await account.createEmailPasswordSession(normEmail, password)
  } catch (e) {
    if (e.code === 401)
      return { ok: false, fejl: 'Forkert e-mail eller adgangskode.' }
    if (e.message === 'Failed to fetch' || e.type === 'general_network_error')
      return { ok: false, fejl: 'Ingen forbindelse til serveren. Tjek din internetforbindelse og prøv igen.' }
    return { ok: false, fejl: e.message }
  }

  fjernBruger()

  const user  = await account.get()
  const kunde = await hentKunde(user.$id)
  const bruger = bygBruger(user.$id, normEmail, kunde)
  gemBruger(bruger)
  return { ok: true, bruger }
}

// ── Session-sync ved app-start ────────────────────────────────────────────────

export async function syncSession() {
  let user
  try { user = await account.get() }
  catch { fjernBruger(); return null }

  const cached = hentAktivBruger()
  if (cached?.id !== user.$id) fjernBruger()
  if (cached?.id === user.$id) return cached

  const kunde  = await hentKunde(user.$id)
  const bruger = bygBruger(user.$id, user.email, kunde)
  gemBruger(bruger)
  return bruger
}

// ── Log ud ────────────────────────────────────────────────────────────────────

export async function logUd() {
  try { await account.deleteSession('current') } catch {}
  fjernBruger()
}

// ── Opdater bruger ────────────────────────────────────────────────────────────

export function opdaterBruger(opdatering) {
  const bruger = hentAktivBruger()
  if (!bruger) return null
  const ny = { ...bruger, ...opdatering }
  gemBruger(ny)
  if (bruger.id) {
    // Find og opdater kundedokument asynkront (fire-and-forget)
    hentKunde(bruger.id).then((doc) => {
      if (!doc) return
      databases.updateDocument(DB_ID, COL.customers, doc.$id, {
        first_name:      ny.navn,
        last_name:       ny.efternavn,
        phone:           ny.telefon ?? null,
        avatar:          ny.avatar,
        bio:             ny.bio ?? null,
        tags:            ny.tags ?? [],
        avatar_url:      ny.avatarUrl ?? null,
        onboarding_done: ny.onboardingFærdig ?? false,
        username:        ny.username ?? null,
      }).catch(() => {})
    })
  }
  return ny
}

export function erLoggetInd() {
  return !!hentAktivBruger()
}

export function anmodReset() { return { ok: true, token: null } }
export function nulstilAdgangskode() { return { ok: false, fejl: 'Brug "Glemt adgangskode".' } }
export function hentResetToken() { return null }
