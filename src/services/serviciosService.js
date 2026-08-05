import { createContentService, uploadContentFile } from './contentService'

const TABLE = 'faby_servicios'
const BUCKET = 'faby_servicios'

const base = createContentService(TABLE)

export const serviciosService = {
  ...base,

  /** Sube la foto de una tarjeta de servicio y devuelve su URL pública. */
  async uploadImage(file) {
    const path = `${Date.now()}-${file.name}`
    return uploadContentFile(BUCKET, path, file)
  },
}
