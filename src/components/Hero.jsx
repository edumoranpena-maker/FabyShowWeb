import { motion } from 'framer-motion'
import WhatsAppButton from './WhatsAppButton'
import HeroGallery from './HeroGallery'
import { whatsappLink, MENSAJES, STATS } from '../data/content'
import { useCountUp } from '../hooks/useCountUp'

function Stat({ value, suffix, label }) {
  const { ref, value: current } = useCountUp(value)
  return (
    <div ref={ref} className="flex flex-col items-center lg:items-start">
      <span className="font-display text-3xl md:text-4xl text-white font-semibold tabular-nums">
        {current.toLocaleString('es-PE')}
        {suffix}
      </span>
      <span className="font-body text-sm text-white/80">{label}</span>
    </div>
  )
}

export default function Hero() {
  return (
    <section id="hero" className="relative bg-ink pt-28 pb-16 lg:pt-36 lg:pb-24 overflow-hidden">
      {/* blobs decorativos */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-amarillo-400/20 blur-3xl rounded-full animate-blob" />
      <div className="absolute bottom-10 -left-16 w-72 h-72 bg-celeste-400/15 blur-3xl rounded-full animate-blob" />

      <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-8">
        {/* Galería cinematográfica: nítida -> blur + overlay -> titular -> crossfade/zoom al siguiente slide */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative rounded-4xl overflow-hidden shadow-glow h-[420px] sm:h-[480px] md:h-[520px] lg:h-[600px] mb-10 lg:mb-12"
        >
          <HeroGallery headline="Hacemos que cada cumpleaños sea un espectáculo inolvidable." />
        </motion.div>

        {/* Contenido estático debajo de la galería */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
          className="max-w-2xl"
        >
          <p className="font-body text-lg text-white/85 mb-9 max-w-xl">
            Animadoras, personajes, DJ y shows en vivo con un equipo profesional que se encarga de todo, para que tú solo disfrutes la fiesta.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-14">
            <WhatsAppButton href={whatsappLink(MENSAJES.general)} size="lg">
              Cotizar por WhatsApp
            </WhatsAppButton>
            <WhatsAppButton
              href="#galeria"
              variant="outline"
              size="lg"
              icon={false}
              className="!bg-white/10"
            >
              Ver nuestros eventos
            </WhatsAppButton>
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-lg border-t border-white/20 pt-7">
            {STATS.map((s) => (
              <Stat key={s.label} {...s} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
