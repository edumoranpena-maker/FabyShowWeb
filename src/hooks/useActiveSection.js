import { useEffect, useState } from 'react'

/**
 * Detecta que seccion (por id) esta actualmente en el centro del viewport.
 * ids debe ser una referencia estable (constante fuera del componente)
 * para que el observer no se re-cree en cada render.
 */
export function useActiveSection(ids) {
  const [active, setActive] = useState(null)

  useEffect(() => {
    const elements = ids.map((id) => document.getElementById(id)).filter(Boolean)
    if (elements.length === 0) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(entry.target.id)
          }
        })
      },
      // Solo cuenta como "activa" la seccion que cruza la franja central
      // del viewport (10% de alto, centrada) — patron estandar de scrollspy.
      { threshold: 0, rootMargin: '-45% 0px -45% 0px' }
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [ids])

  return active
}
