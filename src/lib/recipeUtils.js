export const STORAGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/recipes`

export function billedeUrl(storageImage) {
  return storageImage ? `${STORAGE_BASE}/${storageImage}` : null
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

export function tidLabel(prepTime, cookTime) {
  return [prepTime, cookTime].filter(Boolean).join(' + ') || null
}

export function sværhedLabel(d) {
  return { let: 'Nem', mellem: 'Mellem', svær: 'Svær' }[d] ?? null
}

export function tidMinutter(prepTime, cookTime) {
  const parse = (s) => { const m = s?.match(/(\d+)/); return m ? parseInt(m[1]) : 0 }
  return parse(prepTime) + parse(cookTime)
}

export function shade(hex) {
  const n = parseInt(hex.slice(1), 16)
  const f = 0.82
  return `rgb(${Math.round(((n >> 16) & 255) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)})`
}

export function grad(c) {
  return `linear-gradient(135deg, ${c} 0%, ${shade(c)} 100%)`
}
