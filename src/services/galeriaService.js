// ============================================================================
// Servicio de Galería — fábrica + instancia browser.
//
// `createGaleriaService(client)` construye el servicio contra CUALQUIER
// cliente de Supabase (browser o server). `galeriaService` (la instancia
// de abajo) es la que usa el Admin actual y sigue funcionando exactamente
// igual que antes: mismos imports, mismo comportamiento.
// ============================================================================

import { supabase } from '../lib/supabaseClient.js'
import { createContentService, uploadContentFile, removeContentFile, resolveFileName } from './contentService.js'

const TABLE = 'faby_galeria_items'
const BUCKET = 'faby_galeria'

/** Fábrica: crea el servicio de Galería para el cliente Supabase indicado. */
export function createGaleriaService(client) {
  const base = createContentService(client, TABLE)

  return {
    ...base,

    /** Sube una foto o video nuevo al bucket de la Galería. */
    async uploadMedia(file, explicitName) {
      const path = `${Date.now()}-${resolveFileName(file, explicitName)}`
      return uploadContentFile(client, BUCKET, path, file)
    },

    async removeMedia(path) {
      return removeContentFile(client, BUCKET, path)
    },
  }
}

// Instancia browser — la que usa el Admin. Import y comportamiento
// idénticos a los de antes de esta refactorización.
export const galeriaService = createGaleriaService(supabase)
