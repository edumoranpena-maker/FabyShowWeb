import SectionCrudView from '../components/SectionCrudView'
import { serviciosService } from '../../services/serviciosService'

const fields = [
  { key: 'imagen_url', label: 'Foto', type: 'image', uploadFn: serviciosService.uploadImage },
  { key: 'titulo', label: 'Nombre del servicio', type: 'text', required: true, placeholder: 'Animadoras' },
  { key: 'orden', label: 'Orden', type: 'number', default: 0 },
  { key: 'activo', label: 'Visible en el sitio', type: 'checkbox', default: true },
]

export default function ServiciosView() {
  return (
    <SectionCrudView
      title="Servicios"
      description="Las tarjetas de servicios que ofrece Faby Show: una foto y el nombre."
      service={serviciosService}
      fields={fields}
      newLabel="Nuevo servicio"
      getTitle={(item) => item.titulo}
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
