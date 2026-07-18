import { motion } from 'framer-motion'
import { PASOS } from '../data/content'

export default function ComoTrabajamos() {
  return (
    <section className="relative py-20 md:py-28 bg-party-gradient-soft">
      <div className="max-w-5xl mx-auto px-5 md:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="inline-block font-body text-sm font-semibold text-celeste-700 bg-celeste-100 px-4 py-1.5 rounded-full mb-4">
            ¿Cómo trabajamos?
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-ink mb-4">
            Reservar tu evento es así de simple
          </h2>
        </div>

        <div className="relative">
          {/* línea vertical en móvil, horizontal en desktop */}
          <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-ink/10 md:left-0 md:right-0 md:top-8 md:h-0.5 md:w-auto md:bottom-auto" />

          <div className="flex flex-col md:flex-row md:justify-between gap-10 md:gap-4">
            {PASOS.map((paso, i) => (
              <motion.div
                key={paso.numero}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="relative pl-16 md:pl-0 md:flex md:flex-col md:items-center md:text-center md:w-1/5"
              >
                <div className="absolute left-0 top-0 md:relative md:mb-5 w-12 h-12 rounded-2xl bg-white shadow-soft flex items-center justify-center font-display font-semibold text-fucsia-600 border border-fucsia-100 z-10">
                  {paso.numero}
                </div>
                <h3 className="font-display text-base md:text-lg font-medium text-ink mb-1.5">{paso.titulo}</h3>
                <p className="font-body text-sm text-ink/55 leading-relaxed max-w-[220px] md:mx-auto">{paso.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
