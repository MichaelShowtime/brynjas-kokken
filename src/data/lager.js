// Lager-data med localStorage-persistens.
// Hvert element: { id, navn, mængde, enhed, kategori, emoji, udløb|null, snartTom }

const KEY = 'simmer_lager'

export function hentLager() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function gemLager(liste) {
  try { localStorage.setItem(KEY, JSON.stringify(liste)) } catch {}
}

export function tilføjTilLager(vare) {
  const liste = hentLager()
  const ny = [{ ...vare, id: Date.now() }, ...liste]
  gemLager(ny)
  return ny
}

export function opdaterUdløb(id, udløb) {
  const liste = hentLager().map((v) => v.id === id ? { ...v, udløb } : v)
  gemLager(liste)
  return liste
}

export function sletFraLager(id) {
  const liste = hentLager().filter((v) => v.id !== id)
  gemLager(liste)
  return liste
}

export function opdaterVare(id, opdatering) {
  const liste = hentLager().map((v) => v.id === id ? { ...v, ...opdatering } : v)
  gemLager(liste)
  return liste
}

// ── Auto-lager indstilling ────────────────────────────────────────────────────
const AUTO_KEY = 'simmer_auto_lager'

export function hentAutoLager() {
  try { return JSON.parse(localStorage.getItem(AUTO_KEY)) ?? false } catch { return false }
}

export function gemAutoLager(v) {
  try { localStorage.setItem(AUTO_KEY, JSON.stringify(v)) } catch {}
}

// ── Match og fjern ingredienser ───────────────────────────────────────────────

export function matchIngredienserMedLager(opskriftIngredienser) {
  const lager = hentLager()
  const set = new Set()
  const matches = []
  for (const ing of opskriftIngredienser) {
    const søg = (ing.name ?? '').toLowerCase().trim()
    if (!søg) continue
    const match = lager.find((v) => {
      const n = v.navn.toLowerCase().trim()
      return n === søg || n.includes(søg) || søg.includes(n)
    })
    if (match && !set.has(match.id)) {
      set.add(match.id)
      matches.push({ lagerItem: match, opskriftIng: ing })
    }
  }
  return matches
}

export function fjernFraLagerVedIds(ids) {
  const idSet = new Set(ids.map(String))
  const liste = hentLager().filter((v) => !idSet.has(String(v.id)))
  gemLager(liste)
  return liste
}

// ── Kategorier ────────────────────────────────────────────────────────────────
export const KATEGORIER = [
  { id: 'køl',      label: 'Køl',                emoji: '❄️' },
  { id: 'grønt',    label: 'Grønt & Frugt',       emoji: '🥦' },
  { id: 'tørvarer', label: 'Tørvarer & Konserves', emoji: '🥫' },
  { id: 'frys',     label: 'Frys',                emoji: '🧊' },
  { id: 'krydderier', label: 'Krydderier',         emoji: '🧂' },
]

