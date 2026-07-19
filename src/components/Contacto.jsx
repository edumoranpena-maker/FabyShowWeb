import { motion } from 'framer-motion'
import { Instagram, Clock, MapPin, MessageCircle } from 'lucide-react'
import { CONTACTO, whatsappLink, MENSAJES } from '../data/content'
import WhatsAppButton from './WhatsAppButton'
import TikTokIcon from './icons/TikTokIcon'

export default function Contacto() {
  return (
    <section id="contacto" className="relative py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <span className="inline-block font-body text-sm font-semibold text-morado-600 bg-morado-50 px-4 py-1.5 rounded-full mb-4">
            Contacto
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-ink mb-4">
            Hablemos de tu evento
          </h2>
          <p className="font-body text-ink/60 mb-6">
            Escríbenos y te ayudamos a armar la fiesta perfecta.
          </p>
          <WhatsAppButton href={whatsappLink(MENSAJES.general)}>
            Cotizar por WhatsApp
          </WhatsAppButton>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="max-w-md mx-auto bg-morado-50 rounded-4xl p-8 flex flex-col gap-5"
        >
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-morado-600 flex-shrink-0 mt-0.5" />
            <span className="font-body text-sm text-ink/75">{CONTACTO.direccion}</span>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-morado-600 flex-shrink-0 mt-0.5" />
            <span className="font-body text-sm text-ink/75">{CONTACTO.horario}</span>
          </div>
          <div className="flex items-start gap-3">
            <MessageCircle className="w-5 h-5 text-morado-600 flex-shrink-0 mt-0.5" />
            <a
              href={whatsappLink(MENSAJES.general)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-body text-sm text-ink/75 hover:text-fucsia-600 underline underline-offset-2 decoration-ink/20 hover:decoration-fucsia-400 transition-colors"
            >
              Escríbenos por WhatsApp
            </a>
          </div>

          <div className="flex gap-3 pt-2">
            <a
              href={CONTACTO.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-morado-600 hover:text-fucsia-500 shadow-card transition-colors"
            >
              <TikTokIcon className="w-4 h-4" />
            </a>
            <a
              href={CONTACTO.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-morado-600 hover:text-fucsia-500 shadow-card transition-colors"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href={whatsappLink(MENSAJES.general)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-morado-600 hover:text-fucsia-500 shadow-card transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
