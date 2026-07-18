import { motion } from 'framer-motion'
import { Instagram, Facebook, Clock, MapPin, Send, MessageCircle } from 'lucide-react'
import { CONTACTO, whatsappLink } from '../data/content'
import WhatsAppButton from './WhatsAppButton'

export default function Contacto() {
  const handleSubmit = (e) => {
    e.preventDefault()
    const form = new FormData(e.target)
    const nombre = form.get('nombre') || ''
    const fecha = form.get('fecha') || ''
    const mensaje = form.get('mensaje') || ''
    const texto = 'Hola Faby Show, soy ' + nombre + '. Fecha del evento: ' + fecha + '. ' + mensaje
    window.open(whatsappLink(texto), '_blank', 'noopener,noreferrer')
  }

  return (
    <section id="contacto" className="relative py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <span className="inline-block font-body text-sm font-semibold text-morado-600 bg-morado-50 px-4 py-1.5 rounded-full mb-4">
            Contacto
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-ink mb-4">
            Cuentanos sobre tu evento
          </h2>
          <p className="font-body text-ink/60">
            Completa el formulario y te contactamos por WhatsApp en minutos, o escribenos directamente.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 lg:gap-10">
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            onSubmit={handleSubmit}
            className="lg:col-span-3 bg-white rounded-4xl p-6 md:p-8 shadow-card border border-ink/5 flex flex-col gap-5"
          >
            <div>
              <label htmlFor="nombre" className="font-body text-sm font-medium text-ink/70 mb-1.5 block">
                Nombre
              </label>
              <input
                id="nombre"
                name="nombre"
                required
                type="text"
                placeholder="Tu nombre"
                className="w-full rounded-xl border border-ink/10 px-4 py-3 font-body text-sm focus:border-fucsia-400 focus:ring-2 focus:ring-fucsia-100 outline-none transition-all"
              />
            </div>
            <div>
              <label htmlFor="fecha" className="font-body text-sm font-medium text-ink/70 mb-1.5 block">
                Fecha del evento
              </label>
              <input
                id="fecha"
                name="fecha"
                type="date"
                className="w-full rounded-xl border border-ink/10 px-4 py-3 font-body text-sm focus:border-fucsia-400 focus:ring-2 focus:ring-fucsia-100 outline-none transition-all"
              />
            </div>
            <div>
              <label htmlFor="mensaje" className="font-body text-sm font-medium text-ink/70 mb-1.5 block">
                Cuentanos sobre tu evento
              </label>
              <textarea
                id="mensaje"
                name="mensaje"
                rows={4}
                placeholder="Edad de los ninos, numero de invitados, distrito..."
                className="w-full rounded-xl border border-ink/10 px-4 py-3 font-body text-sm focus:border-fucsia-400 focus:ring-2 focus:ring-fucsia-100 outline-none transition-all resize-none"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white font-body font-semibold rounded-full px-8 py-4 shadow-[0_10px_30px_-8px_rgba(37,211,102,0.6)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <Send className="w-5 h-5" />
              Enviar por WhatsApp
            </button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2 flex flex-col gap-5"
          >
            <div className="rounded-4xl overflow-hidden shadow-card border border-ink/5 h-48">
              <iframe
                title="Ubicacion Faby Show"
                src={CONTACTO.mapsEmbed}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="bg-morado-50 rounded-4xl p-6 flex flex-col gap-4">
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
                <a href={whatsappLink('Hola Faby Show')} target="_blank" rel="noopener noreferrer" className="font-body text-sm text-ink/75 hover:text-fucsia-600">
                  Escribenos por WhatsApp
                </a>
              </div>

              <div className="flex gap-3 pt-2">
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
                  href={CONTACTO.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-morado-600 hover:text-fucsia-500 shadow-card transition-colors"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              </div>
            </div>

            <WhatsAppButton href={whatsappLink('Hola Faby Show, quiero cotizar una animacion para un evento infantil.')} className="w-full">
              Cotizar por WhatsApp
            </WhatsAppButton>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
