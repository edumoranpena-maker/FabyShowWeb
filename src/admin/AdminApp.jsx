import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthProvider'
import ProtectedRoute from '../auth/ProtectedRoute'
import AdminLayout from './layout/AdminLayout'
import LoginPage from './views/LoginPage'
import DashboardView from './views/DashboardView'
import HeroView from './views/HeroView'
import GaleriaView from './views/GaleriaView'
import ServiciosView from './views/ServiciosView'
import PaquetesView from './views/PaquetesView'
import TestimoniosView from './views/TestimoniosView'
import FAQView from './views/FAQView'
import ContactoView from './views/ContactoView'

/**
 * Raíz de todo /admin. Tiene su propio <AuthProvider> (aislado del resto
 * de la app — el sitio público nunca necesita saber nada de sesiones),
 * y define el árbol de rutas:
 *
 *   /admin/login        → pública, formulario de acceso
 *   /admin               → protegida, Dashboard (dentro de AdminLayout)
 *   /admin/hero           → protegida
 *   /admin/galeria         → protegida
 *   ...etc
 *
 * Agregar una sección nueva al CMS es: crear su vista en admin/views,
 * agregarla acá como <Route> y agregar su entrada en admin/navConfig.js.
 */
export default function AdminApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<DashboardView />} />
            <Route path="hero" element={<HeroView />} />
            <Route path="galeria" element={<GaleriaView />} />
            <Route path="servicios" element={<ServiciosView />} />
            <Route path="paquetes" element={<PaquetesView />} />
            <Route path="testimonios" element={<TestimoniosView />} />
            <Route path="faq" element={<FAQView />} />
            <Route path="contacto" element={<ContactoView />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}
