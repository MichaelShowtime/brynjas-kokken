// Gemte kreationer (fra "Afslut tilberedning") — persisteres i localStorage,
// synkroniseret til Appwrite så de deles på tværs af enheder.

import { databases, DB_ID, COL, Query, ID } from '../lib/appwrite'

const KEY = 'simmer_kreationer'

export function hentKreationer() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

export function gemKreation(kreation) {
  let liste = [kreation, ...hentKreationer()]
  try {
    localStorage.setItem(KEY, JSON.stringify(liste))
  } catch {
    // Sandsynligvis pladsmangel pga. billeddata — gem uden fotos.
    liste = liste.map((k) => ({ ...k, foto: null }))
    try {
      localStorage.setItem(KEY, JSON.stringify(liste))
    } catch {
      /* opgiv stille */
    }
  }
  return liste
}

// Foreslå et navn ud fra et lille sæt skabeloner.
const NAVNEFORSLAG = [
  'Tomatpasta med friske krydderurter',
  'Rustik tomat- & hvidløgspasta',
  'Sommerpasta med basilikum',
  'Cremet parmesan-tomatpasta',
  'Hjemmelavet pasta al pomodoro',
]

export function sletKreation(id) {
  const liste = hentKreationer().filter((k) => String(k.id) !== String(id))
  try { localStorage.setItem(KEY, JSON.stringify(liste)) } catch { /* opgiv */ }
  return liste
}

export function genererNavn(undtagen) {
  const valg = NAVNEFORSLAG.filter((n) => n !== undtagen)
  return valg[Math.floor(Math.random() * valg.length)]
}

// ── Appwrite-synk ─────────────────────────────────────────────────────────────

function fraDokument(d) {
  return {
    id: d.$id,
    titel: d.titel,
    opskriftId: d.opskrift_id || null,
    tidBrugt: d.tid_brugt || null,
    dato: d.dato,
    foto: d.foto || null,
    bruger: d.bruger_navn || null,
    noter: d.noter || null,
  }
}

function tilFelter(k) {
  return {
    titel: k.titel ?? k.navn ?? 'Kreation',
    opskrift_id: k.opskriftId != null ? String(k.opskriftId) : null,
    tid_brugt: k.tidBrugt ?? null,
    dato: k.dato ?? new Date().toISOString(),
    foto: k.foto ?? null,
    bruger_navn: k.bruger ?? null,
    noter: k.noter ?? null,
  }
}

// Henter brugerens kreationer fra Appwrite ved app-start. Er der intet på
// serveren endnu, men noget lokalt (fra før synk fandtes), migreres det op
// én gang. Ellers er serveren autoritativ.
export async function synkKreationer(brugerId) {
  if (!brugerId) return hentKreationer()
  try {
    const res = await databases.listDocuments(DB_ID, COL.kreationer, [
      Query.equal('user_id', brugerId), Query.orderDesc('dato'), Query.limit(200),
    ])
    if (res.documents.length > 0) {
      const server = res.documents.map(fraDokument)
      try { localStorage.setItem(KEY, JSON.stringify(server)) } catch {}
      return server
    }
    const lokale = hentKreationer()
    if (!lokale.length) return lokale
    const oprettet = await Promise.all(lokale.map(async (k) => {
      try {
        const d = await databases.createDocument(DB_ID, COL.kreationer, ID.unique(), { user_id: brugerId, ...tilFelter(k) })
        return fraDokument(d)
      } catch { return k }
    }))
    try { localStorage.setItem(KEY, JSON.stringify(oprettet)) } catch {}
    return oprettet
  } catch {
    return hentKreationer()
  }
}

// Gemmer en ny kreation lokalt (straks) og opretter den på kontoen.
export async function gemKreationDB(brugerId, kreation) {
  const lokalListe = gemKreation(kreation)
  if (!brugerId) return lokalListe
  try {
    const d = await databases.createDocument(DB_ID, COL.kreationer, ID.unique(), { user_id: brugerId, ...tilFelter(kreation) })
    const ny = lokalListe.map((k) => k.id === kreation.id ? fraDokument(d) : k)
    try { localStorage.setItem(KEY, JSON.stringify(ny)) } catch {}
    return ny
  } catch {
    return lokalListe
  }
}

// Sletter en kreation lokalt (straks) og på kontoen (kun hvis den er synket —
// lokale, endnu ikke-synkede id'er er ikke gyldige Appwrite-dokument-id'er).
export function sletKreationDB(brugerId, id) {
  const lokalListe = sletKreation(id)
  if (brugerId) databases.deleteDocument(DB_ID, COL.kreationer, id).catch(() => {})
  return lokalListe
}
