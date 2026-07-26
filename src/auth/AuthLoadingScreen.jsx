import { PartyPopper } from 'lucide-react'

// Pantalla de carga breve mientras se resuelve la sesión inicial
// (ProtectedRoute la muestra en vez de parpadear entre "no autenticado"
// y "autenticado" mientras Supabase responde).
export default function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-party-gradient flex items-center justify-center animate-pulse">
        <PartyPopper className="w-6 h-6 text-white" />
      </div>
      <p className="font-body text-sm text-white/60">Cargando…</p>
    </div>
  )
}
