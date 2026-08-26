import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockIdentify = vi.fn()
const mockCapture = vi.fn()
const mockReset = vi.fn()

vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(() => ({
      identify: mockIdentify,
      capture: mockCapture,
      reset: mockReset,
    })),
  },
}))

async function importAnalytics() {
  vi.resetModules()
  return import('./analytics')
}

describe('analytics', () => {
  const originalLocation = window.location

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { hostname: 'app.zeia.com.pe' },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    })
  })

  it('does not initialize PostHog on localhost', async () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { hostname: 'localhost' },
    })

    const { analytics } = await importAnalytics()
    expect(analytics).toBeNull()
  })

  it('infers module from pathname', async () => {
    const { inferModule } = await importAnalytics()
    expect(inferModule('/energia/login')).toBe('energy')
    expect(inferModule('/ambiental/login')).toBe('ambiental')
    expect(inferModule('/')).toBe('landing')
    expect(inferModule('/profile')).toBe('landing')
  })

  it('identifies energy users by email with person properties', async () => {
    const { identifyEnergyUser } = await importAnalytics()

    identifyEnergyUser({
      id: 1,
      email: 'user@zeia.com',
      first_name: 'John',
      last_name: 'Doe',
      companies: [{ id: 10, name: 'Zeia', role: 'admin' }],
      is_user_energy_monitoring: true,
      is_user_water_monitoring: false,
      energy_modules: [],
      water_modules: [],
      is_user_quality_air_auto: false,
      is_user_thermal_comfort: false,
    })

    expect(mockIdentify).toHaveBeenCalledWith('user@zeia.com', {
      email: 'user@zeia.com',
      first_name: 'John',
      last_name: 'Doe',
      company_id: 10,
      company_name: 'Zeia',
      module: 'energy',
      environment: 'test',
    })
  })

  it('identifies ambiental users by email with person properties', async () => {
    const { identifyAmbientalUser } = await importAnalytics()

    identifyAmbientalUser({
      token: 'abc',
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@zeia.com',
      created_at: '2024-01-01',
      registered_days: 100,
      user_id: 42,
    })

    expect(mockIdentify).toHaveBeenCalledWith('jane@zeia.com', {
      email: 'jane@zeia.com',
      first_name: 'Jane',
      last_name: 'Doe',
      user_id: 42,
      module: 'ambiental',
      environment: 'test',
    })
  })

  it('captures logout and resets analytics for energy', async () => {
    const { resetEnergyAnalytics } = await importAnalytics()
    resetEnergyAnalytics()

    expect(mockCapture).toHaveBeenCalledWith('user logged out', {
      module: 'energy',
    })
    expect(mockReset).toHaveBeenCalled()
  })

  it('captures logout and resets analytics for ambiental', async () => {
    const { resetAmbientalAnalytics } = await importAnalytics()
    resetAmbientalAnalytics()

    expect(mockCapture).toHaveBeenCalledWith('user logged out', {
      module: 'ambiental',
    })
    expect(mockReset).toHaveBeenCalled()
  })
})
