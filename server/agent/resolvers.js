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
