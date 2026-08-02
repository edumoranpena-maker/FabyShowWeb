import SectionCrudView from '../components/SectionCrudView'
import { faqService } from '../../services/faqService'

const fields = [
  { key: 'pregunta', label: 'Pregunta', type: 'text', required: true },
  { key: 'respuesta', label: 'Respuesta', type: 'textarea', required: true },
  { key: 'orden', label: 'Orden', type: 'number', default: 0 },
  { key: 'activo', label: 'Visible en el sitio', type: 'checkbox', default: true },
]

export default function FAQView() {
  return (
    <SectionCrudView
      title="Preguntas frecuentes"
      description="Las preguntas y respuestas del accordion de FAQ."
      service={faqService}
      fields={fields}
      newLabel="Nueva pregunta"
      getTitle={(item) => item.pregunta}
      getSubtitle={(item) => item.respuesta}
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
