// Venneliste — gemmes i localStorage.
// Hvert element: { id, brugernavn, navn, emoji, live? }

const KEY = 'brynjas_venner'

const STANDARD = [
  { id: 'mads',   brugernavn: 'mads_koekken',  navn: 'Mads',   emoji: '👨‍🍳', live: true },
  { id: 'sofie',  brugernavn: 'sofie_foodie',   navn: 'Sofie',  emoji: '🧑‍🍳' },
  { id: 'oliver', brugernavn: 'oliver_eats',    navn: 'Oliver', emoji: '👨🏽‍🍳' },
  { id: 'emma',   brugernavn: 'emma_bager',     navn: 'Emma',   emoji: '👩‍🍳' },
  { id: 'noah',   brugernavn: 'noah_gourmet',   navn: 'Noah',   emoji: '🧔' },
  { id: 'liv',    brugernavn: 'liv_spiser',     navn: 'Liv',    emoji: '👩🏼‍🦰' },
]

export function hentVenner() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : STANDARD
  } catch { return STANDARD }
}

export function tilføjVen(brugernavn) {
  const liste = hentVenner()
  const bnLower = brugernavn.toLowerCase().trim()
  if (!bnLower || liste.some(v => v.brugernavn.toLowerCase() === bnLower)) return null
  const ny = {
    id: Date.now().toString(),
    brugernavn: bnLower,
    navn: brugernavn.trim(),
    emoji: '🧑‍🍳',
  }
  const opdateret = [...liste, ny]
  localStorage.setItem(KEY, JSON.stringify(opdateret))
  return opdateret
}

export function fjernVen(id) {
  const liste = hentVenner().filter(v => v.id !== id)
  localStorage.setItem(KEY, JSON.stringify(liste))
  return liste
}