// ── Ingrediens-katalog (søgbar) ───────────────────────────────────────────────
export const INGREDIENS_KATALOG = [
  // Køl
  { navn: 'Kyllingebryst',    kategori: 'køl',       emoji: '🍗', standardEnhed: 'g' },
  { navn: 'Kyllingelår',      kategori: 'køl',       emoji: '🍗', standardEnhed: 'stk' },
  { navn: 'Hakket oksekød',   kategori: 'køl',       emoji: '🥩', standardEnhed: 'g' },
  { navn: 'Laks',             kategori: 'køl',       emoji: '🐟', standardEnhed: 'g' },
  { navn: 'Rejer',            kategori: 'køl',       emoji: '🦐', standardEnhed: 'g' },
  { navn: 'Bacon',            kategori: 'køl',       emoji: '🥓', standardEnhed: 'g' },
  { navn: 'Pølser',           kategori: 'køl',       emoji: '🌭', standardEnhed: 'stk' },
  { navn: 'Mælk',             kategori: 'køl',       emoji: '🥛', standardEnhed: 'l' },
  { navn: 'Madlavningsfløde', kategori: 'køl',       emoji: '🥛', standardEnhed: 'dl' },
  { navn: 'Smør',             kategori: 'køl',       emoji: '🧈', standardEnhed: 'g' },
  { navn: 'Æg',               kategori: 'køl',       emoji: '🥚', standardEnhed: 'stk' },
  { navn: 'Mozzarella',       kategori: 'køl',       emoji: '🧀', standardEnhed: 'g' },
  { navn: 'Feta',             kategori: 'køl',       emoji: '🧀', standardEnhed: 'g' },
  { navn: 'Parmesan',         kategori: 'køl',       emoji: '🧀', standardEnhed: 'g' },
  { navn: 'Cheddar',          kategori: 'køl',       emoji: '🧀', standardEnhed: 'g' },
  { navn: 'Spinat',           kategori: 'køl',       emoji: '🥬', standardEnhed: 'pose' },
  { navn: 'Tofu',             kategori: 'køl',       emoji: '🫙', standardEnhed: 'g' },
  { navn: 'Grøn yoghurt',     kategori: 'køl',       emoji: '🥛', standardEnhed: 'dl' },
  // Grønt & Frugt
  { navn: 'Løg',              kategori: 'grønt',     emoji: '🧅', standardEnhed: 'stk' },
  { navn: 'Rødløg',           kategori: 'grønt',     emoji: '🧅', standardEnhed: 'stk' },
  { navn: 'Hvidløg',          kategori: 'grønt',     emoji: '🧄', standardEnhed: 'fed' },
  { navn: 'Tomater',          kategori: 'grønt',     emoji: '🍅', standardEnhed: 'stk' },
  { navn: 'Cherrytomater',    kategori: 'grønt',     emoji: '🍅', standardEnhed: 'g' },
  { navn: 'Peberfrugt',       kategori: 'grønt',     emoji: '🫑', standardEnhed: 'stk' },
  { navn: 'Agurk',            kategori: 'grønt',     emoji: '🥒', standardEnhed: 'stk' },
  { navn: 'Gulerod',          kategori: 'grønt',     emoji: '🥕', standardEnhed: 'stk' },
  { navn: 'Kartofler',        kategori: 'grønt',     emoji: '🥔', standardEnhed: 'kg' },
  { navn: 'Søde kartofler',   kategori: 'grønt',     emoji: '🍠', standardEnhed: 'stk' },
  { navn: 'Broccoli',         kategori: 'grønt',     emoji: '🥦', standardEnhed: 'stk' },
  { navn: 'Blomkål',          kategori: 'grønt',     emoji: '🥦', standardEnhed: 'stk' },
  { navn: 'Avocado',          kategori: 'grønt',     emoji: '🥑', standardEnhed: 'stk' },
  { navn: 'Citron',           kategori: 'grønt',     emoji: '🍋', standardEnhed: 'stk' },
  { navn: 'Lime',             kategori: 'grønt',     emoji: '🍋', standardEnhed: 'stk' },
  { navn: 'Appelsin',         kategori: 'grønt',     emoji: '🍊', standardEnhed: 'stk' },
  { navn: 'Æble',             kategori: 'grønt',     emoji: '🍎', standardEnhed: 'stk' },
  { navn: 'Banan',            kategori: 'grønt',     emoji: '🍌', standardEnhed: 'stk' },
  { navn: 'Champignon',       kategori: 'grønt',     emoji: '🍄', standardEnhed: 'g' },
  { navn: 'Ingefær',          kategori: 'grønt',     emoji: '🫚', standardEnhed: 'stk' },
  { navn: 'Squash',           kategori: 'grønt',     emoji: '🥒', standardEnhed: 'stk' },
  { navn: 'Porrer',           kategori: 'grønt',     emoji: '🧅', standardEnhed: 'stk' },
  { navn: 'Selleri',          kategori: 'grønt',     emoji: '🥬', standardEnhed: 'stk' },
  { navn: 'Koriander',        kategori: 'grønt',     emoji: '🌿', standardEnhed: 'potte' },
  { navn: 'Basilikum',        kategori: 'grønt',     emoji: '🌿', standardEnhed: 'potte' },
  { navn: 'Persille',         kategori: 'grønt',     emoji: '🌿', standardEnhed: 'potte' },
  // Tørvarer
  { navn: 'Pasta',            kategori: 'tørvarer',  emoji: '🍝', standardEnhed: 'g' },
  { navn: 'Spaghetti',        kategori: 'tørvarer',  emoji: '🍝', standardEnhed: 'g' },
  { navn: 'Ris',              kategori: 'tørvarer',  emoji: '🍚', standardEnhed: 'g' },
  { navn: 'Couscous',         kategori: 'tørvarer',  emoji: '🌾', standardEnhed: 'g' },
  { navn: 'Røde linser',      kategori: 'tørvarer',  emoji: '🌾', standardEnhed: 'dl' },
  { navn: 'Kikærter',         kategori: 'tørvarer',  emoji: '🫘', standardEnhed: 'dåse' },
  { navn: 'Sorte bønner',     kategori: 'tørvarer',  emoji: '🫘', standardEnhed: 'dåse' },
  { navn: 'Hakkede tomater',  kategori: 'tørvarer',  emoji: '🍅', standardEnhed: 'dåser' },
  { navn: 'Kokosmælk',        kategori: 'tørvarer',  emoji: '🥥', standardEnhed: 'dåse' },
  { navn: 'Mel',              kategori: 'tørvarer',  emoji: '🌾', standardEnhed: 'g' },
  { navn: 'Havregryn',        kategori: 'tørvarer',  emoji: '🌾', standardEnhed: 'g' },
  { navn: 'Brød',             kategori: 'tørvarer',  emoji: '🍞', standardEnhed: 'stk' },
  { navn: 'Olivenolie',       kategori: 'tørvarer',  emoji: '🫙', standardEnhed: 'dl' },
  { navn: 'Rapsolie',         kategori: 'tørvarer',  emoji: '🫙', standardEnhed: 'dl' },
  { navn: 'Sojasauce',        kategori: 'tørvarer',  emoji: '🫙', standardEnhed: 'spsk' },
  { navn: 'Tomatpuré',        kategori: 'tørvarer',  emoji: '🍅', standardEnhed: 'spsk' },
  { navn: 'Sukker',           kategori: 'tørvarer',  emoji: '🍬', standardEnhed: 'g' },
  // Frys
  { navn: 'Frosne ærter',     kategori: 'frys',      emoji: '🟢', standardEnhed: 'g' },
  { navn: 'Frosne spinat',    kategori: 'frys',      emoji: '🥬', standardEnhed: 'g' },
  { navn: 'Frosne rejer',     kategori: 'frys',      emoji: '🦐', standardEnhed: 'g' },
  { navn: 'Frossent kylling', kategori: 'frys',      emoji: '🍗', standardEnhed: 'g' },
  // Krydderier
  { navn: 'Salt',             kategori: 'krydderier', emoji: '🧂', standardEnhed: 'g' },
  { navn: 'Sort peber',       kategori: 'krydderier', emoji: '🌶️', standardEnhed: 'g' },
  { navn: 'Spidskommen',      kategori: 'krydderier', emoji: '🌶️', standardEnhed: 'tsk' },
  { navn: 'Paprika',          kategori: 'krydderier', emoji: '🌶️', standardEnhed: 'tsk' },
  { navn: 'Gurkemeje',        kategori: 'krydderier', emoji: '🌶️', standardEnhed: 'tsk' },
  { navn: 'Karry',            kategori: 'krydderier', emoji: '🌶️', standardEnhed: 'tsk' },
  { navn: 'Kanel',            kategori: 'krydderier', emoji: '🪵',  standardEnhed: 'tsk' },
  { navn: 'Chiliflager',      kategori: 'krydderier', emoji: '🌶️', standardEnhed: 'tsk' },
]

