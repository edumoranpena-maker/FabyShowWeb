// ============================================================================
// Fábrica de servicios de contenido — el patrón que usa cada sección
// editable del CMS (Hero, Galería, Servicios, Paquetes, Testimonios, FAQ,
// Contacto) para hablar con Supabase Database y Storage.
//
// Estado actual (sin Supabase conectado): cada método lanza un error
// explícito y descriptivo en vez de fallar en silencio o devolver datos
// falsos — así cualquier vista que intente usarlos hoy muestra con
// claridad que la conexión todavía está pendiente.
// ============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

function notConfiguredError(table) {
  return new Error(
    `El servicio de "${table}" todavía no está conectado a Supabase. ` +
    'Configura src/lib/supabaseClient.js para activarlo.'
  )
}

/**
 * Crea el servicio CRUD para una tabla de Supabase.
 * @param {string} table - nombre de la tabla en Supabase (ej. "faby_hero_slides")
 * @param {string} orderBy - columna por la que ordenar getAll() (default: "orden")
 */
export function createContentService(table, orderBy = 'orden') {
  return {
    /** Lista todos los registros de la tabla, ordenados. */
    async getAll() {
      if (!isSupabaseConfigured) throw notConfiguredError(table)
      const { data, error } = await supabase.from(table).select('*').order(orderBy)
      if (error) throw error
      return data
    },

    /** Obtiene un único registro por id. */
    async getById(id) {
      if (!isSupabaseConfigured) throw notConfiguredError(table)
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single()
      if (error) throw error
      return data
    },

    /** Crea un registro nuevo. */
    async create(values) {
      if (!isSupabaseConfigured) throw notConfiguredError(table)
      const { data, error } = await supabase.from(table).insert(values).select().single()
      if (error) throw error
      return data
    },

    /** Actualiza un registro existente. */
    async update(id, values) {
      if (!isSupabaseConfigured) throw notConfiguredError(table)
      const { data, error } = await supabase.from(table).update(values).eq('id', id).select().single()
      if (error) throw error
      return data
    },

    /** Elimina un registro. */
    async remove(id) {
      if (!isSupabaseConfigured) throw notConfiguredError(table)
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    },
  }
}

/**
 * Sube un archivo a un bucket de Supabase Storage y devuelve su URL
 * pública. Pensado para las imágenes de Hero, Galería y Testimonios.
 * @param {string} bucket - nombre del bucket (ej. "faby_hero")
 * @param {string} path - ruta dentro del bucket (ej. "slide-1.jpg")
 * @param {File} file
 */
export async function uploadContentFile(bucket, path, file) {
  if (!isSupabaseConfigured) throw notConfiguredError(`storage:${bucket}`)

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

/** Elimina un archivo de un bucket de Storage. */
export async function removeContentFile(bucket, path) {
  if (!isSupabaseConfigured) throw notConfiguredError(`storage:${bucket}`)
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}
