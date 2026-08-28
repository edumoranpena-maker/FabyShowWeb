// ============================================================================
// Núcleo del agente — el ÚNICO lugar que decide qué hacer con un mensaje
// entrante, sin importar de qué canal vino.
//
//   Telegram (o WhatsApp en el futuro)
//        │  ya resolvió: canal, id de usuario, autorización, texto, adjunto
//        ▼
//   handleInboundMessage()   ← este archivo
//        │
//        ├─ tarea activa (conversationStore, persistida en Supabase) →
//        │    confirmaciones, desambiguación, texto pendiente, placeMedia
//        │
//        ├─ sin tarea activa pero con recentContext (candidatas de una
//        │    eliminación recién cancelada) → se intenta retomar antes de
//        │    tratar el mensaje como una intención nueva
//        │
//        └─ nada de lo anterior → LLM (resolveIntent) → tool del whitelist
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
import { resolveIntent, extractMediaPlacementIntent } from './llm.js'
import { selectAmongShownCandidates } from './semanticResolve.js'
import {
  getPendingState,
  setPendingState,
  clearPendingState,
  getRecentContext,
  setRecentContext,
  clearRecentContext,
} from './conversationStore.js'
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

const DESCRIBER_BY_SECTION_FOR_CREATE = {
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

const MEDIA_SLOT_QUESTIONS = {
  destino: '¿Dónde quieres ponerla? (Hero, Galería, Servicios o Testimonios)',
  categoria: '¿Qué categoría le pongo a este elemento de la Galería?',
  servicioNombre: '¿A qué servicio pertenece esta foto? Dime el nombre.',
  testimonioNombre: '¿De qué testimonio es esta foto? Dime el nombre de la persona.',
}

function normalize(text) {
  return (text ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function isAffirmative(text) {
  return /^(si|sí|s|yes|ok|dale|confirmo|correcto|de acuerdo|claro|va)\b/i.test(normalize(text))
}

function isNegative(text) {
  return /^(no|n|cancel|cancela|cancelar|ninguna|ninguno|ya no|olvidalo|olvídalo|dejalo|déjalo|mejor no)\b/i.test(normalize(text))
}

function verbFor(actionName) {
  const prefix = Object.keys(ACTION_VERB).find((p) => actionName.startsWith(p))
  return ACTION_VERB[prefix] ?? 'ejecutar'
}

function describeForConfirmation(entry, params, record) {
  if (record) return entry.describeTarget(record)
  const describer = entry.section && DESCRIBER_BY_SECTION_FOR_CREATE[entry.section]
  if (describer && params.values) {
    try {
      return describer({ activo: true, ...params.values })
    } catch {
      // sigue al fallback
    }
  }
  return 'estos datos'
}

/**
 * URL de la foto/imagen de un registro, si tiene una — se usa para
 * mostrarle al admin la foto ANTES de pedir confirmación de borrado, o
 * para mostrar candidatas de una búsqueda. Cubre los distintos nombres de
 * columna de imagen según la sección.
 */
function photoUrlForRecord(record) {
  return record?.src ?? record?.image_url ?? record?.imagen_url ?? record?.foto_url ?? null
}

// ---------------------------------------------------------------------------
// La selección de una candidata ya mostrada (desambiguación / recentContext)
// vive ahora en server/agent/semanticResolve.js (selectAmongShownCandidates)
// — capa única y reutilizable, compartida con la búsqueda inicial de
// resolvers.js. Nada de eso se duplica acá.
// ---------------------------------------------------------------------------

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
// `sourceCandidates`, si viene, es la lista completa que llevó a este
// registro (ej. tras una desambiguación) — se conserva para poder
// retomarla en recentContext si el usuario cancela (ver más abajo).
// ---------------------------------------------------------------------------
function buildConfirmation({ actionName, entry, params, record, sourceCandidates = null }) {
  const summary = describeForConfirmation(entry, params, record)
  return {
    type: 'confirmation',
    actionName,
    params,
    recordId: record?.id ?? null,
    record: record ?? null,
    sourceCandidates,
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
 * @returns {Promise<{ replyText: string, photos?: Array<{url:string, caption?:string}> }>}
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
    await clearPendingState(channel, externalUserId)
    await clearRecentContext(channel, externalUserId)
    if (attachment.kind !== 'photo' && attachment.kind !== 'video') {
      return { replyText: 'Ese tipo de archivo no está soportado todavía. Puedo recibir fotos y videos.' }
    }
    return startMediaFlow({ channel, externalUserId, attachment, captionText: text })
  }

  if (!text || !text.trim()) {
    return { replyText: 'No recibí ningún texto. ¿Puedes escribir tu instrucción?' }
  }

  const pending = await getPendingState(channel, externalUserId)
  if (pending) {
    return continuePendingFlow({ channel, externalUserId, pending, text })
  }

  // Sin tarea activa: si hay un rastro reciente de una eliminación
  // cancelada, se intenta retomar ANTES de tratar el mensaje como algo
  // nuevo — pero solo si de verdad resuelve contra esas candidatas
  // (ver resolveCandidateSelection). Si no resuelve, se ignora en
  // silencio y sigue el camino normal — así "¿cuánto cuesta Premium?"
  // nunca queda atrapado esperando una selección vieja.
  const recent = await getRecentContext(channel, externalUserId)
  if (recent) {
    const resumed = await tryResumeFromRecentContext({ channel, externalUserId, recent, text })
    if (resumed) return resumed
  }

  return handleFreshTextMessage({ channel, externalUserId, text })
}

async function tryResumeFromRecentContext({ channel, externalUserId, recent, text }) {
  const entry = getActionEntry(recent.actionName)
  if (!entry) return null

  const chosen = await selectAmongShownCandidates({ query: text, candidates: recent.candidates, describeFn: entry.describeTarget })
  if (!chosen) return null

  await clearRecentContext(channel, externalUserId)

  if (entry.requiresConfirmation) {
    const confirmation = buildConfirmation({
      actionName: recent.actionName,
      entry,
      params: recent.params,
      record: chosen,
      sourceCandidates: recent.candidates,
    })
    await setPendingState(channel, externalUserId, confirmation)
    return { replyText: confirmation.prompt, photos: photosForConfirmation(confirmation) }
  }

  const message = await runRegistryAction({ channel, externalUserId, actionName: recent.actionName, entry, params: recent.params, record: chosen })
  return { replyText: message }
}

// ---------------------------------------------------------------------------
// Continuación de una tarea activa (confirmación, desambiguación, texto
// pendiente, o subida de media en curso).
// ---------------------------------------------------------------------------
async function continuePendingFlow({ channel, externalUserId, pending, text }) {
  switch (pending.type) {
    case 'confirmation': {
      if (isAffirmative(text)) {
        await clearPendingState(channel, externalUserId)
        await clearRecentContext(channel, externalUserId)
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
        await clearPendingState(channel, externalUserId)
        // Se guarda un rastro corto de las candidatas (no de la tarea
        // completa) para poder retomar sin repetir la búsqueda — ver
        // tryResumeFromRecentContext. TTL corto y separado a propósito
        // (conversationStore.js) de la tarea activa.
        const candidates = pending.sourceCandidates?.length ? pending.sourceCandidates : pending.record ? [pending.record] : []
        if (candidates.length > 0) {
          await setRecentContext(channel, externalUserId, { actionName: pending.actionName, candidates, params: pending.params })
        }
        return { replyText: '❌ Operación cancelada.' }
      }
      return { replyText: `Todavía tengo pendiente esto:\n\n${pending.prompt}` }
    }

    case 'disambiguation': {
      const entry = getActionEntry(pending.actionName)
      if (!entry) {
        await clearPendingState(channel, externalUserId)
        return { replyText: '❌ Esa acción ya no está disponible.' }
      }
      const chosen = await selectAmongShownCandidates({ query: text, candidates: pending.options, describeFn: entry.describeTarget })
      if (!chosen) {
        return { replyText: 'No identifiqué cuál de las opciones. Responde con el número, el nombre, o descríbela.' }
      }
      await clearPendingState(channel, externalUserId)
      if (entry.requiresConfirmation) {
        const confirmation = buildConfirmation({
          actionName: pending.actionName,
          entry,
          params: pending.params,
          record: chosen,
          sourceCandidates: pending.options,
        })
        await setPendingState(channel, externalUserId, confirmation)
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
      await clearPendingState(channel, externalUserId)
      return handleFreshTextMessage({
        channel,
        externalUserId,
        text,
        context: { previousUserText: pending.previousUserText, previousModelText: pending.previousModelText },
      })
    }

    case 'placeMedia': {
      return continueMediaTask({ channel, externalUserId, pending, text })
    }

    default: {
      await clearPendingState(channel, externalUserId)
      return handleFreshTextMessage({ channel, externalUserId, text })
    }
  }
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
    const accumulatedUserText = context ? `${context.previousUserText} ${text}`.slice(-300) : text
    await setPendingState(channel, externalUserId, {
      type: 'pending_text_intent',
      previousUserText: accumulatedUserText,
      previousModelText: intent.text,
    })
    return { replyText: intent.text }
  }

  // Se resolvió una acción → cualquier contexto de texto/recentContext pendiente ya cumplió su función.
  await clearPendingState(channel, externalUserId)
  await clearRecentContext(channel, externalUserId)

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
    // Solo algunas consultas (ej. listGaleriaItems) saben armar fotos —
    // el resto simplemente no define buildPhotos y no cambia su comportamiento.
    const photos = entry.buildPhotos ? entry.buildPhotos(data, params) : undefined
    return { replyText: entry.formatResult(data, params), photos }
  }

  // kind === 'write'. Dato completo + acción no destructiva → ejecutar
  // directo. Solo las marcadas `requiresConfirmation: true` en
  // actionRegistry.js (delete*/remove*Image/remove*Media) piden confirmación.
  if (!entry.resolve) {
    if (entry.requiresConfirmation) {
      const confirmation = buildConfirmation({ actionName: intent.name, entry, params, record: null })
      await setPendingState(channel, externalUserId, confirmation)
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
    await setPendingState(channel, externalUserId, {
      type: 'disambiguation',
      actionName: intent.name,
      params,
      options: resolved.ambiguous,
      section: entry.section,
    })
    // Para búsquedas de media (ej. eliminar por descripción), mandamos las
    // fotos candidatas para que el admin las reconozca visualmente —
    // para las demás secciones (paquetes, servicios de texto, etc.) el
    // listado de texto de siempre es suficiente.
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
    await setPendingState(channel, externalUserId, confirmation)
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
// Flujo de fotos/videos — un único tipo de tarea (`placeMedia`) con slots
// parciales, en vez de un tipo de estado distinto por cada paso. Esto es
// lo que corrige el bug reportado: cualquier turno de seguimiento (sea
// "Galería" exacto o "ponla en la galería" en lenguaje natural) pasa
// SIEMPRE por acá, nunca cae directo a resolveIntent() con las 28 tools
// del whitelist sin saber que hay una subida en curso.
// ---------------------------------------------------------------------------

function computeMissingMediaSlots(slots) {
  if (!slots.destino) return ['destino']
  if (slots.destino === 'galeria' && !slots.categoria) return ['categoria']
  if (slots.destino === 'servicios' && !slots.servicioResolved) return ['servicioNombre']
  if (slots.destino === 'testimonios' && !slots.testimonioResolved) return ['testimonioNombre']
  return []
}

async function setMediaTask(channel, externalUserId, slots, missingSlots, lastPrompt) {
  await setPendingState(channel, externalUserId, { type: 'placeMedia', slots, missingSlots, lastPrompt })
}

function buildPlacementFromSlots(slots, captionText) {
  if (slots.destino === 'hero') {
    return { attachment: slots.attachment, section: 'hero', extra: {} }
  }
  if (slots.destino === 'galeria') {
    return { attachment: slots.attachment, section: 'galeria', extra: { categoria: slots.categoria, captionText } }
  }
  if (slots.destino === 'servicios') {
    const r = slots.servicioResolved
    const extra = r.mode === 'update' ? { mode: 'update', recordId: r.record.id, titulo: r.record.titulo } : { mode: 'create', titulo: r.titulo }
    return { attachment: slots.attachment, section: 'servicios', extra }
  }
  // testimonios
  const r = slots.testimonioResolved
  return { attachment: slots.attachment, section: 'testimonios', extra: { recordId: r.record.id, nombre: r.record.nombre } }
}

async function startMediaFlow({ channel, externalUserId, attachment, captionText }) {
  // Objetivo 1: si el mensaje ya trae destino (y de paso categoría/nombre
  // de servicio/testimonio), no hay que preguntar nada de eso — se extrae
  // con Gemini/function calling (no matching de frase exacta).
  const extracted = await parseMediaCaption(captionText)
  const fallbackDestino = extracted?.section ?? (captionText ? detectDestinationFromText(captionText) : null)

  const slots = {
    attachment,
    destino: fallbackDestino,
    categoria: extracted?.categoria ?? null,
    servicioNombre: extracted?.servicioNombre ?? null,
    testimonioNombre: extracted?.testimonioNombre ?? null,
    servicioResolved: null,
    testimonioResolved: null,
  }

  return advanceMediaTask({ channel, externalUserId, slots, captionText })
}

/**
 * Continúa una tarea `placeMedia` con un mensaje de texto de seguimiento.
 * Atajo determinista primero (barato, sin llamar a Gemini) para el caso
 * inequívoco; si no resuelve, se llama a Gemini CON el contexto de la
 * tarea (destino/categoría faltante, última pregunta) para que interprete
 * lenguaje natural ("ponla en la galería", "en decoración") sin necesitar
 * una regla nueva por cada forma de decirlo.
 */
async function continueMediaTask({ channel, externalUserId, pending, text }) {
  const missingSlot = pending.missingSlots?.[0]

  if (missingSlot === 'servicioNombre' || missingSlot === 'testimonioNombre') {
    // Nombre libre — no hace falta pasar por Gemini para extraerlo, se usa el texto tal cual.
    return advanceMediaTask({ channel, externalUserId, slots: { ...pending.slots, [missingSlot]: text.trim() } })
  }

  if (missingSlot === 'destino') {
    const quick = detectDestinationFromText(text)
    if (quick) {
      return advanceMediaTask({ channel, externalUserId, slots: { ...pending.slots, destino: quick } })
    }
  }
  if (missingSlot === 'categoria') {
    const quick = normalizeGaleriaCategory(text.trim())
    if (!quick.notFound) {
      return advanceMediaTask({ channel, externalUserId, slots: { ...pending.slots, categoria: quick.canonical } })
    }
  }

  let extracted
  try {
    extracted = await extractMediaPlacementIntent(text, {
      slots: pending.slots,
      missingSlots: pending.missingSlots,
      lastPrompt: pending.lastPrompt,
    })
  } catch (err) {
    logAgentEvent('media_intent_error', { channel, externalUserId, error: String(err?.message ?? err).slice(0, 200) })
    return { replyText: `Todavía tengo pendiente esto:\n\n${pending.lastPrompt}` }
  }

  const mergedSlots = { ...pending.slots }
  if (extracted.section) mergedSlots.destino = extracted.section
  if (extracted.categoria) mergedSlots.categoria = extracted.categoria
  if (extracted.servicioNombre) mergedSlots.servicioNombre = extracted.servicioNombre
  if (extracted.testimonioNombre) mergedSlots.testimonioNombre = extracted.testimonioNombre

  const changedAnything = ['destino', 'categoria', 'servicioNombre', 'testimonioNombre'].some(
    (key) => pending.slots[key] !== mergedSlots[key]
  )

  if (!changedAnything) {
    // Gemini (con el contexto completo de la tarea) determinó que este
    // mensaje no la completa — se trata como cambio de tema: se abandona
    // la subida en curso y se procesa como un mensaje nuevo, en vez de
    // insistir con la misma pregunta.
    await clearPendingState(channel, externalUserId)
    return handleFreshTextMessage({ channel, externalUserId, text })
  }

  return advanceMediaTask({ channel, externalUserId, slots: mergedSlots })
}

/**
 * Valida/normaliza los slots conocidos, resuelve servicio/testimonio si
 * corresponde, y decide: preguntar el siguiente dato que falta, o
 * ejecutar si ya está todo completo (nunca pide confirmación — subir
 * media no es una acción destructiva).
 */
async function advanceMediaTask({ channel, externalUserId, slots, captionText = null }) {
  if (slots.destino) {
    const invalidReason = validateAttachmentForSection(slots.attachment.kind, slots.destino)
    if (invalidReason) {
      const cleared = { ...slots, destino: null }
      await setMediaTask(channel, externalUserId, cleared, ['destino'], invalidReason)
      return { replyText: invalidReason }
    }
  }

  if (slots.destino === 'galeria' && slots.categoria && !isCanonicalCategoria(slots.categoria)) {
    const resolved = normalizeGaleriaCategory(slots.categoria)
    if (resolved.notFound) {
      const prompt = categoryClarificationPrompt(slots.categoria)
      const cleared = { ...slots, categoria: null }
      await setMediaTask(channel, externalUserId, cleared, ['categoria'], prompt)
      return { replyText: prompt }
    }
    slots = { ...slots, categoria: resolved.canonical }
  }

  if (slots.destino === 'servicios' && slots.servicioNombre && !slots.servicioResolved) {
    return resolveServicioSlotAndContinue({ channel, externalUserId, slots })
  }
  if (slots.destino === 'testimonios' && slots.testimonioNombre && !slots.testimonioResolved) {
    return resolveTestimonioSlotAndContinue({ channel, externalUserId, slots })
  }

  const missing = computeMissingMediaSlots(slots)
  if (missing.length === 0) {
    return finalizeMediaPlacement({ channel, externalUserId, placement: buildPlacementFromSlots(slots, captionText) })
  }

  const prompt = MEDIA_SLOT_QUESTIONS[missing[0]]
  await setMediaTask(channel, externalUserId, slots, missing, prompt)
  return { replyText: prompt }
}

function isCanonicalCategoria(value) {
  return listCanonicalGaleriaCategories().includes(value)
}

async function resolveServicioSlotAndContinue({ channel, externalUserId, slots }) {
  const result = await resolveServicioTargetForPhoto(slots.servicioNombre)
  if (result.mode === 'ambiguous') {
    const prompt = formatAmbiguous(result.options, describeServicio)
    await setMediaTask(channel, externalUserId, { ...slots, servicioNombre: null }, ['servicioNombre'], prompt)
    return { replyText: prompt }
  }
  if (result.mode === 'invalid') {
    const prompt = 'No entendí el nombre del servicio. ¿Puedes repetirlo?'
    await setMediaTask(channel, externalUserId, { ...slots, servicioNombre: null }, ['servicioNombre'], prompt)
    return { replyText: prompt }
  }
  // 'update' | 'create'
  return advanceMediaTask({ channel, externalUserId, slots: { ...slots, servicioResolved: result } })
}

async function resolveTestimonioSlotAndContinue({ channel, externalUserId, slots }) {
  const result = await resolveTestimonioTargetForPhoto(slots.testimonioNombre)
  if (result.mode === 'ambiguous') {
    const prompt = formatAmbiguous(result.options, describeTestimonio)
    await setMediaTask(channel, externalUserId, { ...slots, testimonioNombre: null }, ['testimonioNombre'], prompt)
    return { replyText: prompt }
  }
  if (result.mode === 'not_found') {
    await clearPendingState(channel, externalUserId)
    return {
      replyText:
        'No encontré ningún testimonio con ese nombre. Primero crea el testimonio con su texto (ej. "agrega un testimonio de Juana que dice...") y después envíame la foto.',
    }
  }
  if (result.mode === 'invalid') {
    const prompt = 'No entendí el nombre. ¿Puedes repetirlo?'
    await setMediaTask(channel, externalUserId, { ...slots, testimonioNombre: null }, ['testimonioNombre'], prompt)
    return { replyText: prompt }
  }
  // 'update'
  return advanceMediaTask({ channel, externalUserId, slots: { ...slots, testimonioResolved: result } })
}

/**
 * Ejecuta la subida/colocación de un archivo ya identificado por completo
 * — sin pedir confirmación (subir media no es una acción destructiva).
 */
async function finalizeMediaPlacement({ channel, externalUserId, placement }) {
  await clearPendingState(channel, externalUserId)
  // externalUserId viaja con el placement (no solo con la llamada) porque
  // executeMediaPlacement lo necesita para guardar telegram_user_id en el
  // registro de Galería (permite luego resolver "la última foto que TE
  // envié" acotado a este usuario).
  const message = await runMediaPlacement({ channel, externalUserId, placement: { ...placement, externalUserId } })
  return { replyText: message }
}
