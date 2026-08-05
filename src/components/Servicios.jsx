import { motion } from 'framer-motion'
import { SERVICIOS } from '../data/content'
import { serviciosService } from '../services/serviciosService'
import { usePublicSectionData } from '../hooks/usePublicSectionData'
import Confetti from './decor/Confetti'

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

// Normaliza las filas de Supabase (titulo/imagen_url) a la misma forma
// que ya usaba el contenido estático (title/image), para no tocar el JSX.
async function fetchServicios() {
  const rows = await serviciosService.getAll()
  return rows.map((r) => ({ id: r.id, title: r.titulo, image: r.imagen_url }))
}

export default function Servicios() {
  const servicios = usePublicSectionData(fetchServicios, SERVICIOS)

  return (
    <section id="servicios" className="relative py-20 md:py-28 mesh-bg">
      <Confetti variant="a" />
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
          {servicios.map((s, i) => (
            <motion.div
              key={s.id ?? `${s.title}-${i}`}
              variants={item}
              whileHover={{ y: -6 }}
              className="group relative bg-white rounded-3xl p-3 shadow-card hover:shadow-soft transition-shadow duration-300 border border-ink/5"
            >
              <div className="relative rounded-2xl overflow-hidden aspect-square mb-3">
                <img
                  src={s.image}
                  alt={s.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-ink/5 group-hover:ring-white/50 rounded-2xl transition-all duration-300" />
              </div>
              <h3 className="font-display text-sm md:text-base font-medium text-ink text-center px-1 pb-1">
                {s.title}
              </h3>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
