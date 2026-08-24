// ============================================================================
// Flujo de fotos/videos — deliberadamente SIN LLM.
//
// Cuando el usuario envía una foto o un video, no hace falta interpretar
// lenguaje natural complejo: solo hay que saber A DÓNDE va (Hero, Galería,
// Servicios o Testimonios) y, para Servicios/Testimonios, A QUÉ registro
// se asocia. Resolver esto con un modelo sería más lento, más caro, y
// arriesgaría a que la ruta de subida de archivos dependa de una
// alucinación del LLM — así que se resuelve con reglas simples y
// deterministas, y solo se le pide aclaración al usuario por texto plano
// cuando hace falta.
//
// La subida real de bytes y el guardado en la tabla correspondiente
// SIEMPRE pasan por server/adminActions/* (Fase 1) — acá no hay ninguna
// llamada directa a Supabase.
// ============================================================================

import * as AdminActions from '../adminActions/index.js'
import { downloadFileById } from '../telegram/telegramClient.js'
import { resolveServicio, resolveTestimonio } from './resolvers.js'
import { extractMediaPlacementIntent, generateMediaDescription } from './llm.js'
import { normalizeGaleriaCategory } from './galeriaCategories.js'

const SECTION_KEYWORDS = [
  { section: 'hero', pattern: /\bhero\b|\bportada\b/ },
  { section: 'galeria', pattern: /galer/ },
  { section: 'servicios', pattern: /servicio/ },
  { section: 'testimonios', pattern: /testimoni/ },
]

