// ============================================================================
// Capa única y reutilizable de resolución semántica de texto libre contra
// entidades reales. No hay un "resolveGaleriaWithGemini()" /
// "resolveServicioWithGemini()" por sección — Galería, Servicios,
// Paquetes, Testimonios y FAQ pasan todos por las mismas dos funciones de
// acá (Hero se queda 100% determinista a propósito: no tiene un campo de
// texto real contra el cual comparar semánticamente, solo posición/orden).
//
// Dos usos del mismo principio (atajo determinista → si no es inequívoco
// → Gemini restringido a candidatos reales → el código valida):
//
//   - resolveBySemanticMatch: BÚSQUEDA inicial — texto libre contra TODOS
//     los registros de una entidad (ej. "elimina la foto de la ranita"
//     contra toda la Galería, "hamburguesa de oreo" contra Servicios).
//   - selectAmongShownCandidates: SELECCIÓN — el usuario ya vio una lista
//     numerada (desambiguación o recentContext) y responde con un
//     número, un ordinal, o una descripción ("la de la animadora", "esa
//     no, la otra").
//
// Gemini NUNCA ve ni puede inventar un id: solo recibe strings de
// descripción ya armados por el código, y solo puede devolver posiciones
// (1-based) dentro de la lista que se le pasó — `resolveSemanticCandidates`
// (llm.js) ya valida que esas posiciones sean enteros dentro de rango
// antes de devolverlas. Acá, además, se mapean exclusivamente contra la
// MISMA lista real que se envió — nunca contra un universo distinto.
// ============================================================================

import { resolveSemanticCandidates } from './llm.js'
import { logAgentEvent } from './logger.js'

// Tope de candidatos que se le ofrecen a Gemini en una búsqueda inicial —
// evita mandar un prompt enorme si una entidad llegara a tener cientos de
// registros. Si hay más que esto, se opera solo sobre los primeros; no es
// paginación real, es una salvaguarda de costo/tamaño (ver AGENT.md).
const MAX_CANDIDATES_FOR_GEMINI = 40

