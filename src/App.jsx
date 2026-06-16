import { Routes, Route, Navigate } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Hjem from './pages/Hjem'
import MadMatch from './pages/MadMatch'
import Opret from './pages/Opret'
import Lager from './pages/Lager'
import Profil from './pages/Profil'

export default function App() {
  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)' }}>
      <Routes>
        {/* Lager er standardskærmen */}
        <Route path="/" element={<Navigate to="/lager" replace />} />
        <Route path="/hjem" element={<Hjem />} />
        <Route path="/madmatch" element={<MadMatch />} />
        <Route path="/opret" element={<Opret />} />
        <Route path="/lager" element={<Lager />} />
        <Route path="/profil" element={<Profil />} />
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/lager" replace />} />
      </Routes>

      <BottomNav />
    </div>
  )
}
