import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import AdminHeader from './AdminHeader'

/**
 * Shell del panel: sidebar + header + área principal. Se monta una sola
 * vez (dentro de la <Route> protegida por ProtectedRoute en AdminApp.jsx)
 * y cada vista de sección se renderiza dentro vía <Outlet/>.
 */
export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f7f5fb] flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        <AdminHeader onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 px-5 md:px-8 py-6 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
