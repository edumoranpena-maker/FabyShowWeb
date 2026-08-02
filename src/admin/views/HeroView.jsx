import SectionCrudView from '../components/SectionCrudView'
import { heroService } from '../../services/heroService'

const fields = [
  { key: 'image_url', label: 'Foto', type: 'image', uploadFn: heroService.uploadImage },
  { key: 'orden', label: 'Orden', type: 'number', default: 0 },
  { key: 'activo', label: 'Visible en el sitio', type: 'checkbox', default: true },
]

export default function HeroView() {
  return (
    <SectionCrudView
      title="Hero"
      description="Fotos del carrusel cinematográfico de la portada."
      service={heroService}
      fields={fields}
      newLabel="Nueva foto"
      getTitle={(item) => `Slide #${item.orden}`}
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
