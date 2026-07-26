import { createContentService } from './contentService'

// CRUD de las tarjetas de Servicios. Tabla sugerida: "servicios"
// (columnas: id, icon, title, desc, orden, created_at).
export const serviciosService = createContentService('servicios')
