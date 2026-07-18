import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { HERO_GALLERY } from '../data/content'

// Duraciones del ciclo cinematográfico de cada slide
const SHARP_MS = 2000 // imagen nítida, sin texto
const TEXT_MS = 3200 // blur + overlay + texto visible
const TRANSITION_MS = 900 // crossfade + zoom hacia el siguiente slide
const TOTAL_MS = SHARP_MS + TEXT_MS + TRANSITION_MS

export default function HeroGallery({ headline }) {
  const [index, setIndex] = useState(0)
  const [blurred, setBlurred] = useState(false)
  const [showText, setShowText] = useState(false)
  const reduceMotion = useReducedMotion()

  // Precarga las 3 imágenes para evitar parpadeos al iniciar el ciclo
  useEffect(() => {
    HERO_GALLERY.forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [])

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
      setIndex((i) => (i + 1) % HERO_GALLERY.length)
    }, TOTAL_MS)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [index, reduceMotion])

  const totalS = TOTAL_MS / 1000
  const transitionS = TRANSITION_MS / 1000

  return (
    <div className="relative w-full h-full">
      {HERO_GALLERY.map((src, i) => {
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

      {/* scrim permanente inferior, para legibilidad base */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/5 to-transparent pointer-events-none" />

      {/* overlay oscuro dinámico que aparece junto con el blur */}
      <div
        className="absolute inset-0 bg-ink pointer-events-none"
        style={{ opacity: blurred ? 0.45 : 0, transition: 'opacity 700ms ease' }}
      />

      {/* headline sincronizado con la fase de blur de cada slide */}
      <div className="absolute inset-0 flex items-end p-6 sm:p-8 md:p-10 lg:p-14">
        <AnimatePresence>
          {showText && (
            <motion.h1
              key="hero-headline"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-[1.1] max-w-2xl"
            >
              {headline}
            </motion.h1>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
