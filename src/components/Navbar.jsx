import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, PartyPopper, Instagram, MessageCircle } from 'lucide-react'
import { useScrolled } from '../hooks/useScrolled'
import { NAV_LINKS, whatsappLink, MENSAJES, CONTACTO } from '../data/content'
import TikTokIcon from './icons/TikTokIcon'

const SOCIALS = [
  { label: 'TikTok', href: CONTACTO.tiktok, icon: TikTokIcon },
  { label: 'Instagram', href: CONTACTO.instagram, icon: Instagram },
  { label: 'WhatsApp', href: whatsappLink(MENSAJES.general), icon: MessageCircle },
]

export default function Navbar() {
  const scrolled = useScrolled(30)
  const [open, setOpen] = useState(false)

  const textColor = scrolled ? 'text-ink' : 'text-white'
  const socialChip = scrolled
    ? 'bg-ink/5 text-ink hover:bg-fucsia-50 hover:text-fucsia-600'
    : 'bg-white/15 text-white hover:bg-white/25'

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-500 ${
        scrolled ? 'bg-white/85 backdrop-blur-lg shadow-card py-3' : 'bg-transparent py-5'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-5 md:px-8 flex items-center justify-between">
        <a href="#hero" className="flex items-center gap-2 font-display font-semibold text-xl md:text-2xl">
          <span
            className={`flex items-center justify-center w-10 h-10 rounded-2xl bg-party-gradient text-white shadow-glow`}
          >
            <PartyPopper className="w-5 h-5" />
          </span>
          <span className={textColor}>Faby Show</span>
        </a>

        <div className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`font-body text-sm font-medium transition-colors hover:text-fucsia-500 ${textColor}`}
            >
              {link.label}
            </a>
          ))}

          <div className="flex items-center gap-2 pl-2 border-l border-current/15">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-300 ${socialChip}`}
              >
                <s.icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        <button
          aria-label="Abrir menú"
          onClick={() => setOpen(true)}
          className="lg:hidden flex items-center justify-center w-11 h-11 rounded-full bg-white text-ink shadow-card"
        >
          <Menu className="w-6 h-6" />
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.35, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-0 h-full w-[80%] max-w-sm bg-white p-6 flex flex-col gap-2 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="font-display font-semibold text-xl text-ink">Faby Show</span>
                <button aria-label="Cerrar menú" onClick={() => setOpen(false)} className="p-2 rounded-xl bg-morado-50">
                  <X className="w-6 h-6 text-morado-700" />
                </button>
              </div>
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="py-3.5 px-3 rounded-xl font-body font-medium text-ink hover:bg-fucsia-50 hover:text-fucsia-600 transition-colors"
                >
                  {link.label}
                </a>
              ))}

              <div className="flex items-center gap-3 mt-6 pt-6 border-t border-ink/10">
                {SOCIALS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    onClick={() => setOpen(false)}
                    className="w-11 h-11 rounded-full bg-morado-50 text-morado-600 flex items-center justify-center hover:bg-fucsia-50 hover:text-fucsia-600 transition-colors"
                  >
                    <s.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
