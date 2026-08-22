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
let warnedMissingEnv = false

/**
 * Devuelve el cliente Supabase server-side (service_role), creándolo la
 * primera vez que se pide. Devuelve `null` si las variables de entorno
 * todavía no están configuradas — los servicios ya saben tratar un
 * cliente `null` como "Supabase no configurado" y lanzar un error
 * explicativo en vez de fallar en silencio.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient|null}
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

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    if (!warnedMissingEnv) {
      // Se listan por separado (sin loguear sus valores) para poder ver
      // en los logs de Vercel EXACTAMENTE cuál de las dos no está
      // llegando a esta función — "faltan ambas" y "falta solo una"
      // apuntan a causas distintas (ver server/AGENT.md, sección
      // Troubleshooting).
      const missing = []
      if (!supabaseUrl) missing.push('SUPABASE_URL')
      if (!supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
      console.error(
        `Faltan las variables de entorno server-side: ${missing.join(', ')}. ` +
        'Revisa que estén configuradas para el Environment (Production/Preview) ' +
        'del deployment que está respondiendo, y que el deployment sea posterior ' +
        'a haberlas agregado en Vercel (los deployments existentes no las reciben ' +
        'retroactivamente — hace falta un redeploy). Detalle: server/AGENT.md.'
      )
      warnedMissingEnv = true
    }
    return null
  }

  cachedClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      // El cliente server-side no debe intentar persistir/renovar una
      // sesión de usuario — actúa siempre como service_role.
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return cachedClient
}

/** Solo para tests: limpia el cliente cacheado. */
export function __resetServerSupabaseClientForTests() {
  cachedClient = null
  warnedMissingEnv = false
}
