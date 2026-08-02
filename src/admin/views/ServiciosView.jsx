import SectionCrudView from '../components/SectionCrudView'
import { serviciosService } from '../../services/serviciosService'

const fields = [
  { key: 'titulo', label: 'Título', type: 'text', required: true },
  { key: 'descripcion', label: 'Descripción', type: 'textarea', required: true },
  {
    key: 'icon',
    label: 'Ícono (nombre de lucide-react)',
    type: 'text',
    placeholder: 'Drama, Sparkles, Wand2…',
    required: true,
  },
  { key: 'orden', label: 'Orden', type: 'number', default: 0 },
  { key: 'activo', label: 'Visible en el sitio', type: 'checkbox', default: true },
]

export default function ServiciosView() {
  return (
    <SectionCrudView
      title="Servicios"
      description="Las tarjetas de servicios que ofrece Faby Show. El ícono debe ser un nombre válido de lucide-react (lucide.dev/icons)."
      service={serviciosService}
      fields={fields}
      newLabel="Nuevo servicio"
      getTitle={(item) => item.titulo}
      getSubtitle={(item) => item.descripcion}
      renderBadges={(item) =>
        !item.activo && (
          <span className="text-xs font-body font-medium text-ink/40 bg-ink/5 px-2.5 py-1 rounded-full">
            Oculto
          </span>
        )
      }
    />
  )
}
