// ============================================================================
// AdminActions — Contacto
//
// faby_contacto es una fila única — solo lectura y actualización, igual
// que contactoService.
// ============================================================================

import { createContactoService } from '../../src/services/contactoService.js'
import { getServerSupabaseClient } from '../lib/supabaseServerClient.js'

function service() {
  return createContactoService(getServerSupabaseClient())
}

/** Obtiene los datos de contacto (dirección, horario, WhatsApp, redes). */
export async function getContacto() {
  return service().get()
}

/** Actualiza los datos de contacto. */
export async function updateContacto(values) {
  return service().update(values)
}
