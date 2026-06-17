const KEY = 'brynjas_afviste'
const UGE_MS = 7 * 24 * 60 * 60 * 1000

function hentRå() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} }
}

// Ryd udløbne og returnér aktive som Set<id>
export function rydOgHent() {
  const rå = hentRå()
  const nu = Date.now()
  const aktive = Object.fromEntries(Object.entries(rå).filter(([, ts]) => nu - ts < UGE_MS))
  localStorage.setItem(KEY, JSON.stringify(aktive))
  return new Set(Object.keys(aktive))
}

export function gemAfvist(id) {
  const rå = hentRå()
  rå[String(id)] = Date.now()
  localStorage.setItem(KEY, JSON.stringify(rå))
}

// Antal dage til reset (til evt. UI-feedback)
export function dageIgjen(id) {
  const ts = hentRå()[String(id)]
  if (!ts) return 0
  return Math.max(0, Math.ceil((ts + UGE_MS - Date.now()) / 86400000))
}
