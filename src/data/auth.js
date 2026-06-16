// Auth-system — alt i localStorage, ingen backend.
// Passwords er hashed med en simpel djb2-hash (ikke kryptografisk sikker).

const BRUGERE_KEY  = 'simmer_brugere'
const SESSION_KEY  = 'simmer_session'
const RESET_KEY    = 'simmer_reset'

function hashPw(pw) {
  let h = 5381
  for (let i = 0; i < pw.length; i++) {
    h = Math.imul((h << 5) + h, 1) ^ pw.charCodeAt(i)
    h = h | 0
  }
  return (h >>> 0).toString(36)
}

function læsBrugere() {
  try { return JSON.parse(localStorage.getItem(BRUGERE_KEY)) || [] } catch { return [] }
}
function skrivBrugere(liste) {
  try { localStorage.setItem(BRUGERE_KEY, JSON.stringify(liste)) } catch {}
}

// ── Registrering ─────────────────────────────────────────────────────────────

export function registrerBruger({ email, navn, efternavn, telefon, password }) {
  const brugere = læsBrugere()
  const normEmail = email.trim().toLowerCase()

  if (!normEmail || !navn.trim() || !efternavn.trim() || !password)
    return { ok: false, fejl: 'Alle felter skal udfyldes.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail))
    return { ok: false, fejl: 'Indtast en gyldig e-mailadresse.' }
  if (password.length < 6)
    return { ok: false, fejl: 'Adgangskoden skal være mindst 6 tegn.' }
  if (brugere.some((b) => b.email === normEmail))
    return { ok: false, fejl: 'Denne e-mail er allerede registreret.' }

  const bruger = {
    id: Date.now().toString(),
    email: normEmail,
    navn: navn.trim(),
    efternavn: efternavn.trim(),
    telefon: telefon.trim(),
    passwordHash: hashPw(password),
    tags: [],
    avatar: '🧑‍🍳',
    bio: '',
    oprettet: new Date().toISOString(),
    onboardingFærdig: false,
  }
  skrivBrugere([...brugere, bruger])
  startSession(bruger.id)
  return { ok: true, bruger }
}

// ── Login ────────────────────────────────────────────────────────────────────

export function logInd({ email, password }) {
  const normEmail = email.trim().toLowerCase()
  const bruger = læsBrugere().find((b) => b.email === normEmail)
  if (!bruger) return { ok: false, fejl: 'Ingen konto med den e-mail.' }
  if (bruger.passwordHash !== hashPw(password))
    return { ok: false, fejl: 'Forkert adgangskode.' }
  startSession(bruger.id)
  return { ok: true, bruger }
}

// ── Session ───────────────────────────────────────────────────────────────────

function startSession(brugerId) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ brugerId, loginAt: new Date().toISOString() })) } catch {}
}

export function logUd() {
  try { localStorage.removeItem(SESSION_KEY) } catch {}
}

export function hentAktivBruger() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY))
    if (!session) return null
    return læsBrugere().find((b) => b.id === session.brugerId) || null
  } catch { return null }
}

export function erLoggetInd() {
  return !!hentAktivBruger()
}

// ── Opdater bruger ────────────────────────────────────────────────────────────

export function opdaterBruger(opdatering) {
  const bruger = hentAktivBruger()
  if (!bruger) return null
  const ny = { ...bruger, ...opdatering }
  skrivBrugere(læsBrugere().map((b) => (b.id === bruger.id ? ny : b)))
  return ny
}

// ── Glemt adgangskode ─────────────────────────────────────────────────────────

export function anmodReset(email) {
  const normEmail = email.trim().toLowerCase()
  const bruger = læsBrugere().find((b) => b.email === normEmail)
  // Afslør aldrig om e-mail eksisterer
  if (!bruger) return { ok: true, token: null }
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36)
  try {
    localStorage.setItem(RESET_KEY, JSON.stringify({
      token, brugerId: bruger.id, udløber: Date.now() + 3600000, // 1 time
    }))
  } catch {}
  return { ok: true, token }
}

export function nulstilAdgangskode(token, nyAdgangskode) {
  if (nyAdgangskode.length < 6)
    return { ok: false, fejl: 'Adgangskoden skal være mindst 6 tegn.' }
  try {
    const reset = JSON.parse(localStorage.getItem(RESET_KEY))
    if (!reset || reset.token !== token || Date.now() > reset.udløber)
      return { ok: false, fejl: 'Linket er udløbet. Anmod om et nyt.' }
    skrivBrugere(læsBrugere().map((b) =>
      b.id === reset.brugerId ? { ...b, passwordHash: hashPw(nyAdgangskode) } : b
    ))
    localStorage.removeItem(RESET_KEY)
    return { ok: true }
  } catch { return { ok: false, fejl: 'Noget gik galt.' } }
}

export function hentResetToken() {
  try {
    const reset = JSON.parse(localStorage.getItem(RESET_KEY))
    return reset && Date.now() < reset.udløber ? reset.token : null
  } catch { return null }
}
