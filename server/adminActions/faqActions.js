// ============================================================================
// AdminActions — FAQ
//
// Preguntas/respuestas sin imágenes — CRUD directo sobre faqService.
// ============================================================================

import { createFaqService } from '../../src/services/faqService.js'
import { getServerSupabaseClient } from '../lib/supabaseServerClient.js'

function service() {
  return createFaqService(getServerSupabaseClient())
}

/** Lista todas las preguntas frecuentes. */
export async function listFaqs() {
  return service().getAll()
}

/** Crea una pregunta frecuente nueva. */
export async function createFaq(values) {
  return service().create(values)
}

/** Actualiza una pregunta frecuente existente. */
export async function updateFaq(id, values) {
  return service().update(id, values)
}

/** Elimina una pregunta frecuente. */
export async function deleteFaq(id) {
  return service().remove(id)
}
