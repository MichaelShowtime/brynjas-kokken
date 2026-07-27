// Næringsindhold — parsning af ingredienser + Open Food Facts opslag med cache.

// ── Hardkodet tabel for hyppige basisingredienser ────────────────────────────
// Næringsindhold per 100g (kcal, protein, kulhydrat, fedt, fibre)
const BASIS = {
  smør:          { kcal: 717, p: 0.9,  k: 0.6,  f: 81.1, fi: 0 },
  margarine:     { kcal: 717, p: 0.9,  k: 0.6,  f: 81,   fi: 0 },
  olivenolie:    { kcal: 884, p: 0,    k: 0,     f: 100,  fi: 0 },
  olie:          { kcal: 884, p: 0,    k: 0,     f: 100,  fi: 0 },
  rapsolie:      { kcal: 884, p: 0,    k: 0,     f: 100,  fi: 0 },
  solsikkeolie:  { kcal: 884, p: 0,    k: 0,     f: 100,  fi: 0 },
  æg:            { kcal: 155, p: 13,   k: 1.1,   f: 11,   fi: 0 },
  mælk:          { kcal: 61,  p: 3.2,  k: 4.8,   f: 3.3,  fi: 0 },
  skummetmælk:   { kcal: 35,  p: 3.5,  k: 4.9,   f: 0.2,  fi: 0 },
  fløde:         { kcal: 337, p: 2.2,  k: 3.3,   f: 35,   fi: 0 },
  piskefløde:    { kcal: 337, p: 2.2,  k: 3.3,   f: 35,   fi: 0 },
  cremefraiche:  { kcal: 214, p: 2.7,  k: 3.8,   f: 21,   fi: 0 },
  yoghurt:       { kcal: 59,  p: 3.5,  k: 4.7,   f: 3.3,  fi: 0 },
  skyr:          { kcal: 65,  p: 11,   k: 4,     f: 0.2,  fi: 0 },
  ost:           { kcal: 402, p: 25,   k: 1.3,   f: 33,   fi: 0 },
  cheddar:       { kcal: 402, p: 25,   k: 1.3,   f: 33,   fi: 0 },
  parmesan:      { kcal: 431, p: 38,   k: 3.2,   f: 29,   fi: 0 },
  mozzarella:    { kcal: 280, p: 28,   k: 3.1,   f: 17,   fi: 0 },
  ricotta:       { kcal: 174, p: 11,   k: 3,     f: 13,   fi: 0 },
  hvedemel:      { kcal: 364, p: 10.3, k: 76.3,  f: 1.2,  fi: 2.7 },
  mel:           { kcal: 364, p: 10.3, k: 76.3,  f: 1.2,  fi: 2.7 },
  rugmel:        { kcal: 335, p: 9.4,  k: 65,    f: 1.7,  fi: 13 },
  havregryn:     { kcal: 389, p: 17,   k: 66,    f: 7,    fi: 10.6 },
  sukker:        { kcal: 387, p: 0,    k: 100,   f: 0,    fi: 0 },
  rørsukker:     { kcal: 387, p: 0,    k: 100,   f: 0,    fi: 0 },
  flormelis:     { kcal: 387, p: 0,    k: 99,    f: 0,    fi: 0 },
  honning:       { kcal: 304, p: 0.3,  k: 82,    f: 0,    fi: 0.2 },
  sirup:         { kcal: 282, p: 0,    k: 77,    f: 0,    fi: 0 },
  ris:           { kcal: 361, p: 7,    k: 79,    f: 0.7,  fi: 1.3 },
  pasta:         { kcal: 371, p: 13,   k: 74,    f: 1.5,  fi: 3 },
  spaghetti:     { kcal: 371, p: 13,   k: 74,    f: 1.5,  fi: 3 },
  kartoffel:     { kcal: 77,  p: 2,    k: 17,    f: 0.1,  fi: 2.2 },
  søde:          { kcal: 86,  p: 1.6,  k: 20,    f: 0.1,  fi: 3 },
  gulerod:       { kcal: 41,  p: 0.9,  k: 10,    f: 0.2,  fi: 2.8 },
  løg:           { kcal: 40,  p: 1.1,  k: 9.3,   f: 0.1,  fi: 1.7 },
  hvidløg:       { kcal: 149, p: 6.4,  k: 33,    f: 0.5,  fi: 2.1 },
  tomat:         { kcal: 18,  p: 0.9,  k: 3.9,   f: 0.2,  fi: 1.2 },
  agurk:         { kcal: 15,  p: 0.7,  k: 3.6,   f: 0.1,  fi: 0.5 },
  spinat:        { kcal: 23,  p: 2.9,  k: 3.6,   f: 0.4,  fi: 2.2 },
  broccoli:      { kcal: 34,  p: 2.8,  k: 7,     f: 0.4,  fi: 2.6 },
  blomkål:       { kcal: 25,  p: 1.9,  k: 5,     f: 0.3,  fi: 2 },
  champignon:    { kcal: 22,  p: 3.1,  k: 3.3,   f: 0.3,  fi: 1 },
  peberfrugt:    { kcal: 31,  p: 1,    k: 6,     f: 0.3,  fi: 2.1 },
  aubergine:     { kcal: 25,  p: 1,    k: 6,     f: 0.2,  fi: 3 },
  zucchini:      { kcal: 17,  p: 1.2,  k: 3.1,   f: 0.3,  fi: 1 },
  kylling:       { kcal: 165, p: 31,   k: 0,     f: 3.6,  fi: 0 },
  kyllingefilet: { kcal: 165, p: 31,   k: 0,     f: 3.6,  fi: 0 },
  hakket:        { kcal: 250, p: 17,   k: 0,     f: 20,   fi: 0 },
  oksekød:       { kcal: 250, p: 26,   k: 0,     f: 17,   fi: 0 },
  svinekød:      { kcal: 242, p: 27,   k: 0,     f: 14,   fi: 0 },
  laks:          { kcal: 208, p: 20,   k: 0,     f: 14,   fi: 0 },
  torsk:         { kcal: 82,  p: 18,   k: 0,     f: 0.7,  fi: 0 },
  rejer:         { kcal: 99,  p: 21,   k: 0,     f: 1.1,  fi: 0 },
  linser:        { kcal: 353, p: 25,   k: 60,    f: 1,    fi: 11 },
  kikærter:      { kcal: 364, p: 19,   k: 61,    f: 6,    fi: 17 },
  bønner:        { kcal: 347, p: 21,   k: 63,    f: 1.2,  fi: 16 },
  tofu:          { kcal: 76,  p: 8,    k: 1.9,   f: 4.8,  fi: 0.3 },
  æble:          { kcal: 52,  p: 0.3,  k: 14,    f: 0.2,  fi: 2.4 },
  banan:         { kcal: 89,  p: 1.1,  k: 23,    f: 0.3,  fi: 2.6 },
  citron:        { kcal: 29,  p: 1.1,  k: 9,     f: 0.3,  fi: 2.8 },
  lime:          { kcal: 30,  p: 0.7,  k: 11,    f: 0.2,  fi: 2.8 },
  ketchup:       { kcal: 112, p: 1.6,  k: 26,    f: 0.2,  fi: 0.6 },
  sennep:        { kcal: 66,  p: 4.4,  k: 6,     f: 3.3,  fi: 3.3 },
  mayonnaise:    { kcal: 680, p: 1.4,  k: 3.5,   f: 74,   fi: 0 },
  sojasauce:     { kcal: 60,  p: 10,   k: 5.6,   f: 0.1,  fi: 0.8 },
  balsamico:     { kcal: 88,  p: 0.5,  k: 17,    f: 0,    fi: 0 },
  bouillon:      { kcal: 9,   p: 1,    k: 0.6,   f: 0.3,  fi: 0 },
  kokosmælk:     { kcal: 230, p: 2.3,  k: 6,     f: 24,   fi: 2.2 },
  tomatpuré:     { kcal: 82,  p: 4.3,  k: 17,    f: 0.5,  fi: 3.8 },
  dåsetomater:   { kcal: 24,  p: 1.2,  k: 5,     f: 0.2,  fi: 1.4 },
  feta:          { kcal: 264, p: 14,   k: 4,     f: 21,   fi: 0 },
  bacon:         { kcal: 541, p: 37,   k: 1.4,   f: 42,   fi: 0 },
  chorizo:       { kcal: 455, p: 24,   k: 2,     f: 38,   fi: 0 },
  pesto:         { kcal: 490, p: 5.5,  k: 8,     f: 49,   fi: 1.5 },
  brød:          { kcal: 265, p: 9,    k: 49,    f: 3.2,  fi: 2.7 },
  rugbrød:       { kcal: 199, p: 7.8,  k: 38,    f: 2.3,  fi: 7.2 },
  kakao:         { kcal: 229, p: 19,   k: 54,    f: 13,   fi: 33 },
  chokolade:     { kcal: 546, p: 5,    k: 60,    f: 31,   fi: 7 },
  vanilje:       { kcal: 288, p: 0.1,  k: 13,    f: 0.1,  fi: 0.1 },
  bagepulver:    { kcal: 53,  p: 0,    k: 28,    f: 0,    fi: 0 },
  gær:           { kcal: 41,  p: 4.7,  k: 6.8,   f: 0.8,  fi: 1.7 },
  salt:          { kcal: 0,   p: 0,    k: 0,     f: 0,    fi: 0 },
  peber:         { kcal: 251, p: 10,   k: 64,    f: 3.3,  fi: 25 },
  kanel:         { kcal: 247, p: 4,    k: 81,    f: 1.2,  fi: 53 },
  spidskommen:   { kcal: 375, p: 18,   k: 44,    f: 22,   fi: 11 },
  paprika:       { kcal: 282, p: 14,   k: 54,    f: 13,   fi: 35 },
  basilikum:     { kcal: 23,  p: 3.2,  k: 2.7,   f: 0.6,  fi: 1.6 },
  persille:      { kcal: 36,  p: 3,    k: 6.3,   f: 0.8,  fi: 3.3 },
  timian:        { kcal: 101, p: 5.6,  k: 24,    f: 1.7,  fi: 14 },
  rosmarin:      { kcal: 131, p: 3.3,  k: 21,    f: 5.9,  fi: 14 },
  vineddike:     { kcal: 20,  p: 0,    k: 0.6,   f: 0,    fi: 0 },
  vand:          { kcal: 0,   p: 0,    k: 0,     f: 0,    fi: 0 },
}

