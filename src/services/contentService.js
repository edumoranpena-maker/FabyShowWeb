// ============================================================================
// Fábrica de servicios de contenido — el patrón que usa cada sección
// editable del CMS (Hero, Galería, Servicios, Paquetes, Testimonios, FAQ,
// Contacto) para hablar con Supabase Database y Storage.
//
// Esta capa es agnóstica de QUIÉN la llama: recibe siempre un cliente de
// Supabase ya construido (`client`) en vez de importar un singleton
// propio. Eso permite que el mismo servicio funcione:
//
//   - desde el Admin web, con el cliente browser (anon key + RLS), o
//   - desde el futuro agente (vía AdminActions), con el cliente server
//     (service_role), sin duplicar ni una línea de lógica.
//
// Si `client` es null/undefined (Supabase todavía no configurado en ese
// entorno), cada método lanza un error explícito y descriptivo en vez de
// fallar en silencio o devolver datos falsos.
// ============================================================================

function notConfiguredError(table) {
  return new Error(
    `El servicio de "${table}" todavía no está conectado a Supabase. ` +
    'Configura src/lib/supabaseClient.js (browser) o las variables ' +
    'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (server) para activarlo.'
  )
}

/**
 * Resuelve el nombre a usar para un archivo subido a Storage.
 *
 * En el navegador, los `<input type="file">` entregan objetos `File`, que
 * ya traen `.name` — ese es el caso de uso actual y sigue funcionando
 * exactamente igual que antes. Un futuro origen server-side (ej. un
 * archivo descargado desde Telegram) puede entregar un `Buffer`/`Blob`
 * sin ese campo; en ese caso hay que pasar `explicitName` explícitamente.
 *
 * @param {File|Blob|Buffer|Uint8Array} file
 * @param {string} [explicitName]
 */
export function resolveFileName(file, explicitName) {
  if (explicitName) return explicitName
  if (file && typeof file.name === 'string' && file.name.length > 0) return file.name
  return `archivo-${Date.now()}`
}

/**
 * Crea el servicio CRUD para una tabla de Supabase.
 * @param {import('@supabase/supabase-js').SupabaseClient|null} client - cliente de Supabase (browser o server)
 * @param {string} table - nombre de la tabla en Supabase (ej. "faby_hero_slides")
 * @param {string} orderBy - columna por la que ordenar getAll() (default: "orden")
 */
export function createContentService(client, table, orderBy = 'orden') {
  return {
    /** Lista todos los registros de la tabla, ordenados. */
    async getAll() {
      if (!client) throw notConfiguredError(table)
      const { data, error } = await client.from(table).select('*').order(orderBy)
      if (error) throw error
      return data
    },

    /** Obtiene un único registro por id. */
    async getById(id) {
      if (!client) throw notConfiguredError(table)
      const { data, error } = await client.from(table).select('*').eq('id', id).single()
      if (error) throw error
      return data
    },

    /** Crea un registro nuevo. */
    async create(values) {
      if (!client) throw notConfiguredError(table)
      const { data, error } = await client.from(table).insert(values).select().single()
      if (error) throw error
      return data
    },

    /** Actualiza un registro existente. */
    async update(id, values) {
      if (!client) throw notConfiguredError(table)
      const { data, error } = await client.from(table).update(values).eq('id', id).select().single()
      if (error) throw error
      return data
    },

    /** Elimina un registro. */
    async remove(id) {
      if (!client) throw notConfiguredError(table)
      const { error } = await client.from(table).delete().eq('id', id)
      if (error) throw error
    },
  }
}

/**
 * Sube un archivo a un bucket de Supabase Storage y devuelve su URL
 * pública. Pensado para las imágenes de Hero, Galería, Servicios y
 * Testimonios.
 * @param {import('@supabase/supabase-js').SupabaseClient|null} client - cliente de Supabase (browser o server)
 * @param {string} bucket - nombre del bucket (ej. "faby_hero")
 * @param {string} path - ruta dentro del bucket (ej. "slide-1.jpg")
 * @param {File|Blob|Buffer|Uint8Array} file
 */
export async function uploadContentFile(client, bucket, path, file) {
  if (!client) throw notConfiguredError(`storage:${bucket}`)

  const { error: uploadError } = await client.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })
  if (uploadError) throw uploadError

  const { data } = client.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

/** Elimina un archivo de un bucket de Storage. */
export async function removeContentFile(client, bucket, path) {
  if (!client) throw notConfiguredError(`storage:${bucket}`)
  const { error } = await client.storage.from(bucket).remove([path])
  if (error) throw error
}

/**
 * Extrae la ruta interna de Storage (la que espera `.remove([path])`) a
 * partir de una URL pública generada por `getPublicUrl()`. Se usa en
 * AdminActions para poder borrar el archivo asociado a un registro antes
 * de borrar el registro mismo, ya que las tablas solo guardan la URL
 * pública completa, no la ruta interna.
 *
 * Devuelve `null` si la URL no tiene el formato esperado (ej. viene de
 * otro dominio/CDN) — quien la llame debe tratar ese caso como "no se
 * pudo determinar la ruta, no se puede borrar el archivo automáticamente".
 *
 * @param {string} publicUrl
 * @param {string} bucket
 */
export function extractStoragePathFromPublicUrl(publicUrl, bucket) {
  if (!publicUrl || typeof publicUrl !== 'string') return null
  const marker = `/storage/v1/object/public/${bucket}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return null
  const rawPath = publicUrl.slice(idx + marker.length)
  try {
    return decodeURIComponent(rawPath)
  } catch {
    return rawPath
  }
}
