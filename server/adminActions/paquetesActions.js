// ============================================================================
// AdminActions — Paquetes
//
// Los planes no tienen imágenes propias, así que esta fachada es un CRUD
// directo sobre paquetesService, sin nada de Storage.
// ============================================================================

import { createPaquetesService } from '../../src/services/paquetesService.js'
import { getServerSupabaseClient } from '../lib/supabaseServerClient.js'

function service() {
  return createPaquetesService(getServerSupabaseClient())
}

/** Lista todos los paquetes/planes. */
export async function listPaquetes() {
  return service().getAll()
}

/** Crea un paquete/plan nuevo. */
export async function createPaquete(values) {
  return service().create(values)
}

/** Actualiza un paquete/plan existente. */
export async function updatePaquete(id, values) {
  return service().update(id, values)
}

/** Elimina un paquete/plan. */
export async function deletePaquete(id) {
  return service().remove(id)
}
