import { createContentService, uploadContentFile, removeContentFile } from './contentService'

const TABLE = 'faby_hero_slides'
const BUCKET = 'faby_hero'

const base = createContentService(TABLE)

export const heroService = {
  ...base,

  /** Sube una foto nueva al bucket del Hero y devuelve su URL pública. */
  async uploadImage(file) {
    const path = `${Date.now()}-${file.name}`
    return uploadContentFile(BUCKET, path, file)
  },

  /** Elimina una foto del bucket (no borra el registro de la tabla). */
  async removeImage(path) {
    return removeContentFile(BUCKET, path)
  },
}
