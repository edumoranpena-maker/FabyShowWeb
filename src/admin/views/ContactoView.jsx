import { useEffect, useState } from 'react'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import FormField from '../components/FormField'
import { contactoService } from '../../services/contactoService'

const fields = [
  { key: 'direccion', label: 'Dirección', type: 'text', required: true },
  { key: 'horario', label: 'Horario', type: 'text', required: true },
  { key: 'whatsapp_number', label: 'Número de WhatsApp', type: 'text', required: true, placeholder: '51931230749' },
  { key: 'instagram_url', label: 'Instagram (URL)', type: 'text' },
  { key: 'tiktok_url', label: 'TikTok (URL)', type: 'text' },
]

// A diferencia de las otras 6 secciones, Contacto es una fila única —
// no tiene lista, ni botón de crear/eliminar. Por eso no usa
// SectionCrudView y en su lugar es un formulario directo contra
// contactoService.get()/update().
export default function ContactoView() {
  const [values, setValues] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    contactoService
      .get()
      .then(setValues)
      .catch((err) => setError(err.message ?? 'No se pudo cargar la información.'))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {}
      fields.forEach((f) => {
        payload[f.key] = values[f.key]
      })
      const updated = await contactoService.update(payload)
      setValues(updated)
      setSaved(true)
    } catch (err) {
      setError(err.message ?? 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title="Contacto" description="Dirección, horario, WhatsApp y redes sociales del sitio." />

      {error && (
        <div className="flex items-center gap-2.5 bg-fucsia-50 border border-fucsia-100 rounded-xl px-4 py-3 mb-6">
          <AlertCircle className="w-4 h-4 text-fucsia-600 flex-shrink-0" />
          <p className="font-body text-sm text-fucsia-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-ink/40">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        values && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl border border-ink/8 shadow-card p-6 md:p-8 flex flex-col gap-4 max-w-lg"
          >
            {fields.map((field) => (
              <FormField key={field.key} field={field} value={values[field.key]} onChange={handleChange} />
            ))}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-body text-sm font-semibold text-white bg-party-gradient hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:translate-y-0"
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
              {saved && (
                <span className="inline-flex items-center gap-1.5 font-body text-sm text-celeste-600">
                  <CheckCircle2 className="w-4 h-4" />
                  Guardado
                </span>
              )}
            </div>
          </form>
        )
      )}
    </>
  )
}