// ── Enhedsomregning → gram ────────────────────────────────────────────────────
const ENHED_GRAM = {
  g: 1, gr: 1, gram: 1, kg: 1000,
  ml: 1, dl: 100, l: 1000, cl: 10,
  spsk: 15, tsk: 5, kop: 240,
  // kontekstafhængige (overskrives ved densitet)
}

// Typisk gram per styk (stk/fed/skive osv.)
const STK_GRAM = {
  æg: 60, løg: 120, hvidløg: 5, fed: 5, tomat: 100,
  gulerod: 80, kartoffel: 150, citron: 100, lime: 60,
  æble: 130, banan: 100, agurk: 200, peberfrugt: 150,
  champignon: 25, broccoli: 200, blomkål: 500,
  skive: 25, bundt: 30, fed: 4,
}

// Densitet g/ml for volumenmålte ingredienser
const DENSITET = {
  olie: 0.91, olivenolie: 0.91, rapsolie: 0.91, solsikkeolie: 0.91,
  smør: 0.91, margarine: 0.91,
  mælk: 1.03, fløde: 1.02, piskefløde: 1.02, skummetmælk: 1.03,
  yoghurt: 1.03, skyr: 1.05, cremefraiche: 1.02,
  honning: 1.4, sirup: 1.3, ahornsirup: 1.3,
  kokosmælk: 1.02, bouillon: 1.0, sojasauce: 1.1,
  ketchup: 1.1, sennep: 1.1, tomatpuré: 1.1,
  pesto: 1.05, balsamico: 1.1,
  vand: 1.0,
}

