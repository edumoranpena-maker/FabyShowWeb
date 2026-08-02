import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import SectionCrudView from '../components/SectionCrudView'
import { testimoniosService } from '../../services/testimoniosService'

const fields = [
  { key: 'nombre', label: 'Nombre', type: 'text', required: true },
  { key: 'evento', label: '¿En qué evento nos viste?', type: 'text', placeholder: 'Cumpleaños de Zoe, 2 años' },
  { key: 'texto', label: 'Reseña', type: 'textarea', required: true },
  { key: 'estrellas', label: 'Estrellas (1-5)', type: 'number', default: 5, min: 1, max: 5 },
  { key: 'foto_url', label: 'Foto (opcional)', type: 'image', uploadFn: testimoniosService.uploadFoto },
  { key: 'aprobado', label: 'Aprobado (visible en el sitio)', type: 'checkbox', default: true },
  { key: 'orden', label: 'Orden', type: 'number', default: 0 },
]

// Los pendientes de moderar van primero, para que nunca se pierdan entre
// los que ya están aprobados y visibles en el sitio.
function sortItems(items) {
  return [...items].sort((a, b) => Number(a.aprobado) - Number(b.aprobado))
}

export default function TestimoniosView() {
  const [approvingId, setApprovingId] = useState(null)

  return (
    <SectionCrudView
      title="Testimonios"
      description="Reseñas de clientes. Las que llegan desde el formulario público del sitio quedan pendientes de aprobación hasta que las revises acá."
      service={testimoniosService}
      fields={fields}
      newLabel="Nuevo testimonio"
      sortItems={sortItems}
      getTitle={(item) => item.nombre}
      getSubtitle={(item) => item.evento}
      renderBadges={(item) =>
        !item.aprobado && (
          <span className="text-xs font-body font-semibold text-amarillo-700 bg-amarillo-50 px-2.5 py-1 rounded-full">
            Pendiente
          </span>
        )
      }
      extraActions={(item, { reload }) =>
        !item.aprobado && (
          <button
            aria-label="Aprobar"
            disabled={approvingId === item.id}
            onClick={async () => {
              setApprovingId(item.id)
              try {
                await testimoniosService.aprobar(item.id)
                await reload()
              } finally {
                setApprovingId(null)
              }
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-ink/50 hover:bg-celeste-50 hover:text-celeste-600 transition-colors"
          >
            {approvingId === item.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
          </button>
        )
      }
    />
  )
}
