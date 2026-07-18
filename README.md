# Faby Show — Landing Page

Landing page de conversion para una empresa de animacion de eventos infantiles en Peru. Construida con React + Vite + Tailwind CSS + Framer Motion + Lucide Icons.

## Antes de publicar (importante)

1. WhatsApp: abre src/data/content.js y reemplaza WHATSAPP_NUMBER por el numero real (formato 51 + 9 digitos, sin espacios ni el signo +).
2. Fotos y videos reales: reemplaza las URLs de Unsplash en src/data/content.js (arreglo GALERIA) y el video del Hero (src/components/Hero.jsx) por material real de tus eventos. Las imagenes de stock son solo temporales para maquetar el diseno.
3. Precios y paquetes: ajusta el arreglo PAQUETES en content.js con tus precios reales.
4. Mapa: reemplaza mapsEmbed en content.js con el iframe real de Google Maps de tu ubicacion (Google Maps -> Compartir -> Insertar un mapa -> copiar el src del iframe).
5. Redes sociales: actualiza los links de Instagram y Facebook en CONTACTO.
6. SEO: revisa el title y meta description en index.html.

## Como correrlo localmente

```
npm install
npm run dev
```

Abre http://localhost:5173

## Build de produccion

```
npm run build
```

Esto genera la carpeta dist/ lista para subir a Vercel, Netlify o cualquier hosting estatico.

## Estructura

```
src/
  components/     Todas las secciones y componentes reutilizables
  data/content.js Todos los textos, precios e imagenes (edita aqui)
  hooks/          Hooks (scroll, contador animado)
  index.css       Estilos globales y tokens visuales
  App.jsx         Ensambla todas las secciones
```

## Notas de diseno

- Paleta: fucsia, morado, celeste y amarillo como acentos sobre fondo blanco.
- Tipografia: Fredoka para titulos, Poppins para cuerpo de texto.
- El boton de WhatsApp aparece en el Hero, debajo de cada paquete, en la galeria, en contacto, en el footer y como boton flotante fijo.
- Mobile-first: cada seccion fue disenada primero para pantallas pequenas.
- Se respeta prefers-reduced-motion para accesibilidad.
