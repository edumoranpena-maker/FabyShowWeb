import { useLocation } from 'react-router-dom'
import { Menu, ExternalLink } from 'lucide-react'
import { ADMIN_NAV } from '../navConfig'

function useActivePageLabel() {
  const { pathname } = useLocation()
  const match = ADMIN_NAV.find((item) =>
    item.end ? pathname === item.to : pathname.startsWith(item.to)
  )
  return match?.label ?? 'Dashboard'
}

export default function AdminHeader({ onOpenSidebar }) {
  const label = useActivePageLabel()

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-ink/8">
      <div className="flex items-center justify-between gap-4 px-5 md:px-8 py-4">
        <div className="flex items-center gap-3">
          <button
            aria-label="Abrir menú"
            onClick={onOpenSidebar}
            className="lg:hidden p-2 rounded-xl bg-ink/5 text-ink/70"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="font-display text-lg font-medium text-ink">{label}</h2>
        </div>

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 font-body text-sm text-ink/55 hover:text-fucsia-600 transition-colors"
        >
          Ver sitio público
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </header>
  )
}
