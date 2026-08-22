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

// Este aviso solo tiene sentido cuando el archivo se ejecuta de verdad en
// un navegador (que es el único contexto donde estas variables VITE_
// deberían existir). `window` está SIEMPRE definido en un navegador real,
// así que esto no cambia en nada el comportamiento del frontend/Admin.
//
// Sin este guard, importar cualquier src/services/*.js desde server/
// (server/adminActions/* lo hace, para reusar las fábricas create*Service)
// dispara este console.error como efecto secundario del import — aunque
// esa ejecución server-side nunca use este cliente browser, solo el de
// server/lib/supabaseServerClient.js. Ese ruido en los logs de Vercel es
// engañoso: no indica que el agente esté usando el cliente equivocado.
if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
  console.error(
    'Faltan las variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'Revísalas en Vercel (Project Settings → Environment Variables) o en tu .env.local local.'
  )
}

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export const isSupabaseConfigured = supabase !== null
