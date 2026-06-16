// Tag-system — bruges på brugerprofil og til filtrering i Mad-match.

export const TAG_KATEGORIER = [
  { id: 'kost',    label: 'Kostvaner' },
  { id: 'tid',     label: 'Tid i køkkenet' },
  { id: 'mål',     label: 'Mine mål' },
  { id: 'køkken',  label: 'Foretrukne køkkener' },
  { id: 'allergi', label: 'Allergi & intolerance' },
]

export const ALLE_TAGS = [
  // Kost
  { id: 'vegetar',       label: 'Vegetar',          emoji: '🥦', kategori: 'kost' },
  { id: 'veganer',       label: 'Veganer',           emoji: '🌱', kategori: 'kost' },
  { id: 'kød',           label: 'Kød',               emoji: '🥩', kategori: 'kost' },
  { id: 'fisk',          label: 'Fisk & skaldyr',    emoji: '🐟', kategori: 'kost' },
  { id: 'mere-grønt',    label: 'Mere grønt',        emoji: '🥗', kategori: 'kost' },
  { id: 'bælgfrugter',   label: 'Bælgfrugter',       emoji: '🫘', kategori: 'kost' },
  { id: 'low-carb',      label: 'Low carb',          emoji: '🥑', kategori: 'kost' },
  // Tid
  { id: 'hurtig',        label: 'Under 30 min',      emoji: '⚡',  kategori: 'tid' },
  { id: 'medium-tid',    label: '30–60 min',          emoji: '⏱️', kategori: 'tid' },
  { id: 'weekend',       label: 'Weekendprojekt',    emoji: '🏠',  kategori: 'tid' },
  // Mål
  { id: 'spise-sundere', label: 'Spise sundere',     emoji: '💪',  kategori: 'mål' },
  { id: 'spare-penge',   label: 'Spare penge',       emoji: '💰',  kategori: 'mål' },
  { id: 'lær-nyt',       label: 'Lær nye retter',    emoji: '📚',  kategori: 'mål' },
  { id: 'spild-mindre',  label: 'Spilde mindre',     emoji: '♻️',  kategori: 'mål' },
  { id: 'madplan',       label: 'Ugentlig madplan',  emoji: '📅',  kategori: 'mål' },
  // Køkken
  { id: 'italiensk',     label: 'Italiensk',         emoji: '🍝',  kategori: 'køkken' },
  { id: 'asiatisk',      label: 'Asiatisk',          emoji: '🥢',  kategori: 'køkken' },
  { id: 'mexicansk',     label: 'Mexicansk',         emoji: '🌮',  kategori: 'køkken' },
  { id: 'dansk',         label: 'Dansk',             emoji: '🇩🇰', kategori: 'køkken' },
  { id: 'indisk',        label: 'Indisk',            emoji: '🍛',  kategori: 'køkken' },
  { id: 'mellemøstlig',  label: 'Mellemøstlig',      emoji: '🧆',  kategori: 'køkken' },
  // Allergi
  { id: 'laktosefri',    label: 'Laktosefri',        emoji: '🥛',  kategori: 'allergi' },
  { id: 'glutenfri',     label: 'Glutenfri',         emoji: '🌾',  kategori: 'allergi' },
  { id: 'nøddefri',      label: 'Nøddefri',          emoji: '🥜',  kategori: 'allergi' },
]

export function hentTag(id) {
  return ALLE_TAGS.find((t) => t.id === id)
}

// Onboarding-trin: hvert svar giver 0-N tag-ids
export const ONBOARDING_TRIN = [
  {
    id: 'kost',
    spørgsmål: 'Hvad beskriver dine kostvaner bedst?',
    ikon: '🍽️',
    multi: false,
    svar: [
      { label: 'Jeg er vegetar',           tags: ['vegetar', 'mere-grønt'] },
      { label: 'Jeg er veganer',           tags: ['veganer', 'mere-grønt', 'bælgfrugter'] },
      { label: 'Jeg spiser alt',           tags: ['kød'] },
      { label: 'Jeg vil spise mere grønt', tags: ['mere-grønt'] },
      { label: 'Jeg reducerer kød',        tags: ['mere-grønt', 'bælgfrugter'] },
    ],
  },
  {
    id: 'præferencer',
    spørgsmål: 'Hvad vil du gerne spise mere af?',
    ikon: '🌟',
    multi: true,
    svar: [
      { label: '🥗 Grønt & salat',    tags: ['mere-grønt'] },
      { label: '🐟 Fisk & skaldyr',   tags: ['fisk'] },
      { label: '🫘 Bælgfrugter',      tags: ['bælgfrugter'] },
      { label: '🥢 Asiatisk mad',     tags: ['asiatisk'] },
      { label: '🌮 Mexicansk mad',    tags: ['mexicansk'] },
      { label: '🍝 Italiensk mad',    tags: ['italiensk'] },
    ],
  },
  {
    id: 'tid',
    spørgsmål: 'Hvor lang tid bruger du typisk på madlavning?',
    ikon: '⏱️',
    multi: false,
    svar: [
      { label: '⚡ Under 20 min — hurtigt og nemt', tags: ['hurtig'] },
      { label: '⏱️ 20–40 min — hverdagskok',        tags: ['medium-tid'] },
      { label: '🏠 Over 40 min — elsker at lave mad', tags: ['weekend'] },
      { label: '🔄 Det varierer',                    tags: [] },
    ],
  },
  {
    id: 'mål',
    spørgsmål: 'Hvad er dit mål med Simmer?',
    ikon: '🎯',
    multi: true,
    svar: [
      { label: '💪 Spise sundere',      tags: ['spise-sundere'] },
      { label: '💰 Spare penge',        tags: ['spare-penge'] },
      { label: '📚 Lære nye retter',    tags: ['lær-nyt'] },
      { label: '♻️ Spilde mindre mad',  tags: ['spild-mindre'] },
      { label: '📅 Lave ugentlig madplan', tags: ['madplan'] },
    ],
  },
  {
    id: 'allergi',
    spørgsmål: 'Har du nogen madallergi eller intolerance?',
    ikon: '🛡️',
    multi: true,
    svar: [
      { label: '🥛 Laktosefri',  tags: ['laktosefri'] },
      { label: '🌾 Glutenfri',   tags: ['glutenfri'] },
      { label: '🥜 Nøddefri',    tags: ['nøddefri'] },
      { label: '✅ Ingen — ingen begrænsninger', tags: [] },
    ],
  },
]
