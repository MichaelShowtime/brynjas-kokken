import { databases, DB_ID, COL, Query, ID } from '../lib/appwrite'

// ── Badge-definitioner ────────────────────────────────────────────────────────

export const ALLE_BADGES = [
  { id: 'cook_1',      emoji: '🍳', titel: 'Første ret',        beskrivelse: 'Lavede din første ret',         kategori: 'mad' },
  { id: 'cook_5',      emoji: '👨‍🍳', titel: 'Lærling',           beskrivelse: 'Lavet 5 retter',                kategori: 'mad' },
  { id: 'cook_10',     emoji: '🧑‍🍳', titel: 'Køkkengast',        beskrivelse: 'Lavet 10 retter',               kategori: 'mad' },
  { id: 'cook_25',     emoji: '👩‍🍳', titel: 'Erfaren kok',       beskrivelse: 'Lavet 25 retter',               kategori: 'mad' },
  { id: 'cook_50',     emoji: '🎖️', titel: 'Sous chef',          beskrivelse: 'Lavet 50 retter',               kategori: 'mad' },
  { id: 'cook_100',    emoji: '🏆', titel: 'Mesterkok',          beskrivelse: 'Lavet 100 retter',              kategori: 'mad' },
  { id: 'streak_3',    emoji: '🔥', titel: 'Varm hånd',          beskrivelse: '3 dages streak',                kategori: 'streak' },
  { id: 'streak_7',    emoji: '🌶️', titel: 'Ugens kok',          beskrivelse: '7 dages streak',                kategori: 'streak' },
  { id: 'streak_14',   emoji: '💪', titel: 'Halvmåned',          beskrivelse: '14 dages streak',               kategori: 'streak' },
  { id: 'streak_30',   emoji: '🌟', titel: 'Madlegende',         beskrivelse: '30 dages streak',               kategori: 'streak' },
  { id: 'foto_1',      emoji: '📸', titel: 'Madfotograf',        beskrivelse: 'Tag dit første madskud',        kategori: 'foto' },
  { id: 'foto_5',      emoji: '🤳', titel: 'Foodie',             beskrivelse: '5 retter fotograferet',         kategori: 'foto' },
  { id: 'foto_10',     emoji: '🎬', titel: 'Madfilmstjerne',     beskrivelse: '10 retter fotograferet',        kategori: 'foto' },
  { id: 'tidlig_fugl', emoji: '☀️', titel: 'Tidlig fugl',       beskrivelse: 'Lavede mad før kl. 8',          kategori: 'tid' },
  { id: 'natkok',      emoji: '🌙', titel: 'Natkok',             beskrivelse: 'Lavede mad efter kl. 22',       kategori: 'tid' },
  { id: 'lynkok',      emoji: '⚡', titel: 'Lynkok',             beskrivelse: 'En ret på under 20 min',        kategori: 'tid' },
  { id: 'gourmet',     emoji: '⏱️', titel: 'Gourmet',           beskrivelse: 'Brugt 90+ min på en ret',       kategori: 'tid' },
  { id: 'weekend_1',   emoji: '🌅', titel: 'Weekendkok',         beskrivelse: 'Lavet mad i weekenden',         kategori: 'mad' },
  { id: 'weekend_5',   emoji: '🥂', titel: 'Weekendmester',      beskrivelse: 'Lavet mad 5 weekender',         kategori: 'mad' },
  { id: 'gem_1',       emoji: '🔖', titel: 'Samleren',           beskrivelse: 'Gemt første opskrift',          kategori: 'samling' },
  { id: 'gem_10',      emoji: '📚', titel: 'Madsniffer',         beskrivelse: '10 gemte opskrifter',           kategori: 'samling' },
  { id: 'gem_25',      emoji: '📖', titel: 'Opskriftshaj',       beskrivelse: '25 gemte opskrifter',           kategori: 'samling' },
  { id: 'gem_50',      emoji: '🗃️', titel: 'Arkivar',           beskrivelse: '50 gemte opskrifter',           kategori: 'samling' },
  { id: 'first_ven',   emoji: '🤝', titel: 'Social kok',         beskrivelse: 'Tilføjede en ven',              kategori: 'social' },
  { id: 'ven_5',       emoji: '👥', titel: 'Netværker',          beskrivelse: '5 venner tilføjet',             kategori: 'social' },
]

