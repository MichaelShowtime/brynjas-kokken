// Venneliste via Supabase — bruger user_id (UUID) fra Supabase Auth.

import { supabase } from '../lib/supabase'
import { hentAktivBruger } from './auth'

const KEY = 'brynjas_venner'

export function hentVenner() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function gemVennerLokalt(liste) {
  try { localStorage.setItem(KEY, JSON.stringify(liste)) } catch {}
}

// ── Supabase DB-funktioner ────────────────────────────────────────────────────

export async function hentVennerFraDB(userId) {
  if (!userId) return []

  const { data: vennerData } = await supabase
    .from('venner')
    .select('ven_email, ven_user_id')
    .eq('bruger_user_id', userId)

  if (!vennerData?.length) return []

  const venUserIds = vennerData.map((v) => v.ven_user_id).filter(Boolean)

  let kunder = []
  if (venUserIds.length) {
    const { data } = await supabase
      .from('customers')
      .select('user_id, email, first_name, last_name, avatar, avatar_url')
      .in('user_id', venUserIds)
    kunder = data ?? []
  }

  const liste = vennerData.map((v) => {
    const k = kunder.find((c) => c.user_id === v.ven_user_id)
    return {
      id:        v.ven_user_id ?? v.ven_email,
      email:     k?.email      ?? v.ven_email ?? '',
      navn:      k?.first_name ?? v.ven_email?.split('@')[0] ?? '?',
      efternavn: k?.last_name  ?? '',
      emoji:     k?.avatar     ?? '🧑‍🍳',
      avatarUrl: k?.avatar_url ?? null,
    }
  })

  gemVennerLokalt(liste)
  return liste
}

export async function søgBrugere(query) {
  if (!query || query.length < 2) return []
  const { data } = await supabase
    .from('customers')
    .select('user_id, email, username, first_name, last_name, avatar, avatar_url')
    .ilike('username', `${query.toLowerCase()}%`)
    .limit(8)
  return data ?? []
}

export async function tilføjVenDB(userId, venUsername) {
  const norm = venUsername.trim().toLowerCase()
  if (!norm) return { ok: false, fejl: 'Indtast et brugernavn.' }

  const bruger = hentAktivBruger()
  if (norm === bruger?.username?.toLowerCase())
    return { ok: false, fejl: 'Du kan ikke tilføje dig selv.' }

  const { data: kunde } = await supabase
    .from('customers')
    .select('user_id, email, username, first_name, last_name, avatar, avatar_url')
    .eq('username', norm)
    .maybeSingle()

  if (!kunde) return { ok: false, fejl: 'Ingen bruger fundet med det brugernavn.' }

  const { error } = await supabase.from('venner').insert({
    bruger_user_id: userId,
    bruger_email:   bruger?.email ?? '',
    ven_user_id:    kunde.user_id,
    ven_email:      kunde.email ?? '',
  })

  if (error) {
    if (error.code === '23505') return { ok: false, fejl: 'Du følger allerede denne person.' }
    return { ok: false, fejl: 'Noget gik galt. Prøv igen.' }
  }

  return {
    ok: true,
    ven: {
      id:        kunde.user_id,
      email:     kunde.email,
      username:  kunde.username,
      navn:      kunde.first_name,
      efternavn: kunde.last_name,
      emoji:     kunde.avatar ?? '🧑‍🍳',
      avatarUrl: kunde.avatar_url ?? null,
    },
  }
}

export async function fjernVenDB(userId, venEmail) {
  await supabase
    .from('venner')
    .delete()
    .eq('bruger_user_id', userId)
    .eq('ven_email', venEmail.toLowerCase())
}

export async function hentAntalFølgere(userId) {
  if (!userId) return 0
  const { count } = await supabase
    .from('venner')
    .select('*', { count: 'exact', head: true })
    .eq('ven_user_id', userId)
  return count ?? 0
}

// Lokale hjælpefunktioner (til offline-cache-manipulation)
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
