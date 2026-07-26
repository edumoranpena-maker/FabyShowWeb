import { useContext } from 'react'
import { AuthContext } from './AuthContext'

/**
 * Hook para consumir el estado de autenticación desde cualquier
 * componente dentro de <AuthProvider>. Lanza un error explícito si se
 * usa afuera, en vez de fallar en silencio con undefined.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return context
}
