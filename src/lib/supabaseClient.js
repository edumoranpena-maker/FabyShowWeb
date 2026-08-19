// ============================================================================
// Cliente de Supabase (BROWSER) — activo.
//
// Este archivo es a propósito el ÚNICO lugar del FRONTEND que sabe cómo se
// construye el cliente de Supabase para el navegador. Auth, Database y
// Storage se consumen siempre a través de las capas de servicio
// (src/auth/authService.js, src/services/*.js), nunca importando este
// cliente directamente desde componentes de UI.
//
// Usa la anon key: cada request va con el JWT de la sesión del usuario
// autenticado y queda sujeto a las políticas RLS de Supabase. Es decir,
// aquí NUNCA vive (ni debe vivir) la service_role key — ese es el cliente
// server-side, que vive fuera de src/ en server/lib/supabaseServerClient.js
// y solo lo usa el futuro agente a través de AdminActions.
//
// Las credenciales vienen de variables de entorno con prefijo VITE_ (Vite
// solo expone al cliente las que empiezan así). En este proyecto se
// configuran directamente en Vercel (Project Settings → Environment
// Variables) en vez de un archivo .env.local — Vercel las inyecta en el
// build igual. Para desarrollo LOCAL (npm run dev en tu máquina) sí vas a
// necesitar un .env.local propio con estas mismas dos variables, porque
// las de Vercel no se propagan a tu entorno local.
// ============================================================================

import { createClient } from '@supabase/supabase-js'

// Acceso defensivo a import.meta.env: bajo Vite siempre existe, pero este
// mismo archivo podría terminar importado (indirectamente, vía los
// servicios) desde un contexto Node fuera de Vite — por ejemplo si en el
// futuro alguien reutiliza sin querer un módulo de src/services/ desde
// server/. En ese caso preferimos "Supabase no configurado" a un crash.
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {}

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Faltan las variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'Revísalas en Vercel (Project Settings → Environment Variables) o en tu .env.local local.'
  )
}

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export const isSupabaseConfigured = supabase !== null