// Regex-mønstre for brøker på dansk
const BRØK_MAP = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 }

function parseMængde(str) {
  if (!str) return null
  const s = str.trim()
  if (BRØK_MAP[s]) return BRØK_MAP[s]
  const blandet = s.match(/^(\d+)(½|¼|¾|⅓|⅔)$/)
  if (blandet) return parseInt(blandet[1]) + BRØK_MAP[blandet[2]]
  const tal = parseFloat(s.replace(',', '.'))
  return isNaN(tal) ? null : tal
}

// ── Parsning af ingrediens-tekst ──────────────────────────────────────────────
// fx "2 spsk olivenolie" → { navn: "olivenolie", gram: 30 }
// fx "400 g hakket oksekød" → { navn: "hakket oksekød", gram: 400 }
// fx "3 æg" → { navn: "æg", gram: 180 }
// Returnerer null ved ubestemte mængder ("efter smag", "en klat" osv.)

const ENHEDS_RE = new RegExp(
  `^(${Object.keys(BRØK_MAP).join('|')}|\\d+[.,]?\\d*(?:${Object.keys(BRØK_MAP).join('|')})?)` +
  `(?:\\s*(${Object.keys(ENHED_GRAM).join('|')}|\\.?))?` +
  `\\.?\\s+(.+)$`,
  'i'
)

