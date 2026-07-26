import { Construction } from 'lucide-react'

/**
 * Placeholder que usan todas las vistas de sección mientras no tienen
 * su editor implementado todavía. Reemplazar por el editor real de cada
 * sección es, en cada vista, cambiar únicamente lo que hay dentro de
 * <PageHeader/> + este componente — el layout, el guard de auth y la
 * navegación del sidebar no cambian.
 */
export default function ComingSoon({ label }) {
  return (
    <div className="bg-white rounded-4xl border border-ink/8 shadow-card p-12 flex flex-col items-center justify-center text-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-morado-50 flex items-center justify-center">
        <Construction className="w-7 h-7 text-morado-500" />
      </div>
      <div>
        <h2 className="font-display text-lg font-medium text-ink mb-1">
          El editor de {label} está en construcción
        </h2>
        <p className="font-body text-sm text-ink/55 max-w-md">
          Esta vista ya está conectada al layout, a la navegación y a la
          arquitectura de autenticación. En la próxima etapa se conecta
          aquí el CRUD real contra Supabase.
        </p>
      </div>
    </div>
  )
}
