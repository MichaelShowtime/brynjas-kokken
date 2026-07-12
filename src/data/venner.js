// Venneliste via Appwrite.

import { databases, DB_ID, COL, Query, ID } from '../lib/appwrite'
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

// ── DB-funktioner ─────────────────────────────────────────────────────────────

export async function hentVennerFraDB(userId) {
  if (!userId) return []

  const venRes = await databases.listDocuments(DB_ID, COL.venner, [
    Query.equal('bruger_user_id', userId),
    Query.limit(100),
  ])
  const vennerData = venRes.documents
  if (!vennerData.length) return []

  const venUserIds = vennerData.map((v) => v.ven_user_id).filter(Boolean)

  let kunder = []
  if (venUserIds.length) {
    const kRes = await databases.listDocuments(DB_ID, COL.customers, [
      Query.equal('user_id', venUserIds),
      Query.limit(100),
    ])
    kunder = kRes.documents
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
  const res = await databases.listDocuments(DB_ID, COL.customers, [
    Query.startsWith('username', query.toLowerCase()),
    Query.limit(8),
  ])
  return res.documents
}

export async function tilføjVenDB(userId, venUsername) {
  const norm = venUsername.trim().toLowerCase()
  if (!norm) return { ok: false, fejl: 'Indtast et brugernavn.' }

  const bruger = hentAktivBruger()
  if (norm === bruger?.username?.toLowerCase())
    return { ok: false, fejl: 'Du kan ikke tilføje dig selv.' }

  const søgRes = await databases.listDocuments(DB_ID, COL.customers, [
    Query.equal('username', norm), Query.limit(1),
  ])
  const kunde = søgRes.documents[0]
  if (!kunde) return { ok: false, fejl: 'Ingen bruger fundet med det brugernavn.' }

  // Tjek om venskab allerede eksisterer
  const eksist = await databases.listDocuments(DB_ID, COL.venner, [
    Query.equal('bruger_user_id', userId),
    Query.equal('ven_user_id', kunde.user_id),
    Query.limit(1),
  ])
  if (eksist.total > 0) return { ok: false, fejl: 'Du følger allerede denne person.' }

  await databases.createDocument(DB_ID, COL.venner, ID.unique(), {
    bruger_user_id: userId,
    bruger_email:   bruger?.email ?? '',
    ven_user_id:    kunde.user_id,
    ven_email:      kunde.email ?? '',
  })

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
  const res = await databases.listDocuments(DB_ID, COL.venner, [
    Query.equal('bruger_user_id', userId),
    Query.equal('ven_email', venEmail.toLowerCase()),
    Query.limit(1),
  ])
  if (res.documents[0]) {
    await databases.deleteDocument(DB_ID, COL.venner, res.documents[0].$id)
  }
}

export async function hentAntalFølgere(userId) {
  if (!userId) return 0
  const res = await databases.listDocuments(DB_ID, COL.venner, [
    Query.equal('ven_user_id', userId),
    Query.limit(1),
  ])
  return res.total
}

// Lokale hjælpefunktioner
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
