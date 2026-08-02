import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

const TABLE = 'faby_contacto'

function notConfiguredError() {
  return new Error(
    `El servicio de "${TABLE}" todavía no está conectado a Supabase. ` +
    'Configura src/lib/supabaseClient.js para activarlo.'
  )
}

// faby_contacto es una fila única (singleton) — no tiene sentido un CRUD
// de lista, así que este servicio expone solo get/update en vez de
// reusar la fábrica genérica de contentService.js.
export const contactoService = {
  /** Obtiene la (única) fila de datos de contacto. */
  async get() {
    if (!isSupabaseConfigured) throw notConfiguredError()
    const { data, error } = await supabase.from(TABLE).select('*').single()
    if (error) throw error
    return data
  },

  /** Actualiza los datos de contacto (siempre la misma fila). */
  async update(values) {
    if (!isSupabaseConfigured) throw notConfiguredError()
    const current = await this.get()
    const { data, error } = await supabase
      .from(TABLE)
      .update(values)
      .eq('id', current.id)
      .select()
      .single()
    if (error) throw error
    return data
  },
}