export const ENHEDER = ['g', 'kg', 'stk', 'dl', 'l', 'ml', 'spsk', 'tsk', 'fed', 'knold', 'pose', 'potte', 'dåse', 'dåser', 'rest']

// ── Mængde-sammenligning ──────────────────────────────────────────────────────

function _tilBase(mængde, enhed) {
  // Udtræk første tal fra streng (håndterer "~1", "ca. 2", osv.)
  const m = String(mængde ?? '').replace(',', '.').match(/[\d.]+/)
  if (!m) return null
  const tal = parseFloat(m[0])
  if (isNaN(tal) || tal <= 0) return null
  const e = (enhed ?? '').toLowerCase().trim()
  // Vægt → gram
  if (e === 'g')     return { val: tal,        type: 'weight' }
  if (e === 'kg')    return { val: tal * 1000,  type: 'weight' }
  // Volumen → ml
  if (e === 'ml')    return { val: tal,         type: 'volume' }
  if (e === 'cl')    return { val: tal * 10,    type: 'volume' }
  if (e === 'dl')    return { val: tal * 100,   type: 'volume' }
  if (e === 'l')     return { val: tal * 1000,  type: 'volume' }
  if (e === 'tsk')   return { val: tal * 5,     type: 'volume' }
  if (e === 'spsk')  return { val: tal * 15,    type: 'volume' }
  // Antal
  if (['stk', 'fed', 'knold', 'dåse', 'dåser', 'pose', 'potte', 'stykker'].includes(e))
    return { val: tal, type: 'count' }
  return null
}