export function parseIngrediens(tekst) {
  if (!tekst) return null
  const t = tekst.trim().toLowerCase()

  // Usikre mængder → skip
  const usikre = ['efter smag', 'en klat', 'lidt', 'en smule', 'evt.', 'valgfrit', 'drys', 'smag til', 'en nip', 'et nip']
  if (usikre.some(u => t.startsWith(u) || t.includes(' ' + u))) return null

  // Prøv at matche: [mængde] [enhed] [navn]
  const m = t.match(
    /^([½¼¾⅓⅔]|\d+[.,]?\d*(?:[½¼¾⅓⅔])?)\s*([a-zæøå]+\.?)?\s+(.+)$/
  )

  let mængde = null, enhed = null, navn = null

  if (m) {
    mængde = parseMængde(m[1])
    const enhedKand = m[2]?.replace('.', '').toLowerCase()
    if (enhedKand && ENHED_GRAM[enhedKand] !== undefined) {
      enhed = enhedKand
      navn = m[3].trim()
    } else {
      // Intet known enhed — m[2] er del af navn
      enhed = 'stk'
      navn = ((m[2] ?? '') + ' ' + (m[3] ?? '')).trim()
    }
  } else {
    // Ingen mængde — solo ingrediens, skip
    return null
  }

  if (mængde === null || mængde <= 0) return null

  // Omregn til gram
  let gram
  const navnNorm = normName(navn)

  if (enhed === 'stk' || enhed === 'fed' || enhed === 'skive' || enhed === 'bundt') {
    const stkGram = STK_GRAM[navnNorm] ?? STK_GRAM[navn.split(' ')[0]] ?? 50
    gram = mængde * stkGram
  } else if (ENHED_GRAM[enhed]) {
    const gramPrEnhed = ENHED_GRAM[enhed]
    const volumen = mængde * gramPrEnhed  // ml for volumenmål, g for vægt
    // Volumenmål → gang med densitet
    if (['ml', 'dl', 'l', 'cl', 'spsk', 'tsk', 'kop'].includes(enhed)) {
      const d = DENSITET[navnNorm] ?? DENSITET[navn.split(' ')[0]] ?? 1.0
      gram = volumen * d
    } else {
      gram = volumen
    }
  } else {
    gram = mængde * 50  // fallback
  }

  return { navn: navnNorm, gram: Math.max(1, gram) }
}

function normName(navn) {
  // Normaliser: fjern "hakket", "frisk", "kogt" osv. og tag første substantiv
  const stop = ['hakket', 'kogt', 'frisk', 'tørret', 'revet', 'skåret', 'hel', 'halv', 'stor', 'lille', 'medium', 'fin', 'groft', 'bagt', 'stegt', 'rå']
  const ord = navn.split(/\s+/)
  const første = ord.find(o => !stop.includes(o)) ?? ord[0]
  return første
}

// ── Open Food Facts opslag ────────────────────────────────────────────────────
// Kun kaldt som fallback — caches i localStorage

const LS_PREFIX = 'bn_nut_'
const LS_TTL    = 30 * 24 * 60 * 60 * 1000  // 30 dage

function cacheKey(navn) { return LS_PREFIX + navn }

function læsCache(navn) {
  try {
    const raw = localStorage.getItem(cacheKey(navn))
    if (!raw) return undefined
    const { ts, data } = JSON.parse(raw)
    if (Date.now() - ts > LS_TTL) { localStorage.removeItem(cacheKey(navn)); return undefined }
    return data  // null = "no data" cached intentionally
  } catch { return undefined }
}

