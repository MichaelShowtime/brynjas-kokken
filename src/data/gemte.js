const GEMTE_KEY = 'simmer_gemte_v1'

export function hentGemte() {
  try { return JSON.parse(localStorage.getItem(GEMTE_KEY)) ?? [] } catch { return [] }
}

export function erGemt(id) {
  return hentGemte().includes(id)
}

export function toggleGemt(id) {
  const liste = hentGemte()
  const gemt = liste.includes(id)
  const ny = gemt ? liste.filter(x => x !== id) : [id, ...liste]
  try { localStorage.setItem(GEMTE_KEY, JSON.stringify(ny)) } catch {}
  return !gemt
}
