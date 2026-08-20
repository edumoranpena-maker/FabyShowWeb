// ============================================================================
// Núcleo del agente — el ÚNICO lugar que decide qué hacer con un mensaje
// entrante, sin importar de qué canal vino.
//
//   Telegram (o WhatsApp en el futuro)
//        │  ya resolvió: canal, id de usuario, autorización, texto, adjunto
//        ▼
//   handleInboundMessage()   ← este archivo
//        │
//        ├─ estado conversacional pendiente (conversationStore) →
//        │    confirmaciones, desambiguación, flujo de fotos/videos
//        │
//        └─ sin estado pendiente → LLM (resolveIntent) → tool del whitelist
//                 │
//                 ▼
//            actionRegistry → AdminActions (Fase 1) → Supabase
//
// Este módulo NO importa nada de server/telegram/* — así queda
// desacoplado de Telegram (requisito de compatibilidad futura con
// WhatsApp). El adaptador de cada canal es quien llama a esta función y
// quien envía la respuesta de vuelta por su propio transporte.
// ============================================================================

import { getActionEntry } from './actionRegistry.js'
import { resolveIntent } from './llm.js'
import { getPendingState, setPendingState, clearPendingState } from './conversationStore.js'
import { logAdminAction, logAgentEvent } from './logger.js'
import { formatAmbiguous, describeHeroSlide, describeGaleriaItem, describeServicio, describePaquete, describeTestimonio, describeFaq } from './formatters.js'
import {
  detectDestinationFromText,
  sectionLabel,
  validateAttachmentForSection,
  resolveServicioTargetForPhoto,
  resolveTestimonioTargetForPhoto,
  executeMediaPlacement,
} from './mediaPlacement.js'

const MATCH_FIELD_BY_SECTION = {
  paquetes: 'nombre',
  servicios: 'titulo',
  testimonios: 'nombre',
  faq: 'pregunta',
  galeria: 'categoria',
}

const DESCRIBER_BY_SECTION = {
  hero: describeHeroSlide,
  galeria: describeGaleriaItem,
  servicios: describeServicio,
  paquetes: describePaquete,
  testimonios: describeTestimonio,
  faq: describeFaq,
}

const ACTION_VERB = {
  delete: 'eliminar',
  update: 'actualizar',
  remove: 'eliminar el archivo de',
  approve: 'aprobar',
  create: 'crear',
}

