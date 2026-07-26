// Encabezado estándar para cada vista del admin: título + descripción
// opcional + slot de acciones (botones) a la derecha. Todas las vistas
// de sección lo usan para que el panel se sienta consistente.
export default function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-ink">{title}</h1>
        {description && <p className="font-body text-sm text-ink/55 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}
