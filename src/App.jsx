import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { hentAktivBruger, syncSession } from './data/auth'
import BottomNav from './components/BottomNav'
import Hjem from './pages/Hjem'
import MadMatch from './pages/MadMatch'
import Opskrift from './pages/Opskrift'
import Opret from './pages/Opret'
import Lager from './pages/Lager'
import Profil from './pages/Profil'
import Login from './pages/Login'
import Register from './pages/Register'
import Onboarding from './pages/Onboarding'
import Kok from './pages/Kok'
import Galleri from './pages/Galleri'

const INGEN_NAV = ['/login', '/register', '/onboarding', '/kok/']

function ProtectedRoute({ children }) {
  const bruger = hentAktivBruger()
  if (!bruger) return <Navigate to="/login" replace />
  if (!bruger.onboardingFærdig || !bruger.tags?.length) return <Navigate to="/onboarding" replace />
  return children
}

function GæsteRoute({ children }) {
  const bruger = hentAktivBruger()
  if (bruger) return <Navigate to={bruger.onboardingFærdig ? '/hjem' : '/onboarding'} replace />
  return children
}

function OnboardingRoute({ children }) {
  const bruger = hentAktivBruger()
  if (!bruger) return <Navigate to="/login" replace />
  if (bruger.onboardingFærdig) return <Navigate to="/hjem" replace />
  return children
}

export default function App() {
  const { pathname } = useLocation()
  const [klar, setKlar] = useState(false)
  const visNav = !INGEN_NAV.some((p) => pathname.startsWith(p))

  // Synkronisér Supabase-session med localStorage ved app-start
  useEffect(() => {
    syncSession().finally(() => setKlar(true))
  }, [])

  if (!klar) return null

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)' }}>
      <Routes>
        <Route path="/login"      element={<GæsteRoute><Login /></GæsteRoute>} />
        <Route path="/register"   element={<GæsteRoute><Register /></GæsteRoute>} />
        <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />

        <Route path="/"               element={<ProtectedRoute><Navigate to="/hjem" replace /></ProtectedRoute>} />
        <Route path="/hjem"           element={<ProtectedRoute><Hjem /></ProtectedRoute>} />
        <Route path="/opskrift/:id"   element={<ProtectedRoute><Opskrift /></ProtectedRoute>} />
        <Route path="/kok/:id"        element={<ProtectedRoute><Kok /></ProtectedRoute>} />
        <Route path="/madmatch"       element={<ProtectedRoute><MadMatch /></ProtectedRoute>} />
        <Route path="/opret"          element={<ProtectedRoute><Opret /></ProtectedRoute>} />
        <Route path="/lager"          element={<ProtectedRoute><Lager /></ProtectedRoute>} />
        <Route path="/profil"         element={<ProtectedRoute><Profil /></ProtectedRoute>} />
        <Route path="/galleri"        element={<ProtectedRoute><Galleri /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {visNav && hentAktivBruger()?.onboardingFærdig && <BottomNav />}
    </div>
  )
}
