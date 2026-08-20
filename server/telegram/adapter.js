// ============================================================================
// Adaptador de Telegram — la única capa que sabe que existe Telegram.
//
// Traduce un `update` crudo de Telegram a la forma genérica que espera
// server/agent/core.js, resuelve la autorización (message.from.id contra
// ALLOWED_TELEGRAM_USER_IDS — nunca el username), y envía la respuesta de
// vuelta por la Bot API. El núcleo del agente no sabe nada de esto.
// ============================================================================

import { isAuthorized } from '../agent/authorization.js'
import { handleInboundMessage } from '../agent/core.js'
import { sendMessage, sendTyping } from './telegramClient.js'

const CHANNEL = 'telegram'

/**
 * Punto de entrada del webhook. Nunca deja escapar una excepción — un
 * mensaje mal formado no debe tumbar el endpoint (ver AGENT.md, "manejo
 * de errores").
 * @param {object} update - el body que envía Telegram
 */
export async function handleTelegramUpdate(update) {
  const message = update?.message
  if (!message) {
    // Ignoramos silenciosamente otros tipos de update (edited_message,
    // callback_query, etc.) — no forman parte del alcance de esta fase.
    return
  }

  const chatId = message.chat?.id
  const externalUserId = message.from?.id
  if (!chatId || !externalUserId) return

  try {
    const authorized = isAuthorized(CHANNEL, externalUserId)
    const inbound = buildInboundFromMessage(message, authorized)

    await sendTyping(chatId)
    const { replyText } = await handleInboundMessage(inbound)
    await sendMessage(chatId, replyText)
  } catch (err) {
    console.error('[telegram/adapter] Error procesando update:', err?.message ?? err)
    await sendMessage(chatId, '❌ Ocurrió un error inesperado. Intenta de nuevo en un momento.').catch(() => {})
  }
}

function buildInboundFromMessage(message, authorized) {
  const attachment = extractAttachment(message)
  const text = message.text ?? message.caption ?? null

  return {
    channel: CHANNEL,
    externalUserId: String(message.from.id),
    isAuthorized: authorized,
    text,
    attachment,
  }
}

function extractAttachment(message) {
  if (Array.isArray(message.photo) && message.photo.length > 0) {
    // Telegram manda varias resoluciones de la misma foto — la última es la de mayor calidad.
    const largest = message.photo[message.photo.length - 1]
    return { kind: 'photo', fileId: largest.file_id }
  }
  if (message.video) {
    return { kind: 'video', fileId: message.video.file_id }
  }
  if (message.document) {
    // No soportado explícitamente en esta fase (point 12: "archivo no soportado").
    return { kind: 'unsupported', fileId: message.document.file_id }
  }
  return null
}
