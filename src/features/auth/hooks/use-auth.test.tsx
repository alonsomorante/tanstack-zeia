import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from './use-auth'

const AUTH_STORAGE_KEY = 'zeia-auth'

function Wrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should return null token and user when not authenticated', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper })

    expect(result.current.token).toBeNull()
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should read existing auth from localStorage on mount', () => {
    const mockAuth = {
      token: 'test-token-123',
      user: {
        id: 1,
        email: 'test@zeia.com.pe',
        first_name: 'Test',
        last_name: 'User',
        companies: [],
        is_user_energy_monitoring: true,
        is_user_water_monitoring: false,
        energy_modules: [],
        water_modules: [],
        is_user_quality_air_auto: false,
        is_user_thermal_comfort: false,
      },
    }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockAuth))

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper })

    expect(result.current.token).toBe('test-token-123')
    expect(result.current.user?.email).toBe('test@zeia.com.pe')
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('should handle corrupted localStorage gracefully', () => {
    localStorage.setItem(AUTH_STORAGE_KEY, 'not-valid-json{')

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper })

    expect(result.current.token).toBeNull()
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should set auth and persist to localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper })

    const authData = {
      token: 'new-token',
      user: {
        id: 2,
        email: 'new@zeia.com.pe',
        first_name: 'New',
        last_name: 'User',
        companies: [],
        is_user_energy_monitoring: true,
        is_user_water_monitoring: false,
        energy_modules: [],
        water_modules: [],
        is_user_quality_air_auto: false,
        is_user_thermal_comfort: false,
      },
    }

    act(() => {
      result.current.setAuth(authData)
    })

    expect(result.current.token).toBe('new-token')
    expect(result.current.isAuthenticated).toBe(true)

    const stored = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}')
    expect(stored.token).toBe('new-token')
    expect(stored.user.email).toBe('new@zeia.com.pe')
  })

  it('should logout and clear localStorage', () => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: 'abc', user: { id: 1 } })
    )

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper })

    act(() => {
      result.current.logout()
    })

    expect(result.current.token).toBeNull()
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })
})
