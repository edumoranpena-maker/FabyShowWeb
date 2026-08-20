// ============================================================================
// Servicio de Paquetes — fábrica + instancia browser.
//
// Los planes no tienen imágenes propias — no necesita bucket de Storage,
// así que es un wrapper directo sobre createContentService().
// ============================================================================

import { supabase } from '../lib/supabaseClient.js'
import { createContentService } from './contentService.js'

const TABLE = 'faby_paquetes'

/** Fábrica: crea el servicio de Paquetes para el cliente Supabase indicado. */
export function createPaquetesService(client) {
  return createContentService(client, TABLE)
}

// Instancia browser — la que usa el Admin. Import y comportamiento
// idénticos a los de antes de esta refactorización.
export const paquetesService = createPaquetesService(supabase)
