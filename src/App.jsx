import { Routes, Route } from 'react-router-dom'
import MarketingSite from './marketing/MarketingSite'
import AdminApp from './admin/AdminApp'

// Punto de entrada de rutas de toda la app: el sitio público vive en "/",
// y todo el panel de administración (login incluido) vive bajo "/admin/*",
// completamente aislado en su propio sub-árbol de rutas y su propio
// AuthProvider (ver src/admin/AdminApp.jsx).
export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="/*" element={<MarketingSite />} />
    </Routes>
  )
}
