export const STORAGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/recipes`

export function billedeUrl(storageImage) {
  if (!storageImage) return null
  if (storageImage.startsWith('http')) return storageImage
  return `${STORAGE_BASE}/${storageImage}`
}

const TAG_FARVE = {
  vegetar: '#2F6B4F', veganer: '#4A8C5C', kød: '#C25B4A',
  fisk: '#4A7C9E', pasta: '#E08A5B', suppe: '#7B5E7B',
  bagning: '#B5763D', dessert: '#C97B4B', kage: '#C97B4B',
}

export function opskriftFarve(tags = []) {
  for (const t of tags) if (TAG_FARVE[t]) return TAG_FARVE[t]
  return '#2F6B4F'
}

function parseMin(str) {
  if (!str) return 0
  let min = 0
  const t = str.match(/(\d+)\s*tim/)
  if (t) min += parseInt(t[1]) * 60
  const m = str.match(/(\d+)\s*min/)
  if (m) min += parseInt(m[1])
  if (min === 0) { const f = str.match(/(\d+)/); if (f) min = parseInt(f[1]) }
  return min
}

export function tidMinutter(prepTime, cookTime) {
  return parseMin(prepTime) + parseMin(cookTime)
}

export function tidLabel(prepTime, cookTime) {
  const total = tidMinutter(prepTime, cookTime)
  if (total <= 0) return [prepTime, cookTime].filter(Boolean)[0] ?? null
  if (total < 60) return `${total} min`
  const t = Math.floor(total / 60)
  const m = total % 60
  return m > 0 ? `${t} t ${m} min` : `${t} t`
}

export function sværhedLabel(d) {
  return { let: 'Nem', mellem: 'Mellem', svær: 'Svær' }[d] ?? null
}

export function shade(hex) {
  const n = parseInt(hex.slice(1), 16)
  const f = 0.82
  return `rgb(${Math.round(((n >> 16) & 255) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)})`
}

export function grad(c) {
  return `linear-gradient(135deg, ${c} 0%, ${shade(c)} 100%)`
}
