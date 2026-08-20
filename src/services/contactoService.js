// ============================================================================
// Servicio de Contacto — fábrica + instancia browser.
//
// faby_contacto es una fila única (singleton) — no tiene sentido un CRUD
// de lista, así que este servicio expone solo get/update en vez de
// reusar la fábrica genérica de contentService.js.
//
// `createContactoService(client)` construye el servicio contra CUALQUIER
// cliente de Supabase (browser o server). `contactoService` (la instancia
// de abajo) es la que usa el Admin actual y el sitio público, sin cambios
// de comportamiento.
// ============================================================================

import { supabase } from '../lib/supabaseClient.js'

const TABLE = 'faby_contacto'

function notConfiguredError() {
  return new Error(
    `El servicio de "${TABLE}" todavía no está conectado a Supabase. ` +
    'Configura src/lib/supabaseClient.js (browser) o las variables ' +
    'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (server) para activarlo.'
  )
}

/** Fábrica: crea el servicio de Contacto para el cliente Supabase indicado. */
export function createContactoService(client) {
  return {
    /** Obtiene la (única) fila de datos de contacto. */
    async get() {
      if (!client) throw notConfiguredError()
      const { data, error } = await client.from(TABLE).select('*').single()
      if (error) throw error
      return data
    },

    /** Actualiza los datos de contacto (siempre la misma fila). */
    async update(values) {
      if (!client) throw notConfiguredError()
      const current = await this.get()
      const { data, error } = await client
        .from(TABLE)
        .update(values)
        .eq('id', current.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
  }
}

// Instancia browser — la que usa el Admin y el sitio público. Import y
// comportamiento idénticos a los de antes de esta refactorización.
export const contactoService = createContactoService(supabase)
