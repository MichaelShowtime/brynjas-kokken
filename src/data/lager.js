// Lager-data med localStorage-persistens.
// Hvert element: { id, navn, mængde, enhed, kategori, emoji, udløb|null, snartTom }

const KEY = 'simmer_lager'

// Startdata — bruges kun første gang (ingen localStorage-data endnu)
const STANDARD_LAGER = [
  { id: 1,  navn: 'Kyllingebryst',      mængde: '600',  enhed: 'g',     kategori: 'køl',       emoji: '🍗', udløb: dagFra(1),  snartTom: false },
  { id: 2,  navn: 'Madlavningsfløde',   mængde: '2½',   enhed: 'dl',    kategori: 'køl',       emoji: '🥛', udløb: dagFra(3),  snartTom: false },
  { id: 3,  navn: 'Spinat',             mængde: '1',    enhed: 'pose',  kategori: 'køl',       emoji: '🥬', udløb: dagFra(2),  snartTom: false },
  { id: 4,  navn: 'Æg',                 mængde: '8',    enhed: 'stk',   kategori: 'køl',       emoji: '🥚', udløb: null,       snartTom: false },
  { id: 5,  navn: 'Feta',               mængde: '',     enhed: 'rest',  kategori: 'køl',       emoji: '🧀', udløb: null,       snartTom: true  },
  { id: 6,  navn: 'Løg',                mængde: '4',    enhed: 'stk',   kategori: 'grønt',     emoji: '🧅', udløb: null,       snartTom: false },
  { id: 7,  navn: 'Hvidløg',            mængde: '1',    enhed: 'knold', kategori: 'grønt',     emoji: '🧄', udløb: null,       snartTom: false },
  { id: 8,  navn: 'Peberfrugt',         mængde: '2',    enhed: 'stk',   kategori: 'grønt',     emoji: '🫑', udløb: null,       snartTom: false },
  { id: 9,  navn: 'Kartofler',          mængde: '~1',   enhed: 'kg',    kategori: 'grønt',     emoji: '🥔', udløb: null,       snartTom: false },
  { id: 10, navn: 'Avocado',            mængde: '',     enhed: 'lav',   kategori: 'grønt',     emoji: '🥑', udløb: null,       snartTom: true  },
  { id: 11, navn: 'Pasta',              mængde: '400',  enhed: 'g',     kategori: 'tørvarer',  emoji: '🍝', udløb: null,       snartTom: false },
  { id: 12, navn: 'Røde linser',        mængde: '3',    enhed: 'dl',    kategori: 'tørvarer',  emoji: '🌾', udløb: null,       snartTom: false },
  { id: 13, navn: 'Ris',                mængde: '',     enhed: 'næsten tom', kategori: 'tørvarer', emoji: '🍚', udløb: null,  snartTom: true  },
  { id: 14, navn: 'Hakkede tomater',    mængde: '4',    enhed: 'dåser', kategori: 'tørvarer',  emoji: '🍅', udløb: null,       snartTom: false },
  { id: 15, navn: 'Sorte bønner',       mængde: '2',    enhed: 'dåser', kategori: 'tørvarer',  emoji: '🫘', udløb: null,       snartTom: false },
]

function dagFra(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export function hentLager() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return STANDARD_LAGER
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
