// ============================================================================
// Resolución de "match" de texto libre → registro concreto.
//
// El usuario escribe en lenguaje natural ("aprueba el de María", "cambia
// el precio del Premium") — nunca un id de base de datos. Estas funciones
// toman ese texto y lo resuelven contra los registros reales, reutilizando
// los `list*` de AdminActions (sin acceder a Supabase directamente, sin
// duplicar lógica).
//
// No es búsqueda difusa sofisticada: es normalización de acentos/mayúsculas
// + coincidencia exacta o parcial. Es intencionalmente simple (ver
// AGENT.md, "no sobrediseñar"); si hay 0 coincidencias o más de una, quien
// llama debe pedirle aclaración al usuario en vez de adivinar.
// ============================================================================

import {
  listHeroSlides,
  listGaleriaItems,
  listServicios,
  listPaquetes,
  listTestimonios,
  listPendingTestimonios,
  listFaqs,
} from '../adminActions/index.js'

function normalize(value) {
  return (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos
    .toLowerCase()
    .trim()
}

/**
 * @returns {{ record: object|null, ambiguous: object[], notFound: boolean }}
 */
function resolveSingle(items, field, match) {
  const nMatch = normalize(match)
  if (!nMatch) return { record: null, ambiguous: [], notFound: true }

  const exact = items.filter((it) => normalize(it[field]) === nMatch)
  if (exact.length === 1) return { record: exact[0], ambiguous: [], notFound: false }
  if (exact.length > 1) return { record: null, ambiguous: exact, notFound: false }

  const partial = items.filter((it) => normalize(it[field]).includes(nMatch))
  if (partial.length === 1) return { record: partial[0], ambiguous: [], notFound: false }
  if (partial.length > 1) return { record: null, ambiguous: partial, notFound: false }

  return { record: null, ambiguous: [], notFound: true }
}

export async function resolveTestimonio(match, { pendingOnly = false } = {}) {
  const items = pendingOnly ? await listPendingTestimonios() : await listTestimonios()
  return resolveSingle(items, 'nombre', match)
}

export async function resolvePaquete(match) {
  return resolveSingle(await listPaquetes(), 'nombre', match)
}

export async function resolveServicio(match) {
  return resolveSingle(await listServicios(), 'titulo', match)
}

export async function resolveFaq(match) {
  return resolveSingle(await listFaqs(), 'pregunta', match)
}

export async function resolveGaleriaItem(match) {
  return resolveSingle(await listGaleriaItems(), 'categoria', match)
}

/**
 * Resolver de búsqueda para ELIMINAR media de la Galería (Objetivo 2.6-2.9
 * del upgrade) — deliberadamente distinto de resolveGaleriaItem (que
 * solo mira "categoria", para editar). Este busca por alias/descripción/
 * categoría a la vez, y reconoce "la última foto/video que envié" como un
 * caso especial resuelto por fecha real (telegram_user_id + created_at),
 * no por texto.
 *
 * @param {string} match - lo que escribió el usuario (ej. "la última foto", "Spider-Man", "Piñata Peppa Pig 23-08")
 * @param {{ externalUserId?: string }} [context]
 */
export async function resolveGaleriaMediaForDeletion(match, context = {}) {
  const items = await listGaleriaItems()
  const n = normalize(match)

  const wantsVideo = /\bvideo\b/.test(n)
  const wantsPhoto = /\bfoto\b/.test(n)
  const wantsLatest = /ultim/.test(n) || /recient/.test(n)

  if (wantsLatest) {
    let candidates = context.externalUserId
      ? items.filter((it) => it.telegram_user_id === context.externalUserId)
      : items
    if (wantsVideo) candidates = candidates.filter((it) => it.tipo === 'video')
    else if (wantsPhoto) candidates = candidates.filter((it) => it.tipo === 'foto')
    candidates = candidates
      .filter((it) => it.created_at)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    if (candidates.length === 0) return { record: null, ambiguous: [], notFound: true }
    return { record: candidates[0], ambiguous: [], notFound: false }
  }

  // Coincidencia exacta de alias tiene prioridad — permite "elimina Piñata
  // Peppa Pig 23-08" con el alias completo tal como se lo mostramos antes.
  const exactAlias = items.filter((it) => it.alias && normalize(it.alias) === n)
  if (exactAlias.length === 1) return { record: exactAlias[0], ambiguous: [], notFound: false }

  // Búsqueda estructurada simple: alias, descripción o categoría contienen el texto.
  const fields = ['alias', 'descripcion', 'categoria']
  const matches = items.filter((it) => fields.some((f) => it[f] && normalize(it[f]).includes(n)))

  if (matches.length === 0) return { record: null, ambiguous: [], notFound: true }
  if (matches.length === 1) return { record: matches[0], ambiguous: [], notFound: false }
  return { record: null, ambiguous: matches, notFound: false }
}

/**
 * Los slides del Hero no tienen un campo de "nombre" — se identifican por
 * posición ("la última", "la primera") o por su número de orden. Resolver
 * deliberadamente más simple que los de arriba.
 */
export async function resolveHeroSlide(match) {
  const items = await listHeroSlides()
  if (items.length === 0) return { record: null, ambiguous: [], notFound: true }

  const sorted = [...items].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
  const n = normalize(match)

  if (!n || /ultim/.test(n) || /recient/.test(n)) {
    return { record: sorted[sorted.length - 1], ambiguous: [], notFound: false }
  }
  if (/primer/.test(n)) {
    return { record: sorted[0], ambiguous: [], notFound: false }
  }
  const asNumber = Number(n)
  if (!Number.isNaN(asNumber)) {
    const byOrden = items.find((it) => it.orden === asNumber)
    if (byOrden) return { record: byOrden, ambiguous: [], notFound: false }
  }
  return { record: null, ambiguous: [], notFound: true }
}
