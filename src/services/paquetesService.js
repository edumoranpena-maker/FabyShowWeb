import { createContentService } from './contentService'

// Los planes no tienen imágenes propias — no necesita bucket de Storage.
export const paquetesService = createContentService('faby_paquetes')
