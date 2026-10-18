import { useState } from 'react'
import { Home, Layers, Refrigerator, ShoppingBasket, ChefHat, User } from 'lucide-react'
import { colors, shadow, radius, font } from '../data/theme'

const KEY = 'simmer_rundtur_set'

export function skalViseRundtur() {
  try { return !localStorage.getItem(KEY) } catch { return false }
}

const TRIN = [
  { Ikon: Home, titel: 'Velkommen til Brynjas Køkken', tekst: 'Her på forsiden finder du dagens ret, tips til hvad du kan lave, og hvad dine madvenner har lavet.' },
  { Ikon: Layers, titel: 'Mad-match', tekst: 'Swipe dig til aftensmaden. Højre gemmer retten, venstre springer over. Du vælger selv hvilken slags retter du er i humør til.' },
  { Ikon: Refrigerator, titel: 'Dit lager', tekst: 'Skriv hvad du har i skabene, så kan appen vise hvilke retter du allerede har ingredienserne til.' },
  { Ikon: ShoppingBasket, titel: 'Indkøbsliste', tekst: 'Mangler du noget? Tilføj det med ét tryk fra en opskrift. Du finder listen fra Lager-fanen.' },
  { Ikon: ChefHat, titel: 'Lav maden', tekst: 'Åbn en opskrift, vælg antal personer og tryk "Start tilberedning". Her får du trin for trin og timere.' },
  { Ikon: User, titel: 'Din profil', tekst: 'Her ser du dine gemte retter, kreationer, badges og venner. Du kan altid ændre dine madpræferencer.' },
]

export default function Rundtur({ onLuk }) {
  const [i, setI] = useState(0)
  const { Ikon, titel, tekst } = TRIN[i]
  const sidste = i === TRIN.length - 1

  function luk() {
    try { localStorage.setItem(KEY, '1') } catch { /* ignorer */ }
    onLuk()
  }

  return (
    <div style={s.overlay} role="dialog" aria-modal="true" aria-label="Rundtur i appen">
      <div style={s.kort}>
        <div style={s.ikonRund}><Ikon size={30} color={colors.green} strokeWidth={2} /></div>
        <h2 style={s.titel}>{titel}</h2>
        <p style={s.tekst}>{tekst}</p>

        <div style={s.prikker}>
          {TRIN.map((_, n) => (
            <span key={n} style={{ ...s.prik, background: n === i ? colors.green : colors.border }} />
          ))}
        </div>

        <button style={s.primær} onClick={() => (sidste ? luk() : setI(i + 1))}>
          {sidste ? 'Kom i gang' : 'Næste'}
        </button>
        {!sidste && <button style={s.spring} onClick={luk}>Spring over</button>}
      </div>
    </div>
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(31,36,33,0.55)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  kort: { width: '100%', maxWidth: 360, background: colors.card, borderRadius: radius.card, boxShadow: shadow.card, padding: '28px 24px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  ikonRund: { width: 64, height: 64, borderRadius: 999, background: 'rgba(47,107,79,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  titel: { fontFamily: font.display, fontWeight: 600, fontSize: 21, color: colors.text, margin: 0, letterSpacing: -0.3 },
  tekst: { fontFamily: font.body, fontSize: 14.5, color: colors.muted, margin: 0, lineHeight: 1.55, minHeight: 66 },
  prikker: { display: 'flex', gap: 6, margin: '8px 0 6px' },
  prik: { width: 7, height: 7, borderRadius: 999 },
  primær: { width: '100%', fontFamily: font.body, fontWeight: 700, fontSize: 15, color: '#fff', background: colors.green, border: 'none', borderRadius: radius.button, padding: '13px 0', cursor: 'pointer' },
  spring: { background: 'none', border: 'none', fontFamily: font.body, fontSize: 13.5, fontWeight: 600, color: colors.mutedLight, cursor: 'pointer', padding: '6px 0' },
}
