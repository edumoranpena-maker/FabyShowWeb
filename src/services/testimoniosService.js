import { createContentService } from './contentService'

// CRUD de los testimonios. Tabla sugerida: "testimonios"
// (columnas: id, nombre, evento, texto, estrellas, foto_url, aprobado, created_at).
// La columna "aprobado" permite moderar las reseñas enviadas desde el
// formulario público antes de que aparezcan en el sitio.
export const testimoniosService = createContentService('testimonios')
