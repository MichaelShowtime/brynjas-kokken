import { NavLink } from 'react-router-dom'
import { colors, font } from '../data/theme'
import { useLang } from '../lib/lang'
import { hentIndkøbsliste } from '../data/indkøbsliste'

// --- Ikoner (stroke-baserede SVG'er, arver currentColor) ---

function HouseIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  )
}

function SwipeIcon({ size = 24 }) {
  // To kort der "swiper" — mad-match
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="5" width="11" height="14" rx="2.5" transform="rotate(7 12.5 12)" />
      <rect x="6" y="5" width="11" height="14" rx="2.5" transform="rotate(-7 11.5 12)" />
    </svg>
  )
}


function PantryIcon({ size = 24 }) {
  // Kasse / spisekammer
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7.5 12 3l9 4.5" />
      <path d="M4 8.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8.5" />
      <path d="M4 8.5h16" />
      <path d="M9.5 13h5" />
    </svg>
  )
}

function CartIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

function PersonIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
    </svg>
  )
}

export default function BottomNav() {
  const { t } = useLang()
  const tabs = [
    { to: '/hjem',     labelKey: 'nav.hjem',    Icon: HouseIcon },
    { to: '/madmatch', labelKey: 'nav.madmatch', Icon: SwipeIcon },
    { to: '/lager',    labelKey: 'nav.lager',    Icon: PantryIcon },
    { to: '/indkøbsliste', labelKey: 'nav.indkøb', Icon: CartIcon, badge: hentIndkøbsliste().length },
    { to: '/profil',   labelKey: 'nav.profil',   Icon: PersonIcon },
  ]
  return (
    <nav style={styles.nav} data-tour="nav">
      <div style={styles.inner}>
        {tabs.map(({ to, labelKey, Icon, badge }) => {
          const label = t(labelKey)
          return (
          <NavLink key={to} to={to} style={styles.link}>
            {({ isActive }) => <RegularTab Icon={Icon} label={label} isActive={isActive} badge={badge} />}
          </NavLink>
        )})}
      </div>
    </nav>
  )
}

function RegularTab({ Icon, label, isActive, badge }) {
  const color = isActive ? colors.green : colors.mutedLight
  return (
    <div style={{ ...styles.tab, color }}>
      <span style={{ position: 'relative', display: 'flex' }}>
        <Icon size={24} />
        {badge > 0 && <span style={styles.badge}>{badge > 99 ? '99+' : badge}</span>}
      </span>
      <span style={{ ...styles.label, color }}>{label}</span>
    </div>
  )
}


const styles = {
  nav: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    background: colors.card,
    borderTop: `1px solid ${colors.border}`,
    paddingTop: 8,
    paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
    zIndex: 50,
  },
  inner: {
    maxWidth: 480,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  link: {
    textDecoration: 'none',
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
  },
  tab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    userSelect: 'none',
  },
  badge: {
    position: 'absolute', top: -5, right: -9, minWidth: 16, height: 16, padding: '0 4px', boxSizing: 'border-box',
    borderRadius: 999, background: colors.terracotta, color: '#fff', fontFamily: font.body, fontSize: 10, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  label: {
    fontFamily: font.body,
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: 0.1,
  },
}
