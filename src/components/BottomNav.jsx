import { NavLink } from 'react-router-dom'
import { colors, shadow, font } from '../data/theme'
import { useLang } from '../lib/lang'

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

function SparkleIcon({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.5c.4 3.7 1.8 5.1 5.5 5.5-3.7.4-5.1 1.8-5.5 5.5-.4-3.7-1.8-5.1-5.5-5.5 3.7-.4 5.1-1.8 5.5-5.5Z" />
      <path d="M18.5 13.5c.2 1.9.9 2.6 2.8 2.8-1.9.2-2.6.9-2.8 2.8-.2-1.9-.9-2.6-2.8-2.8 1.9-.2 2.6-.9 2.8-2.8Z" />
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
    { to: '/hjem',     labelKey: 'nav.hjem',     Icon: HouseIcon },
    { to: '/madmatch', labelKey: 'nav.madmatch',  Icon: SwipeIcon },
    { to: '/opret',    labelKey: 'nav.opret',     Icon: SparkleIcon, featured: true },
    { to: '/lager',    labelKey: 'nav.lager',     Icon: PantryIcon },
    { to: '/profil',   labelKey: 'nav.profil',    Icon: PersonIcon },
  ]
  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        {tabs.map(({ to, labelKey, Icon, featured }) => {
          const label = t(labelKey)
          return (
          <NavLink key={to} to={to} style={styles.link}>
            {({ isActive }) =>
              featured ? (
                <FeaturedTab Icon={Icon} label={label} />
              ) : (
                <RegularTab Icon={Icon} label={label} isActive={isActive} />
              )
            }
          </NavLink>
        )})}
      </div>
    </nav>
  )
}

function RegularTab({ Icon, label, isActive }) {
  const color = isActive ? colors.green : colors.mutedLight
  return (
    <div style={{ ...styles.tab, color }}>
      <Icon size={24} />
      <span style={{ ...styles.label, color }}>{label}</span>
    </div>
  )
}

function FeaturedTab({ Icon, label }) {
  return (
    <div style={styles.tab}>
      <div style={styles.featuredCircle}>
        <Icon size={26} />
      </div>
      <span style={{ ...styles.label, color: colors.green, fontWeight: 600 }}>{label}</span>
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
    padding: '8px 0 20px',
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
  label: {
    fontFamily: font.body,
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: 0.1,
  },
  featuredCircle: {
    width: 52,
    height: 52,
    borderRadius: 999,
    background: colors.green,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadow.fab,
    marginTop: -18,
    border: `3px solid ${colors.card}`,
  },
}
