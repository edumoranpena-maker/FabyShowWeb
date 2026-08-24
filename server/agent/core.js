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
  validateAttachmentForSection,
  resolveServicioTargetForPhoto,
  resolveTestimonioTargetForPhoto,
  executeMediaPlacement,
  parseMediaCaption,
} from './mediaPlacement.js'
import { normalizeGaleriaCategory, listCanonicalGaleriaCategories } from './galeriaCategories.js'

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

/**
 * URL de la foto/imagen de un registro, si tiene una — se usa para
 * mostrarle al admin la foto ANTES de pedir confirmación de borrado
 * (Objetivo 2.8/2.9: nunca eliminar a ciegas, mostrar qué se va a borrar).
 * Cubre los distintos nombres de columna de imagen según la sección.
 */
function photoUrlForRecord(record) {
  return record?.src ?? record?.image_url ?? record?.imagen_url ?? record?.foto_url ?? null
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
    photoUrl: photoUrlForRecord(record),
    prompt: `⚠️ ¿Confirmas ${verbFor(actionName)} ${summary}? Responde "sí" o "no".`,
  }
}

/** Arma el `photos` opcional que espera el adaptador (Telegram u otro canal), a partir de una confirmación ya construida. */
function photosForConfirmation(confirmation) {
  return confirmation.photoUrl ? [{ url: confirmation.photoUrl }] : undefined
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

    case 'disambiguation': {
      const entry = getActionEntry(pending.actionName)
      if (!entry) {
        clearPendingState(channel, externalUserId)
        return { replyText: '❌ Esa acción ya no está disponible.' }
      }
      const matchField = entry.disambiguationField ?? MATCH_FIELD_BY_SECTION[pending.section]
      const chosen = resolveDisambiguation(pending, text, matchField)
      if (!chosen) {
        return { replyText: 'No identifiqué cuál de las opciones. Responde con el número o el nombre exacto.' }
      }
      clearPendingState(channel, externalUserId)
      if (entry.requiresConfirmation) {
        const confirmation = buildConfirmation({ actionName: pending.actionName, entry, params: pending.params, record: chosen })
        setPendingState(channel, externalUserId, confirmation)
        return { replyText: confirmation.prompt, photos: photosForConfirmation(confirmation) }
      }
      const message = await runRegistryAction({
        channel,
        externalUserId,
        actionName: pending.actionName,
        entry,
        params: pending.params,
        record: chosen,
      })
      return { replyText: message }
    }

    case 'pending_text_intent': {
      // Se consume de una sola vez: handleFreshTextMessage vuelve a
      // guardar un `pending_text_intent` nuevo si Gemini todavía no
      // termina de resolver la acción con este mensaje.
      clearPendingState(channel, externalUserId)
      return handleFreshTextMessage({
        channel,
        externalUserId,
        text,
        context: { previousUserText: pending.previousUserText, previousModelText: pending.previousModelText },
      })
    }

    case 'media_awaiting_destination': {
      const section = detectDestinationFromText(text)
      if (!section) {
        return { replyText: 'No reconozco esa sección. Dime: Hero, Galería, Servicios o Testimonios.' }
      }
      return advanceMediaFlowWithDestination({ channel, externalUserId, attachment: pending.attachment, section })
    }

    case 'media_awaiting_categoria': {
      const raw = text.trim()
      if (!raw) {
        return { replyText: '¿Qué categoría le pongo a este elemento de la Galería?' }
      }
      const resolved = normalizeGaleriaCategory(raw)
      if (resolved.notFound) {
        // Nunca se guarda un texto libre como categoría nueva — se
        // mantiene el mismo estado pendiente y se le pide al usuario que
        // elija una categoría real.
        setPendingState(channel, externalUserId, { type: 'media_awaiting_categoria', attachment: pending.attachment })
        return { replyText: categoryClarificationPrompt(raw) }
      }
      // Ya tenemos adjunto + destino + categoría (normalizada al valor
      // canónico): dato completo, se ejecuta directo (Fase 2A) — sin
      // pedir "¿la agrego?".
      const placement = { attachment: pending.attachment, section: 'galeria', extra: { categoria: resolved.canonical } }
      return finalizeMediaPlacement({ channel, externalUserId, placement })
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

function resolveDisambiguation(pending, text, matchField) {
  const idx = Number(text.trim())
  if (!Number.isNaN(idx) && idx >= 1 && idx <= pending.options.length) {
    return pending.options[idx - 1]
  }
  const field = matchField ?? MATCH_FIELD_BY_SECTION[pending.section]
  const n = normalize(text)
  return pending.options.find((o) => normalize(o[field]).includes(n)) ?? null
}

// ---------------------------------------------------------------------------
// Mensaje de texto nuevo (sin flujo pendiente, o completando un
// `pending_text_intent`) → LLM → acción del whitelist.
// ---------------------------------------------------------------------------
async function handleFreshTextMessage({ channel, externalUserId, text, context = null }) {
  let intent
  try {
    intent = await resolveIntent(text, context)
  } catch (err) {
    logAgentEvent('llm_error', { channel, externalUserId, error: String(err?.message ?? err).slice(0, 200) })
    return { replyText: '❌ No pude interpretar tu mensaje en este momento. Intenta de nuevo en un momento.' }
  }

  if (intent.type === 'text') {
    // Todavía no se resolvió ninguna acción — puede ser que a Gemini le
    // falte un dato para completarla (preguntó algo), o una respuesta
    // puramente conversacional. Guardamos este intercambio como contexto
    // de un solo turno: si el próximo mensaje lo completa, se lo pasamos
    // de vuelta a Gemini junto con el mensaje nuevo para que arme la
    // acción entera (ver llm.js). Si el usuario cambia de tema, Gemini ve
    // este mismo contexto y, por instrucción explícita del system prompt,
    // no fuerza la acción vieja.
    //
    // `previousUserText` se acumula (no se reemplaza) para sobrevivir más
    // de un intercambio de aclaración, con un tope de 300 caracteres para
    // no mandarle a Gemini un historial cada vez más largo.
    const accumulatedUserText = context ? `${context.previousUserText} ${text}`.slice(-300) : text
    setPendingState(channel, externalUserId, {
      type: 'pending_text_intent',
      previousUserText: accumulatedUserText,
      previousModelText: intent.text,
    })
    return { replyText: intent.text }
  }

  // Se resolvió una acción → cualquier contexto de texto pendiente ya cumplió su función.
  clearPendingState(channel, externalUserId)

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

  // kind === 'write'. Regla (Fase 2): dato completo + acción no destructiva
  // → ejecutar directo. Solo las marcadas `requiresConfirmation: true` en
  // actionRegistry.js (delete*/remove*Image/remove*Media) piden confirmación.
  if (!entry.resolve) {
    if (entry.requiresConfirmation) {
      const confirmation = buildConfirmation({ actionName: intent.name, entry, params, record: null })
      setPendingState(channel, externalUserId, confirmation)
      return { replyText: confirmation.prompt, photos: photosForConfirmation(confirmation) }
    }
    const message = await runRegistryAction({ channel, externalUserId, actionName: intent.name, entry, params, record: null })
    return { replyText: message }
  }

  let resolved
  try {
    resolved = await entry.resolve(params, { channel, externalUserId })
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
    // Para búsquedas de media (ej. eliminar por descripción), mandamos las
    // fotos candidatas para que el admin las reconozca visualmente
    // (Objetivo 2.8) — para las demás secciones (paquetes, servicios de
    // texto, etc.) el listado de texto de siempre es suficiente.
    const photos =
      entry.section === 'galeria'
        ? resolved.ambiguous
            .filter((it) => photoUrlForRecord(it))
            .map((it) => ({ url: photoUrlForRecord(it), caption: entry.describeTarget(it) }))
        : undefined
    return { replyText: formatAmbiguous(resolved.ambiguous, entry.describeTarget), photos }
  }

  if (entry.requiresConfirmation) {
    const confirmation = buildConfirmation({ actionName: intent.name, entry, params, record: resolved.record })
    setPendingState(channel, externalUserId, confirmation)
    return { replyText: confirmation.prompt, photos: photosForConfirmation(confirmation) }
  }

  const message = await runRegistryAction({ channel, externalUserId, actionName: intent.name, entry, params, record: resolved.record })
  return { replyText: message }
}

/** Mensaje de aclaración cuando la categoría dicha por el usuario no coincide con ninguna real — nunca se crea una categoría nueva en silencio. */
function categoryClarificationPrompt(rawInput) {
  const options = listCanonicalGaleriaCategories().join(', ')
  return `No reconozco la categoría "${rawInput}". Las categorías válidas son: ${options}. ¿Cuál uso?`
}

// ---------------------------------------------------------------------------
// Flujo de fotos/videos.
// ---------------------------------------------------------------------------
async function startMediaFlow({ channel, externalUserId, attachment, captionText }) {
  // Objetivo 1: si el mensaje ya trae destino (y de paso categoría/nombre
  // de servicio/testimonio), no hay que preguntar nada de eso — se extrae
  // con Gemini/function calling (no matching de frase exacta), reutilizando
  // el mismo mecanismo que ya usa resolveIntent() para el resto del agente.
  const extracted = await parseMediaCaption(captionText)
  const section = extracted?.section ?? (captionText ? detectDestinationFromText(captionText) : null)

  if (!section) {
    setPendingState(channel, externalUserId, { type: 'media_awaiting_destination', attachment })
    return { replyText: '¿Dónde quieres ponerla? (Hero, Galería, Servicios o Testimonios)' }
  }

  return advanceMediaFlowWithDestination({ channel, externalUserId, attachment, section, prefill: extracted, captionText })
}

async function advanceMediaFlowWithDestination({ channel, externalUserId, attachment, section, prefill = null, captionText = null }) {
  const invalidReason = validateAttachmentForSection(attachment.kind, section)
  if (invalidReason) {
    setPendingState(channel, externalUserId, { type: 'media_awaiting_destination', attachment })
    return { replyText: invalidReason }
  }

  if (section === 'hero') {
    // Ya tenemos todo lo necesario (adjunto + destino): dato completo,
    // se ejecuta directo (Fase 2A) — sin pedir "¿la agrego?".
    return finalizeMediaPlacement({ channel, externalUserId, placement: { attachment, section: 'hero', extra: {} } })
  }

  if (section === 'galeria') {
    if (prefill?.categoria) {
      const resolved = normalizeGaleriaCategory(prefill.categoria)
      if (resolved.notFound) {
        // El caption mencionaba una categoría, pero no coincide con
        // ninguna real — se trata igual que "falta la categoría": se
        // pregunta en vez de inventar una nueva (nunca se guarda tal cual).
        setPendingState(channel, externalUserId, { type: 'media_awaiting_categoria', attachment })
        return { replyText: categoryClarificationPrompt(prefill.categoria) }
      }
      // Destino + categoría ya vinieron en el mismo mensaje (normalizada
      // al valor canónico): dato completo, se ejecuta directo (Objetivo 1)
      // — sin preguntar nada.
      const placement = { attachment, section: 'galeria', extra: { categoria: resolved.canonical, captionText } }
      return finalizeMediaPlacement({ channel, externalUserId, placement })
    }
    setPendingState(channel, externalUserId, { type: 'media_awaiting_categoria', attachment })
    return { replyText: '¿Qué categoría le pongo a este elemento de la Galería?' }
  }

  if (section === 'servicios') {
    if (prefill?.servicioNombre) {
      const result = await resolveServicioTargetForPhoto(prefill.servicioNombre)
      return handleServicioTargetResult({ channel, externalUserId, attachment, result })
    }
    setPendingState(channel, externalUserId, { type: 'media_awaiting_target_servicio', attachment })
    return { replyText: '¿A qué servicio pertenece esta foto? Dime el nombre.' }
  }

  // testimonios
  if (prefill?.testimonioNombre) {
    const result = await resolveTestimonioTargetForPhoto(prefill.testimonioNombre)
    return handleTestimonioTargetResult({ channel, externalUserId, attachment, result })
  }
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
    return finalizeMediaPlacement({ channel, externalUserId, placement })
  }
  if (result.mode === 'create') {
    const placement = { attachment, section: 'servicios', extra: { mode: 'create', titulo: result.titulo } }
    return finalizeMediaPlacement({ channel, externalUserId, placement })
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
    return finalizeMediaPlacement({ channel, externalUserId, placement })
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

/**
 * Ejecuta la subida/colocación de un archivo ya identificado por completo
 * (adjunto + destino + lo que haga falta por sección) — sin pedir
 * confirmación (Fase 2A: la subida no es una acción destructiva).
 */
async function finalizeMediaPlacement({ channel, externalUserId, placement }) {
  clearPendingState(channel, externalUserId)
  // externalUserId viaja con el placement (no solo con la llamada) porque
  // executeMediaPlacement lo necesita para guardar telegram_user_id en el
  // registro de Galería (Objetivo 2.1/2.6 — permite luego resolver "la
  // última foto que TE envié" acotado a este usuario).
  const message = await runMediaPlacement({ channel, externalUserId, placement: { ...placement, externalUserId } })
  return { replyText: message }
}