function normalize(text) {
  return (text ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/** Detecta a qué sección se refiere un texto libre ("ponla en el hero", "hero", etc.). */
export function detectDestinationFromText(text) {
  const n = normalize(text)
  if (!n) return null
  const hit = SECTION_KEYWORDS.find(({ pattern }) => pattern.test(n))
  return hit ? hit.section : null
}

const SECTION_LABELS = {
  hero: 'el Hero',
  galeria: 'la Galería',
  servicios: 'Servicios',
  testimonios: 'Testimonios',
}

export function sectionLabel(section) {
  return SECTION_LABELS[section] ?? section
}

/**
 * Extrae destino/categoría/nombre del texto (caption) que acompañó una
 * foto/video, para no preguntar datos que el usuario ya dio en el mismo
 * mensaje (Objetivo 1). Reutiliza Gemini/function calling (llm.js) — no
 * es matching de frase exacta. Si no hay caption, o si Gemini falla,
 * devuelve `null` y el flujo sigue preguntando como antes (degradación
 * segura, nunca bloquea la subida).
 *
 * @param {string|null} captionText
 * @returns {Promise<{ section?: string, categoria?: string, servicioNombre?: string, testimonioNombre?: string }|null>}
 */
export async function parseMediaCaption(captionText) {
  if (!captionText || !captionText.trim()) return null
  try {
    return await extractMediaPlacementIntent(captionText)
  } catch (err) {
    console.error('[mediaPlacement] No se pudo extraer destino del caption, se preguntará manualmente:', err?.message ?? err)
    return null
  }
}

/**
 * Dado un video, solo la Galería lo acepta (los otros buckets son solo
 * imágenes en este proyecto). Devuelve un mensaje de error o null si es válido.
 */
export function validateAttachmentForSection(attachmentKind, section) {
  if (attachmentKind === 'video' && section !== 'galeria') {
    return 'Los videos solo se pueden agregar a la Galería. ¿Quieres ponerlo ahí?'
  }
  return null
}

/**
 * Resuelve a qué servicio se asocia una foto según el nombre que dio el
 * usuario. Si existe un servicio con ese nombre, se actualiza su imagen;
 * si no existe ninguno, se ofrece crear uno nuevo con esa foto.
 */
export async function resolveServicioTargetForPhoto(nameText) {
  const { record, ambiguous, notFound } = await resolveServicio(nameText)
  if (record) return { mode: 'update', record }
  if (ambiguous.length > 0) return { mode: 'ambiguous', options: ambiguous }
  if (notFound) return { mode: 'create', titulo: nameText.trim() }
  return { mode: 'invalid' }
}

/**
 * Resuelve a qué testimonio se asocia una foto. A diferencia de Servicios,
 * un testimonio necesita texto propio (nombre + reseña) para existir, así
 * que la foto SOLO puede adjuntarse a uno ya creado — no se auto-crea uno
 * nuevo solo con la foto.
 */
export async function resolveTestimonioTargetForPhoto(nameText) {
  const { record, ambiguous, notFound } = await resolveTestimonio(nameText)
  if (record) return { mode: 'update', record }
  if (ambiguous.length > 0) return { mode: 'ambiguous', options: ambiguous }
  if (notFound) return { mode: 'not_found' }
  return { mode: 'invalid' }
}

const MIME_TYPE_BY_EXT = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

function mimeTypeForExt(ext) {
  return MIME_TYPE_BY_EXT[(ext ?? '').toLowerCase()] ?? 'image/jpeg'
}

/** Fecha de hoy en formato DD-MM, para componer el alias (ej. "23-08"). */
function todayDDMM() {
  const now = new Date()
  const dd = String(now.getUTCDate()).padStart(2, '0')
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}-${mm}`
}

/**
 * Genera el alias humano + descripción breve de una foto/video recién
 * subido (Objetivo 2.3/2.4). Para fotos, analiza el contenido visual con
 * Gemini (nunca solo el caption, si se puede analizar la imagen). Para
 * video, o si el análisis visual falla, usa un alias de respaldo basado
 * en categoría/sección — no bloquea la subida en ningún caso.
 */
async function buildMediaIdentification({ buffer, ext, kind, categoria, section, captionText }) {
  const ddmm = todayDDMM()

  if (kind === 'photo') {
    try {
      const { aliasBase, descripcion } = await generateMediaDescription({
        imageBase64: buffer.toString('base64'),
        mimeType: mimeTypeForExt(ext),
        categoria,
        section,
        captionText,
      })
      return { alias: `${aliasBase} ${ddmm}`, descripcion }
    } catch (err) {
      console.error('[mediaPlacement] No se pudo generar alias con Gemini Vision, uso respaldo:', err?.message ?? err)
    }
  }

  // Respaldo: video (sin análisis de frames en esta fase — ver AGENT.md),
  // o falla del análisis visual de la foto.
  const base = categoria || sectionLabel(section)
  return {
    alias: `${base} ${kind === 'video' ? 'video' : 'foto'} ${ddmm}`,
    descripcion: captionText || `${kind === 'video' ? 'Video' : 'Foto'} subida a ${sectionLabel(section)}.`,
  }
}

/**
 * Ejecuta la colocación de un archivo ya confirmada por el usuario:
 * descarga el binario desde Telegram y llama al AdminAction que
 * corresponde (subida + creación/actualización del registro).
 *
 * @param {object} placement - ver la forma que arma server/agent/core.js
 * @returns {Promise<string>} mensaje de éxito para el usuario
 */
export async function executeMediaPlacement(placement) {
  const { attachment, section, extra, externalUserId } = placement
  const { buffer, ext } = await downloadFileById(attachment.fileId)
  const filename = `telegram-${attachment.fileId}.${ext}`

  if (section === 'hero') {
    const url = await AdminActions.uploadHeroImage(buffer, filename)
    const existing = await AdminActions.listHeroSlides()
    const nextOrden = existing.length > 0 ? Math.max(...existing.map((s) => s.orden ?? 0)) + 1 : 1
    await AdminActions.createHeroSlide({ image_url: url, orden: nextOrden, activo: true })
    return '📸 ✅ Imagen agregada al Hero.'
  }

  if (section === 'galeria') {
    // Red de seguridad: aunque core.js ya valida la categoría antes de
    // llegar hasta acá, se vuelve a normalizar justo en el punto real de
    // persistencia — así la garantía de "nunca guardar una categoría
    // inventada" no depende de que todos los llamadores futuros lo hagan
    // bien antes. Nunca debería disparar el error en uso normal.
    const categoryResolution = normalizeGaleriaCategory(extra.categoria)
    if (categoryResolution.notFound) {
      throw new Error(
        `"${extra.categoria}" no es una categoría válida de Galería. ` +
        `Categorías válidas: ${categoryResolution.suggestions.join(', ')}.`
      )
    }
    const categoria = categoryResolution.canonical

    const url = await AdminActions.uploadGaleriaMedia(buffer, filename)
    const existing = await AdminActions.listGaleriaItems()
    const nextOrden = existing.length > 0 ? Math.max(...existing.map((s) => s.orden ?? 0)) + 1 : 1
    const tipo = attachment.kind === 'video' ? 'video' : 'foto'

    const { alias, descripcion } = await buildMediaIdentification({
      buffer,
      ext,
      kind: attachment.kind,
      categoria,
      section: 'galeria',
      captionText: extra.captionText,
    })

    await AdminActions.createGaleriaItem({
      src: url,
      categoria,
      tipo,
      alto: 'medio',
      orden: nextOrden,
      activo: true,
      // Identificación de media (Objetivo 2) — columnas agregadas en
      // supabase/migrations/20260821000000_add_media_metadata_to_faby_galeria_items.sql.
      // El id/UUID técnico lo sigue generando Supabase; esto es aparte.
      telegram_file_id: attachment.fileId,
      telegram_message_id: attachment.messageId ?? null,
      telegram_user_id: externalUserId ?? null,
      alias,
      descripcion,
    })

    return (
      `${tipo === 'video' ? '🎬' : '📸'} ✅ ${tipo === 'video' ? 'Video subido' : 'Foto subida'} correctamente\n\n` +
      `📁 Galería → ${categoria}\n` +
      `🏷️ ID: ${alias}\n` +
      `📝 ${descripcion}`
    )
  }

  if (section === 'servicios') {
    const url = await AdminActions.uploadServicioImage(buffer, filename)
    if (extra.mode === 'update') {
      await AdminActions.updateServicio(extra.recordId, { imagen_url: url })
      return `📸 ✅ Imagen actualizada para el servicio "${extra.titulo}".`
    }
    const existing = await AdminActions.listServicios()
    const nextOrden = existing.length > 0 ? Math.max(...existing.map((s) => s.orden ?? 0)) + 1 : 1
    await AdminActions.createServicio({ titulo: extra.titulo, imagen_url: url, orden: nextOrden, activo: true })
    return `📸 ✅ Servicio "${extra.titulo}" creado con esta foto.`
  }

  if (section === 'testimonios') {
    const url = await AdminActions.uploadTestimonioFoto(buffer, filename)
    await AdminActions.updateTestimonio(extra.recordId, { foto_url: url })
    return `📸 ✅ Foto agregada al testimonio de ${extra.nombre}.`
  }

  throw new Error(`Sección de destino no soportada: ${section}`)
}
