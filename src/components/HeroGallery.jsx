import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

// Duraciones del ciclo cinematográfico de cada slide
const SHARP_MS = 2000 // imagen nítida, sin texto
const TEXT_MS = 3200 // blur + overlay + texto visible
const TRANSITION_MS = 900 // crossfade + zoom hacia el siguiente slide
const TOTAL_MS = SHARP_MS + TEXT_MS + TRANSITION_MS

// "images" ahora llega por prop (en vez de importar HERO_GALLERY fijo) —
// así funciona igual de bien con el fallback estático o con la lista
// real que traiga faby_hero_slides desde Supabase, sea cual sea su
// cantidad de fotos.
export default function HeroGallery({ images, headline, subtitle, onActiveChange }) {
  const [index, setIndex] = useState(0)
  const [blurred, setBlurred] = useState(false)
  const [showText, setShowText] = useState(false)
  // 0 = turno del titulo, 1 = turno del subtitulo. Alternan en cada slide.
  const [textTurn, setTextTurn] = useState(0)
  const reduceMotion = useReducedMotion()

  // Si cambia el set de imágenes (ej. llega la lista real de Supabase
  // reemplazando el fallback estático), reinicia el ciclo desde cero.
  useEffect(() => {
    setIndex(0)
    setTextTurn(0)
    setShowText(false)
    setBlurred(false)
  }, [images])

  // Precarga las imágenes para evitar parpadeos al iniciar el ciclo
  useEffect(() => {
    images.forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [images])

  // Avisa al padre (Hero.jsx) cual imagen esta activa, para que pueda
  // sincronizar el fondo ambiental con el slide visible.
  useEffect(() => {
    onActiveChange?.(images[index])
  }, [index, images, onActiveChange])

  useEffect(() => {
    if (reduceMotion) {
      setBlurred(false)
      setShowText(true)
      return
    }

    const t1 = setTimeout(() => {
      setBlurred(true)
      setShowText(true)
    }, SHARP_MS)

    const t2 = setTimeout(() => {
      setShowText(false)
      setBlurred(false)
    }, SHARP_MS + TEXT_MS)

    const t3 = setTimeout(() => {
      setIndex((i) => (i + 1) % images.length)
      setTextTurn((t) => (t + 1) % 2)
    }, TOTAL_MS)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [index, reduceMotion, images])

  const totalS = TOTAL_MS / 1000
  const transitionS = TRANSITION_MS / 1000
  const currentText = textTurn === 0 ? headline : subtitle

  return (
    <div className="relative w-full h-full">
      {images.map((src, i) => {
        const isActive = i === index
        return (
          <motion.div
            key={src}
            className="absolute inset-0"
            initial={false}
            animate={{
              opacity: isActive ? 1 : 0,
              scale: isActive && !reduceMotion ? 1.08 : 1,
            }}
            transition={{
              opacity: { duration: transitionS, ease: 'easeInOut' },
              scale: { duration: isActive ? totalS : 0.01, ease: 'easeOut' },
            }}
          >
            <img
              src={src}
              alt="Evento Faby Show"
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchPriority={i === 0 ? 'high' : 'auto'}
              className="w-full h-full object-cover"
              style={{
                filter: isActive && blurred ? 'blur(14px)' : 'blur(0px)',
                transition: 'filter 700ms ease',
                willChange: 'transform, filter, opacity',
              }}
            />
          </motion.div>
        )
      })}

      {/* Oscurece unicamente la franja inferior donde aparece el texto */}
      <div
        className="absolute inset-x-0 bottom-0 h-[60%] sm:h-[54%] bg-gradient-to-t from-ink via-ink/55 to-transparent pointer-events-none"
        style={{ opacity: blurred ? 1 : 0.3, transition: 'opacity 700ms ease' }}
      />

      <div className="absolute inset-0 flex items-end p-6 sm:p-8 md:p-10 lg:p-14">
        <AnimatePresence mode="wait">
          {showText && (
            <motion.div
              key={`hero-text-${textTurn}`}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="max-w-2xl"
            >
              {textTurn === 0 ? (
                <p className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-[1.1]">
                  {currentText}
                </p>
              ) : (
                <p className="font-body text-lg sm:text-xl text-white/90 leading-relaxed max-w-xl">
                  {currentText}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
