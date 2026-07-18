// ============================================================
// TODO PARA FABY SHOW: este archivo centraliza todos los textos,
// precios e imágenes de la web. Reemplaza las URLs de Unsplash
// por fotos y videos reales de tus eventos antes de publicar.
// ============================================================

export const WHATSAPP_NUMBER = '51931230749'

export const whatsappLink = (mensaje) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`

export const MENSAJES = {
  general: 'Hola Faby Show 👋 Quiero cotizar una animación para un evento infantil.',
  paquete: (nombre) => `Hola Faby Show 👋 Quiero reservar el ${nombre}. ¿Me ayudan con la disponibilidad?`,
  galeria: 'Hola Faby Show 👋 Vi su galería y quiero un evento así de espectacular. ¿Cotizamos?',
}

export const NAV_LINKS = [
  { label: 'Inicio', href: '#hero' },
  { label: 'Servicios', href: '#servicios' },
  { label: 'Paquetes', href: '#paquetes' },
  { label: 'Galería', href: '#galeria' },
  { label: 'Testimonios', href: '#testimonios' },
  { label: 'Contacto', href: '#contacto' },
]

export const STATS = [
  { value: 850, suffix: '+', label: 'eventos realizados' },
  { value: 12000, suffix: '+', label: 'niños felices' },
  { value: 9, suffix: '', label: 'años de experiencia' },
]

export const SERVICIOS = [
  { icon: 'Drama', title: 'Animadoras', desc: 'Energía y carisma para mantener la fiesta activa de principio a fin.' },
  { icon: 'PartyPopper', title: 'Personajes infantiles', desc: 'Los favoritos de tus hijos, en vivo, listos para la foto perfecta.' },
  { icon: 'Sparkles', title: 'Burbujas gigantes', desc: 'Un espectáculo visual que atrapa a niños y adultos por igual.' },
  { icon: 'Music4', title: 'DJ Infantil', desc: 'Música, luces y baile: la pista nunca se queda vacía.' },
  { icon: 'Paintbrush', title: 'Pintacaritas', desc: 'Diseños coloridos y seguros para la piel, hechos por artistas.' },
  { icon: 'Wand2', title: 'Magia', desc: 'Trucos que sorprenden y dejan a los niños con la boca abierta.' },
  { icon: 'Gamepad2', title: 'Juegos', desc: 'Dinámicas grupales pensadas para todas las edades.' },
  { icon: 'Mic2', title: 'Concursos', desc: 'Premios y risas aseguradas con nuestros concursos animados.' },
  { icon: 'PartyPopper', title: 'Hora loca', desc: 'Espuma, luces y accesorios para el cierre más divertido.' },
  { icon: 'Gift', title: 'Decoración', desc: 'Ambientación temática que combina con el resto del show.' },
]

export const PAQUETES = [
  {
    nombre: 'Plan Básico',
    duracion: '1.5 horas',
    precio: 'Desde S/ 350',
    destacado: false,
    incluye: [
      '1 animadora profesional',
      'Juegos y concursos',
      'Música y sonido incluido',
      'Bailes coreografiados',
    ],
  },
  {
    nombre: 'Plan Premium',
    duracion: '2.5 horas',
    precio: 'Desde S/ 650',
    destacado: true,
    incluye: [
      '2 animadoras + 1 personaje',
      'Pintacaritas incluido',
      'DJ infantil con luces',
      'Hora loca con espuma',
      'Concursos con premios',
    ],
  },
  {
    nombre: 'Plan VIP',
    duracion: '3.5 horas',
    precio: 'Desde S/ 990',
    destacado: false,
    incluye: [
      'Todo lo del Plan Premium',
      '2 personajes a elección',
      'Show de magia en vivo',
      'Burbujas gigantes',
      'Decoración temática completa',
      'Fotógrafo del evento',
    ],
  },
]

export const GALERIA = [
  { id: 1, categoria: 'Personajes', tipo: 'foto', alto: 'alto', src: 'https://images.unsplash.com/photo-1533294455009-a77b7557d2d1?q=80&w=800&auto=format&fit=crop' },
  { id: 2, categoria: 'Animación', tipo: 'foto', alto: 'medio', src: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=800&auto=format&fit=crop' },
  { id: 3, categoria: 'Decoración', tipo: 'foto', alto: 'medio', src: 'https://images.unsplash.com/photo-1464349153735-e88d8aa5ca6d?q=80&w=800&auto=format&fit=crop' },
  { id: 4, categoria: 'DJ', tipo: 'foto', alto: 'alto', src: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=800&auto=format&fit=crop' },
  { id: 5, categoria: 'Pintacaritas', tipo: 'foto', alto: 'medio', src: 'https://images.unsplash.com/photo-1560582861-45078880e48b?q=80&w=800&auto=format&fit=crop' },
  { id: 6, categoria: 'Animación', tipo: 'foto', alto: 'alto', src: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop' },
  { id: 7, categoria: 'Personajes', tipo: 'foto', alto: 'medio', src: 'https://images.unsplash.com/photo-1602631985686-1bb0e6a8696e?q=80&w=800&auto=format&fit=crop' },
  { id: 8, categoria: 'Decoración', tipo: 'foto', alto: 'alto', src: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=800&auto=format&fit=crop' },
  { id: 9, categoria: 'Animación', tipo: 'foto', alto: 'medio', src: 'https://images.unsplash.com/photo-1509825232004-3c9b7a935528?q=80&w=800&auto=format&fit=crop' },
]

export const GALERIA_FILTROS = ['Todos', 'Animación', 'Personajes', 'DJ', 'Decoración', 'Pintacaritas']

export const PASOS = [
  { numero: '01', titulo: 'Solicitas información', desc: 'Nos escribes por WhatsApp y te respondemos en minutos.' },
  { numero: '02', titulo: 'Elegimos el paquete ideal', desc: 'Te asesoramos según la edad, el lugar y el presupuesto.' },
  { numero: '03', titulo: 'Reservas la fecha', desc: 'Confirmamos disponibilidad y separamos tu evento.' },
  { numero: '04', titulo: 'Nosotros nos encargamos de todo', desc: 'Coordinamos equipo, sonido y logística sin que te preocupes.' },
  { numero: '05', titulo: 'Disfrutas una fiesta inolvidable', desc: 'Tú celebras, nosotros hacemos que todo salga perfecto.' },
]

export const TESTIMONIOS = [
  {
    nombre: 'María José R.',
    evento: 'Cumpleaños de Valentina, 5 años',
    texto: 'La animadora tuvo a todos los niños jugando sin parar. Los papás también terminamos bailando. Contratamos el Plan Premium y superó nuestras expectativas.',
    foto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
  },
  {
    nombre: 'Carlos M.',
    evento: 'Cumpleaños de Mateo, 7 años',
    texto: 'Muy puntuales y profesionales. Se encargaron de absolutamente todo, desde el sonido hasta la decoración. Ya los recontratamos para el próximo año.',
    foto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
  },
  {
    nombre: 'Andrea T.',
    evento: 'Cumpleaños de Sofía, 4 años',
    texto: 'El show de magia fue el favorito de todos. Se nota la experiencia del equipo y el cuidado en cada detalle. Totalmente recomendados.',
    foto: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?q=80&w=200&auto=format&fit=crop',
  },
  {
    nombre: 'Diego H.',
    evento: 'Cumpleaños de Rafaella, 6 años',
    texto: 'Contratamos el Plan VIP y valió cada sol. La hora loca fue un éxito total, los niños no querían que terminara la fiesta.',
    foto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop',
  },
]

export const FAQS = [
  { pregunta: '¿Con cuánta anticipación debo reservar?', respuesta: 'Recomendamos reservar con al menos 2 semanas de anticipación, especialmente en fines de semana y temporada alta (vacaciones y diciembre), aunque también atendemos solicitudes de último momento según disponibilidad.' },
  { pregunta: '¿Qué zonas de Lima cubren?', respuesta: 'Cubrimos todos los distritos de Lima Metropolitana. Para eventos fuera de Lima, escríbenos por WhatsApp y te confirmamos disponibilidad y costo de movilidad.' },
  { pregunta: '¿El precio incluye equipo de sonido?', respuesta: 'Sí, todos nuestros paquetes incluyen equipo de sonido profesional. Solo necesitamos un punto de electricidad cerca del área del show.' },
  { pregunta: '¿Puedo personalizar el paquete?', respuesta: 'Claro que sí. Podemos combinar servicios de distintos paquetes según la edad de los niños, el espacio disponible y tu presupuesto. Cuéntanos tu idea por WhatsApp.' },
  { pregunta: '¿Qué pasa si llueve o el clima cambia?', respuesta: 'Nuestro equipo se adapta a espacios cerrados o techados sin ningún costo adicional. Te recomendamos avisarnos con anticipación si el evento es al aire libre.' },
  { pregunta: '¿Cómo confirmo mi reserva?', respuesta: 'Con un adelanto que coordinamos directamente por WhatsApp. Una vez confirmado, tu fecha queda separada exclusivamente para tu evento.' },
]

export const CONTACTO = {
  direccion: 'Sullana, Piura (atención a toda la provincia)',
  horario: 'Lunes a domingo, 8:00 am – 11:00 pm',
  instagram: 'https://instagram.com/fabyshow',
  tiktok: 'https://tiktok.com/@fabyshow',
}
