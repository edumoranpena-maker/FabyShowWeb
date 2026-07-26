import {
  LayoutDashboard,
  Image,
  GalleryHorizontalEnd,
  Sparkles,
  PackageOpen,
  Star,
  HelpCircle,
  Phone,
} from 'lucide-react'

// Fuente única de verdad de la navegación del admin. La usan tanto el
// Sidebar (para renderizar los links) como el AdminHeader (para mostrar
// el título de la página activa) — agregar una sección nueva al CMS es
// agregar una entrada acá y su vista correspondiente en admin/views.
export const ADMIN_NAV = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Hero', to: '/admin/hero', icon: Image },
  { label: 'Galería', to: '/admin/galeria', icon: GalleryHorizontalEnd },
  { label: 'Servicios', to: '/admin/servicios', icon: Sparkles },
  { label: 'Paquetes', to: '/admin/paquetes', icon: PackageOpen },
  { label: 'Testimonios', to: '/admin/testimonios', icon: Star },
  { label: 'FAQ', to: '/admin/faq', icon: HelpCircle },
  { label: 'Contacto', to: '/admin/contacto', icon: Phone },
]
