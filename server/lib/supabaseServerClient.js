// ============================================================================
// Cliente de Supabase (SERVER) — infraestructura para Fase 2 (agente).
//
// Este archivo vive DELIBERADAMENTE fuera de `src/`, para que Vite jamás
// pueda incluirlo en el bundle del navegador aunque alguien lo importe por
// error desde un componente. Es el único lugar del proyecto que conoce
// `SUPABASE_SERVICE_ROLE_KEY`.
//
// REGLAS:
//   - NUNCA importar este archivo desde src/admin, src/components, ni
//     ningún módulo que Vite empaquete para el navegador.
//   - `SUPABASE_SERVICE_ROLE_KEY` se lee de `process.env`, NUNCA con el
//     prefijo VITE_ (si tuviera ese prefijo, Vite la expondría al bundle
//     del cliente — justo lo que no queremos).
//   - El cliente se crea de forma perezosa (lazy) y cacheada, no al
//     importar el módulo, para que este archivo se pueda importar sin
//     efectos secundarios incluso antes de que existan las variables de
//     entorno server-side (ej. durante el build del frontend, o en tests).
//
// ESTADO ACTUAL (Fase 1): esta función no la llama todavía ningún código
// en ejecución. Es infraestructura preparada para AdminActions y para el
// futuro agente — ver server/adminActions/.
// ============================================================================

import { createClient } from '@supabase/supabase-js'

let cachedClient = null

/**
 * Devuelve el cliente Supabase server-side (service_role), creándolo la
 * primera vez que se pide y cacheándolo para el resto de esta instancia
 * serverless. Si faltan las variables de entorno, o si `createClient()`
 * falla, LANZA un error con el motivo específico (no devuelve `null` en
 * silencio) — así el motivo real llega hasta el log de la acción que
 * falló, en vez de perderse en el camino como un "no configurado" genérico.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getServerSupabaseClient() {
  if (typeof window !== 'undefined') {
    // Defensa en profundidad: si esto llegara a ejecutarse en un
    // navegador (por un import indebido), rechazamos explícitamente en
    // vez de arriesgarnos a filtrar la service_role key.
    throw new Error(
      'getServerSupabaseClient() no debe llamarse nunca desde el navegador. ' +
      'Este cliente usa la service_role key y solo puede vivir server-side.'
    )
  }

  if (cachedClient) return cachedClient

  // .trim() defensivo: si el valor se pegó en Vercel con un salto de línea
  // o espacio accidental al final, sigue contando como "presente" para
  // esta validación mientras no llegue vacío tras limpiarlo.
  const supabaseUrl = process.env.SUPABASE_URL?.trim()
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  const missing = []
  if (!supabaseUrl) missing.push('SUPABASE_URL')
  if (!supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  if (missing.length > 0) {
    // ANTES este caso devolvía `null` en silencio, y quien llamara (ej.
    // uploadContentFile en contentService.js) se limitaba a lanzar un
    // "no está conectado" genérico — esa capa ya no tiene forma de saber
    // POR QUÉ, porque para cuando recibe `client=null` esa información ya
    // se perdió. Acá SÍ sabemos exactamente cuál falta, así que fallamos
    // ya mismo con esa razón puntual. Este mensaje es el que termina
    // dentro del campo "error" del log agent_admin_action — no un
    // console.error aparte que nadie está mirando.
    throw new Error(
      `Cliente Supabase server-side no disponible: falta ${missing.join(' y ')} ` +
      'en el entorno de ESTA función. Revisa en Vercel que estén habilitadas ' +
      'para el Environment que está respondiendo esta invocación (Production/' +
      'Preview) y que hayas hecho un redeploy después de guardarlas.'
    )
  }

  try {
    cachedClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        // El cliente server-side no debe intentar persistir/renovar una
        // sesión de usuario — actúa siempre como service_role.
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  } catch (err) {
    // Si SUPABASE_URL tiene un formato inválido (ej. sin https://, o con
    // un typo), createClient() puede lanzar acá — también lo queremos ver
    // en el log de la acción, no perderlo.
    throw new Error(`No se pudo crear el cliente Supabase server-side: ${err.message}`)
  }

  return cachedClient
}

/** Solo para tests: limpia el cliente cacheado. */
export function __resetServerSupabaseClientForTests() {
  cachedClient = null
}
