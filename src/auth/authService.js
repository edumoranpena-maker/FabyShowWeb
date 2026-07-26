// ============================================================================
// Servicio de autenticación — la ÚNICA capa que habla con Supabase Auth.
//
// AuthProvider, ProtectedRoute y LoginPage nunca importan supabaseClient
// directamente: siempre pasan por estas funciones. Esto significa que
// conectar Supabase de verdad consiste en reescribir el CUERPO de estas
// 4 funciones (ya con la forma final que van a tener) — el resto de la
// app no se entera del cambio.
//
// Mientras `supabase` sea `null` (ver src/lib/supabaseClient.js), estas
// funciones se comportan de forma segura y predecible: no hay sesión,
// y cualquier intento de iniciar sesión falla con un error explicativo
// en vez de romper la app o simular un login falso.
// ============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

const NOT_CONFIGURED_MESSAGE =
  'Supabase todavía no está conectado. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (ver src/lib/supabaseClient.js) para activar el inicio de sesión.'

/** Devuelve la sesión activa (o null). Se llama una vez al montar AuthProvider. */
export async function getSession() {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

/** Inicia sesión con email/contraseña. Lanza un error si falla. */
export async function signInWithPassword(email, password) {
  if (!isSupabaseConfigured) {
    throw new Error(NOT_CONFIGURED_MESSAGE)
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

/** Cierra la sesión activa. */
export async function signOut() {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Se suscribe a cambios de sesión (login, logout, refresh de token).
 * Devuelve una función para cancelar la suscripción.
 */
export function onAuthStateChange(callback) {
  if (!isSupabaseConfigured) {
    return () => {} // no-op: nada a lo que desuscribirse
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })

  return () => data.subscription.unsubscribe()
}
