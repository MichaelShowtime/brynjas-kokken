// Alle trin i rundvisningen samlet ét sted. Redigér tekster her.
//
// Et trin kan have:
//   kapitel   Lille overskrift over titlen (hvor i appen vi er)
//   side      Hvilken side trinnet hører til (start på stien, fx '/hjem' eller '/opskrift/')
//   åbnVia    Kun hvis siden ikke kan åbnes direkte (fx en opskrift, som har et id):
//             en kæde af {side, klik}: "stå på side, tryk på knappen med data-tour=klik"
//   mål       data-tour-navnet på det element, der fremhæves (null = boks midt på skærmen)
//   titel     Kort overskrift
//   tekst     Forklaring på almindeligt dansk
//   dialog    {rod, åbn, luk}: et vindue, der skal være åbent under trinnet.
//             Rundvisningen åbner det selv og lukker det igen bagefter. Der gemmes aldrig noget.
//   før       Handlinger, der køres før trinnet vises (se nedenfor)
//   valgfri   true = spring stille over, hvis elementet ikke findes (fx hvis lageret er tomt)
//   ventMaks  Hvor længe (ms) der vælges at vente på elementet
//
// Handlinger (i "før"):
//   {klik: 'navn'}                 Tryk på elementet (navn kan også være en liste: det første fundne bruges)
//   {klik: 'navn', valgfri: true}  Tryk kun hvis elementet findes
//   {klik: 'navn', medmindre: 'x'} Tryk kun hvis elementet 'x' IKKE findes
//   {skriv: 'tekst', i: 'navn'}    Skriv tekst i et felt (kun på skærmen, intet gemmes). Kan også have 'medmindre'
//   {vent: 300}                    Vent lidt

const SØG_VINDUE = { rod: 'hjem-soeg-modal', åbn: 'hjem-soeg', luk: 'hjem-soeg-luk' }
const LAGER_TILFØJ_VINDUE = { rod: 'lager-dialog', åbn: 'lager-tilfoej', luk: 'lager-dialog-luk' }
const LAGER_REDIGER_VINDUE = { rod: 'lager-rediger-dialog', åbn: 'lager-rediger', luk: 'lager-rediger-luk' }
const VEN_VINDUE = { rod: 'profil-ven-dialog', åbn: 'profil-tilfoej-ven', luk: 'profil-ven-annuller' }

const TIL_OPSKRIFT = [{ side: '/hjem', klik: 'hjem-dagens-ret' }]
const TIL_KOK = [...TIL_OPSKRIFT, { side: '/opskrift/', klik: 'opskrift-start' }]

// Vælger en vare i lagerets "tilføj"-vindue, så felterne for mængde og enhed kommer frem
const VÆLG_MÆLK = [
  { skriv: 'mælk', i: 'lager-soeg-felt', medmindre: 'lager-maengde' },
  { klik: ['lager-resultat', 'lager-manuelt'], medmindre: 'lager-maengde' },
]

