import { createContentService } from './contentService'

// La informacion de Contacto es un registro único (no una lista), pero
// reutiliza el mismo patrón CRUD: getById('main') / update('main', {...}).
// Tabla sugerida: "contacto_info" (columnas: id, direccion, horario,
// instagram, tiktok, whatsapp_number, created_at).
export const contactoService = createContentService('contacto_info')
