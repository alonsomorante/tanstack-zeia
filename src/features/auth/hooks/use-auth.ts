import { useCallback, useState } from 'react'
import type { AuthResponse, User } from '@/features/auth/types'
import { clearSessionCache } from '@/lib/query-client'

const AUTH_STORAGE_KEY = 'zeia-auth'
const RESOURCE_STORAGE_KEY = 'zeia-resource'

interface AuthState {
  token: string
  user: User
}

function getStoredAuth(): AuthState | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as AuthState
  } catch {
    return null
  }
}

export function useAuth() {
  const [auth, setAuthState] = useState<AuthState | null>(getStoredAuth)

  const setAuth = useCallback((data: AuthResponse) => {
    // Limpia el caché ANTES de guardar la nueva sesión: las queryKeys no
    // incluyen al usuario, así los datos del usuario anterior quedarían
    // "pegados" (sedes, paneles, puntos) hasta que expire el staleTime.
    clearSessionCache()
    // El recurso activo (energy/water) puede no existir para el nuevo usuario.
    localStorage.removeItem(RESOURCE_STORAGE_KEY)
    const state: AuthState = {
      token: data.token,
      user: data.user,
    }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state))
    setAuthState(state)
  }, [])

  const logout = useCallback(() => {
    clearSessionCache()
    localStorage.removeItem(AUTH_STORAGE_KEY)
    localStorage.removeItem(RESOURCE_STORAGE_KEY)
    setAuthState(null)
  }, [])

  return {
    token: auth?.token ?? null,
    user: auth?.user ?? null,
    isAuthenticated: !!auth?.token,
    setAuth,
    logout,
  }
}
