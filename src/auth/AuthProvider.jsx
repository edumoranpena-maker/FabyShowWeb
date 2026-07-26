import { useCallback, useEffect, useState } from 'react'
import { AuthContext } from './AuthContext'
import * as authService from './authService'

/**
 * Fuente única de verdad del estado de autenticación para todo /admin.
 * Resuelve la sesión inicial al montar, se suscribe a cambios futuros
 * (login/logout/refresh de token) y expone signIn/signOut. Todo pasa
 * por src/auth/authService.js — este componente no sabe nada de Supabase.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    authService
      .getSession()
      .then((s) => {
        if (mounted) setSession(s)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    const unsubscribe = authService.onAuthStateChange((s) => {
      if (mounted) setSession(s)
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email, password) => {
    const s = await authService.signInWithPassword(email, password)
    setSession(s)
    return s
  }, [])

  const signOut = useCallback(async () => {
    await authService.signOut()
    setSession(null)
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    isAuthenticated: Boolean(session),
    loading,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
