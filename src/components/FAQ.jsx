import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import { FAQS } from '../data/content'
import Confetti from './decor/Confetti'

export default function FAQ() {
  const [open, setOpen] = useState(0)

  return (
    <section id="faq" className="relative py-20 md:py-28 mesh-bg">
      <Confetti variant="b" />
      <div className="max-w-3xl mx-auto px-5 md:px-8">
        <div className="text-center mb-14">
          <span className="inline-block font-body text-sm font-semibold text-celeste-700 bg-celeste-100 px-4 py-1.5 rounded-full mb-4">
            Preguntas frecuentes
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-ink">
            Resolvemos tus dudas antes de reservar
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i
            return (
              <div
                key={f.pregunta}
                className={`rounded-2xl border transition-colors duration-300 overflow-hidden ${
                  isOpen ? 'border-fucsia-200 bg-white shadow-card' : 'border-ink/8 bg-white/60'
                }`}
              >
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 text-left px-5 md:px-6 py-5"
                  aria-expanded={isOpen}
                >
                  <span className="font-body font-medium text-ink">{f.pregunta}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      isOpen ? 'bg-fucsia-500 text-white' : 'bg-ink/5 text-ink/60'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <p className="font-body text-sm text-ink/60 leading-relaxed px-5 md:px-6 pb-5">
                        {f.respuesta}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
