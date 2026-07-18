import { MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'

/**
 * Botón de WhatsApp reutilizable.
 * variant: 'primary' | 'secondary' | 'outline'
 * size: 'lg' | 'md' | 'sm'
 */
export default function WhatsAppButton({
  href,
  children = 'Cotizar por WhatsApp',
  variant = 'primary',
  size = 'lg',
  className = '',
  icon = true,
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-body font-semibold rounded-full transition-all duration-300 focus-visible:outline-celeste-400'

  const sizes = {
    lg: 'px-8 py-4 text-base md:text-lg',
    md: 'px-6 py-3.5 text-sm md:text-base',
    sm: 'px-5 py-2.5 text-sm',
  }

  const variants = {
    primary:
      'bg-[#25D366] text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.6)] hover:shadow-[0_14px_36px_-6px_rgba(37,211,102,0.75)] hover:-translate-y-0.5',
    secondary:
      'bg-white text-morado-700 border-2 border-morado-200 hover:border-morado-400 hover:-translate-y-0.5 shadow-card',
    outline:
      'bg-white/10 text-white border-2 border-white/70 backdrop-blur-sm hover:bg-white/20 hover:-translate-y-0.5',
  }

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      whileTap={{ scale: 0.96 }}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {icon && <MessageCircle className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.4} />}
      {children}
    </motion.a>
  )
}
