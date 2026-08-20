// ============================================================================
// Autorización del agente — agnóstica de canal.
//
// El núcleo del agente (core.js) nunca decide por sí mismo si un usuario
// puede actuar: recibe un booleano `isAuthorized` ya resuelto por el
// adaptador de transporte (Telegram hoy, WhatsApp mañana). Esta función es
// la única que sabe CÓMO se autoriza cada canal.
//
// Fail-closed: cualquier canal no reconocido queda denegado por defecto.
// ============================================================================

import { getAllowedTelegramUserIds } from '../lib/env.js'

/**
 * @param {'telegram'} channel
 * @param {string|number} externalUserId - ID nativo del canal (ej. Telegram user id)
 * @returns {boolean}
 */
export function isAuthorized(channel, externalUserId) {
  if (channel === 'telegram') {
    const allowed = getAllowedTelegramUserIds()
    return allowed.includes(String(externalUserId))
  }
  return false
}
