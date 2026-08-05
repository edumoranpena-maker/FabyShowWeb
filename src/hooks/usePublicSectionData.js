import { useEffect, useState } from 'react'

/**
 * Hook para las secciones del sitio público. Arranca mostrando los datos
 * estáticos de src/data/content.js (el "fallback") — así el sitio nunca
 * se ve vacío ni se rompe si Supabase todavía no está conectado en este
 * entorno — e intenta traer los datos reales en segundo plano.
 *
 * Si la carga real tiene éxito y trae al menos un resultado, reemplaza
 * el contenido estático por el real. Si falla (Supabase no configurado,
 * error de red, RLS, etc.) se queda callado con el fallback — un
 * visitante nunca debe ver un error de carga en un sitio de marketing.
 *
 * @param {() => Promise<any>} fetchFn - trae los datos reales (un array o un objeto único)
 * @param {any} fallback - los datos estáticos de content.js
 */
export function usePublicSectionData(fetchFn, fallback) {
  const [data, setData] = useState(fallback)

  useEffect(() => {
    let cancelled = false

    fetchFn()
      .then((result) => {
        if (cancelled) return
        const hasData = Array.isArray(result) ? result.length > 0 : Boolean(result)
        if (hasData) setData(result)
      })
      .catch(() => {
        // Silencioso a propósito — ver comentario de arriba.
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return data
}
