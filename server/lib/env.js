// ============================================================================
// Variables de entorno server-side del AGENTE (Telegram + LLM).
//
// Las de Supabase server-side (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) ya
// se leen en server/lib/supabaseServerClient.js (Fase 1) — no se duplican
// aquí.
//
// Ninguna variable de este archivo lleva el prefijo VITE_, así que Vite
// nunca las expone al bundle del navegador. Este archivo, igual que el
// resto de server/, vive fuera de src/ a propósito.
// ============================================================================

/** Token del bot de Telegram (BotFather). Nunca se loguea ni se expone. */
export function getTelegramBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN || null
}

/**
 * Secreto compartido para validar que un request a /api/telegram viene
 * realmente de Telegram (header `X-Telegram-Bot-Api-Secret-Token`, ver
 * https://core.telegram.org/bots/api#setwebhook).
 */
export function getTelegramWebhookSecret() {
  return process.env.TELEGRAM_WEBHOOK_SECRET || null
}

/**
 * IDs numéricos de Telegram autorizados a usar el agente, separados por
 * coma (ej. "111111111,222222222"). Se compara SIEMPRE contra
 * `message.from.id`, nunca contra el username.
 */
export function getAllowedTelegramUserIds() {
  const raw = process.env.ALLOWED_TELEGRAM_USER_IDS || ''
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** API key de Google Gemini — el agente la usa para interpretar lenguaje natural. */
export function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || null
}
