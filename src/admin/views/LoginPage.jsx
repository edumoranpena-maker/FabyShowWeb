import { useState } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogIn, AlertCircle } from 'lucide-react'
import { useAuth } from '../../auth/useAuth'
import { isSupabaseConfigured } from '../../lib/supabaseClient'

export default function LoginPage() {
  const { signIn, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Si ya hay sesión activa, no tiene sentido mostrar el login.
  if (!authLoading && isAuthenticated) {
    const redirectTo = location.state?.from?.pathname ?? '/admin'
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate(location.state?.from?.pathname ?? '/admin', { replace: true })
    } catch (err) {
      setError(err.message ?? 'No se pudo iniciar sesión.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-5 py-12 mesh-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-8">
          <img src="/avatar-faby-show.png" alt="" className="w-14 h-14 rounded-full object-cover mb-4 shadow-glow" />
          <h1 className="font-display text-xl font-semibold text-white">Panel de administración</h1>
          <p className="font-body text-sm text-white/50 mt-1">Faby Show</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-4xl p-7 shadow-2xl flex flex-col gap-4">
          {!isSupabaseConfigured && (
            <div className="flex gap-2.5 bg-amarillo-50 border border-amarillo-200 rounded-xl p-3.5">
              <AlertCircle className="w-4 h-4 text-amarillo-600 flex-shrink-0 mt-0.5" />
              <p className="font-body text-xs text-amarillo-800 leading-relaxed">
                Supabase todavía no está conectado. Este formulario ya está listo — solo falta
                configurar las credenciales en <code className="font-mono">src/lib/supabaseClient.js</code>.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="font-body text-sm font-medium text-ink/70 mb-1.5 block">
              Correo
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-ink/10 px-4 py-3 font-body text-sm focus:border-fucsia-400 focus:ring-2 focus:ring-fucsia-100 outline-none transition-all"
              placeholder="admin@fabyshow.pe"
            />
          </div>

          <div>
            <label htmlFor="password" className="font-body text-sm font-medium text-ink/70 mb-1.5 block">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-ink/10 px-4 py-3 font-body text-sm focus:border-fucsia-400 focus:ring-2 focus:ring-fucsia-100 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="font-body text-xs text-fucsia-600 bg-fucsia-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 inline-flex items-center justify-center gap-2 bg-party-gradient text-white font-body font-semibold rounded-full px-6 py-3.5 shadow-soft hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:translate-y-0"
          >
            <LogIn className="w-4 h-4" />
            {submitting ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
