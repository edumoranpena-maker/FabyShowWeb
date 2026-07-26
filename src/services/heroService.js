import { createContentService } from './contentService'

// CRUD de los slides del carrusel del Hero. Tabla sugerida: "hero_slides"
// (columnas: id, image_url, orden, created_at). Las imágenes se subirán
// a Supabase Storage con uploadContentFile('hero-gallery', ...) desde la
// vista de edición, y la URL pública resultante se guarda en image_url.
export const heroService = createContentService('hero_slides')
