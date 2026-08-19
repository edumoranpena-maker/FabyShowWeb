// ============================================================================
// AdminActions — Servicios (tarjetas de servicios ofrecidos)
//
// Fachada administrativa semántica sobre serviciosService. Ver
// heroActions.js para la explicación completa del patrón.
//
// Nota: serviciosService (igual que hoy en el Admin) no expone un método
// dedicado de "removeImage" — por eso aquí usamos removeContentFile
// directamente, el mismo helper de bajo nivel que usan los demás
// servicios. No se está inventando lógica nueva, solo reutilizando la
// función compartida de src/services/contentService.js.
// ============================================================================

import { createServiciosService } from '../../src/services/serviciosService.js'
import { removeContentFile, extractStoragePathFromPublicUrl } from '../../src/services/contentService.js'
import { getServerSupabaseClient } from '../lib/supabaseServerClient.js'

const BUCKET = 'faby_servicios'

function service() {
  return createServiciosService(getServerSupabaseClient())
}

/** Lista todos los servicios. */
export async function listServicios() {
  return service().getAll()
}

/** Crea un servicio nuevo. */
export async function createServicio(values) {
  return service().create(values)
}

/** Actualiza un servicio existente. */
export async function updateServicio(id, values) {
  return service().update(id, values)
}

/**
 * Elimina un servicio junto con su imagen de Storage (best-effort). Ver
 * la nota equivalente en heroActions.deleteHeroSlide.
 */
export async function deleteServicio(id) {
  const svc = service()
  const client = getServerSupabaseClient()
  const record = await svc.getById(id).catch(() => null)

  if (record?.imagen_url) {
    const path = extractStoragePathFromPublicUrl(record.imagen_url, BUCKET)
    if (path) {
      await removeContentFile(client, BUCKET, path).catch((err) => {
        console.error(`[AdminActions] No se pudo borrar el archivo de Storage del servicio ${id}:`, err.message)
      })
    }
  }

  return svc.remove(id)
}

/** Sube la imagen de una tarjeta de servicio y devuelve su URL pública. */
export async function uploadServicioImage(file, explicitName) {
  return service().uploadImage(file, explicitName)
}
