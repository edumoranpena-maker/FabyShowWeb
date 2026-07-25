import { useEffect, useState } from 'react'
import { getImagePalette } from '../lib/colorExtraction'

/**
 * Extrae (o recupera de cache) la paleta/gradiente de cada imagen del
 * arreglo dado. Se ejecuta una sola vez por imagen — si "images" es una
 * referencia estable (constante fuera del componente, como HERO_GALLERY),
 * el efecto corre una única vez al montar.
 *
 * Devuelve un mapa { [src]: { palette, gradient } } que se va llenando a
 * medida que cada imagen termina de procesarse — así el primer fondo
 * puede mostrarse con un fallback y transicionar suavemente en cuanto
 * su gradiente real esté listo.
 *
 * Design para escalar: si en el futuro "images" viene de Supabase
 * Storage (por ejemplo, refrescado con un listener en tiempo real),
 * este hook no necesita cambios — cualquier URL nueva que aparezca en
 * el arreglo se procesa automáticamente en su propio useEffect run.
 */
export function useImagePalettes(images) {
  const [palettes, setPalettes] = useState({})

  useEffect(() => {
    let cancelled = false

    images.forEach((src) => {
      getImagePalette(src).then((result) => {
        if (!cancelled) {
          setPalettes((prev) => ({ ...prev, [src]: result }))
        }
      })
    })

    return () => {
      cancelled = true
    }
  }, [images])

  return palettes
}
