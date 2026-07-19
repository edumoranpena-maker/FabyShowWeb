// Decoración de fiesta sutil para fondos de sección: confeti CSS (piezas
// de color de marca) + un puñado de emojis (globos, brillos, estrellas,
// piñatas de confeti, gorros de fiesta, regalos) a muy baja opacidad.
// Siempre pointer-events-none y ubicados cerca de los bordes, nunca sobre
// el area central donde vive el contenido. Se coloca como primer hijo
// dentro de cada <section> (antes del contenido) para que el orden
// natural del DOM lo deje detrás de las cards.

const DOTS = {
  a: [
    'absolute w-2.5 h-2.5 rounded-full bg-fucsia-400 opacity-20 top-10 left-8',
    'absolute w-3 h-3 rotate-45 bg-amarillo-400 opacity-15 top-24 left-20',
    'absolute w-2 h-2 rounded-full bg-celeste-400 opacity-20 top-14 right-12',
    'absolute w-2.5 h-2.5 rotate-45 bg-morado-400 opacity-15 top-32 right-24',
    'absolute w-2 h-2 rounded-full bg-fucsia-300 opacity-15 bottom-16 left-16',
    'absolute w-3 h-3 rotate-12 bg-amarillo-300 opacity-20 bottom-10 left-32',
    'absolute w-2.5 h-2.5 rounded-full bg-celeste-300 opacity-15 bottom-24 right-10',
    'absolute w-2 h-2 rotate-45 bg-morado-300 opacity-20 bottom-8 right-28',
  ],
  b: [
    'absolute w-2 h-2 rounded-full bg-celeste-400 opacity-20 top-12 right-16',
    'absolute w-3 h-3 rotate-12 bg-fucsia-400 opacity-15 top-8 left-24',
    'absolute w-2.5 h-2.5 rounded-full bg-amarillo-400 opacity-20 top-28 left-10',
    'absolute w-2 h-2 rotate-45 bg-morado-400 opacity-15 top-20 right-32',
    'absolute w-2.5 h-2.5 rounded-full bg-celeste-300 opacity-15 bottom-12 right-14',
    'absolute w-2 h-2 rotate-45 bg-amarillo-300 opacity-20 bottom-20 left-12',
    'absolute w-3 h-3 rounded-full bg-fucsia-300 opacity-15 bottom-8 left-36',
    'absolute w-2.5 h-2.5 rotate-12 bg-morado-300 opacity-20 bottom-28 right-8',
  ],
  c: [
    'absolute w-2.5 h-2.5 rounded-full bg-amarillo-400 opacity-20 top-16 left-12',
    'absolute w-2 h-2 rotate-45 bg-celeste-400 opacity-15 top-10 right-20',
    'absolute w-3 h-3 rounded-full bg-morado-400 opacity-15 top-28 right-10',
    'absolute w-2 h-2 rotate-12 bg-fucsia-400 opacity-20 top-36 left-28',
    'absolute w-2.5 h-2.5 rounded-full bg-celeste-300 opacity-20 bottom-14 left-10',
    'absolute w-2 h-2 rotate-45 bg-amarillo-300 opacity-15 bottom-24 right-16',
    'absolute w-3 h-3 rounded-full bg-fucsia-300 opacity-15 bottom-10 right-32',
    'absolute w-2.5 h-2.5 rotate-12 bg-morado-300 opacity-20 bottom-32 left-24',
  ],
}

// Emojis de fiesta: globos, brillos, estrellas, confeti, regalos.
// opacity-10 en todos, tamaños y rotaciones variadas, siempre cerca de bordes.
const EMOJIS = {
  a: [
    { icon: '🎈', cls: 'top-8 -left-2 text-6xl -rotate-12' },
    { icon: '✨', cls: 'top-1/4 right-4 text-3xl rotate-6' },
    { icon: '🎊', cls: 'bottom-20 left-6 text-5xl rotate-6' },
    { icon: '⭐', cls: 'bottom-10 right-10 text-3xl -rotate-6' },
  ],
  b: [
    { icon: '⭐', cls: 'top-10 right-6 text-4xl rotate-12' },
    { icon: '🎉', cls: 'top-1/3 -left-3 text-6xl -rotate-6' },
    { icon: '🎈', cls: 'bottom-16 right-8 text-5xl rotate-6' },
    { icon: '✨', cls: 'bottom-6 left-10 text-3xl rotate-12' },
  ],
  c: [
    { icon: '🎁', cls: 'top-12 left-8 text-5xl -rotate-6' },
    { icon: '✨', cls: 'top-6 right-1/4 text-3xl rotate-12' },
    { icon: '🎊', cls: 'bottom-8 -right-2 text-6xl rotate-6' },
    { icon: '⭐', cls: 'bottom-24 left-1/4 text-3xl -rotate-12' },
  ],
}

export default function Confetti({ variant = 'a', className = '' }) {
  const dots = DOTS[variant] || DOTS.a
  const emojis = EMOJIS[variant] || EMOJIS.a

  return (
    <div aria-hidden="true" className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {dots.map((cls, i) => (
        <span key={`dot-${i}`} className={cls} />
      ))}

      {emojis.map((e, i) => (
        <span key={`emoji-${i}`} className={`absolute select-none opacity-10 ${e.cls}`}>
          {e.icon}
        </span>
      ))}
    </div>
  )
}
