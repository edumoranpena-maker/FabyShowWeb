import { createContentService } from './contentService'

// CRUD de las preguntas frecuentes. Tabla sugerida: "faqs"
// (columnas: id, pregunta, respuesta, orden, created_at).
export const faqService = createContentService('faqs')
