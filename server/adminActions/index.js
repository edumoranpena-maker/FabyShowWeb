// ============================================================================
// AdminActions — punto de entrada único.
//
// Futuro: Telegram → Agente → import { listHeroSlides, ... } from
// 'server/adminActions' → servicios (src/services) → Supabase (service_role).
//
// Nada en el proyecto invoca todavía este módulo — es infraestructura de
// Fase 1. Ver server/README.md para el detalle completo.
// ============================================================================

export * from './heroActions.js'
export * from './galeriaActions.js'
export * from './serviciosActions.js'
export * from './paquetesActions.js'
export * from './testimoniosActions.js'
export * from './faqActions.js'
export * from './contactoActions.js'
