// ============================================================================
// Fábrica de servicios de contenido — el patrón que va a usar CADA sección
// editable del CMS (Hero, Galería, Servicios, Paquetes, Testimonios, FAQ,
// Contacto) para hablar con Supabase Database (y Storage, cuando aplique).
//
// Por qué una fábrica en vez de un archivo por sección escrito a mano:
// todas las secciones necesitan las mismas 5 operaciones (listar, obtener
// una, crear, actualizar, eliminar). Centralizar esa lógica acá significa
// que conectar Supabase es escribir el cuerpo de ESTAS funciones una sola
// vez — cada servicio de sección (ver src/services/heroService.js, etc.)
// ya está escrito y no necesita tocarse.
//
// Estado actual (sin Supabase conectado): cada método lanza un error
// explícito y descriptivo en vez de fallar en silencio o devolver datos
// falsos — así cualquier vista que intente usarlos hoy muestra con
// claridad que la conexión todavía está pendiente, en vez de comportarse
// de forma inconsistente.
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
 * @param {string} table - nombre de la tabla en Supabase (ej. "hero_slides")
 */
export function createContentService(table) {
  return {
    /** Lista todos los registros de la tabla. */
    async getAll() {
      if (!isSupabaseConfigured) throw notConfiguredError(table)
      const { data, error } = await supabase.from(table).select('*').order('created_at')
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
 * pública. Pensado para las imágenes/videos de Hero y Galería.
 * @param {string} bucket - nombre del bucket (ej. "hero-gallery")
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