function normalize(value) {
  return (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const ORDINAL_WORDS = {
  primera: 1,
  primer: 1,
  segunda: 2,
  segundo: 2,
  tercera: 3,
  tercero: 3,
  cuarta: 4,
  cuarto: 4,
  quinta: 5,
  quinto: 5,
  ultima: -1,
  ultimo: -1,
}

function resolveOrdinal(text, count) {
  const n = normalize(text)
  for (const [word, value] of Object.entries(ORDINAL_WORDS)) {
    if (n.includes(word)) return value === -1 ? count : value
  }
  return null
}

/** Le pregunta a Gemini cuáles de `items` (ya acotados) coinciden con `query`. Nunca lanza — si falla, se trata como "ninguna coincidencia". */
async function askGeminiToMatch(query, items, describeFn) {
  if (items.length === 0) return []
  try {
    const descriptions = items.map(describeFn)
    const indexes = await resolveSemanticCandidates(query, descriptions)
    return indexes.map((i) => items[i - 1]).filter(Boolean)
  } catch (err) {
    logAgentEvent('semantic_resolve_error', { error: String(err?.message ?? err).slice(0, 200) })
    return []
  }
}

/**
 * BÚSQUEDA inicial: texto libre → uno o más registros reales.
 *
 * Capas: coincidencia exacta → coincidencia parcial (substring) → si
 * ninguna de las dos fue inequívoca, Gemini interpreta lenguaje natural
 * (typos, sinónimos, plural/singular, descripciones aproximadas o más
 * largas que el texto guardado) sobre los candidatos reales.
 *
 * @param {{ query: string, items: object[], describeFn: (item:object)=>string }} params
 * @returns {Promise<{ record: object|null, ambiguous: object[], notFound: boolean }>}
 */
export async function resolveBySemanticMatch({ query, items, describeFn }) {
  if (!items?.length) return { record: null, ambiguous: [], notFound: true }
  const n = normalize(query)
  if (!n) return { record: null, ambiguous: [], notFound: true }

  const exact = items.filter((it) => normalize(describeFn(it)) === n)
  if (exact.length === 1) return { record: exact[0], ambiguous: [], notFound: false }

  if (exact.length === 0) {
    const partial = items.filter((it) => normalize(describeFn(it)).includes(n))
    if (partial.length === 1) return { record: partial[0], ambiguous: [], notFound: false }
    if (partial.length > 1) return { record: null, ambiguous: partial, notFound: false }
  }

  // No fue inequívoco con el atajo determinista -> Gemini, sobre el
  // universo real (acotado a los exactos si hubo varios, o a todos si no
  // hubo ninguno) — nunca sobre un universo inventado.
  const pool = (exact.length > 1 ? exact : items).slice(0, MAX_CANDIDATES_FOR_GEMINI)
  const matched = await askGeminiToMatch(query, pool, describeFn)

  if (matched.length === 0) return { record: null, ambiguous: [], notFound: true }
  if (matched.length === 1) return { record: matched[0], ambiguous: [], notFound: false }
  return { record: null, ambiguous: matched, notFound: false }
}

/**
 * Filtra `items` por una búsqueda libre — pensado para CONSULTAS de
 * lectura (mostrar varios resultados), no para seleccionar un único
 * objetivo de escritura. Substring primero (barato); si no encuentra
 * nada, Gemini amplía con comprensión semántica (plural/singular,
 * sinónimos, temas relacionados) sobre el universo real. Como es de solo
 * lectura, ser generoso acá es seguro — a diferencia de
 * resolveBySemanticMatch, no hace falta que el resultado sea inequívoco.
 *
 * @param {{ query: string, items: object[], describeFn: (item:object)=>string }} params
 * @returns {Promise<object[]>}
 */
export async function filterBySemanticMatch({ query, items, describeFn }) {
  if (!items?.length) return []
  const n = normalize(query)
  if (!n) return items

  const literal = items.filter((it) => normalize(describeFn(it)).includes(n))
  if (literal.length > 0) return literal

  const pool = items.slice(0, MAX_CANDIDATES_FOR_GEMINI)
  return askGeminiToMatch(query, pool, describeFn)
}

/**
 * SELECCIÓN entre candidatos YA mostrados y numerados (desambiguación o
 * recentContext). A diferencia de resolveBySemanticMatch, acá "1", "la
 * segunda", "la última" sí son referencias válidas por posición.
 *
 * @param {{ query: string, candidates: object[], describeFn: (item:object)=>string }} params
 * @returns {Promise<object|null>} el candidato elegido, o null si no se identificó ninguno con confianza
 */
export async function selectAmongShownCandidates({ query, candidates, describeFn }) {
  if (!candidates?.length) return null
  const trimmed = query.trim()

  const idx = Number(trimmed)
  if (!Number.isNaN(idx) && Number.isInteger(idx) && idx >= 1 && idx <= candidates.length) {
    return candidates[idx - 1]
  }

  const ordinal = resolveOrdinal(trimmed, candidates.length)
  if (ordinal && ordinal >= 1 && ordinal <= candidates.length) {
    return candidates[ordinal - 1]
  }

  const n = normalize(trimmed)
  const substringMatches = candidates.filter((c) => normalize(describeFn(c)).includes(n))
  if (substringMatches.length === 1) return substringMatches[0]

  // Lenguaje natural ambiguo ("la de la animadora", "esa no, la otra") —
  // Gemini elige, restringido a las descripciones reales ya mostradas. Si
  // devuelve más de una (genuinamente ambiguo incluso para Gemini), no se
  // adivina — se pide que sea más específico.
  const matched = await askGeminiToMatch(query, candidates, describeFn)
  return matched.length === 1 ? matched[0] : null
}
