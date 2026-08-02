import SectionCrudView from '../components/SectionCrudView'
import { paquetesService } from '../../services/paquetesService'

const fields = [
  { key: 'nombre', label: 'Nombre del plan', type: 'text', required: true },
  { key: 'duracion', label: 'Duración', type: 'text', required: true, placeholder: '2.5 horas' },
  { key: 'precio', label: 'Precio', type: 'text', required: true, placeholder: 'Desde S/ 650' },
  { key: 'incluye', label: 'Incluye (un ítem por línea)', type: 'list', default: [] },
  { key: 'destacado', label: 'Marcar como "Más elegido"', type: 'checkbox', default: false },
  { key: 'orden', label: 'Orden', type: 'number', default: 0 },
  { key: 'activo', label: 'Visible en el sitio', type: 'checkbox', default: true },
]

export default function PaquetesView() {
  return (
    <SectionCrudView
      title="Paquetes"
      description="Los planes y precios que se muestran en la sección de paquetes."
      service={paquetesService}
      fields={fields}
      newLabel="Nuevo plan"
      getTitle={(item) => item.nombre}
      getSubtitle={(item) => item.precio}
      renderBadges={(item) => (
        <>
          {item.destacado && (
            <span className="text-xs font-body font-semibold text-amarillo-700 bg-amarillo-50 px-2.5 py-1 rounded-full">
              Más elegido
            </span>
          )}
          {!item.activo && (
            <span className="text-xs font-body font-medium text-ink/40 bg-ink/5 px-2.5 py-1 rounded-full">
              Oculto
            </span>
          )}
        </>
      )}
    />
  )
}
