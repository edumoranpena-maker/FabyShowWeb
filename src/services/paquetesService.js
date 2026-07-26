import { createContentService } from './contentService'

// CRUD de los planes/paquetes. Tabla sugerida: "paquetes"
// (columnas: id, nombre, duracion, precio, destacado, incluye [jsonb], created_at).
export const paquetesService = createContentService('paquetes')
