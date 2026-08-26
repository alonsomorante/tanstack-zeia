import { describe, it, expect } from 'vitest'
import {
  normalizeModuleUrl,
  getResourceModuleUrls,
  getFirstResourceModuleUrl,
} from './modules'
import type { User } from '@/features/auth/types'

function mockUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'demo@zeia.com.pe',
    first_name: 'Zeia',
    last_name: 'Demo',
    companies: [],
    is_user_energy_monitoring: true,
    is_user_water_monitoring: true,
    energy_modules: [],
    water_modules: [],
    is_user_quality_air_auto: false,
    is_user_thermal_comfort: false,
    ...overrides,
  }
}

describe('normalizeModuleUrl', () => {
  it('adds a leading slash to relative urls', () => {
    expect(normalizeModuleUrl('energia/water/dashboard/panel')).toBe(
      '/energia/water/dashboard/panel'
    )
  })

  it('keeps absolute urls untouched', () => {
    expect(normalizeModuleUrl('/energia/dashboard/panel')).toBe('/energia/dashboard/panel')
  })

  it('returns null for empty, whitespace or missing urls', () => {
    expect(normalizeModuleUrl(null)).toBeNull()
    expect(normalizeModuleUrl(undefined)).toBeNull()
    expect(normalizeModuleUrl('')).toBeNull()
    expect(normalizeModuleUrl('   ')).toBeNull()
  })
})

describe('getResourceModuleUrls', () => {
  it('returns normalized urls of modules and children for water', () => {
    const user = mockUser({
      water_modules: [
        {
          name: 'Gestión de Agua',
          url: null,
          icon: '',
          monitoring_type: 'water',
          is_active: true,
          children: [{ name: 'Panel Dashboard', url: 'energia/water/dashboard/panel', icon: '' }],
        },
      ],
    })

    expect(getResourceModuleUrls(user, 'water')).toEqual(['/energia/water/dashboard/panel'])
  })

  it('returns normalized urls for energy modules with direct urls', () => {
    const user = mockUser({
      energy_modules: [
        {
          name: 'Panel Dashboard',
          url: '/energia/dashboard/panel',
          icon: '',
          is_active: true,
          children: [],
        },
      ],
    })

    expect(getResourceModuleUrls(user, 'energy')).toEqual(['/energia/dashboard/panel'])
  })

  it('returns an empty array when user is null', () => {
    expect(getResourceModuleUrls(null, 'energy')).toEqual([])
  })
})

describe('getFirstResourceModuleUrl', () => {
  it('prioritizes the first child url of the first module', () => {
    const user = mockUser({
      water_modules: [
        {
          name: 'Gestión de Agua',
          url: 'energia/water/dashboard',
          icon: '',
          monitoring_type: 'water',
          is_active: true,
          children: [{ name: 'Panel Dashboard', url: 'energia/water/dashboard/panel', icon: '' }],
        },
      ],
    })

    expect(getFirstResourceModuleUrl(user, 'water')).toBe('/energia/water/dashboard/panel')
  })

  it('falls back to the module url when there are no children', () => {
    const user = mockUser({
      energy_modules: [
        {
          name: 'Panel Dashboard',
          url: '/energia/dashboard/panel',
          icon: '',
          is_active: true,
          children: [],
        },
      ],
    })

    expect(getFirstResourceModuleUrl(user, 'energy')).toBe('/energia/dashboard/panel')
  })

  it('returns null when user is null or resource has no modules', () => {
    expect(getFirstResourceModuleUrl(null, 'water')).toBeNull()
    expect(getFirstResourceModuleUrl(mockUser(), 'water')).toBeNull()
  })
})
