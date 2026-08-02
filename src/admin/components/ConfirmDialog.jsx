import Modal from './Modal'

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = '¿Eliminar este elemento?',
  description = 'Esta acción no se puede deshacer.',
  confirmLabel = 'Eliminar',
  loading,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-sm">
      <p className="font-body text-sm text-ink/60 mb-6">{description}</p>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 rounded-full font-body text-sm font-medium text-ink/60 hover:bg-ink/5 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="px-5 py-2.5 rounded-full font-body text-sm font-semibold text-white bg-fucsia-500 hover:bg-fucsia-600 transition-colors disabled:opacity-60"
        >
          {loading ? 'Eliminando…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
