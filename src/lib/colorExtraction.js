// ============================================================================
// Extracción automática de paleta de color por imagen + generación de
// gradiente + cache persistente.
//
// Cómo funciona:
// 1. Cada imagen se dibuja en un <canvas> oculto, reducida a 48x48px
//    (suficiente para detectar los colores dominantes, y extremadamente
//    rápido: unos pocos milisegundos, no bloquea el hilo principal).
// 2. Se cuentan los colores más frecuentes (histograma cuantizado),
//    ignorando píxeles casi blancos/negros/transparentes para que un
//    fondo neutro no opaque el resultado.
// 3. Con los 2 colores dominantes se arma un gradiente diagonal que se
//    funde hacia el "ink" de la marca, para mantener el look premium y
//    oscuro del sitio sin importar qué foto sea.
// 4. El resultado se guarda en localStorage, indexado por la URL de la
//    imagen — así el cálculo se hace una sola vez por imagen y se
//    reutiliza en visitas futuras.
//
// Por qué esto escala a Supabase Storage sin tocar código:
// La función getImagePalette() no sabe ni le importa de dónde viene la
// imagen — solo necesita una URL. El día que HERO_GALLERY (o cualquier
// otro arreglo de imágenes) pase a leer desde Supabase Storage, cada
// URL nueva se procesa automáticamente la primera vez que se usa y
// queda cacheada, sin ninguna intervención manual. El único requisito
// es que el bucket de Supabase sirva las imágenes con CORS habilitado
// (Storage > bucket > Configuration > Allowed origins), igual que ya
// lo hace Unsplash, para que el canvas pueda leer los píxeles.
//
// Nota sobre escala futura: si más adelante quieren que la paleta se
// comparta entre TODOS los visitantes (no solo cacheada por navegador),
// esta misma lógica de extracción se puede mover a una Supabase Edge
// Function que corra al subir la imagen (usando una librería de canvas
// en servidor) y guardar el resultado en una columna de la tabla de
// medios. El front-end simplemente leería esa columna si existe, y
// si no, haría el fallback a este cálculo en el navegador.
// ============================================================================

const CACHE_PREFIX = 'faby-show:palette:v1:'

function cacheKey(src) {
  return `${CACHE_PREFIX}${src}`
}

function readCache(src) {
  try {
    const raw = localStorage.getItem(cacheKey(src))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null // localStorage no disponible (modo privado, cuota llena, etc.)
  }
}

function writeCache(src, result) {
  try {
    localStorage.setItem(cacheKey(src), JSON.stringify(result))
  } catch {
    // No es critico si falla el guardado — simplemente se recalculara
    // la proxima vez que se cargue la imagen.
  }
}

// Agrupa un valor de color en "cubetas" para que tonos muy similares
// cuenten como el mismo color dominante.
function quantize(value, step = 24) {
  return Math.round(value / step) * step
}

function relativeLuminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Paleta de respaldo (colores de marca) por si una imagen falla al
// cargar, no tiene CORS habilitado, o no arroja colores útiles.
const FALLBACK_PALETTE = [
  { r: 124, g: 58, b: 237 }, // morado
  { r: 236, g: 30, b: 121 }, // fucsia
]

function extractPaletteFromImage(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        const size = 48
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)

        const buckets = new Map()
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3]
          if (alpha < 200) continue // ignora pixeles transparentes

          const r = quantize(data[i])
          const g = quantize(data[i + 1])
          const b = quantize(data[i + 2])
          const lum = relativeLuminance(r, g, b)
          if (lum < 18 || lum > 242) continue // ignora casi-negro / casi-blanco puro

          const key = `${r},${g},${b}`
          const bucket = buckets.get(key)
          if (bucket) {
            bucket.count++
          } else {
            buckets.set(key, { r, g, b, count: 1 })
          }
        }

        const sorted = [...buckets.values()].sort((a, b) => b.count - a.count)
        const top = sorted.slice(0, 3).map(({ r, g, b }) => ({ r, g, b }))

        resolve(top.length > 0 ? top : FALLBACK_PALETTE)
      } catch {
        // Canvas "tainted" (CORS) u otro error de lectura de píxeles
        resolve(FALLBACK_PALETTE)
      }
    }

    img.onerror = () => resolve(FALLBACK_PALETTE)
    img.src = src
  })
}

function toRgba({ r, g, b }, alpha) {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Convierte una paleta en un gradiente diagonal que se funde hacia el
// "ink" de la marca — así cualquier foto se siente parte del mismo
// sistema visual premium, en vez de un color plano y saturado.
function paletteToGradient(palette) {
  const colors = palette && palette.length > 0 ? palette : FALLBACK_PALETTE
  const [c1, c2] = colors
  const stop1 = toRgba(c1, 0.55)
  const stop2 = c2 ? toRgba(c2, 0.35) : toRgba(c1, 0.25)
  return `linear-gradient(135deg, ${stop1} 0%, ${stop2} 45%, #1a1523 100%)`
}

/**
 * API pública. Dada la URL de una imagen, devuelve { palette, gradient }.
 * Usa cache en localStorage para no reprocesar la misma imagen dos veces.
 */
export async function getImagePalette(src) {
  const cached = readCache(src)
  if (cached) return cached

  const palette = await extractPaletteFromImage(src)
  const result = { palette, gradient: paletteToGradient(palette) }
  writeCache(src, result)
  return result
}

export const FALLBACK_GRADIENT = paletteToGradient(FALLBACK_PALETTE)
