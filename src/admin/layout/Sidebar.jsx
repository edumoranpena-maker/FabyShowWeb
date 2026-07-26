import { NavLink } from 'react-router-dom'
import { LogOut, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ADMIN_NAV } from '../navConfig'
import { useAuth } from '../../auth/useAuth'

function SidebarContent({ onNavigate }) {
  const { user, signOut } = useAuth()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <img src="/avatar-faby-show.png" alt="" className="w-9 h-9 rounded-full object-cover" />
        <div>
          <p className="font-display font-semibold text-ink leading-tight">Faby Show</p>
          <p className="font-body text-xs text-ink/45 leading-tight">Panel de administración</p>
        </div>
      </div>

      <nav className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
        {ADMIN_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-body text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-fucsia-50 text-fucsia-600'
                  : 'text-ink/60 hover:bg-ink/5 hover:text-ink'
              }`
            }
          >
            <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-ink/8">
        <div className="px-3.5 py-2 mb-1">
          <p className="font-body text-xs text-ink/40 truncate">
            {user?.email ?? 'Sesión sin conectar'}
          </p>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-body text-sm font-medium text-ink/60 hover:bg-fucsia-50 hover:text-fucsia-600 transition-colors"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

/**
 * Sidebar de escritorio (fija) + drawer móvil (overlay). `open`/`onClose`
 * controlan el drawer móvil; en desktop el sidebar siempre está visible
 * vía el "hidden lg:flex" de abajo, independiente de ese estado.
 */
export default function Sidebar({ open, onClose }) {
  return (
    <>
      <aside className="hidden lg:flex lg:flex-col w-64 flex-shrink-0 bg-white border-r border-ink/8">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-ink/50 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 top-0 h-full w-72 bg-white shadow-2xl"
            >
              <button
                aria-label="Cerrar menú"
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-xl bg-ink/5"
              >
                <X className="w-5 h-5 text-ink/60" />
              </button>
              <SidebarContent onNavigate={onClose} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
