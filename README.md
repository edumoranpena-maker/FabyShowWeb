# Faby Show — Sitio + Panel de administración

Landing page de conversión para una empresa de animación de eventos infantiles en Perú, más el panel de administración (`/admin`) donde eventualmente se editará todo el contenido. Construido con React + Vite + React Router + Tailwind CSS + Framer Motion + Lucide Icons, preparado para Supabase (Auth, Database, Storage).

## Antes de publicar el sitio público (importante)

1. WhatsApp: abre `src/data/content.js` y reemplaza `WHATSAPP_NUMBER` por el número real.
2. Fotos y videos reales: reemplaza las URLs de Unsplash en `src/data/content.js` (arreglos `GALERIA` y `HERO_GALLERY`) por material real de tus eventos.
3. Precios y paquetes: ajusta el arreglo `PAQUETES` en `content.js`.
4. Redes sociales: actualiza los links en `CONTACTO` (`content.js`).
5. SEO: revisa el `title` y `meta description` en `index.html`.

## Cómo correrlo localmente

```
npm install
npm run dev
```

Abre `http://localhost:5173` para el sitio público, y `http://localhost:5173/admin` para el panel de administración.

## Build de producción

```
npm run build
```

## Estructura

```
src/
  marketing/          El sitio público (landing), montado en "/"
  admin/               Panel de administración, montado en "/admin/*"
    AdminApp.jsx        Rutas del admin (login + secciones protegidas)
    layout/              Sidebar, Header, shell del panel
    views/               Una vista por sección del CMS (hoy son placeholders)
    components/          PageHeader, ComingSoon — piezas compartidas
    navConfig.js          Lista única de secciones del sidebar
  auth/                Arquitectura de autenticación (ver abajo)
  services/            Capa de datos por sección, lista para Supabase Database/Storage
  lib/
    supabaseClient.js    Cliente de Supabase (placeholder — ver "Conectar Supabase")
    colorExtraction.js   Extracción automática de paleta de color del Hero
  components/          Componentes del sitio público
  data/content.js      Textos, precios e imágenes del sitio público
  hooks/               Hooks reutilizables
  App.jsx              Switchboard de rutas: "/" → marketing, "/admin/*" → admin
```

## Panel de administración (`/admin`)

Arquitectura pensada para que conectar Supabase sea **solo** escribir el cuerpo
de un puñado de funciones ya definidas — sin tocar componentes de UI, rutas,
ni el guard de autenticación.

- **`/admin/login`** — formulario de acceso (público).
- **`/admin`** y todas las subrutas (`/admin/hero`, `/admin/galeria`, etc.) —
  protegidas por `ProtectedRoute`, que redirige a `/admin/login` si no hay
  sesión.
- El sidebar (`src/admin/navConfig.js`) lista: Dashboard, Hero, Galería,
  Servicios, Paquetes, Testimonios, FAQ y Contacto.
- Cada vista de sección (`src/admin/views/*View.jsx`) es hoy un placeholder
  (`ComingSoon`) — el layout, la navegación y el guard de auth ya están
  completos; falta construir el editor de cada una.

### Conectar Supabase (cuando estén listos)

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. Crear `.env.local` en la raíz:
   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key
   ```
3. Descomentar el bloque en `src/lib/supabaseClient.js`.
4. Listo — `src/auth/authService.js` y `src/services/*.js` ya están escritos
   contra la API real de Supabase; empiezan a funcionar automáticamente en
   cuanto el cliente deja de ser `null`.

Para cada sección del CMS, la tabla sugerida en Supabase está documentada
como comentario en su archivo de servicio (`src/services/heroService.js`,
`src/services/galeriaService.js`, etc.).

## Notas de diseño (sitio público)

- Paleta: fucsia, morado, celeste y amarillo como acentos sobre fondo blanco.
- Tipografía: Fredoka para títulos, Poppins para cuerpo de texto.
- El botón de WhatsApp aparece en el Hero, debajo de cada paquete, en la
  galería, en contacto, en el footer y como botón flotante fijo.
- Mobile-first: cada sección fue diseñada primero para pantallas pequeñas.
- Se respeta `prefers-reduced-motion` para accesibilidad.
