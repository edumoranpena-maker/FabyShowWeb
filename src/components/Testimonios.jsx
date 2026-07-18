import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { TESTIMONIOS } from '../data/content'

export default function Testimonios() {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)

  const go = useCallback((dir) => {
    setDirection(dir)
    setIndex((i) => (i + dir + TESTIMONIOS.length) % TESTIMONIOS.length)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => go(1), 6000)
    return () => clearInterval(timer)
  }, [go])

  const t = TESTIMONIOS[index]

  return (
    <section id="testimonios" className="relative py-20 md:py-28 bg-white overflow-hidden">
      <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
        <span className="inline-block font-body text-sm font-semibold text-fucsia-600 bg-fucsia-50 px-4 py-1.5 rounded-full mb-4">
          Testimonios
        </span>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-ink mb-14">
          Familias felices, la mejor carta de presentación
        </h2>

        <div className="relative min-h-[280px] md:min-h-[240px] flex items-center justify-center">
          <Quote className="absolute -top-2 left-1/2 -translate-x-1/2 w-14 h-14 text-morado-100 -z-0" />

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={t.nombre}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 40 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="relative z-10 flex flex-col items-center"
            >
              <div className="flex gap-1 mb-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amarillo-400 text-amarillo-400" />
                ))}
              </div>

              <p className="font-alt italic text-lg md:text-xl text-ink/80 leading-relaxed mb-8 max-w-xl">
                "{t.texto}"
              </p>

              <img
                src={t.foto}
                alt={t.nombre}
                className="w-14 h-14 rounded-full object-cover border-2 border-fucsia-200 mb-2"
              />
              <span className="font-body font-semibold text-ink text-sm">{t.nombre}</span>
              <span className="font-body text-xs text-ink/50">{t.evento}</span>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-4 mt-10">
          <button
            aria-label="Testimonio anterior"
            onClick={() => go(-1)}
            className="w-10 h-10 rounded-full bg-morado-50 text-morado-600 flex items-center justify-center hover:bg-morado-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            {TESTIMONIOS.map((_, i) => (
              <button
                key={i}
                aria-label={`Ir al testimonio ${i + 1}`}
                onClick={() => {
                  setDirection(i > index ? 1 : -1)
                  setIndex(i)
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === index ? 'w-6 bg-fucsia-500' : 'w-2 bg-ink/15'
                }`}
              />
            ))}
          </div>
          <button
            aria-label="Siguiente testimonio"
            onClick={() => go(1)}
            className="w-10 h-10 rounded-full bg-morado-50 text-morado-600 flex items-center justify-center hover:bg-morado-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  )
}
