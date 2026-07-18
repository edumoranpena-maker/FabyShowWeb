import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import WhatsAppButton from './WhatsAppButton'
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
    <section id="hero" className="relative min-h-screen flex items-end lg:items-center overflow-hidden">
      {/* Fondo: video real del evento (reemplazar por metraje propio) */}
      <div className="absolute inset-0">
        <video
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster="https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=1600&auto=format&fit=crop"
        >
          {/* TODO: reemplazar con un video real de un evento Faby Show */}
          <source src="https://cdn.coverr.co/videos/coverr-kids-playing-with-bubbles-2651/1080p.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
        <div className="absolute inset-0 bg-gradient-to-br from-morado-900/40 via-transparent to-fucsia-900/30" />
      </div>

      {/* blobs decorativos */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-amarillo-400/30 blur-3xl rounded-full animate-blob" />
      <div className="absolute bottom-10 -left-16 w-72 h-72 bg-celeste-400/25 blur-3xl rounded-full animate-blob" />

      <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-8 pb-16 pt-40 lg:py-32 w-full">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="max-w-2xl"
        >
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-white leading-[1.08] mb-5">
            Hacemos que cada cumpleaños sea un espectáculo inolvidable.
          </h1>

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

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="hidden lg:flex absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-white/70"
      >
        <ChevronDown className="w-6 h-6" />
      </motion.div>
    </section>
  )
}
