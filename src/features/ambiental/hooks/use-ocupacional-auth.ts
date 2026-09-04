import { useCallback, useState } from 'react'
import type { OcupacionalAuthResponse } from '@/features/auth/types'
import { clearSessionCache } from '@/lib/query-client'

const AUTH_STORAGE_KEY = 'zeia-ocupacional-auth'

export interface OcupacionalAuthState {
  token: string
  user: Omit<OcupacionalAuthResponse, 'token'>
}

function getStoredAuth(): OcupacionalAuthState | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as OcupacionalAuthState
  } catch {
    return null
  }
}

export function useOcupacionalAuth() {
  const [auth, setAuthState] = useState<OcupacionalAuthState | null>(getStoredAuth)

  const setAuth = useCallback((data: OcupacionalAuthResponse) => {
    // Evita que el siguiente usuario vea salas/sedes alertas de la sesión anterior.
    clearSessionCache()
    const { token, ...user } = data
    const state: OcupacionalAuthState = { token, user }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state))
    setAuthState(state)
  }, [])

  const logout = useCallback(() => {
    clearSessionCache()
    localStorage.removeItem(AUTH_STORAGE_KEY)
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
