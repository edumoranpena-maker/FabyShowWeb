// ============================================================================
// AdminActions — Hero
//
// Fachada administrativa semántica sobre heroService. NO duplica lógica:
// cada acción delega en el servicio existente (src/services/heroService.js),
// construido aquí con el cliente Supabase SERVER (service_role).
//
// Nada llama todavía a este módulo (Fase 1 = infraestructura). Está
// preparado para el futuro agente: Telegram → Agente → estas funciones.
// ============================================================================

import { createHeroService } from '../../src/services/heroService.js'
import { extractStoragePathFromPublicUrl } from '../../src/services/contentService.js'
import { getServerSupabaseClient } from '../lib/supabaseServerClient.js'

const BUCKET = 'faby_hero'

function service() {
  return createHeroService(getServerSupabaseClient())
}

/** Lista todos los slides del Hero. */
export async function listHeroSlides() {
  return service().getAll()
}

/** Crea un slide nuevo del Hero. */
export async function createHeroSlide(values) {
  return service().create(values)
}

/** Actualiza un slide existente del Hero. */
export async function updateHeroSlide(id, values) {
  return service().update(id, values)
}

/**
 * Elimina un slide del Hero de forma completa: intenta borrar primero el
 * archivo de Storage asociado (best-effort — si falla, se registra el
 * error pero NO bloquea el borrado del registro) y luego borra la fila.
 *
 * Esto es intencionalmente más completo que `service.remove(id)`, que es
 * lo que usa hoy el Admin web y que SOLO borra la fila (ver informe,
 * sección "Eliminaciones" — es un comportamiento existente que esta fase
 * no modifica en el Admin, pero que AdminActions sí corrige para el
 * futuro agente).
 */
export async function deleteHeroSlide(id) {
  const svc = service()
  const record = await svc.getById(id).catch(() => null)

  if (record?.image_url) {
    const path = extractStoragePathFromPublicUrl(record.image_url, BUCKET)
    if (path) {
      await svc.removeImage(path).catch((err) => {
        console.error(`[AdminActions] No se pudo borrar el archivo de Storage del hero slide ${id}:`, err.message)
      })
    }
  }

  return svc.remove(id)
}

/** Sube una imagen al bucket del Hero y devuelve su URL pública. */
export async function uploadHeroImage(file, explicitName) {
  return service().uploadImage(file, explicitName)
}

/** Elimina una imagen del bucket del Hero (sin tocar ningún registro). */
export async function removeHeroImage(path) {
  return service().removeImage(path)
}
