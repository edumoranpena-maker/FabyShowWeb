import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { createContentService, uploadContentFile } from './contentService'

const TABLE = 'faby_testimonios'
const BUCKET = 'faby_testimonios'

function notConfiguredError() {
  return new Error(
    `El servicio de "${TABLE}" todavía no está conectado a Supabase. ` +
    'Configura src/lib/supabaseClient.js para activarlo.'
  )
}

// Métodos de administración (listar todos incluidos los pendientes, crear,
// editar, eliminar) — se comportan igual que cualquier otra sección.
const base = createContentService(TABLE)

export const testimoniosService = {
  ...base,

  /**
   * Lista solo los testimonios aprobados — lo que usa el sitio público.
   * (El admin usa getAll() de la fábrica genérica, que trae todos.)
   */
  async getAllAprobados() {
    if (!isSupabaseConfigured) throw notConfiguredError()
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('aprobado', true)
      .order('orden')
    if (error) throw error
    return data
  },

  /**
   * Envío público desde el formulario "Escribe una reseña" del sitio.
   * Se fuerza aprobado=false en el cliente Y además la política RLS de
   * INSERT para el rol "anon" exige aprobado=false — así que aunque este
   * método se manipulara, la base de datos igual lo rechazaría si alguien
   * intentara mandar una reseña ya aprobada.
   */
  async submitPublico({ nombre, evento, texto, estrellas, foto_url }) {
    if (!isSupabaseConfigured) throw notConfiguredError()
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ nombre, evento, texto, estrellas, foto_url, aprobado: false })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Aprueba una reseña pendiente para que empiece a mostrarse en el sitio. */
  async aprobar(id) {
    return base.update(id, { aprobado: true })
  },

  /** Sube la foto de un testimonio al bucket correspondiente. */
  async uploadFoto(file) {
    const path = `${Date.now()}-${file.name}`
    return uploadContentFile(BUCKET, path, file)
  },
}
