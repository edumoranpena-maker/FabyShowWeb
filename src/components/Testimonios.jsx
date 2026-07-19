import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, ChevronLeft, ChevronRight, Quote, PenLine, X } from 'lucide-react'
import { TESTIMONIOS as TESTIMONIOS_INICIALES } from '../data/content'

function EstrellasInput({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              n <= (hover || value) ? 'fill-amarillo-400 text-amarillo-400' : 'text-ink/15'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function ModalResena({ onClose, onSubmit }) {
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [evento, setEvento] = useState('')
  const [texto, setTexto] = useState('')
  const [estrellas, setEstrellas] = useState(5)
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!nombre.trim() || !texto.trim()) {
      setError('Completa tu nombre y tu opinión antes de enviar.')
      return
    }
    onSubmit({
      nombre: nombre.trim(),
      evento: evento.trim() ? evento.trim() : 'Cliente Faby Show',
      texto: texto.trim(),
      estrellas,
      foto: null,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.form
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="relative w-full max-w-md bg-white rounded-4xl p-6 md:p-8 shadow-2xl flex flex-col gap-5"
      >
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-ink/5 flex items-center justify-center text-ink/60 hover:bg-ink/10"
        >
          <X className="w-4 h-4" />
        </button>

        <div>
          <h3 className="font-display text-xl md:text-2xl font-semibold text-ink mb-1">Cuéntanos tu experiencia</h3>
          <p className="font-body text-sm text-ink/55">Tu opinión ayuda a otras familias a decidir.</p>
        </div>

        <div>
          <span className="font-body text-sm font-medium text-ink/70 mb-2 block">Tu calificación</span>
          <EstrellasInput value={estrellas} onChange={setEstrellas} />
        </div>

        <div>
          <label htmlFor="resena-nombre" className="font-body text-sm font-medium text-ink/70 mb-1.5 block">
            Nombre
          </label>
          <input
            id="resena-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            type="text"
            placeholder="Tu nombre"
            className="w-full rounded-xl border border-ink/10 px-4 py-3 font-body text-sm focus:border-fucsia-400 focus:ring-2 focus:ring-fucsia-100 outline-none transition-all"
          />
        </div>

        <div>
          <label htmlFor="resena-contacto" className="font-body text-sm font-medium text-ink/70 mb-1.5 block">
            Correo o número (opcional)
          </label>
          <input
            id="resena-contacto"
            value={contacto}
            onChange={(e) => setContacto(e.target.value)}
            type="text"
            placeholder="correo@ejemplo.com o 999 999 999"
            className="w-full rounded-xl border border-ink/10 px-4 py-3 font-body text-sm focus:border-fucsia-400 focus:ring-2 focus:ring-fucsia-100 outline-none transition-all"
          />
        </div>

        <div>
          <label htmlFor="resena-evento" className="font-body text-sm font-medium text-ink/70 mb-1.5 block">
            ¿En qué evento nos viste?
          </label>
          <input
            id="resena-evento"
            value={evento}
            onChange={(e) => setEvento(e.target.value)}
            type="text"
            placeholder="Cumpleaños de Zoe, 2 años"
            className="w-full rounded-xl border border-ink/10 px-4 py-3 font-body text-sm focus:border-fucsia-400 focus:ring-2 focus:ring-fucsia-100 outline-none transition-all"
          />
        </div>

        <div>
          <label htmlFor="resena-texto" className="font-body text-sm font-medium text-ink/70 mb-1.5 block">
            Tu opinión
          </label>
          <textarea
            id="resena-texto"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            placeholder="Cuéntanos cómo estuvo el evento..."
            className="w-full rounded-xl border border-ink/10 px-4 py-3 font-body text-sm focus:border-fucsia-400 focus:ring-2 focus:ring-fucsia-100 outline-none transition-all resize-none"
          />
        </div>

        {error && <p className="font-body text-xs text-fucsia-600">{error}</p>}

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 bg-party-gradient text-white font-body font-semibold rounded-full px-8 py-3.5 shadow-soft hover:-translate-y-0.5 transition-all duration-300"
        >
          Publicar reseña
        </button>
      </motion.form>
    </motion.div>
  )
}

export default function Testimonios() {
  const [testimonios, setTestimonios] = useState(
    TESTIMONIOS_INICIALES.map((t) => ({ ...t, estrellas: 5 }))
  )
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [modalAbierto, setModalAbierto] = useState(false)

  const go = useCallback(
    (dir) => {
      setDirection(dir)
      setIndex((i) => (i + dir + testimonios.length) % testimonios.length)
    },
    [testimonios.length]
  )

  useEffect(() => {
    const timer = setInterval(() => go(1), 6000)
    return () => clearInterval(timer)
  }, [go])

  const agregarResena = (nueva) => {
    setTestimonios((prev) => [nueva, ...prev])
    setIndex(0)
    setDirection(-1)
    setModalAbierto(false)
  }

  const t = testimonios[index]

  return (
    <section id="testimonios" className="relative py-20 md:py-28 bg-white overflow-hidden">
      <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
        <span className="inline-block font-body text-sm font-semibold text-fucsia-600 bg-fucsia-50 px-4 py-1.5 rounded-full mb-4">
          Testimonios
        </span>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-ink mb-6">
          Familias felices, la mejor carta de presentación
        </h2>

        <button
          onClick={() => setModalAbierto(true)}
          className="inline-flex items-center gap-2 font-body text-sm font-semibold text-morado-600 bg-morado-50 hover:bg-morado-100 transition-colors px-5 py-2.5 rounded-full mb-12"
        >
          <PenLine className="w-4 h-4" />
          Escribe una reseña
        </button>

        <div className="relative min-h-[280px] md:min-h-[240px] flex items-center justify-center">
          <Quote className="absolute -top-2 left-1/2 -translate-x-1/2 w-14 h-14 text-morado-100 -z-0" />

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={t.nombre + t.texto.slice(0, 10)}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 40 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="relative z-10 flex flex-col items-center"
            >
              <div className="flex gap-1 mb-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < (t.estrellas || 5) ? 'fill-amarillo-400 text-amarillo-400' : 'text-ink/15'
                    }`}
                  />
                ))}
              </div>

              <p className="font-alt italic text-lg md:text-xl text-ink/80 leading-relaxed mb-8 max-w-xl">
                "{t.texto}"
              </p>

              {t.foto ? (
                <img
                  src={t.foto}
                  alt={t.nombre}
                  className="w-14 h-14 rounded-full object-cover border-2 border-fucsia-200 mb-2"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-party-gradient flex items-center justify-center text-white font-display font-semibold text-lg mb-2">
                  {t.nombre.charAt(0)}
                </div>
              )}
              <span className="font-body font-semibold text-ink text-sm">{t.nombre}</span>
              <span className="font-body text-xs text-ink/50">{t.evento}</span>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-4 mt-10">
          <button
            aria-label="Testimonio anterior"
            onClick={() => go(-1)}
            className="w-10 h-10 rounded-full bg-morado-50 text-morado-600 flex items-center justify-center hover:bg-morado-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            {testimonios.map((_, i) => (
              <button
                key={i}
                aria-label={`Ir al testimonio ${i + 1}`}
                onClick={() => {
                  setDirection(i > index ? 1 : -1)
                  setIndex(i)
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === index ? 'w-6 bg-fucsia-500' : 'w-2 bg-ink/15'
                }`}
              />
            ))}
          </div>
          <button
            aria-label="Siguiente testimonio"
            onClick={() => go(1)}
            className="w-10 h-10 rounded-full bg-morado-50 text-morado-600 flex items-center justify-center hover:bg-morado-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {modalAbierto && (
          <ModalResena onClose={() => setModalAbierto(false)} onSubmit={agregarResena} />
        )}
      </AnimatePresence>
    </section>
  )
}
