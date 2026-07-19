// Confetti decorativo y sutil para fondos de sección. Piezas de CSS puro
// (no imágenes) en los colores de marca, muy baja opacidad, siempre
// pointer-events-none y ubicadas cerca de los bordes para no competir
// con el contenido. Se coloca como primer hijo dentro de cada <section>
// (antes del contenido) para que el orden natural del DOM lo deje detrás.

const VARIANTS = {
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
}

export default function Confetti({ variant = 'a', emojis = false, className = '' }) {
  const pieces = VARIANTS[variant] || VARIANTS.a

  return (
    <div aria-hidden="true" className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {pieces.map((cls, i) => (
        <span key={i} className={cls} />
      ))}

      {emojis && (
        <>
          <span className="absolute top-10 -left-3 text-5xl -rotate-12 opacity-[0.08] select-none">🎈</span>
          <span className="absolute bottom-16 -right-3 text-5xl rotate-12 opacity-[0.08] select-none">🎉</span>
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl opacity-[0.06] select-none">✨</span>
        </>
      )}
    </div>
  )
}
