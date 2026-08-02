import { createContentService } from './contentService'

// Las tarjetas de Servicios usan nombres de icono de lucide-react (texto),
// no imágenes subidas — no necesita bucket de Storage.
export const serviciosService = createContentService('faby_servicios')
