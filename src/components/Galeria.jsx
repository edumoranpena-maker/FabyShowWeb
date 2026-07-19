import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Expand } from 'lucide-react'
import { GALERIA, GALERIA_FILTROS } from '../data/content'
import Confetti from './decor/Confetti'

const alturaClase = {
  alto: 'row-span-2',
  medio: 'row-span-1',
}

export default function Galeria() {
  const [filtro, setFiltro] = useState('Todos')
  const [lightboxIndex, setLightboxIndex] = useState(null)

  const items = useMemo(
    () => (filtro === 'Todos' ? GALERIA : GALERIA.filter((g) => g.categoria === filtro)),
    [filtro]
  )

  const openLightbox = (id) => {
    const idx = items.findIndex((i) => i.id === id)
    setLightboxIndex(idx)
  }

  const closeLightbox = () => setLightboxIndex(null)
  const next = () => setLightboxIndex((i) => (i + 1) % items.length)
  const prev = () => setLightboxIndex((i) => (i - 1 + items.length) % items.length)

  return (
    <section id="galeria" className="relative py-20 md:py-28 bg-ink">
      <Confetti variant="b" />
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="max-w-2xl mx-auto text-center mb-10">
          <span className="inline-block font-body text-sm font-semibold text-amarillo-300 bg-white/10 px-4 py-1.5 rounded-full mb-4">
            Galería
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-white mb-4">
            Momentos que hablan por nosotros
          </h2>
          <p className="font-body text-white/60">Fotos y videos reales de nuestras últimas fiestas.</p>
        </div>

        <div className="flex gap-2.5 overflow-x-auto no-scrollbar mb-10 justify-start md:justify-center px-1 pb-1">
          {GALERIA_FILTROS.map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-body font-medium transition-colors duration-300 ${
                filtro === f ? 'bg-party-gradient text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <motion.div layout className="grid grid-cols-2 md:grid-cols-3 auto-rows-[140px] md:auto-rows-[180px] gap-3 md:gap-4">
          <AnimatePresence mode="popLayout">
            {items.map((g) => (
              <motion.button
                layout
                key={g.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35 }}
                onClick={() => openLightbox(g.id)}
                className={`relative rounded-2xl overflow-hidden group ${alturaClase[g.alto]}`}
              >
                <img
                  src={g.src}
                  alt={`Evento Faby Show — ${g.categoria}`}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <span className="flex items-center gap-1.5 text-white text-xs font-medium">
                    <Expand className="w-3.5 h-3.5" /> {g.categoria}
                  </span>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence>
        {lightboxIndex !== null && items[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-ink/95 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closeLightbox}
          >
            <button
              aria-label="Cerrar"
              onClick={closeLightbox}
              className="absolute top-5 right-5 text-white/80 hover:text-white p-2"
            >
              <X className="w-7 h-7" />
            </button>
            <button
              aria-label="Anterior"
              onClick={(e) => {
                e.stopPropagation()
                prev()
              }}
              className="absolute left-3 md:left-8 text-white/80 hover:text-white p-2"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <motion.img
              key={items[lightboxIndex].id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              src={items[lightboxIndex].src}
              alt="Evento Faby Show"
              onClick={(e) => e.stopPropagation()}
              className="max-h-[80vh] max-w-full rounded-2xl object-contain"
            />
            <button
              aria-label="Siguiente"
              onClick={(e) => {
                e.stopPropagation()
                next()
              }}
              className="absolute right-3 md:right-8 text-white/80 hover:text-white p-2"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
