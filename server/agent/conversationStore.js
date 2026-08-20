// ============================================================================
// Estado conversacional del agente — en memoria, con expiración (TTL).
//
// Guarda dos cosas, una por usuario/canal a la vez:
//   - una confirmación pendiente ("¿Confirmas eliminar X?")
//   - un paso de un flujo multi-mensaje (ej. "sube esta foto" → "¿dónde?")
//
// LIMITACIÓN IMPORTANTE (ver server/AGENT.md): en Vercel, cada invocación
// del webhook puede caer en una instancia serverless distinta, así que
// este estado NO está garantizado entre mensajes si pasa suficiente
// tiempo o hay baja concurrencia (cold start). Para esta primera versión
// (Fase 2 — "no sobrediseñar", sin tabla nueva de sesión) es un trade-off
// aceptado a propósito: en el peor caso el bot pierde el contexto
// pendiente y lo dice explícitamente ("no encontré ese contexto, ¿puedes
// repetir la instrucción?") en vez de ejecutar algo no confirmado o fallar
// en silencio.
//
// Si en el futuro se necesita continuidad garantizada, esta es la ÚNICA
// pieza que habría que reemplazar (ej. por una tabla de Supabase) — el
// resto del agente solo conoce esta interfaz (get/set/clear), nunca su
// implementación interna.
// ============================================================================

const TTL_MS = 10 * 60 * 1000 // 10 minutos
const store = new Map()

function key(channel, externalUserId) {
  return `${channel}:${externalUserId}`
}

/** Devuelve el estado pendiente del usuario (o null si no hay / expiró). */
export function getPendingState(channel, externalUserId) {
  const k = key(channel, externalUserId)
  const entry = store.get(k)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(k)
    return null
  }
  return entry.value
}

/** Guarda el estado pendiente del usuario, reemplazando el anterior. */
export function setPendingState(channel, externalUserId, value) {
  store.set(key(channel, externalUserId), { value, expiresAt: Date.now() + TTL_MS })
}

/** Limpia el estado pendiente (tras ejecutar, cancelar, o expirar a mano). */
export function clearPendingState(channel, externalUserId) {
  store.delete(key(channel, externalUserId))
}
