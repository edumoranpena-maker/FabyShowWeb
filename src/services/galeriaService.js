import { createContentService, uploadContentFile, removeContentFile } from './contentService'

const TABLE = 'faby_galeria_items'
const BUCKET = 'faby_galeria'

const base = createContentService(TABLE)

export const galeriaService = {
  ...base,

  /** Sube una foto o video nuevo al bucket de la Galería. */
  async uploadMedia(file) {
    const path = `${Date.now()}-${file.name}`
    return uploadContentFile(BUCKET, path, file)
  },

  async removeMedia(path) {
    return removeContentFile(BUCKET, path)
  },
}
