// Venneliste — primært via Supabase, localStorage som fallback/cache.
// DB-tabel: venner(bruger_email, ven_email) + customers(email, first_name, last_name)

import { supabase } from '../lib/supabase'

const KEY = 'brynjas_venner'

// ── Lokale mock-venner (bruges kun hvis ingen DB-data) ────────────────────────

const STANDARD = [
  { id: 'mads',   email: 'mads@example.dk',   navn: 'Mads',   efternavn: 'Koekken', emoji: '👨‍🍳', live: true  },
  { id: 'sofie',  email: 'sofie@example.dk',  navn: 'Sofie',  efternavn: 'Foodie',  emoji: '🧑‍🍳' },
  { id: 'oliver', email: 'oliver@example.dk', navn: 'Oliver', efternavn: 'Eats',    emoji: '👨🏽‍🍳' },
]

// ── localStorage (sync — bruges til hurtig visning) ───────────────────────────

export function hentVenner() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : STANDARD
  } catch { return STANDARD }
}

function gemVennerLokalt(liste) {
  try { localStorage.setItem(KEY, JSON.stringify(liste)) } catch {}
}

// ── Supabase DB-funktioner ────────────────────────────────────────────────────

// Hent alle venner for en bruger fra DB
export async function hentVennerFraDB(brugerEmail) {
  if (!brugerEmail) return []

  const { data: vennerData } = await supabase
    .from('venner')
    .select('ven_email')
    .eq('bruger_email', brugerEmail.toLowerCase())

  if (!vennerData?.length) return []

  const emails = vennerData.map((v) => v.ven_email)

  const { data: kunder } = await supabase
    .from('customers')
    .select('email, first_name, last_name')
    .in('email', emails)

  const liste = vennerData.map((v) => {
    const k = kunder?.find((c) => c.email === v.ven_email)
    return {
      id: v.ven_email,
      email: v.ven_email,
      navn: k?.first_name ?? v.ven_email.split('@')[0],
      efternavn: k?.last_name ?? '',
      emoji: '🧑‍🍳',
    }
  })

  gemVennerLokalt(liste)
  return liste
}

// Tilføj ven via e-mail — finder personen i customers-tabel
export async function tilføjVenDB(brugerEmail, venEmail) {
  const normEmail = venEmail.trim().toLowerCase()
  if (!normEmail) return { ok: false, fejl: 'Indtast en e-mailadresse.' }
  if (normEmail === brugerEmail?.toLowerCase())
    return { ok: false, fejl: 'Du kan ikke tilføje dig selv.' }

  // Tjek om personen eksisterer i customers
  const { data: kunde } = await supabase
    .from('customers')
    .select('email, first_name, last_name')
    .eq('email', normEmail)
    .maybeSingle()

  if (!kunde) return { ok: false, fejl: 'Ingen bruger fundet med den e-mail.' }

  const { error } = await supabase.from('venner').insert({
    bruger_email: brugerEmail.toLowerCase(),
    ven_email: normEmail,
  })

  if (error) {
    if (error.code === '23505') return { ok: false, fejl: 'Du følger allerede denne person.' }
    return { ok: false, fejl: 'Noget gik galt. Prøv igen.' }
  }

  return {
    ok: true,
    ven: {
      id: kunde.email,
      email: kunde.email,
      navn: kunde.first_name,
      efternavn: kunde.last_name,
      emoji: '🧑‍🍳',
    },
  }
}

// Fjern ven fra DB
export async function fjernVenDB(brugerEmail, venEmail) {
  await supabase
    .from('venner')
    .delete()
    .eq('bruger_email', brugerEmail.toLowerCase())
    .eq('ven_email', venEmail.toLowerCase())
}

// Hent antal der følger mig (følgere)
export async function hentAntalFølgere(brugerEmail) {
  if (!brugerEmail) return 0
  const { count } = await supabase
    .from('venner')
    .select('*', { count: 'exact', head: true })
    .eq('ven_email', brugerEmail.toLowerCase())
  return count ?? 0
}

// ── Lokale hjælpefunktioner (stadig brugt til offline-tilstand) ───────────────

export function tilføjVen(brugernavn) {
  const liste = hentVenner()
  const bnLower = brugernavn.toLowerCase().trim()
  if (!bnLower || liste.some((v) => v.email?.toLowerCase() === bnLower)) return null
  const ny = { id: Date.now().toString(), email: bnLower, navn: brugernavn.trim(), efternavn: '', emoji: '🧑‍🍳' }
  const opdateret = [...liste, ny]
  gemVennerLokalt(opdateret)
  return opdateret
}

export function fjernVen(id) {
  const liste = hentVenner().filter((v) => v.id !== id)
  gemVennerLokalt(liste)
  return liste
}
