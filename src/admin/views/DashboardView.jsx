import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { ADMIN_NAV } from '../navConfig'
import { useAuth } from '../../auth/useAuth'
import { heroService } from '../../services/heroService'
import { galeriaService } from '../../services/galeriaService'
import { serviciosService } from '../../services/serviciosService'
import { paquetesService } from '../../services/paquetesService'
import { testimoniosService } from '../../services/testimoniosService'
import { faqService } from '../../services/faqService'

const COUNTERS = [
  { to: '/admin/hero', label: 'Fotos en el Hero', service: heroService },
  { to: '/admin/galeria', label: 'Elementos en Galería', service: galeriaService },
  { to: '/admin/servicios', label: 'Servicios', service: serviciosService },
  { to: '/admin/paquetes', label: 'Paquetes', service: paquetesService },
  { to: '/admin/testimonios', label: 'Testimonios', service: testimoniosService },
  { to: '/admin/faq', label: 'Preguntas frecuentes', service: faqService },
]

export default function DashboardView() {
  const { user } = useAuth()
  // undefined = cargando, null = falló (ej. Supabase aún no conectado), numero = ok
  const [counts, setCounts] = useState({})

  useEffect(() => {
    let cancelled = false
    COUNTERS.forEach(({ to, service }) => {
      service
        .getAll()
        .then((items) => {
          if (!cancelled) setCounts((prev) => ({ ...prev, [to]: items.length }))
        })
        .catch(() => {
          if (!cancelled) setCounts((prev) => ({ ...prev, [to]: null }))
        })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const sections = ADMIN_NAV.filter((item) => item.to !== '/admin')

  return (
    <>
      <PageHeader
        title={`Hola${user?.email ? ', ' + user.email : ''} 👋`}
        description="Resumen del contenido del sitio."
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {COUNTERS.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="bg-white rounded-3xl border border-ink/8 shadow-card p-6 hover:shadow-soft transition-shadow"
          >
            <p className="font-display text-3xl font-semibold text-ink mb-1">
              {counts[c.to] === undefined ? '…' : counts[c.to] === null ? '—' : counts[c.to]}
            </p>
            <p className="font-body text-sm text-ink/55">{c.label}</p>
          </Link>
        ))}
      </div>

      <h2 className="font-display text-base font-medium text-ink/70 mb-4">Accesos rápidos</h2>
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
