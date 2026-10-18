// ── Mængde-skalering ──────────────────────────────────────────────────────────
// Delt af Opskrift (portionsvælger) og Kok (tilberedning), så begge viser
// de samme mængder for det valgte antal portioner.

// Kendte brøk-tegn → decimalværdi
const BRØK = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1/3, '⅔': 2/3, '⅛': 0.125, '⅜': 0.375 }
const BRØK_INV = Object.entries(BRØK).sort((a, b) => a[1] - b[1])

export function parseMængde(str) {
  if (!str) return null
  const s = String(str).trim()
  if (BRØK[s] !== undefined) return BRØK[s]
  // "1½", "2¼" osv.
  const blandet = s.match(/^(\d+)(½|¼|¾|⅓|⅔|⅛|⅜)$/)
  if (blandet) return parseInt(blandet[1]) + BRØK[blandet[2]]
  const tal = parseFloat(s.replace(',', '.'))
  return isNaN(tal) ? null : tal
}

export function formatMængde(num) {
  if (num === null || num <= 0) return null
  const hel = Math.floor(num)
  const rest = num - hel
  // Find nærmeste brøk inden for ±0.09
  let bedsteBrøk = null, bedsteAfstand = 0.09
  for (const [tegn, val] of BRØK_INV) {
    const afstand = Math.abs(rest - val)
    if (afstand < bedsteAfstand) { bedsteAfstand = afstand; bedsteBrøk = tegn }
  }
  if (bedsteBrøk) return hel > 0 ? `${hel}${bedsteBrøk}` : bedsteBrøk
  // Afrund fornuftigt efter størrelse
  if (num >= 200) return String(Math.round(num / 5) * 5)
  if (num >= 50)  return String(Math.round(num))
  if (num >= 10)  return String(Math.round(num * 2) / 2)  // 0,5-skridt
  if (num >= 1)   return String(Math.round(num * 4) / 4 % 1 === 0
                    ? Math.round(num * 4) / 4
                    : parseFloat((Math.round(num * 4) / 4).toFixed(2)))
  return String(parseFloat(num.toFixed(2)))
}

export function skalér(mængde, faktor) {
  if (faktor === 1 || !mængde) return mængde
  const tal = parseMængde(mængde)
  if (tal === null) return mængde   // tekst som "lidt" / "efter smag" — uændret
  return formatMængde(tal * faktor) ?? mængde
}
