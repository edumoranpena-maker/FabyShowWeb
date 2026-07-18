import { MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { whatsappLink, MENSAJES } from '../data/content'

export default function WhatsAppFloat() {
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
      <span className="absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-60 animate-ping" />
      <MessageCircle className="relative w-8 h-8 text-white" strokeWidth={2.2} />
    </motion.a>
  )
}
