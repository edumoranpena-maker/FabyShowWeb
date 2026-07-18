import { PartyPopper, Instagram, Facebook, MessageCircle } from 'lucide-react'
import { NAV_LINKS, CONTACTO, whatsappLink, MENSAJES } from '../data/content'
import WhatsAppButton from './WhatsAppButton'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative bg-ink text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 font-display font-semibold text-2xl mb-4">
              <span className="flex items-center justify-center w-10 h-10 rounded-2xl bg-party-gradient text-white">
                <PartyPopper className="w-5 h-5" />
              </span>
              Faby Show
            </div>
            <p className="font-body text-sm text-white/60 max-w-sm mb-6">
              Animacion profesional de eventos infantiles en Peru. Convertimos cada cumpleanos en un espectaculo inolvidable, con un equipo que se encarga de todo.
            </p>
            <WhatsAppButton href={whatsappLink(MENSAJES.general)} size="md">
              Cotizar por WhatsApp
            </WhatsAppButton>
          </div>

          <div>
            <h4 className="font-display font-medium text-base mb-4">Navegacion</h4>
            <ul className="flex flex-col gap-2.5">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="font-body text-sm text-white/60 hover:text-fucsia-300 transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-medium text-base mb-4">Contacto</h4>
            <ul className="flex flex-col gap-2.5 font-body text-sm text-white/60">
              <li>{CONTACTO.direccion}</li>
              <li>{CONTACTO.horario}</li>
            </ul>
            <div className="flex gap-3 mt-4">
              <a href={CONTACTO.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-fucsia-500 transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href={CONTACTO.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-fucsia-500 transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href={whatsappLink(MENSAJES.general)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#25D366] transition-colors">
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="font-body text-xs text-white/40">
            (c) {year} Faby Show. Todos los derechos reservados.
          </p>
          <p className="font-body text-xs text-white/40">Hecho con alegria en Peru</p>
        </div>
      </div>
    </footer>
  )
}
