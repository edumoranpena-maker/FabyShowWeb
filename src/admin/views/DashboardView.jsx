import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { ADMIN_NAV } from '../navConfig'
import { useAuth } from '../../auth/useAuth'

export default function DashboardView() {
  const { user } = useAuth()
  const sections = ADMIN_NAV.filter((item) => item.to !== '/admin')

  return (
    <>
      <PageHeader
        title={`Hola${user?.email ? ', ' + user.email : ''} 👋`}
        description="Elige qué sección del sitio quieres editar."
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="group bg-white rounded-3xl border border-ink/8 shadow-card hover:shadow-soft p-6 flex items-center gap-4 transition-shadow duration-300"
          >
            <div className="w-11 h-11 rounded-2xl bg-morado-50 flex items-center justify-center flex-shrink-0 group-hover:bg-fucsia-50 transition-colors">
              <item.icon className="w-5 h-5 text-morado-600 group-hover:text-fucsia-600 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-medium text-ink">{item.label}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-ink/25 group-hover:text-fucsia-500 group-hover:translate-x-0.5 transition-all" />
          </Link>
        ))}
      </div>
    </>
  )
}
