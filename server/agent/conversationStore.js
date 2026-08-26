// ============================================================================
// Estado conversacional del agente — persistido en Supabase
// (tabla `agent_conversation_state`, migración
// supabase/migrations/20260822000000_create_agent_conversation_state.sql).
//
// Reemplaza el Map en memoria que usaba este archivo hasta la fase
// anterior: en Vercel, dos mensajes consecutivos del mismo usuario pueden
// caer en instancias serverless distintas, así que el estado no puede
// vivir solo en memoria de proceso — quedó documentado como limitación
// desde la primera fase del agente (ver AGENT.md) y esta es la migración
// que ya estaba anticipada.
//
// La interfaz pública (getPendingState/setPendingState/clearPendingState)
// se mantiene igual que antes — solo pasan a ser `async`. Se agregan
// get/set/clearRecentContext, un concepto NUEVO y separado (no un
// reemplazo): `active_task` es la operación en curso; `recent_context` es
// el rastro corto de una operación destructiva recién cancelada, para
// poder retomar sus candidatas ("entonces elimina la 2") sin confundirse
// con si hay o no una tarea activa.
// ============================================================================

import { getServerSupabaseClient } from '../lib/supabaseServerClient.js'

const DEFAULT_TASK_TTL_MS = 10 * 60 * 1000 // 10 minutos — igual que el Map anterior
const RECENT_CONTEXT_TTL_MS = 3 * 60 * 1000 // corto a propósito (ver AGENT.md)

function isExpired(value) {
  if (!value || !value.expiresAt) return true
  return Date.now() > new Date(value.expiresAt).getTime()
}

async function readRow(channel, externalUserId) {
  const client = getServerSupabaseClient()
  const { data, error } = await client
    .from('agent_conversation_state')
    .select('active_task, recent_context')
    .eq('channel', channel)
    .eq('external_user_id', externalUserId)
    .maybeSingle()
  if (error) throw error
  return data
}

async function upsertColumn(channel, externalUserId, column, value) {
  const client = getServerSupabaseClient()
  const { error } = await client
    .from('agent_conversation_state')
    .upsert(
      { channel, external_user_id: externalUserId, [column]: value, updated_at: new Date().toISOString() },
      { onConflict: 'channel,external_user_id' }
    )
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Tarea activa (lo que hasta ahora se llamaba "pending state").
// ---------------------------------------------------------------------------

/** Devuelve la tarea activa del usuario (o null si no hay / expiró). */
export async function getPendingState(channel, externalUserId) {
  const row = await readRow(channel, externalUserId)
  const task = row?.active_task ?? null
  if (!task || isExpired(task)) return null
  return task
}

/** Guarda la tarea activa, reemplazando la anterior. */
export async function setPendingState(channel, externalUserId, value, ttlMs = DEFAULT_TASK_TTL_MS) {
  const withExpiry = { ...value, expiresAt: new Date(Date.now() + ttlMs).toISOString() }
  await upsertColumn(channel, externalUserId, 'active_task', withExpiry)
}

/** Limpia la tarea activa (tras ejecutar, cancelar, o expirar a mano). */
export async function clearPendingState(channel, externalUserId) {
  await upsertColumn(channel, externalUserId, 'active_task', null)
}

// ---------------------------------------------------------------------------
// Contexto reciente — candidatas de una operación destructiva recién
// cancelada. TTL corto y deliberadamente separado de la tarea activa (ver
// server/AGENT.md, sección de contexto conversacional).
// ---------------------------------------------------------------------------

/** Devuelve el contexto reciente del usuario (o null si no hay / expiró). */
export async function getRecentContext(channel, externalUserId) {
  const row = await readRow(channel, externalUserId)
  const ctx = row?.recent_context ?? null
  if (!ctx || isExpired(ctx)) return null
  return ctx
}

/** Guarda el contexto reciente (candidatas de la última búsqueda/selección). */
export async function setRecentContext(channel, externalUserId, value, ttlMs = RECENT_CONTEXT_TTL_MS) {
  const withExpiry = { ...value, expiresAt: new Date(Date.now() + ttlMs).toISOString() }
  await upsertColumn(channel, externalUserId, 'recent_context', withExpiry)
}

/** Limpia el contexto reciente. */
export async function clearRecentContext(channel, externalUserId) {
  await upsertColumn(channel, externalUserId, 'recent_context', null)
}
