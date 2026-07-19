import { motion } from 'framer-motion'
import { Check, Clock, Crown, Sparkles } from 'lucide-react'
import WhatsAppButton from './WhatsAppButton'
import { PAQUETES, whatsappLink, MENSAJES } from '../data/content'
import Confetti from './decor/Confetti'

export default function Paquetes() {
  return (
    <section id="paquetes" className="relative py-20 md:py-28 bg-white overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-morado-100/60 rounded-full blur-3xl -z-0" />
      <Confetti variant="b" />

      <div className="relative max-w-7xl mx-auto px-5 md:px-8">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <span className="inline-block font-body text-sm font-semibold text-morado-600 bg-morado-50 px-4 py-1.5 rounded-full mb-4">
            Paquetes
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-ink mb-4">
            Elige el plan perfecto para tu celebración
          </h2>
          <p className="font-body text-ink/60">
            Todos nuestros paquetes son personalizables. Escríbenos y armamos uno a tu medida.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {PAQUETES.map((p, i) => {
            const esPersonalizable = p.nombre === 'Plan Personalizable'
            return (
            <motion.div
              key={p.nombre}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.1, ease: 'easeOut' }}
              className="relative rounded-4xl p-7 md:p-8 flex flex-col bg-white text-ink border border-ink/8 shadow-card"
            >
              {p.destacado && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-amarillo-400 text-ink text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
                  <Crown className="w-3.5 h-3.5" />
                  MÁS ELEGIDO
                </div>
              )}
              {esPersonalizable && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-celeste-400 text-ink text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
                  <Sparkles className="w-3.5 h-3.5" />
                  A TU MEDIDA
                </div>
              )}

              <h3 className="font-display text-xl md:text-2xl font-semibold mb-1 text-ink">
                {p.nombre}
              </h3>

              <div className="flex items-center gap-1.5 text-sm mb-5 text-ink/50">
                <Clock className="w-4 h-4" />
                {p.duracion}
              </div>

              <div className="mb-6">
                <span className="font-display text-3xl md:text-4xl font-semibold text-gradient">
                  {p.precio}
                </span>
              </div>

              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {p.incluye.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-fucsia-50">
                      <Check className="w-3 h-3 text-fucsia-600" strokeWidth={3} />
                    </span>
                    <span className="text-ink/75">{item}</span>
                  </li>
                ))}
              </ul>

              <WhatsAppButton
                href={whatsappLink(esPersonalizable ? MENSAJES.personalizado : MENSAJES.paquete(p.nombre))}
                variant="primary"
                className="w-full"
              >
                {esPersonalizable ? 'Cotizar mi plan por WhatsApp' : 'Reservar por WhatsApp'}
              </WhatsAppButton>
            </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
