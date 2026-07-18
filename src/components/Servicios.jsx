import { motion } from 'framer-motion'
import * as Icons from 'lucide-react'
import { SERVICIOS } from '../data/content'

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

const accentByIndex = [
  'from-fucsia-500 to-fucsia-400',
  'from-morado-500 to-morado-400',
  'from-celeste-500 to-celeste-400',
  'from-amarillo-500 to-amarillo-400',
]

export default function Servicios() {
  return (
    <section id="servicios" className="relative py-20 md:py-28 mesh-bg">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <span className="inline-block font-body text-sm font-semibold text-fucsia-600 bg-fucsia-50 px-4 py-1.5 rounded-full mb-4">
            Nuestros servicios
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-ink mb-4">
            Todo lo que tu fiesta necesita, en un solo equipo
          </h2>
          <p className="font-body text-ink/60">
            Combina los servicios que quieras para armar el evento perfecto para tus invitados.
          </p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5"
        >
          {SERVICIOS.map((s, i) => {
            const Icon = Icons[s.icon]
            return (
              <motion.div
                key={s.title}
                variants={item}
                whileHover={{ y: -6 }}
                className="group relative bg-white rounded-3xl p-5 md:p-6 shadow-card hover:shadow-soft transition-shadow duration-300 border border-ink/5"
              >
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${accentByIndex[i % accentByIndex.length]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  {Icon && <Icon className="w-6 h-6 text-white" strokeWidth={2} />}
                </div>
                <h3 className="font-display text-base md:text-lg font-medium text-ink mb-1.5">{s.title}</h3>
                <p className="font-body text-sm text-ink/55 leading-relaxed">{s.desc}</p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
