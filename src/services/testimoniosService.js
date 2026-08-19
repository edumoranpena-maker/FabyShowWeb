// ============================================================================
// Servicio de Testimonios — fábrica + instancia browser.
//
// `createTestimoniosService(client)` construye el servicio contra
// CUALQUIER cliente de Supabase (browser o server). `testimoniosService`
// (la instancia de abajo) es la que usa el Admin actual y sigue
// funcionando exactamente igual que antes: mismos imports, mismo
// comportamiento.
// ============================================================================

import { supabase } from '../lib/supabaseClient'
import { createContentService, uploadContentFile, resolveFileName } from './contentService'

const TABLE = 'faby_testimonios'
const BUCKET = 'faby_testimonios'

function notConfiguredError() {
  return new Error(
    `El servicio de "${TABLE}" todavía no está conectado a Supabase. ` +
    'Configura src/lib/supabaseClient.js (browser) o las variables ' +
    'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (server) para activarlo.'
  )
}

/** Fábrica: crea el servicio de Testimonios para el cliente Supabase indicado. */
export function createTestimoniosService(client) {
  // Métodos de administración (listar todos incluidos los pendientes, crear,
  // editar, eliminar) — se comportan igual que cualquier otra sección.
  const base = createContentService(client, TABLE)

  return {
    ...base,

    /**
     * Lista solo los testimonios aprobados — lo que usa el sitio público.
     * (El admin usa getAll() de la fábrica genérica, que trae todos.)
     */
    async getAllAprobados() {
      if (!client) throw notConfiguredError()
      const { data, error } = await client
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
      if (!client) throw notConfiguredError()
      const { data, error } = await client
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
    async uploadFoto(file, explicitName) {
      const path = `${Date.now()}-${resolveFileName(file, explicitName)}`
      return uploadContentFile(client, BUCKET, path, file)
    },
  }
}

// Instancia browser — la que usa el Admin (y el formulario público de
// reseñas). Import y comportamiento idénticos a los de antes de esta
// refactorización.
export const testimoniosService = createTestimoniosService(supabase)
