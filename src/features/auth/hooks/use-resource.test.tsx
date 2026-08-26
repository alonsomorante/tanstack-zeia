import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useResource, getEnabledResources } from './use-resource'
import type { User } from '@/features/auth/types'

function mockUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'demo@zeia.com.pe',
    first_name: 'Zeia',
    last_name: 'Demo',
    companies: [],
    is_user_energy_monitoring: false,
    is_user_water_monitoring: false,
    energy_modules: [],
    water_modules: [],
    is_user_quality_air_auto: false,
    is_user_thermal_comfort: false,
    ...overrides,
  }
}

function setStoredUser(user: User) {
  localStorage.setItem('zeia-auth', JSON.stringify({ token: 'abc123', user }))
}

describe('getEnabledResources', () => {
  it('returns empty array when user is null', () => {
    expect(getEnabledResources(null)).toEqual([])
  })

  it('returns only enabled resources from user flags', () => {
    const user = mockUser({
      is_user_energy_monitoring: true,
      is_user_water_monitoring: true,
    })
    expect(getEnabledResources(user)).toEqual(['energy', 'water'])
  })

  it('returns empty when no resource flag is enabled', () => {
    expect(getEnabledResources(mockUser())).toEqual([])
  })
})

describe('useResource', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to energy when only energy is enabled', () => {
    setStoredUser(mockUser({ is_user_energy_monitoring: true }))
    const { result } = renderHook(() => useResource())

    expect(result.current.resource).toBe('energy')
    expect(result.current.canSwitch).toBe(false)
  })

  it('defaults to water when only water is enabled', () => {
    setStoredUser(mockUser({ is_user_water_monitoring: true }))
    const { result } = renderHook(() => useResource())

    expect(result.current.resource).toBe('water')
    expect(result.current.canSwitch).toBe(false)
  })

  it('enables the switcher when both resources are enabled', () => {
    setStoredUser(
      mockUser({ is_user_energy_monitoring: true, is_user_water_monitoring: true })
    )
    const { result } = renderHook(() => useResource())

    expect(result.current.canSwitch).toBe(true)
    expect(result.current.resource).toBe('energy')
  })

  it('reads the persisted selection from localStorage', () => {
    setStoredUser(
      mockUser({ is_user_energy_monitoring: true, is_user_water_monitoring: true })
    )
    localStorage.setItem('zeia-resource', 'water')
    const { result } = renderHook(() => useResource())

    expect(result.current.resource).toBe('water')
  })

  it('falls back to the default when the persisted selection is not enabled', () => {
    setStoredUser(mockUser({ is_user_energy_monitoring: true }))
    localStorage.setItem('zeia-resource', 'water')
    const { result } = renderHook(() => useResource())

    expect(result.current.resource).toBe('energy')
  })

  it('switches the resource and persists the selection', () => {
    setStoredUser(
      mockUser({ is_user_energy_monitoring: true, is_user_water_monitoring: true })
    )
    const { result } = renderHook(() => useResource())

    act(() => {
      result.current.setResource('water')
    })

    expect(result.current.resource).toBe('water')
    expect(localStorage.getItem('zeia-resource')).toBe('water')
  })

  it('ignores switching to a disabled resource', () => {
    setStoredUser(mockUser({ is_user_water_monitoring: true }))
    const { result } = renderHook(() => useResource())

    act(() => {
      result.current.setResource('energy')
    })

    expect(result.current.resource).toBe('water')
    expect(localStorage.getItem('zeia-resource')).toBeNull()
  })
})
