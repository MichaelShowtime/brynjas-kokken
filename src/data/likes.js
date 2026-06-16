// Persisterer opskrifter der er swipet ❤️ i Mad-match.
const KEY = 'simmer_likes'

export function hentLikes() {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] }
}

export function gemLike(opskrift) {
  const liste = hentLikes()
  if (liste.some((o) => o.id === opskrift.id)) return liste
  const ny = [opskrift, ...liste]
  try { localStorage.setItem(KEY, JSON.stringify(ny)) } catch {}
  return ny
}

export function fjernLike(id) {
  const ny = hentLikes().filter((o) => o.id !== id)
  try { localStorage.setItem(KEY, JSON.stringify(ny)) } catch {}
  return ny
}