function normalize(text) {
  return (text ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function isAffirmative(text) {
  return /^(si|sí|s|yes|ok|dale|confirmo|correcto|de acuerdo|claro|va)\b/i.test(normalize(text))
}

function isNegative(text) {
  return /^(no|n|cancel|cancela|cancelar)\b/i.test(normalize(text))
}

function verbFor(actionName) {
  const prefix = Object.keys(ACTION_VERB).find((p) => actionName.startsWith(p))
  return ACTION_VERB[prefix] ?? 'ejecutar'
}

function describeForConfirmation(entry, params, record) {
  if (record) return entry.describeTarget(record)
  if (entry.section && DESCRIBER_BY_SECTION[entry.section] && params.values) {
    try {
      return DESCRIBER_BY_SECTION[entry.section]({ activo: true, ...params.values })
    } catch {
      // sigue al fallback
    }
  }
  return 'estos datos'
}

// ---------------------------------------------------------------------------
// Ejecución de una acción del registro, con logging. SIEMPRE pasa por acá
// (nunca se llama a AdminActions directamente desde otro lugar del core).
// ---------------------------------------------------------------------------
async function runRegistryAction({ channel, externalUserId, actionName, entry, params, record }) {
  try {
    const data = await entry.run(record, params)
    const message = entry.successMessage(data, record)
    logAdminAction({ channel, externalUserId, action: actionName, params, success: true })
    return message
  } catch (err) {
    logAdminAction({ channel, externalUserId, action: actionName, params, success: false, error: err })
    return '❌ No pude completar la acción. Intenta de nuevo en un momento.'
  }
}

async function runMediaPlacement({ channel, externalUserId, placement }) {
  try {
    const message = await executeMediaPlacement(placement)
    logAdminAction({
      channel,
      externalUserId,
      action: `placeMedia:${placement.section}`,
      params: { attachmentKind: placement.attachment.kind, ...placement.extra },
      success: true,
    })
    return message
  } catch (err) {
    logAdminAction({
      channel,
      externalUserId,
      action: `placeMedia:${placement.section}`,
      params: { attachmentKind: placement.attachment.kind },
      success: false,
      error: err,
    })
    return '❌ No pude subir el archivo. Intenta de nuevo en un momento.'
  }
}

// ---------------------------------------------------------------------------
// Construye el estado "confirmation" a partir de una acción del registro ya
// resuelta (o sin necesidad de resolver, para creates/updateContacto).
// ---------------------------------------------------------------------------
function buildConfirmation({ actionName, entry, params, record }) {
  const summary = describeForConfirmation(entry, params, record)
  return {
    type: 'confirmation',
    actionName,
    params,
    recordId: record?.id ?? null,
    record: record ?? null,
    prompt: `⚠️ ¿Confirmas ${verbFor(actionName)} ${summary}? Responde "sí" o "no".`,
  }
}

// ---------------------------------------------------------------------------
// Punto de entrada público.
// ---------------------------------------------------------------------------

/**
 * @param {object} inbound
 * @param {'telegram'} inbound.channel
 * @param {string} inbound.externalUserId
 * @param {boolean} inbound.isAuthorized - ya resuelto por el adaptador del canal
 * @param {string|null} inbound.text - texto del mensaje (o caption si trae adjunto)
 * @param {{kind:'photo'|'video', fileId:string}|null} inbound.attachment
 * @returns {Promise<{ replyText: string }>}
 */
export async function handleInboundMessage(inbound) {
  const { channel, externalUserId, isAuthorized, text, attachment } = inbound

  if (!isAuthorized) {
    logAgentEvent('unauthorized_attempt', { channel, externalUserId })
    return { replyText: '🚫 No tienes autorización para usar este agente.' }
  }

  // Un adjunto nuevo siempre reemplaza cualquier flujo pendiente — evita
  // ejecutar por sorpresa una confirmación vieja que el usuario ya olvidó.
  if (attachment) {
    clearPendingState(channel, externalUserId)
    if (attachment.kind !== 'photo' && attachment.kind !== 'video') {
      return { replyText: 'Ese tipo de archivo no está soportado todavía. Puedo recibir fotos y videos.' }
    }
    return startMediaFlow({ channel, externalUserId, attachment, captionText: text })
  }

  if (!text || !text.trim()) {
    return { replyText: 'No recibí ningún texto. ¿Puedes escribir tu instrucción?' }
  }

  const pending = getPendingState(channel, externalUserId)
  if (pending) {
    return continuePendingFlow({ channel, externalUserId, pending, text })
  }

  return handleFreshTextMessage({ channel, externalUserId, text })
}

// ---------------------------------------------------------------------------
// Continuación de un flujo pendiente (confirmación, desambiguación, o pasos
// del flujo de fotos/videos).
// ---------------------------------------------------------------------------
async function continuePendingFlow({ channel, externalUserId, pending, text }) {
  switch (pending.type) {
    case 'confirmation': {
      if (isAffirmative(text)) {
        clearPendingState(channel, externalUserId)
        const entry = getActionEntry(pending.actionName)
        if (!entry) return { replyText: '❌ Esa acción ya no está disponible.' }
        const message = await runRegistryAction({
          channel,
          externalUserId,
          actionName: pending.actionName,
          entry,
          params: pending.params,
          record: pending.record,
        })
        return { replyText: message }
      }
      if (isNegative(text)) {
        clearPendingState(channel, externalUserId)
        return { replyText: '❌ Operación cancelada.' }
      }
      return { replyText: `Todavía tengo pendiente esto:\n\n${pending.prompt}` }
    }

    case 'media_awaiting_confirmation': {
      if (isAffirmative(text)) {
        clearPendingState(channel, externalUserId)
        const message = await runMediaPlacement({ channel, externalUserId, placement: pending.placement })
        return { replyText: message }
      }
      if (isNegative(text)) {
        clearPendingState(channel, externalUserId)
        return { replyText: '❌ Operación cancelada. No se agregó el archivo.' }
      }
      return { replyText: `Todavía tengo pendiente esto:\n\n${pending.prompt}` }
    }

    case 'disambiguation': {
      const chosen = resolveDisambiguation(pending, text)
      if (!chosen) {
        return { replyText: 'No identifiqué cuál de las opciones. Responde con el número o el nombre exacto.' }
      }
      clearPendingState(channel, externalUserId)
      const entry = getActionEntry(pending.actionName)
      if (!entry) return { replyText: '❌ Esa acción ya no está disponible.' }
      const confirmation = buildConfirmation({ actionName: pending.actionName, entry, params: pending.params, record: chosen })
      setPendingState(channel, externalUserId, confirmation)
      return { replyText: confirmation.prompt }
    }

    case 'media_awaiting_destination': {
      const section = detectDestinationFromText(text)
      if (!section) {
        return { replyText: 'No reconozco esa sección. Dime: Hero, Galería, Servicios o Testimonios.' }
      }
      return advanceMediaFlowWithDestination({ channel, externalUserId, attachment: pending.attachment, section })
    }

    case 'media_awaiting_categoria': {
      const categoria = text.trim()
      const placement = { attachment: pending.attachment, section: 'galeria', extra: { categoria } }
      return promptMediaConfirmation({ channel, externalUserId, placement })
    }

    case 'media_awaiting_target_servicio': {
      const result = await resolveServicioTargetForPhoto(text)
      return handleServicioTargetResult({ channel, externalUserId, attachment: pending.attachment, result })
    }

    case 'media_awaiting_target_testimonio': {
      const result = await resolveTestimonioTargetForPhoto(text)
      return handleTestimonioTargetResult({ channel, externalUserId, attachment: pending.attachment, result })
    }

    default: {
      clearPendingState(channel, externalUserId)
      return handleFreshTextMessage({ channel, externalUserId, text })
    }
  }
}

function resolveDisambiguation(pending, text) {
  const idx = Number(text.trim())
  if (!Number.isNaN(idx) && idx >= 1 && idx <= pending.options.length) {
    return pending.options[idx - 1]
  }
  const field = MATCH_FIELD_BY_SECTION[pending.section]
  const n = normalize(text)
  return pending.options.find((o) => normalize(o[field]).includes(n)) ?? null
}

// ---------------------------------------------------------------------------
// Mensaje de texto nuevo (sin flujo pendiente) → LLM → acción del whitelist.
// ---------------------------------------------------------------------------
async function handleFreshTextMessage({ channel, externalUserId, text }) {
  let intent
  try {
    intent = await resolveIntent(text)
  } catch (err) {
    logAgentEvent('llm_error', { channel, externalUserId, error: String(err?.message ?? err).slice(0, 200) })
    return { replyText: '❌ No pude interpretar tu mensaje en este momento. Intenta de nuevo en un momento.' }
  }

  if (intent.type === 'text') {
    return { replyText: intent.text }
  }

  const entry = getActionEntry(intent.name)
  if (!entry) {
    // Defensa en profundidad: el LLM solo puede recibir tools del whitelist,
    // pero si de todos modos llegara un nombre desconocido, no se ejecuta nada.
    logAgentEvent('unknown_action_from_llm', { channel, externalUserId, action: intent.name })
    return { replyText: '❌ No reconozco esa acción.' }
  }

  const params = intent.input ?? {}

  if (entry.kind === 'read') {
    const data = await entry.run(params).catch((err) => {
      logAdminAction({ channel, externalUserId, action: intent.name, params, success: false, error: err })
      return null
    })
    if (data === null) return { replyText: '❌ No pude obtener esa información. Intenta de nuevo en un momento.' }
    logAdminAction({ channel, externalUserId, action: intent.name, params, success: true })
    return { replyText: entry.formatResult(data) }
  }

  // kind === 'write'
  if (!entry.resolve) {
    const confirmation = buildConfirmation({ actionName: intent.name, entry, params, record: null })
    setPendingState(channel, externalUserId, confirmation)
    return { replyText: confirmation.prompt }
  }

  let resolved
  try {
    resolved = await entry.resolve(params)
  } catch (err) {
    logAgentEvent('resolve_error', { channel, externalUserId, action: intent.name, error: String(err?.message ?? err).slice(0, 200) })
    return { replyText: '❌ No pude buscar ese elemento. Intenta de nuevo en un momento.' }
  }

  if (resolved.notFound) {
    return { replyText: `No encontré ningún elemento que coincida con "${params.match}".` }
  }
  if (resolved.ambiguous?.length) {
    setPendingState(channel, externalUserId, {
      type: 'disambiguation',
      actionName: intent.name,
      params,
      options: resolved.ambiguous,
      section: entry.section,
    })
    return { replyText: formatAmbiguous(resolved.ambiguous, DESCRIBER_BY_SECTION[entry.section]) }
  }

  const confirmation = buildConfirmation({ actionName: intent.name, entry, params, record: resolved.record })
  setPendingState(channel, externalUserId, confirmation)
  return { replyText: confirmation.prompt }
}

// ---------------------------------------------------------------------------
// Flujo de fotos/videos.
// ---------------------------------------------------------------------------
async function startMediaFlow({ channel, externalUserId, attachment, captionText }) {
  const section = captionText ? detectDestinationFromText(captionText) : null

  if (!section) {
    setPendingState(channel, externalUserId, { type: 'media_awaiting_destination', attachment })
    return { replyText: '¿Dónde quieres ponerla? (Hero, Galería, Servicios o Testimonios)' }
  }

  return advanceMediaFlowWithDestination({ channel, externalUserId, attachment, section })
}

async function advanceMediaFlowWithDestination({ channel, externalUserId, attachment, section }) {
  const invalidReason = validateAttachmentForSection(attachment.kind, section)
  if (invalidReason) {
    setPendingState(channel, externalUserId, { type: 'media_awaiting_destination', attachment })
    return { replyText: invalidReason }
  }

  if (section === 'hero') {
    const placement = { attachment, section: 'hero', extra: {} }
    return promptMediaConfirmation({ channel, externalUserId, placement })
  }

  if (section === 'galeria') {
    setPendingState(channel, externalUserId, { type: 'media_awaiting_categoria', attachment })
    return { replyText: '¿Qué categoría le pongo a este elemento de la Galería?' }
  }

  if (section === 'servicios') {
    setPendingState(channel, externalUserId, { type: 'media_awaiting_target_servicio', attachment })
    return { replyText: '¿A qué servicio pertenece esta foto? Dime el nombre.' }
  }

  // testimonios
  setPendingState(channel, externalUserId, { type: 'media_awaiting_target_testimonio', attachment })
  return { replyText: '¿De qué testimonio es esta foto? Dime el nombre de la persona.' }
}

async function handleServicioTargetResult({ channel, externalUserId, attachment, result }) {
  if (result.mode === 'ambiguous') {
    setPendingState(channel, externalUserId, { type: 'media_awaiting_target_servicio', attachment })
    return { replyText: formatAmbiguous(result.options, describeServicio) }
  }
  if (result.mode === 'update') {
    const placement = {
      attachment,
      section: 'servicios',
      extra: { mode: 'update', recordId: result.record.id, titulo: result.record.titulo },
    }
    return promptMediaConfirmation({ channel, externalUserId, placement })
  }
  if (result.mode === 'create') {
    const placement = { attachment, section: 'servicios', extra: { mode: 'create', titulo: result.titulo } }
    return promptMediaConfirmation({ channel, externalUserId, placement })
  }
  setPendingState(channel, externalUserId, { type: 'media_awaiting_target_servicio', attachment })
  return { replyText: 'No entendí el nombre del servicio. ¿Puedes repetirlo?' }
}

async function handleTestimonioTargetResult({ channel, externalUserId, attachment, result }) {
  if (result.mode === 'ambiguous') {
    setPendingState(channel, externalUserId, { type: 'media_awaiting_target_testimonio', attachment })
    return { replyText: formatAmbiguous(result.options, describeTestimonio) }
  }
  if (result.mode === 'update') {
    const placement = {
      attachment,
      section: 'testimonios',
      extra: { recordId: result.record.id, nombre: result.record.nombre },
    }
    return promptMediaConfirmation({ channel, externalUserId, placement })
  }
  if (result.mode === 'not_found') {
    clearPendingState(channel, externalUserId)
    return {
      replyText:
        'No encontré ningún testimonio con ese nombre. Primero crea el testimonio con su texto (ej. "agrega un testimonio de Juana que dice...") y después envíame la foto.',
    }
  }
  setPendingState(channel, externalUserId, { type: 'media_awaiting_target_testimonio', attachment })
  return { replyText: 'No entendí el nombre. ¿Puedes repetirlo?' }
}

function promptMediaConfirmation({ channel, externalUserId, placement }) {
  const kindLabel = placement.attachment.kind === 'video' ? 'este video' : 'esta foto'
  const destLabel = sectionLabel(placement.section)
  let extraLabel = ''
  if (placement.extra?.categoria) extraLabel = ` (categoría "${placement.extra.categoria}")`
  else if (placement.extra?.titulo) extraLabel = ` (${placement.extra.mode === 'create' ? 'nuevo servicio' : 'servicio'} "${placement.extra.titulo}")`
  else if (placement.extra?.nombre) extraLabel = ` (testimonio de ${placement.extra.nombre})`
  const prompt = `¿Agrego ${kindLabel} a ${destLabel}${extraLabel}?`
  setPendingState(channel, externalUserId, { type: 'media_awaiting_confirmation', placement, prompt })
  return { replyText: prompt }
}
