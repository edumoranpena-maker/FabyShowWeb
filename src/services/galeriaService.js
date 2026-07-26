import { createContentService } from './contentService'

// CRUD de las fotos/videos de la Galería. Tabla sugerida: "galeria_items"
// (columnas: id, categoria, tipo, src, created_at).
export const galeriaService = createContentService('galeria_items')
