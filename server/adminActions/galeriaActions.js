// ============================================================================
// AdminActions — Galería
//
// Fachada administrativa semántica sobre galeriaService. Ver
// heroActions.js para la explicación completa del patrón.
// ============================================================================

import { createGaleriaService } from '../../src/services/galeriaService.js'
import { extractStoragePathFromPublicUrl } from '../../src/services/contentService.js'
import { getServerSupabaseClient } from '../lib/supabaseServerClient.js'

const BUCKET = 'faby_galeria'

function service() {
  return createGaleriaService(getServerSupabaseClient())
}

/** Lista todos los elementos de la Galería. */
export async function listGaleriaItems() {
  return service().getAll()
}

/** Crea un elemento nuevo (foto o video) en la Galería. */
export async function createGaleriaItem(values) {
  return service().create(values)
}

/** Actualiza un elemento existente de la Galería. */
export async function updateGaleriaItem(id, values) {
  return service().update(id, values)
}

/**
 * Elimina un elemento de la Galería junto con su archivo de Storage
 * (best-effort). Ver la nota equivalente en heroActions.deleteHeroSlide.
 */
export async function deleteGaleriaItem(id) {
  const svc = service()
  const record = await svc.getById(id).catch(() => null)

  if (record?.src) {
    const path = extractStoragePathFromPublicUrl(record.src, BUCKET)
    if (path) {
      await svc.removeMedia(path).catch((err) => {
        console.error(`[AdminActions] No se pudo borrar el archivo de Storage del elemento de galería ${id}:`, err.message)
      })
    }
  }

  return svc.remove(id)
}

/** Sube una foto o video al bucket de la Galería y devuelve su URL pública. */
export async function uploadGaleriaMedia(file, explicitName) {
  return service().uploadMedia(file, explicitName)
}

/** Elimina un archivo del bucket de la Galería (sin tocar ningún registro). */
export async function removeGaleriaMedia(path) {
  return service().removeMedia(path)
}
