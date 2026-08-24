// ============================================================================
// Normalización de categorías de Galería.
//
// PROBLEMA que corrige: el agente guardaba la categoría tal como la
// escribió el admin ("decoración", "DECORACION", etc.), pero el sitio
// público filtra comparando con `===` contra la lista canónica de
// src/data/content.js (GALERIA_FILTROS) — cualquier variante de
// mayúsculas/acentos quedaba invisible en su filtro real, aunque
// existiera en la base de datos.
//
// FUENTE CANÓNICA: se reutiliza GALERIA_FILTROS tal cual — NO se inventa
// una lista nueva acá. Es el mismo archivo que ya usa el sitio público
// (src/components/Galeria.jsx) para los botones de filtro, así que
// cualquier categoría nueva que se agregue ahí queda automáticamente
// disponible para el agente sin tocar este archivo.
// ============================================================================

import { GALERIA_FILTROS } from '../../src/data/content.js'

// "Todos" es el filtro especial de "ver todo" del sitio público, no una
// categoría real — se excluye de las categorías válidas para guardar.
const CANONICAL_CATEGORIES = GALERIA_FILTROS.filter((f) => f !== 'Todos')

function normalizeForComparison(value) {
  return (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos/tildes
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Resuelve un texto libre (como lo escribió el admin) a la categoría
 * canónica real de Galería — comparando sin distinguir mayúsculas/
 * minúsculas ni acentos, y tolerando espacios de más. NUNCA inventa una
 * categoría nueva: si no hay una coincidencia clara con una de las
 * categorías canónicas, devuelve `notFound` para que quien llame le pida
 * aclaración al usuario en vez de guardar el texto tal cual.
 *
 * @param {string} input
 * @returns {{ canonical: string } | { notFound: true, input: string, suggestions: string[] }}
 */
export function normalizeGaleriaCategory(input) {
  const n = normalizeForComparison(input)
  if (!n) return { notFound: true, input, suggestions: CANONICAL_CATEGORIES }

  const exact = CANONICAL_CATEGORIES.find((c) => normalizeForComparison(c) === n)
  if (exact) return { canonical: exact }

  // Tolerancia razonable a variantes cercanas (ej. plural: "decoraciones"),
  // pero solo si hay UNA sola categoría candidata — si hay más de una
  // coincidencia parcial, es ambiguo y no se adivina.
  const partial = CANONICAL_CATEGORIES.filter((c) => {
    const nc = normalizeForComparison(c)
    return nc.includes(n) || n.includes(nc)
  })
  if (partial.length === 1) return { canonical: partial[0] }

  return { notFound: true, input, suggestions: CANONICAL_CATEGORIES }
}

/** Lista de categorías válidas de Galería, para mostrarlas al pedir aclaración. */
export function listCanonicalGaleriaCategories() {
  return CANONICAL_CATEGORIES
}
