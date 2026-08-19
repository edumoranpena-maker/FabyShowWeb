// ============================================================================
// Servicio de Hero — fábrica + instancia browser.
//
// `createHeroService(client)` construye el servicio contra CUALQUIER
// cliente de Supabase (browser o server). `heroService` (la instancia de
// abajo) es la que usa el Admin actual y sigue funcionando exactamente
// igual que antes: mismos imports, mismo comportamiento.
// ============================================================================

import { supabase } from '../lib/supabaseClient'
import { createContentService, uploadContentFile, removeContentFile, resolveFileName } from './contentService'

const TABLE = 'faby_hero_slides'
const BUCKET = 'faby_hero'

/** Fábrica: crea el servicio de Hero para el cliente Supabase indicado. */
export function createHeroService(client) {
  const base = createContentService(client, TABLE)

  return {
    ...base,

    /** Sube una foto nueva al bucket del Hero y devuelve su URL pública. */
    async uploadImage(file, explicitName) {
      const path = `${Date.now()}-${resolveFileName(file, explicitName)}`
      return uploadContentFile(client, BUCKET, path, file)
    },

    /** Elimina una foto del bucket (no borra el registro de la tabla). */
    async removeImage(path) {
      return removeContentFile(client, BUCKET, path)
    },
  }
}

// Instancia browser — la que usa el Admin. Import y comportamiento
// idénticos a los de antes de esta refactorización.
export const heroService = createHeroService(supabase)
