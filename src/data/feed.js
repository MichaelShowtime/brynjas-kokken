// Mock-data til hjemmeskærmen: det sociale lag + kuraterede retter.

// Aktive venner ("stories" øverst)
export const venner = [
  { id: 1, navn: 'Mads', emoji: '👨‍🍳', live: true },
  { id: 2, navn: 'Sofie', emoji: '🧑‍🍳' },
  { id: 3, navn: 'Oliver', emoji: '👨🏽‍🍳' },
  { id: 4, navn: 'Emma', emoji: '👩‍🍳' },
  { id: 5, navn: 'Noah', emoji: '🧔' },
  { id: 6, navn: 'Liv', emoji: '👩🏼‍🦰' },
]

// Ugens kuraterede ret
export const ugensRet = {
  titel: 'Cremet Tomatpasta',
  emoji: '🍝',
  farve: '#2F6B4F',
  tid: 25,
  sværhedsgrad: 'Nem',
  kok: 'Brynjas Køkken',
  beskrivelse: 'Fløjlsblød tomatsauce med parmesan — ugens mest gemte ret.',
}

// Socialt aktivitetsfeed
export const opslag = [
  {
    id: 1,
    navn: 'Sofie',
    avatar: '🧑‍🍳',
    handling: 'lavede',
    ret: 'Cremet Tomatpasta',
    farve: '#C25B4A',
    emoji: '🍅',
    tid: '12 min siden',
    likes: 24,
    kommentarer: 5,
    citat: 'Tilføjede lidt chili — helt perfekt 🌶️',
  },
  {
    id: 2,
    navn: 'Mads',
    avatar: '👨‍🍳',
    handling: 'gemte',
    ret: 'Spaghetti Carbonara',
    farve: '#1F2421',
    emoji: '🥓',
    tid: '1 t siden',
    likes: 12,
    kommentarer: 2,
    citat: null,
  },
  {
    id: 3,
    navn: 'Emma',
    avatar: '👩‍🍳',
    handling: 'lavede',
    ret: 'Pizza Margherita',
    farve: '#E08A5B',
    emoji: '🍕',
    tid: '3 t siden',
    likes: 41,
    kommentarer: 9,
    citat: 'Bedste fredagspizza nogensinde 🔥',
  },
]
