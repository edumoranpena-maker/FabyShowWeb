import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import AuthLoadingScreen from './AuthLoadingScreen'

/**
 * Guard de rutas privadas. Se usa envolviendo un <Route> padre en
 * AdminApp.jsx: mientras se resuelve la sesión inicial muestra un
 * loader, si no hay sesión redirige a /admin/login (recordando de
 * dónde venía, para volver ahí después de iniciar sesión), y si hay
 * sesión renderiza las rutas hijas normalmente.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <AuthLoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
