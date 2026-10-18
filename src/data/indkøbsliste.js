import { kanonisk, tilBase } from './lager'
import { parseMængde, formatMængde } from '../lib/skalering'

const KEY = 'simmer_indkøbsliste'

// Faktor til basisenhed (g / ml) — bruges til at lægge mængder sammen på tværs af enheder
const FAKTOR = { g: 1, kg: 1000, ml: 1, cl: 10, dl: 100, l: 1000, tsk: 5, spsk: 15 }

// Læg to mængder sammen hvis de kan sammenlignes; ellers returnér null
function lægSammen(eksM, eksE, nyM, nyE) {
  const a = parseMængde(eksM), b = parseMængde(nyM)
  if (a === null || b === null) return null
  const ee = (eksE ?? '').toLowerCase(), ne = (nyE ?? '').toLowerCase()
  if (ee === ne) return { mængde: formatMængde(a + b), enhed: eksE }
  const ba = tilBase(a, ee), bb = tilBase(b, ne)
  if (ba && bb && ba.type === bb.type && ba.type !== 'count' && FAKTOR[ee]) {
    return { mængde: formatMængde((ba.val + bb.val) / FAKTOR[ee]), enhed: eksE }
  }
  return null
}

export function hentIndkøbsliste() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? [] } catch { return [] }
}

export function gemIndkøbsliste(liste) {
  try { localStorage.setItem(KEY, JSON.stringify(liste)) } catch {}
}

// Tilføj array af varer — deduplicerer på navn (samme enhedstype slås sammen)
export function tilføjTilIndkøbsliste(nyeVarer) {
  const liste = hentIndkøbsliste()
  const opdateret = [...liste]
  for (const ny of nyeVarer) {
    const eksIdx = opdateret.findIndex(
      (v) => kanonisk(v.navn) === kanonisk(ny.navn) && !v.tjekket
    )
    if (eksIdx >= 0) {
      // Eksisterende — tilføj opskrift-reference hvis ikke allerede der
      const eks = opdateret[eksIdx]
      const refs = eks.opskriftRefs ?? (eks.opskriftTitel ? [{ titel: eks.opskriftTitel, id: eks.opskriftId }] : [])
      if (ny.opskriftTitel && !refs.some((r) => r.id === ny.opskriftId)) {
        refs.push({ titel: ny.opskriftTitel, id: ny.opskriftId })
      }
      const sum = lægSammen(eks.mængde, eks.enhed, ny.mængde, ny.enhed)
      opdateret[eksIdx] = { ...eks, ...(sum ?? {}), opskriftRefs: refs }
    } else {
      opdateret.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        navn: ny.navn,
        mængde: ny.mængde ?? null,
        enhed: ny.enhed ?? null,
        emoji: ny.emoji ?? '🥄',
        kategori: ny.kategori ?? 'tørvarer',
        opskriftTitel: ny.opskriftTitel ?? null,
        opskriftId: ny.opskriftId ?? null,
        opskriftRefs: ny.opskriftTitel ? [{ titel: ny.opskriftTitel, id: ny.opskriftId }] : [],
        tjekket: false,
      })
    }
  }
  gemIndkøbsliste(opdateret)
  return opdateret
}

export function toggleTjekket(id) {
  const liste = hentIndkøbsliste().map((v) =>
    v.id === id ? { ...v, tjekket: !v.tjekket } : v
  )
  gemIndkøbsliste(liste)
  return liste
}

export function fjernFraIndkøbsliste(id) {
  const liste = hentIndkøbsliste().filter((v) => v.id !== id)
  gemIndkøbsliste(liste)
  return liste
}

export function rydTjekkede() {
  const liste = hentIndkøbsliste().filter((v) => !v.tjekket)
  gemIndkøbsliste(liste)
  return liste
}

// Returnerer de tjekkede varer som lager-format, og rydder dem fra listen
export function flytTjekkede() {
  const alle = hentIndkøbsliste()
  const tjekkede = alle.filter((v) => v.tjekket)
  const resten = alle.filter((v) => !v.tjekket)
  gemIndkøbsliste(resten)
  return {
    ryddet: resten,
    lagerVarer: tjekkede.map((v) => ({
      id: Date.now() + Math.random(),
      navn: v.navn,
      mængde: v.mængde ?? '',
      enhed: v.enhed ?? 'stk',
      kategori: v.kategori ?? 'tørvarer',
      emoji: v.emoji ?? '🥄',
      udløb: null,
      snartTom: false,
    })),
  }
}
