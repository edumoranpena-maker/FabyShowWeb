// ============================================================================
// Webhook de Telegram — Vercel Serverless Function.
//
// Vive en /api porque así detecta Vercel las funciones serverless en un
// proyecto Vite, sin necesidad de convertirlo a Next.js. Es la ÚNICA
// puerta de entrada HTTP de todo el agente.
//
// Seguridad: valida el header `X-Telegram-Bot-Api-Secret-Token` contra
// TELEGRAM_WEBHOOK_SECRET antes de procesar nada (mecanismo de "secret
// token" de Telegram: https://core.telegram.org/bots/api#setwebhook). La
// autorización por usuario (ALLOWED_TELEGRAM_USER_IDS) se resuelve más
// adentro, en server/telegram/adapter.js, para cada mensaje.
//
// Siempre responde 200 una vez pasada la validación del secreto, incluso
// si el procesamiento interno falla — así Telegram no reintenta en bucle
// un update que de todos modos no se va a poder procesar mejor la segunda
// vez (el error ya se logueó server-side y, si se pudo, se le avisó al
// usuario en el chat).
// ============================================================================

import { getTelegramWebhookSecret } from '../server/lib/env.js'
import { handleTelegramUpdate } from '../server/telegram/adapter.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false })
    return
  }

  const expectedSecret = getTelegramWebhookSecret()
  const providedSecret = req.headers['x-telegram-bot-api-secret-token']
  if (!expectedSecret || providedSecret !== expectedSecret) {
    // Si esto falla, el request no es un update real de Telegram (o el
    // secreto está mal configurado) — acá sí tiene sentido cortar en seco.
    res.status(401).json({ ok: false })
    return
  }

  const update = await readJsonBody(req)

  try {
    await handleTelegramUpdate(update)
  } catch (err) {
    // handleTelegramUpdate ya atrapa sus propios errores; este catch es un
    // resguardo adicional para que el webhook JAMÁS devuelva 500 por un
    // update inesperado (requisito: "un mensaje mal formado no debe tumbar
    // el webhook").
    console.error('[api/telegram] Error no capturado:', err?.message ?? err)
  }

  res.status(200).json({ ok: true })
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