export const TRIN = [
  // ── Velkommen ──────────────────────────────────────────────────────────────
  {
    kapitel: 'Velkommen',
    side: '/hjem',
    mål: null,
    titel: 'Velkommen til Brynjas Køkken',
    tekst: 'Vi viser dig rundt i appen, så du let finder dig til rette. Tryk på "Næste" for at komme videre. Du kan altid trykke "Spring over".',
  },

  // ── Forsiden ───────────────────────────────────────────────────────────────
  {
    kapitel: 'Forsiden',
    side: '/hjem',
    mål: 'hjem-klokke',
    titel: 'Klokken',
    tekst: 'Her får du besked, når en madven har liket noget eller skrevet til dig. En rød prik betyder, at der er noget nyt.',
  },
  {
    kapitel: 'Forsiden',
    side: '/hjem',
    mål: 'hjem-avatar',
    titel: 'Dig',
    tekst: 'Tryk på dit billede for at komme til din egen side.',
  },
  {
    kapitel: 'Forsiden',
    side: '/hjem',
    mål: 'hjem-hjaelp',
    titel: 'Hjælp',
    tekst: 'Vil du se rundvisningen igen? Tryk på spørgsmålstegnet, så starter vi forfra.',
  },
  {
    kapitel: 'Forsiden',
    side: '/hjem',
    mål: 'hjem-tal',
    titel: 'Dine tal',
    tekst: 'Her tæller appen for dig: hvor mange dage i træk du har lavet mad ("streak"), hvor mange retter du har lavet, og hvor mange du har gemt. Tallene kommer frem, når du er i gang.',
  },
  {
    kapitel: 'Forsiden',
    side: '/hjem',
    mål: 'hjem-soeg',
    titel: 'Søg efter mad',
    tekst: 'Tryk her, når du leder efter en bestemt ret.',
  },
  {
    kapitel: 'Forsiden',
    side: '/hjem',
    mål: 'hjem-soeg-felt',
    dialog: SØG_VINDUE,
    titel: 'Skriv, hvad du leder efter',
    tekst: 'Skriv fx "suppe" eller "kylling". Listen under feltet viser de retter, der passer. Tryk på en ret for at åbne den.',
  },
  {
    kapitel: 'Forsiden',
    side: '/hjem',
    mål: 'hjem-venner',
    valgfri: true,
    ventMaks: 800,
    titel: 'Dine madvenner',
    tekst: 'Her er dine madvenner. En farvet ring betyder, at de har lavet mad inden for det sidste døgn. Tryk på en ven for at se vedkommendes side.',
  },
  {
    kapitel: 'Forsiden',
    side: '/hjem',
    mål: 'hjem-dagens-ret',
    ventMaks: 8000,
    titel: 'Dagens ret',
    tekst: 'Hver dag foreslår appen en ret. Tryk på den for at se opskriften.',
  },
  {
    kapitel: 'Forsiden',
    side: '/hjem',
    mål: 'hjem-feed',
    titel: 'Hvad laver dine venner?',
    tekst: 'Her ser du de retter, dine madvenner har lavet. Har du ingen venner endnu, kan du tilføje nogle fra din profil.',
  },
  {
    kapitel: 'Forsiden',
    side: '/hjem',
    mål: 'hjem-post-handlinger',
    valgfri: true,
    ventMaks: 800,
    titel: 'Hjerte, snak og opskrift',
    tekst: 'Hjertet betyder, at du kan lide retten. Taleboblen lader dig skrive en hilsen. Kokkehuen åbner opskriften, så du selv kan lave retten.',
  },
  {
    kapitel: 'Forsiden',
    side: '/hjem',
    mål: 'hjem-mere',
    titel: 'Mere til dig',
    tekst: 'Her er flere forslag, der passer til din smag. Tryk på "Se alle" for at se alle opskrifter. Bogmærket på en ret gemmer den til senere.',
  },
  {
    kapitel: 'Forsiden',
    side: '/hjem',
    mål: 'nav',
    titel: 'Menuen i bunden',
    tekst: 'Her nede skifter du mellem appens dele: Hjem, Mad-match, Lager, Indkøb og Profil. Den følger dig overalt i appen.',
  },

  // ── Beskeder og gemte ──────────────────────────────────────────────────────
  {
    kapitel: 'Beskeder',
    side: '/notifikationer',
    mål: 'notif-top',
    titel: 'Dine beskeder',
    tekst: 'Her samles alt nyt: nye madvenner samt likes og kommentarer på dine retter. Du kommer hertil med klokken på forsiden.',
  },
  {
    kapitel: 'Gemte retter',
    side: '/gemte',
    mål: 'gemte-top',
    titel: 'Dine gemte retter',
    tekst: 'Her ligger de retter, du har gemt med bogmærket. Du kommer hertil ved at trykke på "gemte" på forsiden.',
  },

  // ── Opskrifter ─────────────────────────────────────────────────────────────
  {
    kapitel: 'Opskrifter',
    side: '/galleri',
    mål: 'galleri-soeg',
    titel: 'Find en opskrift',
    tekst: 'Her kan du søge i alle opskrifter. Skriv fx navnet på en ret eller en ingrediens.',
  },
  {
    kapitel: 'Opskrifter',
    side: '/galleri',
    mål: 'galleri-chips',
    titel: 'Vælg en slags mad',
    tekst: 'Tryk på en af knapperne for at se én slags retter ad gangen, fx hurtige hverdagsretter eller vegetarretter.',
  },
  {
    kapitel: 'Opskrifter',
    side: '/galleri',
    mål: 'galleri-kort',
    titel: 'Åbn en ret',
    tekst: 'Tryk på en ret for at se opskriften. Bogmærket i hjørnet gemmer retten, så du let finder den igen.',
  },
  {
    kapitel: 'Opskrifter',
    side: '/galleri',
    mål: 'galleri-opret',
    titel: 'Skriv din egen opskrift',
    tekst: 'Med plus-knappen kan du skrive din egen opskrift. Det viser vi dig om lidt.',
  },

  // ── En opskrift ────────────────────────────────────────────────────────────
  {
    kapitel: 'En opskrift',
    side: '/opskrift/',
    åbnVia: TIL_OPSKRIFT,
    mål: 'opskrift-gem',
    ventMaks: 8000,
    titel: 'Gem retten',
    tekst: 'Tryk på bogmærket for at gemme opskriften. Så finder du den igen under "Gemte".',
  },
  {
    kapitel: 'En opskrift',
    side: '/opskrift/',
    åbnVia: TIL_OPSKRIFT,
    mål: 'opskrift-portioner',
    valgfri: true,
    ventMaks: 800,
    titel: 'Hvor mange skal spise med?',
    tekst: 'Tryk på plus og minus. Mængderne i opskriften regner sig selv om.',
  },
  {
    kapitel: 'En opskrift',
    side: '/opskrift/',
    åbnVia: TIL_OPSKRIFT,
    mål: 'opskrift-ingredienser',
    titel: 'Ingredienser',
    tekst: 'Et flueben betyder, at du har varen i dit lager. Et plus betyder, at den mangler.',
  },
  {
    kapitel: 'En opskrift',
    side: '/opskrift/',
    åbnVia: TIL_OPSKRIFT,
    mål: 'opskrift-indkoeb',
    titel: 'Til indkøbslisten',
    tekst: 'Mangler du noget? Tryk her, så kommer det du mangler på din indkøbsliste.',
  },
  {
    kapitel: 'En opskrift',
    side: '/opskrift/',
    åbnVia: TIL_OPSKRIFT,
    mål: 'opskrift-trin',
    titel: 'Sådan gør du',
    tekst: 'Her står opskriften trin for trin.',
  },
  {
    kapitel: 'En opskrift',
    side: '/opskrift/',
    åbnVia: TIL_OPSKRIFT,
    mål: 'opskrift-rating',
    titel: 'Giv retten stjerner',
    tekst: 'Har du lavet retten? Tryk på de stjerner, du synes den fortjener. Dine venner kan se, hvad du synes.',
  },
  {
    kapitel: 'En opskrift',
    side: '/opskrift/',
    åbnVia: TIL_OPSKRIFT,
    mål: 'opskrift-noter',
    titel: 'Dine egne noter',
    tekst: 'Skriv fx "mindre salt næste gang". Det er kun dig, der kan se dine noter.',
  },
  {
    kapitel: 'En opskrift',
    side: '/opskrift/',
    åbnVia: TIL_OPSKRIFT,
    mål: 'opskrift-chat',
    titel: 'Spørg om retten',
    tekst: 'Tryk på den lille taleboble, hvis du vil spørge om noget, fx hvad du kan bruge i stedet for en ingrediens.',
  },
  {
    kapitel: 'En opskrift',
    side: '/opskrift/',
    åbnVia: TIL_OPSKRIFT,
    mål: 'opskrift-start',
    titel: 'Start med at lave maden',
    tekst: 'Tryk på den grønne knap, når du står i køkkenet. Så får du hjælp hele vejen.',
  },

  // ── Madlavning ─────────────────────────────────────────────────────────────
  {
    kapitel: 'Madlavning',
    side: '/kok/',
    åbnVia: TIL_KOK,
    mål: 'kok-timer',
    ventMaks: 8000,
    titel: 'Stopur',
    tekst: 'Tryk på "Start" for at se, hvor længe du har været i gang. Du kan sætte det på pause eller nulstille det.',
  },
  {
    kapitel: 'Madlavning',
    side: '/kok/',
    åbnVia: TIL_KOK,
    mål: 'kok-timere',
    titel: 'Flere timere',
    tekst: 'Skal kartoflerne koge i 20 minutter? Opret en timer med et navn. Den starter først, når du trykker på afspil.',
  },
  {
    kapitel: 'Madlavning',
    side: '/kok/',
    åbnVia: TIL_KOK,
    mål: 'kok-trin',
    titel: 'Sæt kryds undervejs',
    tekst: 'Tryk på et trin, når du er færdig med det. Så kan du altid se, hvor langt du er kommet.',
  },
  {
    kapitel: 'Madlavning',
    side: '/kok/',
    åbnVia: TIL_KOK,
    mål: 'kok-afslut',
    titel: 'Når du er færdig',
    tekst: 'Tryk på "Afslut". Så kan du tage et billede af retten og vise den til dine madvenner. Appen kan også fjerne de brugte varer fra dit lager.',
  },

  // ── Mad-match ──────────────────────────────────────────────────────────────
  {
    kapitel: 'Mad-match',
    side: '/madmatch',
    før: [{ klik: 'mm-skift-valg', valgfri: true }],
    mål: 'mm-valg',
    titel: 'Hvad vil du have mad til?',
    tekst: 'Mad-match hjælper dig med at finde aftensmad. Først vælger du, hvad du er på udkig efter: morgenmad, frokost, aftensmad, noget du kan lave af det du har, eller bare en overraskelse.',
  },
  {
    kapitel: 'Mad-match',
    side: '/madmatch',
    før: [{ klik: 'mm-valg-overrask', valgfri: true }],
    mål: 'mm-filtre',
    titel: 'Indsnævr valget',
    tekst: 'Tryk på knapperne for kun at se bestemte retter, fx vegetar, under 30 minutter eller retter du kan lave af dit lager.',
  },
  {
    kapitel: 'Mad-match',
    side: '/madmatch',
    før: [{ klik: 'mm-valg-overrask', valgfri: true }],
    mål: 'mm-kort',
    ventMaks: 8000,
    titel: 'Swipe på retterne',
    tekst: 'Træk kortet mod højre med fingeren, hvis du gerne vil gemme retten. Træk det mod venstre, hvis du vil springe over. Tryk på kortet for at se opskriften.',
  },
  {
    kapitel: 'Mad-match',
    side: '/madmatch',
    før: [{ klik: 'mm-valg-overrask', valgfri: true }],
    mål: 'mm-knapper',
    titel: 'Eller brug knapperne',
    tekst: 'Krydset springer over. Hjertet gemmer retten. Pilen i midten fortryder det sidste, du gjorde.',
  },

  // ── Lager ──────────────────────────────────────────────────────────────────
  {
    kapitel: 'Lageret',
    side: '/lager',
    mål: 'lager-top',
    titel: 'Dit lager',
    tekst: 'Her skriver du, hvad du har i køleskab og skabe. Så kan appen vise dig, hvilke retter du allerede har det meste til.',
  },
  {
    kapitel: 'Lageret',
    side: '/lager',
    mål: 'lager-tilfoej',
    titel: 'Tilføj en vare',
    tekst: 'Tryk på den grønne knap, når du har købt noget ind.',
  },
  {
    kapitel: 'Lageret',
    side: '/lager',
    dialog: LAGER_TILFØJ_VINDUE,
    før: [{ klik: 'lager-skift', valgfri: true }],
    mål: 'lager-soeg-felt',
    titel: 'Find varen',
    tekst: 'Skriv navnet på varen, fx "mælk". Tryk så på varen på listen.',
  },
  {
    kapitel: 'Lageret',
    side: '/lager',
    dialog: LAGER_TILFØJ_VINDUE,
    før: [{ klik: 'lager-skift', valgfri: true }],
    mål: 'lager-scan',
    titel: 'Scan i stedet for at skrive',
    tekst: 'Med "Stregkode" kan du holde kameraet hen over stregkoden på en vare. Med "Scan billede" kan du tage et billede af dit køleskab, så finder appen varerne selv.',
  },
  {
    kapitel: 'Lageret',
    side: '/lager',
    dialog: LAGER_TILFØJ_VINDUE,
    før: VÆLG_MÆLK,
    mål: 'lager-maengde',
    titel: 'Hvor meget har du?',
    tekst: 'Skriv antallet i det hvide felt, fx 1. Ved siden af vælger du, hvad det måles i.',
  },
  {
    kapitel: 'Lageret',
    side: '/lager',
    dialog: LAGER_TILFØJ_VINDUE,
    før: VÆLG_MÆLK,
    mål: 'lager-enhed',
    titel: 'Vælg enhed',
    tekst: 'Tryk her for at vælge: liter (l), deciliter (dl), milliliter (ml), gram (g), kilo (kg) eller styk (stk). Der er også ske, tsk, pose og dåse.',
  },
  {
    kapitel: 'Lageret',
    side: '/lager',
    dialog: LAGER_TILFØJ_VINDUE,
    før: VÆLG_MÆLK,
    mål: 'lager-udloeb',
    titel: 'Sidste holdbarhedsdato',
    tekst: 'Skriv datoen, hvis du vil have en påmindelse, før varen bliver dårlig. Du kan også lade den stå tom.',
  },
  {
    kapitel: 'Lageret',
    side: '/lager',
    dialog: LAGER_TILFØJ_VINDUE,
    før: VÆLG_MÆLK,
    mål: 'lager-gem',
    titel: 'Læg den i lageret',
    tekst: 'Til sidst trykker du på den grønne knap. Lige nu gør vi det ikke, for vi øver bare. Der bliver ikke lagt noget i dit lager.',
  },
  {
    kapitel: 'Lageret',
    side: '/lager',
    mål: 'lager-vare',
    valgfri: true,
    ventMaks: 800,
    titel: 'Dine varer',
    tekst: 'Varerne står samlet efter slags. En orange eller rød mærkat betyder, at varen snart udløber.',
  },
  {
    kapitel: 'Lageret',
    side: '/lager',
    mål: 'lager-rediger',
    valgfri: true,
    ventMaks: 800,
    titel: 'Ret en vare',
    tekst: 'Tryk på blyanten for at ændre mængden eller datoen på en vare.',
  },
  {
    kapitel: 'Lageret',
    side: '/lager',
    dialog: LAGER_REDIGER_VINDUE,
    mål: 'lager-slet',
    valgfri: true,
    ventMaks: 800,
    titel: 'Fjern en vare',
    tekst: 'Er varen brugt op? Tryk på "Slet". Appen spørger dig først, så du ikke sletter ved en fejl.',
  },
  {
    kapitel: 'Lageret',
    side: '/lager',
    mål: 'lager-indkoeb',
    titel: 'Til indkøbslisten',
    tekst: 'Med den her knap kommer du til din indkøbsliste.',
  },
  {
    kapitel: 'Lageret',
    side: '/lager',
    mål: 'lager-auto',
    titel: 'Lageret passer sig selv',
    tekst: 'Er knappen tændt, fjerner appen selv de varer, du bruger, når du afslutter en ret.',
  },

  // ── Indkøbsliste ───────────────────────────────────────────────────────────
  {
    kapitel: 'Indkøb',
    side: '/indkøbsliste',
    mål: 'indkob-top',
    titel: 'Din indkøbsliste',
    tekst: 'Her står alt det, du mangler. Varer fra opskrifter kommer herind med ét tryk.',
  },
  {
    kapitel: 'Indkøb',
    side: '/indkøbsliste',
    mål: 'indkob-tilfoej',
    titel: 'Skriv selv en vare',
    tekst: 'Tryk her, hvis du vil skrive noget på listen, som ikke kommer fra en opskrift.',
  },
  {
    kapitel: 'Indkøb',
    side: '/indkøbsliste',
    mål: 'indkob-vare',
    valgfri: true,
    ventMaks: 800,
    titel: 'Sæt kryds i butikken',
    tekst: 'Tryk på en vare, når den er i kurven. Bagefter kan du trykke "Flyt til lager", så lægger appen varerne ind i dit lager.',
  },

  // ── Profil ─────────────────────────────────────────────────────────────────
  {
    kapitel: 'Din profil',
    side: '/profil',
    før: [{ klik: 'profil-tab-gemte', valgfri: true }],
    mål: 'profil-top',
    titel: 'Din profil',
    tekst: 'Her står dit navn og dit billede. Tryk på det lille kamera ved billedet for at skifte det. Under dit navn ser du, hvor mange retter du har lavet.',
  },
  {
    kapitel: 'Din profil',
    side: '/profil',
    mål: 'profil-rediger',
    titel: 'Ret din profil',
    tekst: 'Her kan du ændre dit navn, dit billede og en lille tekst om dig selv.',
  },
  {
    kapitel: 'Din profil',
    side: '/profil',
    mål: 'profil-tags',
    titel: 'Det du kan lide',
    tekst: 'Her har du valgt, hvilken slags mad du bedst kan lide. Appen bruger det til at finde retter, der passer til dig. Tryk på "Rediger" for at ændre det.',
  },
  {
    kapitel: 'Din profil',
    side: '/profil',
    mål: 'profil-venner',
    titel: 'Dine madvenner',
    tekst: 'Her ser du dem, du følger. Så kan du se, hvad de laver i køkkenet.',
  },
  {
    kapitel: 'Din profil',
    side: '/profil',
    dialog: VEN_VINDUE,
    mål: 'profil-ven-felt',
    titel: 'Tilføj en ven',
    tekst: 'Skriv din vens brugernavn her. Tryk så på "Følg". Lige nu øver vi bare, så der bliver ikke tilføjet nogen.',
  },
  {
    kapitel: 'Din profil',
    side: '/profil',
    mål: 'profil-statistik',
    titel: 'Din madstatistik',
    tekst: 'Her kan du se din streak, hvor mange retter du har lavet, og hvor lang tid du i gennemsnit bruger i køkkenet.',
  },
  {
    kapitel: 'Din profil',
    side: '/profil',
    mål: 'profil-tabs',
    titel: 'Fire faner',
    tekst: '"Gemte" er retter, du har gemt. "Mine opskrifter" er dem, du selv har skrevet. "Kreationer" er de retter, du har lavet. "Badges" er belønninger, du optjener.',
  },
  {
    kapitel: 'Din profil',
    side: '/profil',
    før: [{ klik: 'profil-tab-badges' }],
    mål: 'profil-badges-antal',
    titel: 'Badges',
    tekst: 'Badges er små belønninger. Du får dem, når du fx laver mad flere dage i træk eller får madvenner. Her kan du se, hvor mange du har fået.',
  },
  {
    kapitel: 'Din profil',
    side: '/profil',
    før: [{ klik: 'profil-tab-gemte', valgfri: true }],
    mål: 'profil-indst',
    titel: 'Indstillinger',
    tekst: 'Her kan du slå beskeder til og fra, skifte sprog til engelsk, læse om privatliv og få hjælp. Hjælp-siden har også en lille formular, hvor du kan skrive til os.',
  },
  {
    kapitel: 'Din profil',
    side: '/profil',
    mål: 'profil-indst-valg',
    titel: 'Flere valg',
    tekst: 'Her kan du vælge, at lageret opdaterer sig selv, at opskrifter viser kalorier og protein, og hvor mange personer du som regel laver mad til.',
  },
  {
    kapitel: 'Din profil',
    side: '/profil',
    mål: 'profil-opret',
    titel: 'Skriv din egen opskrift',
    tekst: 'Her kan du skrive en opskrift, som andre kan lave. Vi går igennem skemaet på næste side.',
  },

  // ── Opret opskrift ─────────────────────────────────────────────────────────
  {
    kapitel: 'Din egen opskrift',
    side: '/opret-opskrift',
    mål: 'opret-top',
    titel: 'Skemaet til en ny opskrift',
    tekst: 'Udfyld felterne ét for ét. Når du er færdig, bliver opskriften set igennem, før andre kan se den. Det kan du se på din profil under "Mine opskrifter".',
  },
  {
    kapitel: 'Din egen opskrift',
    side: '/opret-opskrift',
    mål: 'opret-billede',
    titel: 'Billede',
    tekst: 'Tryk her for at vælge et billede af retten. Det er valgfrit.',
  },
  {
    kapitel: 'Din egen opskrift',
    side: '/opret-opskrift',
    mål: 'opret-titel',
    titel: 'Navn på retten',
    tekst: 'Skriv, hvad retten hedder, fx "Boller i karry". Det skal du udfylde.',
  },
  {
    kapitel: 'Din egen opskrift',
    side: '/opret-opskrift',
    mål: 'opret-beskrivelse',
    titel: 'Lille beskrivelse',
    tekst: 'Fortæl kort, hvorfor retten er god. Det er valgfrit.',
  },
  {
    kapitel: 'Din egen opskrift',
    side: '/opret-opskrift',
    mål: 'opret-meta',
    titel: 'Antal og tid',
    tekst: 'Skriv, hvor mange personer retten er til, og hvor lang tid den tager, fx "30 min".',
  },
  {
    kapitel: 'Din egen opskrift',
    side: '/opret-opskrift',
    mål: 'opret-svaerhed',
    titel: 'Hvor svær er den?',
    tekst: 'Tryk på "Nem", "Mellem" eller "Svær".',
  },
  {
    kapitel: 'Din egen opskrift',
    side: '/opret-opskrift',
    mål: 'opret-koekken',
    titel: 'Slags køkken',
    tekst: 'Skriv fx "dansk" eller "italiensk". Det er valgfrit.',
  },
  {
    kapitel: 'Din egen opskrift',
    side: '/opret-opskrift',
    mål: 'opret-tags',
    titel: 'Mærkater',
    tekst: 'Tryk på de mærkater, der passer til retten, fx "vegetar" eller "hurtig". Du kan vælge op til seks. De hjælper andre med at finde din ret.',
  },
  {
    kapitel: 'Din egen opskrift',
    side: '/opret-opskrift',
    mål: 'opret-ingrediens',
    titel: 'Ingredienser: navn',
    tekst: 'Begynd at skrive, fx "mel". Tryk så på varen på listen, der kommer frem. Så kan appen se, om du har den i dit lager.',
  },
  {
    kapitel: 'Din egen opskrift',
    side: '/opret-opskrift',
    mål: 'opret-maengde',
    titel: 'Ingredienser: mængde',
    tekst: 'Skriv hvor meget, der skal bruges, fx 400.',
  },
  {
    kapitel: 'Din egen opskrift',
    side: '/opret-opskrift',
    mål: 'opret-enhed',
    titel: 'Ingredienser: enhed',
    tekst: 'Vælg, hvad mængden måles i, fx gram (g), liter (l) eller stk. Det lille kryds yderst til højre fjerner ingrediensen igen.',
  },
  {
    kapitel: 'Din egen opskrift',
    side: '/opret-opskrift',
    mål: 'opret-tilfoej-ing',
    titel: 'Flere ingredienser',
    tekst: 'Tryk her, hver gang du skal bruge en ny ingrediens.',
  },
  {
    kapitel: 'Din egen opskrift',
    side: '/opret-opskrift',
    mål: 'opret-trin',
    titel: 'Fremgangsmåde',
    tekst: 'Skriv, hvad man skal gøre i første trin, fx "Skræl kartoflerne". Skriv ét trin ad gangen.',
  },
  {
    kapitel: 'Din egen opskrift',
    side: '/opret-opskrift',
    mål: 'opret-tilfoej-trin',
    titel: 'Flere trin',
    tekst: 'Tryk her for at tilføje næste trin.',
  },
  {
    kapitel: 'Din egen opskrift',
    side: '/opret-opskrift',
    mål: 'opret-send',
    titel: 'Send opskriften',
    tekst: 'Når alt er udfyldt, trykker du her. Opskriften bliver set igennem, og så kan alle se den. Lige nu øver vi bare, så der bliver ikke sendt noget.',
  },

  // ── Slut ───────────────────────────────────────────────────────────────────
  {
    kapitel: 'Færdig',
    side: '/profil',
    før: [{ klik: 'profil-tab-gemte', valgfri: true }],
    mål: 'profil-rundvisning',
    titel: 'Se rundvisningen igen',
    tekst: 'Du kan altid se den her igen. Du kan også trykke på spørgsmålstegnet på forsiden. God fornøjelse i køkkenet!',
  },
]
