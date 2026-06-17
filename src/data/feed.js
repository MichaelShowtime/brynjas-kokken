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

// Socialt aktivitetsfeed — vises kun som fallback mens posts-tabellen er tom
export const opslag = [
  {
    id: 1,
    navn: 'Sofie',
    avatar: '🧑‍🍳',
    handling: 'lavede',
    ret: 'Pasta med rejer og pesto',
    farve: '#2F6B4F',
    emoji: '🍝',
    tid: '18 min siden',
    likes: 7,
    kommentarer: 2,
    citat: 'Hurtig hverdagsmad på under 20 min 🙌',
    opskriftId: null,
  },
  {
    id: 2,
    navn: 'Mads',
    avatar: '👨‍🍳',
    handling: 'lavede',
    ret: 'Kylling med citron og timian',
    farve: '#E08A5B',
    emoji: '🍗',
    tid: '1 t siden',
    likes: 11,
    kommentarer: 3,
    citat: null,
    opskriftId: null,
  },
  {
    id: 3,
    navn: 'Emma',
    avatar: '👩‍🍳',
    handling: 'lavede',
    ret: 'Linsesuppe med kokos og ingefær',
    farve: '#C25B4A',
    emoji: '🥘',
    tid: '3 t siden',
    likes: 19,
    kommentarer: 5,
    citat: 'Varmende og mættende — perfekt til kolde aftener 🍂',
    opskriftId: null,
  },
]
