import { useEffect, useState } from 'react'

/**
 * Detecta si el usuario ya salio del Hero haciendo scroll hacia abajo.
 * Se apoya en IntersectionObserver (mismo patron que useActiveSection.js)
 * en lugar de un listener de scroll, para evitar recalcular en cada
 * evento de scroll.
 *
 * `exited` es true unicamente cuando el Hero dejo de ser visible por
 * arriba (el usuario avanzo hacia el resto del contenido). Si el Hero
 * aun no aparecio en pantalla (rectTop > 0, caso imposible en la
 * practica porque el Hero es la primera seccion) o esta parcial/
 * totalmente visible, `exited` es false — asi la Topbar compacta solo
 * aparece despues de dejar atras el Hero y desaparece limpiamente al
 * volver a el.
 */
export function useHeroExited(heroId = 'hero') {
  const [exited, setExited] = useState(false)

  useEffect(() => {
    const hero = document.getElementById(heroId)
    if (!hero) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        setExited(!entry.isIntersecting && entry.boundingClientRect.top < 0)
      },
      { threshold: 0 }
    )

    observer.observe(hero)
    return () => observer.disconnect()
  }, [heroId])

  return exited
}
