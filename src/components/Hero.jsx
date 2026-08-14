import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import WhatsAppButton from './WhatsAppButton'
import HeroGallery from './HeroGallery'
import { whatsappLink, MENSAJES, STATS, HERO_GALLERY } from '../data/content'
import { useCountUp } from '../hooks/useCountUp'
import { useImagePalettes } from '../hooks/useImagePalettes'
import { usePublicSectionData } from '../hooks/usePublicSectionData'
import { heroService } from '../services/heroService'
import { FALLBACK_GRADIENT } from '../lib/colorExtraction'

const HEADLINE = 'Hacemos que cada cumpleaños sea un espectáculo inolvidable.'
const SUBTITLE =
  'Animadoras, personajes, DJ y shows en vivo con un equipo profesional que se encarga de todo, para que tú solo disfrutes la fiesta.'

async function fetchHeroImages() {
  const rows = await heroService.getAll()
  return rows.map((r) => r.image_url)
}

function Stat({ value, suffix, label }) {
  const { ref, value: current } = useCountUp(value)
  return (
    <div ref={ref} className="flex flex-col items-center">
      <span className="font-display text-3xl md:text-4xl text-white font-semibold tabular-nums">
        {current.toLocaleString('es-PE')}
        {suffix}
      </span>
      <span className="font-body text-sm text-white/80">{label}</span>
    </div>
  )
}

export default function Hero() {
  const heroImages = usePublicSectionData(fetchHeroImages, HERO_GALLERY)

  // Paleta/gradiente de cada foto del carrusel — se calcula una sola vez
  // por imagen (con cache persistente) y se reutiliza cada vez que esa
  // foto vuelve a estar activa. Si "heroImages" pasa del fallback
  // estático a la lista real de Supabase, se recalcula solo para las
  // fotos nuevas (las que ya estén cacheadas no se vuelven a procesar).
  const palettes = useImagePalettes(heroImages)
  const [activeSrc, setActiveSrc] = useState(heroImages[0])

  // Si cambia el set de imágenes, sincroniza cuál está "activa" para que
  // el fondo ambiental no quede apuntando a una foto que ya no existe.
  useEffect(() => {
    setActiveSrc(heroImages[0])
  }, [heroImages])

  const handleActiveChange = useCallback((src) => setActiveSrc(src), [])

  return (
    <section id="hero" className="relative bg-ink pt-24 pb-16 md:pt-36 md:pb-24 overflow-hidden">
      {/* Fondo ambiental: un gradiente distinto por cada foto del carrusel,
          generado automáticamente a partir de sus colores dominantes. */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-ink" />
        <AnimatePresence>
          <motion.div
            key={activeSrc}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: 'easeInOut' }}
            style={{ background: palettes[activeSrc]?.gradient ?? FALLBACK_GRADIENT }}
          />
        </AnimatePresence>
      </div>

      {/* blobs decorativos */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-amarillo-400/20 blur-3xl rounded-full animate-blob" />
      <div className="absolute bottom-10 -left-16 w-72 h-72 bg-celeste-400/15 blur-3xl rounded-full animate-blob" />

      <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-8">
        {/* Encabezado real para SEO/lectores de pantalla; el titular visible
            vive dentro de la galería y se anima junto con el subtítulo. */}
        <h1 className="sr-only">{HEADLINE}</h1>

        {/* Identidad de marca grande, exclusiva de Desktop (>= lg). En
            Mobile/tablet el logo lo sigue mostrando el Navbar de siempre,
            fijo sobre el Hero — aquí no se duplica esa lógica. */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="hidden lg:flex items-center gap-3 mb-8"
        >
          <img
            src="/avatar-faby-show.png"
            alt=""
            className="w-12 h-12 rounded-full object-cover shadow-glow"
          />
          <img src="/logo-faby-show.png" alt="Faby Show" className="h-28 w-auto" />
        </motion.div>

        {/* Galería cinematográfica: nítida -> blur + overlay -> titular/subtítulo -> crossfade/zoom */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative rounded-4xl overflow-hidden shadow-glow h-[420px] sm:h-[480px] md:h-[520px] lg:h-[600px] mb-10 lg:mb-12"
        >
          <HeroGallery images={heroImages} headline={HEADLINE} subtitle={SUBTITLE} onActiveChange={handleActiveChange} />
        </motion.div>

        {/* Contenido estático debajo de la galería, centrado */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
          className="max-w-2xl lg:max-w-4xl mx-auto flex flex-col items-center text-center"
        >
          {/* En Desktop (lg+) los tres botones van en una sola fila,
              reduciendo tamaño/padding/gap para que quepan siempre sin
              overflow. En Mobile/tablet se mantienen apilados como antes. */}
          <div className="flex flex-col lg:flex-row lg:flex-nowrap gap-4 lg:gap-3 mb-14 items-center lg:justify-center">
            <WhatsAppButton
              href={whatsappLink(MENSAJES.general)}
              size="lg"
              className="lg:px-5 lg:py-2.5 lg:text-sm lg:gap-1.5 lg:whitespace-nowrap"
            >
              Cotizar por WhatsApp
            </WhatsAppButton>
            <WhatsAppButton
              href="#galeria"
              variant="outline"
              size="lg"
              icon={false}
              external={false}
              className="!bg-white/10 lg:px-5 lg:py-2.5 lg:text-sm lg:whitespace-nowrap"
            >
              Ver nuestros eventos
            </WhatsAppButton>
            <WhatsAppButton
              href="#paquetes"
              variant="outline"
              size="lg"
              icon={false}
              external={false}
              className="!bg-white/10 lg:px-5 lg:py-2.5 lg:text-sm lg:whitespace-nowrap"
            >
              Ver nuestros planes
            </WhatsAppButton>
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto border-t border-white/20 pt-7">
            {STATS.map((s) => (
              <Stat key={s.label} {...s} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
