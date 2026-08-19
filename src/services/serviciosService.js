// ============================================================================
// Servicio de Servicios (tarjetas de servicios ofrecidos) — fábrica +
// instancia browser.
//
// `createServiciosService(client)` construye el servicio contra CUALQUIER
// cliente de Supabase (browser o server). `serviciosService` (la instancia
// de abajo) es la que usa el Admin actual y sigue funcionando exactamente
// igual que antes: mismos imports, mismo comportamiento.
// ============================================================================

import { supabase } from '../lib/supabaseClient'
import { createContentService, uploadContentFile, resolveFileName } from './contentService'

const TABLE = 'faby_servicios'
const BUCKET = 'faby_servicios'

/** Fábrica: crea el servicio de Servicios para el cliente Supabase indicado. */
export function createServiciosService(client) {
  const base = createContentService(client, TABLE)

  return {
    ...base,

    /** Sube la foto de una tarjeta de servicio y devuelve su URL pública. */
    async uploadImage(file, explicitName) {
      const path = `${Date.now()}-${resolveFileName(file, explicitName)}`
      return uploadContentFile(client, BUCKET, path, file)
    },
  }
}

// Instancia browser — la que usa el Admin. Import y comportamiento
// idénticos a los de antes de esta refactorización.
export const serviciosService = createServiciosService(supabase)
