// Campo de formulario genérico: el "type" del field decide qué input
// renderizar. Lo usan SectionCrudView y las vistas custom (ContactoView).
// type: 'text' | 'textarea' | 'number' | 'checkbox' | 'select' | 'list'
// ('list' = textarea de un ítem por línea, se guarda como array — lo usa
// "incluye" en Paquetes).
export default function FormField({ field, value, onChange }) {
  const { key, label, type = 'text', options, placeholder, required, min, max } = field

  const commonClasses =
    'w-full rounded-xl border border-ink/10 px-4 py-2.5 font-body text-sm focus:border-fucsia-400 focus:ring-2 focus:ring-fucsia-100 outline-none transition-all'

  if (type === 'checkbox') {
    return (
      <label className="flex items-center gap-2.5 py-1 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(key, e.target.checked)}
          className="w-4 h-4 rounded border-ink/20 text-fucsia-500 focus:ring-fucsia-300"
        />
        <span className="font-body text-sm text-ink/70">{label}</span>
      </label>
    )
  }

  return (
    <div>
      <label htmlFor={key} className="font-body text-sm font-medium text-ink/70 mb-1.5 block">
        {label}
        {required && <span className="text-fucsia-500"> *</span>}
      </label>

      {type === 'textarea' && (
        <textarea
          id={key}
          rows={3}
          required={required}
          value={value ?? ''}
          onChange={(e) => onChange(key, e.target.value)}
          placeholder={placeholder}
          className={`${commonClasses} resize-none`}
        />
      )}

      {type === 'list' && (
        <textarea
          id={key}
          rows={4}
          value={Array.isArray(value) ? value.join('\n') : value ?? ''}
          onChange={(e) => onChange(key, e.target.value.split('\n').filter(Boolean))}
          placeholder={placeholder ?? 'Un ítem por línea'}
          className={`${commonClasses} resize-none`}
        />
      )}

      {type === 'select' && (
        <select
          id={key}
          value={value ?? ''}
          onChange={(e) => onChange(key, e.target.value)}
          className={commonClasses}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {type === 'number' && (
        <input
          id={key}
          type="number"
          required={required}
          min={min}
          max={max}
          value={value ?? 0}
          onChange={(e) => onChange(key, Number(e.target.value))}
          className={commonClasses}
        />
      )}

      {type === 'text' && (
        <input
          id={key}
          type="text"
          required={required}
          value={value ?? ''}
          onChange={(e) => onChange(key, e.target.value)}
          placeholder={placeholder}
          className={commonClasses}
        />
      )}
    </div>
  )
}
