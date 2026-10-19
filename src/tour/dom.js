// Små hjælpefunktioner til at finde, vente på og trykke på elementer med data-tour.

export const vælger = (navn) => `[data-tour="${navn}"]`

// navn kan være ét data-tour-navn eller en liste (det første fundne bruges)
export function find(navn) {
  const liste = Array.isArray(navn) ? navn : [navn]
  for (const n of liste) {
    const el = document.querySelector(vælger(n))
    if (el) return el
  }
  return null
}

export function harStørrelse(el) {
  if (!el?.isConnected) return false
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return false
  const cs = getComputedStyle(el)
  return cs.display !== 'none' && cs.visibility !== 'hidden'
}

// Til vinduer, der altid ligger i siden men er skjult udenfor skærmen, til de åbnes
export function erÅben(el) {
  if (!harStørrelse(el)) return false
  return el.getBoundingClientRect().top < window.innerHeight - 8
}

export function vent(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Gentager betingelsen, til den giver et resultat, eller tiden er gået (giver så null)
export function ventPå(betingelse, maksMs = 4000, interval = 50) {
  return new Promise((resolve) => {
    const start = performance.now()
    const tjek = () => {
      let værdi = null
      try { værdi = betingelse() } catch { /* prøv igen */ }
      if (værdi) return resolve(værdi)
      if (performance.now() - start >= maksMs) return resolve(null)
      setTimeout(tjek, interval)
    }
    tjek()
  })
}

// Skriver i et React-styret felt, så appens egen onChange kører (kun på skærmen)
export function sætFeltværdi(el, tekst) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (!setter) return
  setter.call(el, tekst)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

export function erFast(el) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (getComputedStyle(n).position === 'fixed') return true
  }
  return false
}

export function stien() {
  try { return decodeURIComponent(window.location.pathname) } catch { return window.location.pathname }
}

// Fjerner tastaturet, hvis en dialog selv har givet et felt fokus
export function slipFokus() {
  const aktiv = document.activeElement
  if (aktiv && aktiv !== document.body && typeof aktiv.blur === 'function') aktiv.blur()
}