// Reducer et ingrediensnavn til dets kerne-vare ved at fjerne kontekst og adjektiver.
// "Koldt smør i små tern" → "smør", "Hakket løg" → "løg", "Smør - smeltet" → "smør"
export function kanoniselér(navn) {
  let n = (navn ?? '').toLowerCase().trim()
  // Strip parentetisk kontekst: "(kødsauce)"
  n = n.replace(/\s*\(.*?\)\s*/g, '').trim()
  // Strip efter komma eller dash: ", smeltet" / " - til stegning"
  n = n.replace(/\s*[,]\s*.*$/, '').replace(/\s+-\s+.*$/, '').trim()
  // Strip fælles adjektiv-præfikser
  n = n.replace(/^(koldt?|blødt?|smeltet|frisk[et]?|tørt?|hakket|revet|kogt[et]?|rå[t]?|frossen?|tynd[et]?|groft?)\s+/i, '').trim()
  // Strip præpositionsled til sidst: " til X", " i X", " med X", " uden X", " af X"
  n = n.replace(/\s+(til|i|med|uden|af|på)\s+\S.*$/, '').trim()
  return n
}

// ── Sammensatte ord — undtagelser ────────────────────────────────────────────
// Disse sammensatte ingredienser må IKKE matche deres delord i lageret.
// "hvidløgssmør" ≠ "smør", "forårsløg" ≠ "løg" osv.
const UNDTAGELSER = new Map(
  [
    ['hvidløgssmør',  ['smør']],
    ['jordnøddesmør', ['smør']],
    ['mandelsmør',    ['smør']],
    ['forårsløg',     ['løg']],
    ['purløg',        ['løg']],
    ['perleløg',      ['løg']],
    ['hvedemel',      ['mel']],
    ['rugmel',        ['mel']],
    ['mandelmel',     ['mel']],
    ['majsmel',       ['mel']],
    ['olivenolie',    ['olie']],
    ['rapsolie',      ['olie']],
    ['sesamolie',     ['olie']],
    ['kokosolie',     ['olie']],
    ['kokosmælk',     ['mælk']],
    ['kærnemælk',     ['mælk']],
    ['mandelmælk',    ['mælk']],
    ['havremælk',     ['mælk']],
    ['hytteost',      ['ost']],
    ['flødeost',      ['ost']],
    ['mascarpone',    ['ost']],
    ['peanutbutter',  ['smør']],
  ].map(([k, v]) => [k, new Set(v)])
)

