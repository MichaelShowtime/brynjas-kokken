// Gemte kreationer fra "Opret" — persisteres i localStorage, så de kan findes igen.

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
