// ============================================================================
// Resolución de "match" de texto libre → registro concreto.
//
// El usuario escribe en lenguaje natural ("aprueba el de María", "cambia
// el precio del Premium", "elimina la foto de la ranita") — nunca un id
// de base de datos. Estas funciones reutilizan los `list*` de
// AdminActions (sin acceder a Supabase directamente) y delegan la
// interpretación en la capa única de server/agent/semanticResolve.js —
// no hay un "resolveXWithGemini()" distinto por sección: todas pasan por
// la misma función (`resolveBySemanticMatch`), que ya se encarga de
// intentar primero coincidencia exacta/parcial (barato, sin Gemini) y
// solo recurrir a Gemini cuando eso no fue inequívoco (typos, sinónimos,
// descripciones aproximadas o más largas que el texto guardado).
//
// Hero es la única excepción: no tiene un campo de texto real contra el
// cual comparar semánticamente (solo posición/orden), así que se queda
// 100% determinista.
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
import { resolveBySemanticMatch } from './semanticResolve.js'

function normalize(value) {
  return (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos
    .toLowerCase()
    .trim()
}

export async function resolveTestimonio(match, { pendingOnly = false } = {}) {
  const items = pendingOnly ? await listPendingTestimonios() : await listTestimonios()
  return resolveBySemanticMatch({ query: match, items, describeFn: (it) => it.nombre })
}

export async function resolvePaquete(match) {
  const items = await listPaquetes()
  return resolveBySemanticMatch({ query: match, items, describeFn: (it) => it.nombre })
}

export async function resolveServicio(match) {
  const items = await listServicios()
  return resolveBySemanticMatch({ query: match, items, describeFn: (it) => it.titulo })
}

export async function resolveFaq(match) {
  const items = await listFaqs()
  return resolveBySemanticMatch({ query: match, items, describeFn: (it) => it.pregunta })
}

/** Para EDITAR un elemento de Galería por categoría (updateGaleriaItem). */
export async function resolveGaleriaItem(match) {
  const items = await listGaleriaItems()
  return resolveBySemanticMatch({ query: match, items, describeFn: (it) => it.categoria })
}

/**
 * Resolver de búsqueda para ELIMINAR media de la Galería — deliberadamente
 * distinto de resolveGaleriaItem (que solo mira "categoria", para editar).
 * Este busca por alias/descripción/categoría combinados, y reconoce "la
 * última foto/video que envié" como un caso especial resuelto por fecha
 * real (telegram_user_id + created_at), no por texto — eso nunca pasa
 * por Gemini, porque no es una interpretación de lenguaje, es una
 * consulta a datos reales.
 *
 * Para todo lo demás ("la ranita", "hamburguesa de oreo", "la
 * animadora"), delega en resolveBySemanticMatch — la misma capa que usan
 * las demás secciones, sin duplicar lógica de Gemini acá.
 *
 * @param {string} match - lo que escribió el usuario
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

  const describeFn = (it) => [it.alias, it.descripcion, it.categoria].filter(Boolean).join(' — ')
  return resolveBySemanticMatch({ query: match, items, describeFn })
}

/**
 * Los slides del Hero no tienen un campo de "nombre" — se identifican por
 * posición ("la última", "la primera") o por su número de orden. Se
 * queda 100% determinista a propósito: no hay texto real que comparar
 * semánticamente, la ambigüedad acá es solo de posición.
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
