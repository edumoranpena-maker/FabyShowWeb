import { useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react'
import PageHeader from './PageHeader'
import Modal from './Modal'
import ConfirmDialog from './ConfirmDialog'
import FormField from './FormField'
import ImageUploadField from './ImageUploadField'
import { useCrud } from '../hooks/useCrud'

function emptyValuesFromFields(fields) {
  const values = {}
  fields.forEach((f) => {
    if (f.type === 'checkbox') values[f.key] = f.default ?? false
    else if (f.type === 'number') values[f.key] = f.default ?? 0
    else if (f.type === 'list') values[f.key] = f.default ?? []
    else values[f.key] = f.default ?? ''
  })
  return values
}

/**
 * Motor genérico de CRUD para una sección del CMS: lista + modal de
 * crear/editar (formulario armado desde "fields") + confirmación de
 * borrado. Cada vista de sección (HeroView, GaleriaView, etc.) es solo
 * su configuración de "fields" sobre este componente — igual que los
 * servicios son configuración sobre createContentService().
 *
 * Props:
 *  - service: objeto con getAll/create/update/remove (cualquier servicio
 *    de src/services/)
 *  - fields: [{ key, label, type, options?, uploadFn?, accept?, default?,
 *    required?, min?, max? }]
 *  - getTitle(item) / getSubtitle(item): qué mostrar en cada fila
 *  - renderBadges(item): JSX opcional de badges de estado (ej. "Oculto")
 *  - sortItems(items): orden opcional antes de renderizar la lista
 *  - extraActions(item, { reload }): botón(es) extra antes de editar/eliminar
 */
export default function SectionCrudView({
  title,
  description,
  service,
  fields,
  getTitle,
  getSubtitle,
  renderBadges,
  sortItems,
  extraActions,
  newLabel = 'Nuevo',
}) {
  const { items, loading, error, reload } = useCrud(service)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formValues, setFormValues] = useState({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const openCreate = () => {
    setEditingItem(null)
    setFormValues(emptyValuesFromFields(fields))
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setFormValues({ ...item })
    setFormError('')
    setModalOpen(true)
  }

  const handleFieldChange = (key, value) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }

  const buildPayload = () => {
    const payload = {}
    fields.forEach((f) => {
      payload[f.key] = formValues[f.key]
    })
    return payload
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const payload = buildPayload()
      if (editingItem) {
        await service.update(editingItem.id, payload)
      } else {
        await service.create(payload)
      }
      setModalOpen(false)
      await reload()
    } catch (err) {
      setFormError(err.message ?? 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await service.remove(deleteTarget.id)
      setDeleteTarget(null)
      await reload()
    } catch (err) {
      setFormError(err.message ?? 'No se pudo eliminar.')
    } finally {
      setDeleting(false)
    }
  }

  const displayItems = sortItems ? sortItems(items) : items

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-party-gradient text-white font-body text-sm font-semibold rounded-full px-5 py-2.5 shadow-soft hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            {newLabel}
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2.5 bg-fucsia-50 border border-fucsia-100 rounded-xl px-4 py-3 mb-6">
          <AlertCircle className="w-4 h-4 text-fucsia-600 flex-shrink-0" />
          <p className="font-body text-sm text-fucsia-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-ink/40">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : displayItems.length === 0 ? (
        <div className="bg-white rounded-3xl border border-ink/8 p-12 text-center">
          <p className="font-body text-sm text-ink/50">
            Todavía no hay elementos. Crea el primero con el botón de arriba.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {displayItems.map((item) => {
            const thumb = item.image_url || item.src || item.foto_url || item.imagen_url
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-ink/8 shadow-card px-5 py-4 flex items-center gap-4"
              >
                {thumb && (
                  <img src={thumb} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-body font-medium text-ink truncate">{getTitle(item)}</p>
                  {getSubtitle && getSubtitle(item) && (
                    <p className="font-body text-xs text-ink/45 truncate mt-0.5">{getSubtitle(item)}</p>
                  )}
                </div>

                {renderBadges && <div className="flex items-center gap-2 flex-shrink-0">{renderBadges(item)}</div>}

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {extraActions && extraActions(item, { reload })}
                  <button
                    aria-label="Editar"
                    onClick={() => openEdit(item)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-ink/50 hover:bg-morado-50 hover:text-morado-600 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    aria-label="Eliminar"
                    onClick={() => setDeleteTarget(item)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-ink/50 hover:bg-fucsia-50 hover:text-fucsia-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? 'Editar' : newLabel}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {fields.map((field) =>
            field.type === 'image' ? (
              <ImageUploadField
                key={field.key}
                label={field.label}
                value={formValues[field.key]}
                onChange={(url) => handleFieldChange(field.key, url)}
                uploadFn={field.uploadFn}
                accept={field.accept}
              />
            ) : (
              <FormField key={field.key} field={field} value={formValues[field.key]} onChange={handleFieldChange} />
            )
          )}

          {formError && (
            <p className="font-body text-xs text-fucsia-600 bg-fucsia-50 rounded-lg px-3 py-2">{formError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 rounded-full font-body text-sm font-medium text-ink/60 hover:bg-ink/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-full font-body text-sm font-semibold text-white bg-party-gradient hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:translate-y-0"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="¿Eliminar este elemento?"
        description="Esta acción no se puede deshacer."
      />
    </>
  )
}
