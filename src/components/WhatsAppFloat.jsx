import { useEffect, useRef, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { whatsappLink, MENSAJES } from '../data/content'
import { useActiveSection } from '../hooks/useActiveSection'

// Referencia estable (fuera del componente) para no re-crear el observer
// en cada render. Debe coincidir con los id="" de cada seccion.
const SECTION_IDS = [
  'hero',
  'servicios',
  'paquetes',
  'galeria',
  'como-trabajamos',
  'testimonios',
  'faq',
  'contacto',
]

export default function WhatsAppFloat() {
  const activeSection = useActiveSection(SECTION_IDS)
  const [blinkKey, setBlinkKey] = useState(0)
  const prevSection = useRef(null)

  useEffect(() => {
    if (activeSection && activeSection !== prevSection.current) {
      prevSection.current = activeSection
      // Cambiar la key remonta el <span>, lo que reinicia la animacion
      // CSS de 3 iteraciones definida en index.css (.whatsapp-blink)
      setBlinkKey((k) => k + 1)
    }
  }, [activeSection])

  return (
    <motion.a
      href={whatsappLink(MENSAJES.general)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Cotizar por WhatsApp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: 'spring', stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      className="fixed bottom-5 right-5 md:bottom-8 md:right-8 z-50 flex items-center justify-center w-16 h-16 rounded-full bg-[#25D366] shadow-[0_12px_32px_-6px_rgba(37,211,102,0.7)]"
    >
      <span key={blinkKey} className="absolute inset-0 rounded-full bg-[#25D366] whatsapp-blink" />
      <MessageCircle className="relative w-8 h-8 text-white" strokeWidth={2.2} />
    </motion.a>
  )
}
