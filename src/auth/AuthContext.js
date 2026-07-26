import { createContext } from 'react'

// Forma del valor que expone el contexto de autenticación. Se documenta
// aquí (en vez de solo en AuthProvider) para que cualquier componente que
// consuma useAuth() sepa exactamente con qué está trabajando:
//
// {
//   session: object | null        // sesión cruda de Supabase (o null)
//   user: object | null           // session?.user, por comodidad
//   isAuthenticated: boolean
//   loading: boolean              // true mientras se resuelve la sesión inicial
//   signIn: (email, password) => Promise<Session>
//   signOut: () => Promise<void>
// }
export const AuthContext = createContext(undefined)
