import { Instagram, MessageCircle } from 'lucide-react'
import { useHeroExited } from '../hooks/useHeroExited'
import { NAV_LINKS, whatsappLink, MENSAJES, CONTACTO } from '../data/content'
import TikTokIcon from './icons/TikTokIcon'

const SOCIALS = [
  { label: 'TikTok', href: CONTACTO.tiktok, icon: TikTokIcon },
  { label: 'Instagram', href: CONTACTO.instagram, icon: Instagram },
  { label: 'WhatsApp', href: whatsappLink(MENSAJES.general), icon: MessageCircle },
]

/**
 * Topbar compacta y sticky, exclusiva para pantallas horizontales reales
 * (orientation: landscape, variante `hz` definida en tailwind.config.js) —
 * celular rotado, tablet o desktop. En vertical queda oculta por completo,
 * ahi el Navbar mobile de siempre se encarga. Conceptualmente es un elemento aparte del Hero:
 * el Hero presenta la marca en grande, esta barra solo navega, y por eso
 * es mucho mas pequeña que el header anterior.
 *
 * Su visibilidad depende de si el Hero sigue en pantalla (ver
 * useHeroExited, basado en IntersectionObserver) y no de un listener de
 * scroll. Se mantiene siempre montada para poder animar su entrada/salida
 * con una transicion sutil sin flicker; cuando esta oculta se le quitan
 * los eventos e interaccion via pointer-events/aria-hidden.
 */
export default function DesktopTopbar() {
  const heroExited = useHeroExited('hero')

  return (
    <header
      aria-hidden={!heroExited}
      className={`hidden hz:block fixed top-0 inset-x-0 z-40 h-16 bg-white/95 backdrop-blur-lg shadow-card transition-all duration-300 ease-out ${
        heroExited
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}
    >
      <nav className="max-w-7xl mx-auto h-full px-8 flex items-center justify-between">
        <a href="#hero" className="flex items-center gap-2.5" tabIndex={heroExited ? 0 : -1}>
          <img
            src="/avatar-faby-show.png"
            alt=""
            className="w-8 h-8 rounded-full object-cover shadow-glow"
          />
          <img src="/logo-faby-show.png" alt="Faby Show" className="h-9 w-auto" />
        </a>

        <div className="flex items-center gap-7">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              tabIndex={heroExited ? 0 : -1}
              className="font-body text-[16px] font-medium text-ink/80 transition-colors hover:text-fucsia-500"
            >
              {link.label}
            </a>
          ))}

          <div className="flex items-center gap-2 pl-2 border-l border-ink/10">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                tabIndex={heroExited ? 0 : -1}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-ink/5 text-ink transition-colors duration-300 hover:bg-fucsia-50 hover:text-fucsia-600"
              >
                <s.icon className="w-3.5 h-3.5" />
              </a>
            ))}
          </div>
        </div>
      </nav>
    </header>
  )
}
