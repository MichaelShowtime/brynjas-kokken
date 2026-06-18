// Auth via Supabase Auth — profil caches i localStorage for synkron adgang.

import { supabase } from '../lib/supabase'

const SESSION_KEY = 'simmer_bruger_v2'

// ── Profil-cache ─────────────────────────────────────────────────────────────

export function hentAktivBruger() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) ?? null } catch { return null }
}

function gemBruger(bruger) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(bruger)) } catch {}
}

function fjernBruger() {
  try {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem('simmer_brugere')
    localStorage.removeItem('simmer_session')
  } catch {}
}

function bygBruger(userId, email, kunde) {
  return {
    id:              userId,
    email,
    username:        kunde?.username      ?? null,
    navn:            kunde?.first_name    ?? email.split('@')[0],
    efternavn:       kunde?.last_name     ?? '',
    telefon:         kunde?.phone         ?? '',
    avatar:          kunde?.avatar        ?? '🧑‍🍳',
    tags:            kunde?.tags          ?? [],
    onboardingFærdig: (kunde?.tags ?? []).length > 0 || kunde?.onboarding_done === true,
    bio:             kunde?.bio           ?? '',
    avatarUrl:       kunde?.avatar_url    ?? null,
  }
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

  const { data: existing } = await supabase
    .from('customers').select('id').eq('username', normUsername).maybeSingle()
  if (existing) return { ok: false, fejl: 'Dette brugernavn er allerede taget.' }

  const { data: authData, error: authError } = await supabase.auth.signUp({ email: normEmail, password })
  if (authError) {
    if (authError.message.toLowerCase().includes('already registered'))
      return { ok: false, fejl: 'Denne e-mail er allerede registreret.' }
    return { ok: false, fejl: authError.message }
  }

  const userId = authData.user.id

  await supabase.from('customers').insert({
    user_id:    userId,
    email:      normEmail,
    first_name: navn.trim(),
    last_name:  efternavn?.trim() ?? '',
    phone:      telefon?.trim() || null,
    username:   normUsername,
  })

  const bruger = bygBruger(userId, normEmail, {
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

  const { data, error } = await supabase.auth.signInWithPassword({ email: normEmail, password })
  if (error) {
    if (error.message.toLowerCase().includes('invalid login credentials'))
      return { ok: false, fejl: 'Forkert e-mail eller adgangskode.' }
    return { ok: false, fejl: error.message }
  }

  const { data: kunde } = await supabase.from('customers')
    .select('*').eq('user_id', data.user.id).maybeSingle()

  const bruger = bygBruger(data.user.id, normEmail, kunde)
  gemBruger(bruger)
  return { ok: true, bruger }
}

// ── Session-sync ved app-start ────────────────────────────────────────────────
// Returnerer den opdaterede bruger (eller null) — kald i App.jsx ved mount

export async function syncSession() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    fjernBruger()
    return null
  }
  const cached = hentAktivBruger()
  if (cached?.id === session.user.id) return cached

  const { data: kunde } = await supabase.from('customers')
    .select('*').eq('user_id', session.user.id).maybeSingle()
  const bruger = bygBruger(session.user.id, session.user.email, kunde)
  gemBruger(bruger)
  return bruger
}

// ── Log ud ────────────────────────────────────────────────────────────────────

export async function logUd() {
  await supabase.auth.signOut()
  fjernBruger()
}

// ── Opdater bruger ────────────────────────────────────────────────────────────

export function opdaterBruger(opdatering) {
  const bruger = hentAktivBruger()
  if (!bruger) return null
  const ny = { ...bruger, ...opdatering }
  gemBruger(ny)
  if (bruger.id) {
    supabase.from('customers').update({
      first_name:      ny.navn,
      last_name:       ny.efternavn,
      phone:           ny.telefon ?? null,
      avatar:          ny.avatar,
      bio:             ny.bio ?? null,
      tags:            ny.tags ?? [],
      avatar_url:      ny.avatarUrl ?? null,
      onboarding_done: ny.onboardingFærdig ?? false,
      username:        ny.username ?? null,
    }).eq('user_id', bruger.id).then(() => {})
  }
  return ny
}

export function erLoggetInd() {
  return !!hentAktivBruger()
}

// Baglæns-kompatibilitet — ikke brugt mere
export function anmodReset() { return { ok: true, token: null } }
export function nulstilAdgangskode() { return { ok: false, fejl: 'Brug "Glemt adgangskode" via Supabase.' } }
export function hentResetToken() { return null }