// ── Beregn badges (ren funktion) ──────────────────────────────────────────────

export function beregnOpnåedeBadges({ kreationer, gemteAntal, vennerAntal, streak }) {
  const opnåede = new Set()
  const n = kreationer.length
  if (n >= 1)   opnåede.add('cook_1')
  if (n >= 5)   opnåede.add('cook_5')
  if (n >= 10)  opnåede.add('cook_10')
  if (n >= 25)  opnåede.add('cook_25')
  if (n >= 50)  opnåede.add('cook_50')
  if (n >= 100) opnåede.add('cook_100')
  if (streak >= 3)  opnåede.add('streak_3')
  if (streak >= 7)  opnåede.add('streak_7')
  if (streak >= 14) opnåede.add('streak_14')
  if (streak >= 30) opnåede.add('streak_30')
  const medFoto = kreationer.filter(k => k.foto).length
  if (medFoto >= 1)  opnåede.add('foto_1')
  if (medFoto >= 5)  opnåede.add('foto_5')
  if (medFoto >= 10) opnåede.add('foto_10')
  const tidligFugl = kreationer.some(k => { const h = new Date(k.dato).getHours(); return h >= 5 && h < 8 })
  if (tidligFugl) opnåede.add('tidlig_fugl')
  const natkok = kreationer.some(k => new Date(k.dato).getHours() >= 22)
  if (natkok) opnåede.add('natkok')
  const lynkok = kreationer.some(k => { const t = parseInt(k.tidBrugt); return t > 0 && t <= 20 })
  if (lynkok) opnåede.add('lynkok')
  const gourmet = kreationer.some(k => parseInt(k.tidBrugt) >= 90)
  if (gourmet) opnåede.add('gourmet')
  const weekends = kreationer.filter(k => { const d = new Date(k.dato).getDay(); return d === 0 || d === 6 })
  const unikeWeekender = new Set(weekends.map(k => {
    const d = new Date(k.dato)
    const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return mon.toISOString().slice(0, 10)
  }))
  if (unikeWeekender.size >= 1) opnåede.add('weekend_1')
  if (unikeWeekender.size >= 5) opnåede.add('weekend_5')
  if (gemteAntal >= 1)  opnåede.add('gem_1')
  if (gemteAntal >= 10) opnåede.add('gem_10')
  if (gemteAntal >= 25) opnåede.add('gem_25')
  if (gemteAntal >= 50) opnåede.add('gem_50')
  if (vennerAntal >= 1) opnåede.add('first_ven')
  if (vennerAntal >= 5) opnåede.add('ven_5')
  return [...opnåede]
}

// ── Synk badges til Appwrite ──────────────────────────────────────────────────

export async function synkBadges(brugerId, opnåedeIds) {
  if (!brugerId || !opnåedeIds.length) return new Set()

  const res = await databases.listDocuments(DB_ID, COL.user_badges, [
    Query.equal('user_id', brugerId),
    Query.limit(200),
  ])
  const allerede = new Set(res.documents.map(r => r.badge_id))
  const nye = opnåedeIds.filter(id => !allerede.has(id))

  for (const badge_id of nye) {
    await databases.createDocument(DB_ID, COL.user_badges, ID.unique(), {
      user_id: brugerId, badge_id,
    })
    allerede.add(badge_id)
  }

  return allerede
}

// ── Hent badges fra Appwrite ──────────────────────────────────────────────────

export async function hentBadgesDB(brugerId) {
  if (!brugerId) return new Set()
  const res = await databases.listDocuments(DB_ID, COL.user_badges, [
    Query.equal('user_id', brugerId),
    Query.limit(200),
  ])
  return new Set(res.documents.map(r => r.badge_id))
}
