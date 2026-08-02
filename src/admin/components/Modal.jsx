import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full ${maxWidth} bg-white rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto`}
          >
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-ink/8 rounded-t-3xl">
              <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
              <button
                aria-label="Cerrar"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-ink/5 flex items-center justify-center text-ink/60 hover:bg-ink/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
