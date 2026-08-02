import SectionCrudView from '../components/SectionCrudView'
import { galeriaService } from '../../services/galeriaService'

const fields = [
  { key: 'src', label: 'Foto o video', type: 'image', uploadFn: galeriaService.uploadMedia, accept: 'image/*,video/*' },
  { key: 'categoria', label: 'Categoría', type: 'text', required: true, placeholder: 'Animación, Personajes, DJ…' },
  {
    key: 'tipo',
    label: 'Tipo',
    type: 'select',
    options: [
      { value: 'foto', label: 'Foto' },
      { value: 'video', label: 'Video' },
    ],
    default: 'foto',
  },
  {
    key: 'alto',
    label: 'Tamaño en la grilla',
    type: 'select',
    options: [
      { value: 'medio', label: 'Medio' },
      { value: 'alto', label: 'Alto' },
    ],
    default: 'medio',
  },
  { key: 'orden', label: 'Orden', type: 'number', default: 0 },
  { key: 'activo', label: 'Visible en el sitio', type: 'checkbox', default: true },
]

export default function GaleriaView() {
  return (
    <SectionCrudView
      title="Galería"
      description="Fotos y videos que se muestran en la sección de galería."
      service={galeriaService}
      fields={fields}
      newLabel="Nuevo elemento"
      getTitle={(item) => item.categoria}
      getSubtitle={(item) => item.tipo}
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
