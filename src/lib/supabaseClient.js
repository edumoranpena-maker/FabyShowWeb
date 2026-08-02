// ============================================================================
// Cliente de Supabase — placeholder listo para activarse.
//
// Este archivo es a propósito el ÚNICO lugar de todo el proyecto que sabe
// cómo se construye el cliente de Supabase. Auth, Database y Storage se
// consumen siempre a través de las capas de servicio (src/auth/authService.js,
// src/services/*.js), nunca importando este cliente directamente desde
// componentes de UI. Esto es lo que permite conectar Supabase sin tocar
// nada de la capa visual.
//
// Para activarlo:
// 1. `npm install` (ya incluye @supabase/supabase-js en package.json)
// 2. Crear un archivo `.env.local` en la raíz del proyecto con:
//      VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
//      VITE_SUPABASE_ANON_KEY=tu-anon-key
// 3. Descomentar el bloque de abajo (y borrar el `export const supabase = null`)
// ============================================================================

// import { createClient } from '@supabase/supabase-js'
//
// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
//
// if (!supabaseUrl || !supabaseAnonKey) {
//   throw new Error(
//     'Faltan las variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
//     'Revisa tu archivo .env.local.'
//   )
// }
//
// export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// TODO: eliminar esta línea al descomentar el bloque de arriba.
export const supabase = null

export const isSupabaseConfigured = supabase !== null
