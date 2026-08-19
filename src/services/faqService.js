// ============================================================================
// Servicio de FAQ — fábrica + instancia browser.
//
// Preguntas/respuestas sin imágenes — wrapper directo sobre
// createContentService().
// ============================================================================

import { supabase } from '../lib/supabaseClient'
import { createContentService } from './contentService'

const TABLE = 'faby_faqs'

/** Fábrica: crea el servicio de FAQ para el cliente Supabase indicado. */
export function createFaqService(client) {
  return createContentService(client, TABLE)
}

// Instancia browser — la que usa el Admin. Import y comportamiento
// idénticos a los de antes de esta refactorización.
export const faqService = createFaqService(supabase)
