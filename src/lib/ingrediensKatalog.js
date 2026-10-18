import { databases, DB_ID, COL, Query } from './appwrite'
import { INGREDIENS_KATALOG, kanoniselér } from '../data/lager'
import { gætKategori, gætEmoji, gætEnhed } from './ingrediensUtils'

// Delt ingrediens-katalog: de faste varer + alle kerne-ingredienser fra opskrifterne.
// Bruges af Lager (tilføj vare) og OpretOpskrift (vælg ingrediens), så navne er ens
// og lager-matching virker. Hentes én gang pr. sidevisning.
let _promise = null

export function hentIngrediensKatalog() {
  if (_promise) return _promise
  _promise = databases.listDocuments(DB_ID, COL.recipes, [Query.equal('status', 'approved'), Query.limit(1000)])
    .then(({ documents: data }) => {
      const set = new Set(INGREDIENS_KATALOG.map((i) => i.navn.toLowerCase()))
      const ekstra = []
      for (const r of data ?? []) {
        let ings = []
        try { ings = r.ingredients_json ? JSON.parse(r.ingredients_json) : (r.ingredients ?? []) } catch { /* spring over */ }
        for (const ing of ings) {
          const rå = (ing.name ?? '').trim()
          if (!rå) continue
          // "Mandelsmør eller peanutbutter" → to separate varer
          for (const del of rå.split(/\s+eller\s+/i)) {
            const raw = kanoniselér(del)
            if (!raw || raw.length < 2) continue
            const navn = raw.charAt(0).toUpperCase() + raw.slice(1)
            if (set.has(navn.toLowerCase())) continue
            set.add(navn.toLowerCase())
            ekstra.push({ navn, kategori: gætKategori(navn), emoji: gætEmoji(navn), standardEnhed: gætEnhed(navn) })
          }
        }
      }
      ekstra.sort((a, b) => a.navn.localeCompare(b.navn, 'da'))
      return [...INGREDIENS_KATALOG, ...ekstra]
    })
    .catch(() => { _promise = null; return INGREDIENS_KATALOG })
  return _promise
}

// Søg i kataloget: begyndelse af navn først, derefter indeholder
export function søgKatalog(katalog, tekst, max = 8) {
  const søg = (tekst ?? '').trim().toLowerCase()
  if (!søg) return []
  return katalog
    .filter((v) => v.navn.toLowerCase().includes(søg))
    .sort((a, b) => {
      const aS = a.navn.toLowerCase().startsWith(søg)
      const bS = b.navn.toLowerCase().startsWith(søg)
      if (aS !== bS) return aS ? -1 : 1
      return a.navn.localeCompare(b.navn, 'da')
    })
    .slice(0, max)
}
