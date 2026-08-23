// ============================================================================
// Formateo de texto para Telegram.
//
// A propósito NO se le pide al LLM que redacte estas respuestas: los datos
// reales (listas, nombres, precios) se formatean acá con funciones
// deterministas, para no arriesgarnos a que el modelo invente o altere
// datos que vienen de Supabase.
// ============================================================================

export function describeHeroSlide(item) {
  return `slide #${item.orden}${item.activo ? '' : ' (oculto)'}`
}

export function describeGaleriaItem(item) {
  return `"${item.categoria}" (${item.tipo}${item.activo ? '' : ', oculto'})`
}

/**
 * Igual que describeGaleriaItem, pero pensado para el flujo de
 * búsqueda/eliminación de media por alias (Objetivo 2): prioriza el alias
 * humano generado por Gemini ("Piñata Peppa Pig 23-08") sobre la
 * categoría, con fallback a describeGaleriaItem para filas viejas que
 * todavía no tengan alias (subidas antes de esta fase).
 */
export function describeGaleriaMedia(item) {
  return item.alias || describeGaleriaItem(item)
}

export function describeServicio(item) {
  return `"${item.titulo}"${item.activo ? '' : ' (oculto)'}`
}

export function describePaquete(item) {
  return `"${item.nombre}" (${item.precio})`
}

export function describeTestimonio(item) {
  return `de ${item.nombre}${item.evento ? ` (${item.evento})` : ''}`
}

export function describeFaq(item) {
  return `"${item.pregunta}"`
}

export function formatList(title, items, describe) {
  if (items.length === 0) return `No hay elementos en ${title}.`
  const lines = items.map((it, i) => `${i + 1}. ${describe(it)}`)
  return `${title} (${items.length}):\n\n${lines.join('\n')}`
}

export function formatAmbiguous(options, describe) {
  const lines = options.slice(0, 8).map((it, i) => `${i + 1}. ${describe(it)}`)
  return `Encontré varias coincidencias, ¿cuál de estas?\n\n${lines.join('\n')}`
}
