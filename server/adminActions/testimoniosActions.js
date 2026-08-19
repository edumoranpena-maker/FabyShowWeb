// ============================================================================
// AdminActions — Testimonios
//
// Fachada administrativa semántica sobre testimoniosService. Ver
// heroActions.js para la explicación completa del patrón.
//
// Nota: testimoniosService (igual que hoy en el Admin) no expone un
// método dedicado de "removeFoto" — usamos removeContentFile directamente
// para el borrado best-effort, igual que en serviciosActions.js.
// ============================================================================

import { createTestimoniosService } from '../../src/services/testimoniosService.js'
import { removeContentFile, extractStoragePathFromPublicUrl } from '../../src/services/contentService.js'
import { getServerSupabaseClient } from '../lib/supabaseServerClient.js'

const BUCKET = 'faby_testimonios'

function service() {
  return createTestimoniosService(getServerSupabaseClient())
}

/** Lista todos los testimonios (aprobados y pendientes). */
export async function listTestimonios() {
  return service().getAll()
}

/** Lista solo los testimonios pendientes de aprobación. */
export async function listPendingTestimonios() {
  const all = await service().getAll()
  return all.filter((t) => !t.aprobado)
}

/** Crea un testimonio nuevo (uso administrativo — no el formulario público). */
export async function createTestimonio(values) {
  return service().create(values)
}

/** Actualiza un testimonio existente. */
export async function updateTestimonio(id, values) {
  return service().update(id, values)
}

/**
 * Elimina un testimonio junto con su foto de Storage, si tenía una
 * (best-effort). Ver la nota equivalente en heroActions.deleteHeroSlide.
 */
export async function deleteTestimonio(id) {
  const svc = service()
  const client = getServerSupabaseClient()
  const record = await svc.getById(id).catch(() => null)

  if (record?.foto_url) {
    const path = extractStoragePathFromPublicUrl(record.foto_url, BUCKET)
    if (path) {
      await removeContentFile(client, BUCKET, path).catch((err) => {
        console.error(`[AdminActions] No se pudo borrar la foto de Storage del testimonio ${id}:`, err.message)
      })
    }
  }

  return svc.remove(id)
}

/** Aprueba un testimonio pendiente para que se muestre en el sitio. */
export async function approveTestimonio(id) {
  return service().aprobar(id)
}

/** Sube la foto de un testimonio y devuelve su URL pública. */
export async function uploadTestimonioFoto(file, explicitName) {
  return service().uploadFoto(file, explicitName)
}
