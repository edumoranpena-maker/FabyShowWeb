import { useState } from 'react'
import { ImagePlus, Loader2 } from 'lucide-react'

/**
 * Campo de subida de imagen/video: muestra preview + botón de subida.
 * "uploadFn" es la función del servicio de la sección (ej.
 * heroService.uploadImage) que sube el archivo a su bucket de Storage
 * y devuelve la URL pública — este componente no sabe nada de Supabase,
 * solo llama a la función que le pasan.
 */
export default function ImageUploadField({ label, value, onChange, uploadFn, accept = 'image/*' }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const url = await uploadFn(file)
      onChange(url)
    } catch (err) {
      setError(err.message ?? 'No se pudo subir el archivo.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div>
      <label className="font-body text-sm font-medium text-ink/70 mb-1.5 block">{label}</label>
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-xl bg-ink/5 overflow-hidden flex items-center justify-center flex-shrink-0">
          {value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImagePlus className="w-6 h-6 text-ink/25" />
          )}
        </div>
        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-morado-50 text-morado-600 font-body text-sm font-medium cursor-pointer hover:bg-morado-100 transition-colors">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          {uploading ? 'Subiendo…' : 'Subir archivo'}
          <input type="file" accept={accept} className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
      </div>
      {error && <p className="font-body text-xs text-fucsia-600 mt-2">{error}</p>}
    </div>
  )
}