// ── Synonymer — varer der matcher på tværs ────────────────────────────────────
// Ingredienser i samme gruppe kan dække hinanden i lageret.
const SYNONYMER = [
  ['creme fraiche', 'creme fraiche 18%', 'creme fraiche 38%'],
  ['basilikum', 'frisk basilikum', 'tørret basilikum'],
  ['hakket oksekød', 'oksefars', 'oksekød hakket'],
  ['piskefløde', 'fløde', 'madlavningsfløde', 'sødmælksfløde'],
  ['parmesan', 'parmesanost', 'revet parmesan'],
  ['mozzarella', 'frisk mozzarella', 'buffelmozzarella'],
  ['kyllingebryst', 'kyllingefilet', 'kylling filet'],
]

// Byg opslag: kanonisk navn → gruppeindeks
const SYNONYM_OPSLAG = new Map()
for (let i = 0; i < SYNONYMER.length; i++) {
  for (const n of SYNONYMER[i]) {
    SYNONYM_OPSLAG.set(n.toLowerCase(), i)
    SYNONYM_OPSLAG.set(kanoniselér(n), i)
  }
}

// Find lager-vare via synonym-gruppe
function findSynonym(lager, ingNavn) {
  const søg = ingNavn.toLowerCase().trim()
  const idx = SYNONYM_OPSLAG.get(søg) ?? SYNONYM_OPSLAG.get(kanoniselér(søg))
  if (idx === undefined) return undefined
  const gruppe = new Set(SYNONYMER[idx].map(n => n.toLowerCase()))
  return lager.find(v => gruppe.has(v.navn.toLowerCase()))
}

// ── Ordgrænse-matching med undtagelser ────────────────────────────────────────
// "smør" matcher "koldt smør i små tern" ✓ men IKKE "hvidløgssmør" ✗
function matcherKerne(lagerNavn, ingrediensNavn) {
  const kanonLager = kanoniselér(lagerNavn)
  const kanonIng   = kanoniselér(ingrediensNavn)

  // Tjek undtagelsesliste — sammensatte ord blokeres eksplicit
  if (UNDTAGELSER.get(kanonIng)?.has(kanonLager)) return false

  const escaped = kanonLager.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (!escaped) return false
  return new RegExp(`\\b${escaped}\\b`, 'i').test(kanonIng)
}

// Byg et opslags-objekt fra lager-array (kald én gang, brug mange gange)
export function byggLagerOpslag(lager) {
  const map = new Map(lager.map((v) => [v.navn.toLowerCase(), v]))
  return {
    harNok(ingNavn, ingMængde, ingEnhed) {
      const navn = (ingNavn ?? '').toLowerCase()
      // 1) Eksakt match
      // 2) Strip parentes: "Smør (kødsauce)" → "smør"
      // 3) Synonym-gruppe: "piskefløde" → matcher "fløde" i lageret
      // 4) Ordgrænse + undtagelser: "koldt smør" → "smør" ✓, "hvidløgssmør" ✗
      const vare = map.get(navn)
        ?? map.get(navn.replace(/\s*\(.*?\)\s*$/, '').trim())
        ?? findSynonym(lager, ingNavn)
        ?? lager.find(v => matcherKerne(v.navn, ingNavn))
      if (!vare) return { fundet: false, nok: false }

      // Ingen mængde registreret i lageret → vi antager der er nok
      if (!vare.mængde || !String(vare.mængde).trim()) return { fundet: true, nok: true }

      const lagerBase = _tilBase(vare.mængde, vare.enhed)
      const behovBase = _tilBase(ingMængde, ingEnhed)

      // Kan ikke sammenligne (inkompatible enheder el. ukendt format) → antag nok
      if (!lagerBase || !behovBase || lagerBase.type !== behovBase.type)
        return { fundet: true, nok: true }

      return { fundet: true, nok: lagerBase.val >= behovBase.val }
    },
  }
}
