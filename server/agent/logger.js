// ============================================================================
// Logging de acciones administrativas ejecutadas por el agente.
//
// Va a stdout como JSON de una línea — Vercel captura stdout automáticamente
// como logs de la función, así que no hace falta ninguna tabla nueva en
// Supabase para esto (se evaluó y se descartó a propósito, ver AGENT.md).
//
// Nunca se loguean: token de Telegram, service_role, ni contenido binario
// de archivos (fotos/videos) — solo su tamaño.
// ============================================================================

export function logAdminAction({ channel, externalUserId, action, params, success, error }) {
  const entry = {
    type: 'agent_admin_action',
    at: new Date().toISOString(),
    channel,
    userId: externalUserId,
    action,
    params: redactParams(params),
    success,
    ...(error ? { error: String(error?.message ?? error).slice(0, 300) } : {}),
  }
  console.log(JSON.stringify(entry))
}

/** Registra también eventos no-administrativos relevantes (ej. rechazos de autorización). */
export function logAgentEvent(name, details = {}) {
  console.log(JSON.stringify({ type: `agent_${name}`, at: new Date().toISOString(), ...redactParams(details) }))
}

function redactParams(params) {
  if (!params || typeof params !== 'object') return params
  const clean = {}
  for (const [k, v] of Object.entries(params)) {
    if (v && (v instanceof Uint8Array || typeof v.byteLength === 'number')) {
      clean[k] = `<binary:${v.byteLength ?? v.length ?? '?'} bytes>`
    } else if (/token|key|secret|password|service_role/i.test(k)) {
      clean[k] = '<redacted>'
    } else {
      clean[k] = v
    }
  }
  return clean
}
