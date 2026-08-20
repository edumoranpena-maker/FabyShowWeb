// ============================================================================
// Cliente delgado de la Bot API de Telegram.
//
// Es el ÚNICO módulo de todo el proyecto que sabe hablar HTTP con
// Telegram. El núcleo del agente (server/agent/*) nunca lo importa
// directamente — solo lo usa server/telegram/adapter.js. Esto es lo que
// permite, a futuro, agregar un adaptador de WhatsApp sin tocar el
// agente ni AdminActions (ver AGENT.md).
// ============================================================================

import { getTelegramBotToken } from '../lib/env.js'

function apiBase() {
  const token = getTelegramBotToken()
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN no está configurado.')
  return `https://api.telegram.org/bot${token}`
}

function fileBase() {
  const token = getTelegramBotToken()
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN no está configurado.')
  return `https://api.telegram.org/file/bot${token}`
}

async function callTelegramApi(method, payload) {
  const res = await fetch(`${apiBase()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.ok) {
    throw new Error(`Telegram API error en ${method}: ${data?.description ?? res.status}`)
  }
  return data.result
}

/**
 * Envía un mensaje de texto. Texto plano a propósito (sin parse_mode): los
 * datos reales (nombres, preguntas de FAQ, etc.) pueden traer caracteres
 * que rompen el parseo de Markdown/HTML de Telegram si no se escapan.
 */
export async function sendMessage(chatId, text) {
  return callTelegramApi('sendMessage', { chat_id: chatId, text })
}

/** Muestra "escribiendo…" mientras se procesa (la llamada al LLM tarda unos segundos). */
export async function sendTyping(chatId) {
  return callTelegramApi('sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {})
}

/** Metadata de un archivo subido a Telegram (incluye file_path, necesario para descargarlo). */
export async function getFile(fileId) {
  return callTelegramApi('getFile', { file_id: fileId })
}

/** Descarga el contenido binario de un archivo ya resuelto con getFile(). */
export async function downloadFileByPath(filePath) {
  const res = await fetch(`${fileBase()}/${filePath}`)
  if (!res.ok) throw new Error(`No se pudo descargar el archivo de Telegram (${res.status}).`)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/** Atajo: resuelve file_path y descarga en un solo paso. Devuelve también la extensión detectada. */
export async function downloadFileById(fileId) {
  const file = await getFile(fileId)
  const buffer = await downloadFileByPath(file.file_path)
  const ext = (file.file_path.split('.').pop() || 'bin').toLowerCase()
  return { buffer, filePath: file.file_path, ext }
}

/** Registra la URL del webhook en Telegram. Usado por server/telegram/setWebhook.js. */
export async function setWebhook(url, secretToken) {
  return callTelegramApi('setWebhook', {
    url,
    secret_token: secretToken,
    allowed_updates: ['message'],
  })
}

/** Consulta el estado actual del webhook — útil para diagnóstico manual. */
export async function getWebhookInfo() {
  return callTelegramApi('getWebhookInfo', {})
}
