// ============================================================================
// Cliente de Supabase — activo.
//
// Este archivo es a propósito el ÚNICO lugar de todo el proyecto que sabe
// cómo se construye el cliente de Supabase. Auth, Database y Storage se
// consumen siempre a través de las capas de servicio (src/auth/authService.js,
// src/services/*.js), nunca importando este cliente directamente desde
// componentes de UI.
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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Faltan las variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'Revísalas en Vercel (Project Settings → Environment Variables) o en tu .env.local local.'
  )
}

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export const isSupabaseConfigured = supabase !== null