function skrivcCache(navn, data) {
  try { localStorage.setItem(cacheKey(navn), JSON.stringify({ ts: Date.now(), data })) } catch {}
}

// Danskt-til-engelsk for bedre OFF-søgning
const DAN_ENG = {
  oksekød: 'beef', svinekød: 'pork', kylling: 'chicken', laks: 'salmon',
  torsk: 'cod', rejer: 'shrimp', smør: 'butter', mel: 'flour',
  mælk: 'milk', fløde: 'cream', ost: 'cheese', æg: 'egg',
  sukker: 'sugar', salt: 'salt', olie: 'oil', løg: 'onion',
  hvidløg: 'garlic', gulerod: 'carrot', kartoffel: 'potato',
  tomat: 'tomato', ris: 'rice', pasta: 'pasta', honning: 'honey',
  linser: 'lentils', kikærter: 'chickpeas', bønner: 'beans',
  broccoli: 'broccoli', spinat: 'spinach', agurk: 'cucumber',
  champignon: 'mushroom', æble: 'apple', banan: 'banana',
  chokolade: 'chocolate', kakao: 'cocoa',
}

async function hentFraOFF(navn) {
  const søgeTerm = DAN_ENG[navn] ?? navn
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(søgeTerm)}&search_simple=1&action=process&json=1&fields=product_name,nutriments&page_size=3&sort_by=popularity_key`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return null
    const json = await res.json()
    const produkt = (json.products ?? []).find(p => p.nutriments?.['energy-kcal_100g'] > 0)
    if (!produkt) return null
    const n = produkt.nutriments
    return {
      kcal: n['energy-kcal_100g'] ?? 0,
      p:    n['proteins_100g']    ?? 0,
      k:    n['carbohydrates_100g'] ?? 0,
      f:    n['fat_100g']         ?? 0,
      fi:   n['fiber_100g']       ?? 0,
    }
  } catch { return null }
}

async function hentNæring(navn) {
  // 1. Hardkodet tabel
  if (BASIS[navn]) return BASIS[navn]
  // 2. Delvis match i tabellen (fx "piskefløde" → "fløde")
  const delvis = Object.keys(BASIS).find(k => navn.includes(k) || k.includes(navn))
  if (delvis) return BASIS[delvis]
  // 3. Cache
  const cached = læsCache(navn)
  if (cached !== undefined) return cached
  // 4. Open Food Facts
  const offData = await hentFraOFF(navn)
  skrivcCache(navn, offData)
  return offData
}

// ── Hoved-funktion ────────────────────────────────────────────────────────────

export async function beregnNæringsindhold(ingredienser, portioner) {
  if (!ingredienser?.length || !portioner) return null

  const opslag = await Promise.allSettled(
    ingredienser.map(async (i) => {
      const parsed = parseIngrediens(`${i.amount ?? ''} ${i.unit ?? ''} ${i.name ?? ''}`.trim())
      if (!parsed) return null
      const næring = await hentNæring(parsed.navn)
      if (!næring) return null
      return { gram: parsed.gram, næring }
    })
  )

  let tot = { kcal: 0, p: 0, k: 0, f: 0, fi: 0 }
  let tolkede = 0

  for (const r of opslag) {
    if (r.status !== 'fulfilled' || !r.value) continue
    const { gram, næring } = r.value
    tot.kcal += (næring.kcal / 100) * gram
    tot.p    += (næring.p   / 100) * gram
    tot.k    += (næring.k   / 100) * gram
    tot.f    += (næring.f   / 100) * gram
    tot.fi   += (næring.fi  / 100) * gram
    tolkede++
  }

  if (tolkede === 0) return null

  return {
    kalorier:  Math.round(tot.kcal / portioner),
    protein:   Math.round(tot.p  / portioner * 10) / 10,
    kulhydrat: Math.round(tot.k  / portioner * 10) / 10,
    fedt:      Math.round(tot.f  / portioner * 10) / 10,
    fibre:     Math.round(tot.fi / portioner * 10) / 10,
    komplethed: tolkede / ingredienser.length,
  }
}
