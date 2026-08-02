import { useCallback, useEffect, useState } from 'react'

/**
 * Hook base para cualquier vista de sección: carga la lista al montar,
 * expone loading/error, y un reload() para refrescar después de
 * crear/editar/eliminar. Funciona con cualquier servicio que tenga un
 * método getAll() (o el que se indique en getAllMethod).
 */
export function useCrud(service, { getAllMethod = 'getAll' } = {}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await service[getAllMethod]()
      setItems(data ?? [])
    } catch (err) {
      setError(err.message ?? 'No se pudo cargar la información.')
    } finally {
      setLoading(false)
    }
  }, [service, getAllMethod])

  useEffect(() => {
    reload()
  }, [reload])

  return { items, setItems, loading, error, reload }
}
