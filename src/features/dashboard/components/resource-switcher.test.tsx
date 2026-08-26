import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResourceSwitcher } from './resource-switcher'
import type { User } from '@/features/auth/types'

const { mockRouter } = vi.hoisted(() => ({
  mockRouter: {
    navigate: vi.fn(),
    pathname: '/energia/dashboard/panel',
  },
}))

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate: mockRouter.navigate }),
  useRouterState: () => ({ location: { pathname: mockRouter.pathname } }),
}))

function mockUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'demo@zeia.com.pe',
    first_name: 'Zeia',
    last_name: 'Demo',
    companies: [],
    is_user_energy_monitoring: true,
    is_user_water_monitoring: true,
    energy_modules: [
      {
        name: 'GESTIÓN ENERGÉTICA',
        url: null,
        icon: '',
        is_active: true,
        children: [
          { name: 'Panel Dashboard', url: '/energia/dashboard/panel', icon: '' },
        ],
      },
    ],
    water_modules: [
      {
        name: 'Gestión de Agua',
        url: null,
        icon: '',
        monitoring_type: 'water',
        is_active: true,
        children: [
          { name: 'Panel Dashboard', url: 'energia/water/dashboard/panel', icon: '' },
        ],
      },
    ],
    is_user_quality_air_auto: false,
    is_user_thermal_comfort: false,
    ...overrides,
  }
}

describe('ResourceSwitcher', () => {
  beforeEach(() => {
    localStorage.clear()
    mockRouter.navigate.mockClear()
    mockRouter.pathname = '/energia/dashboard/panel'
  })

  it('renders both options when both resources are enabled', () => {
    localStorage.setItem('zeia-auth', JSON.stringify({ token: 'abc', user: mockUser() }))
    render(<ResourceSwitcher />)

    expect(screen.getByRole('button', { name: /energía/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /agua/i })).toBeInTheDocument()
  })

  it('navigates to the first water module when switching from an energy page', async () => {
    localStorage.setItem('zeia-auth', JSON.stringify({ token: 'abc', user: mockUser() }))
    const user = userEvent.setup()
    render(<ResourceSwitcher />)

    await user.click(screen.getByRole('button', { name: /agua/i }))

    await waitFor(() => {
      expect(mockRouter.navigate).toHaveBeenCalledWith({ to: '/energia/water/dashboard/panel' })
    })
  })

  it('keeps the current page when the path exists in the target resource too', async () => {
    const sharedUser = mockUser({
      water_modules: [
        {
          name: 'Gestión de Agua',
          url: null,
          icon: '',
          monitoring_type: 'water',
          is_active: true,
          children: [
            { name: 'Panel Dashboard', url: '/energia/dashboard/panel', icon: '' },
          ],
        },
      ],
    })
    localStorage.setItem('zeia-auth', JSON.stringify({ token: 'abc', user: sharedUser }))
    const user = userEvent.setup()
    render(<ResourceSwitcher />)

    await user.click(screen.getByRole('button', { name: /agua/i }))

    await waitFor(() => {
      expect(localStorage.getItem('zeia-resource')).toBe('water')
    })
    expect(mockRouter.navigate).not.toHaveBeenCalled()
  })

  it('navigates back to the first energy module when switching from a water page', async () => {
    localStorage.setItem('zeia-auth', JSON.stringify({ token: 'abc', user: mockUser() }))
    localStorage.setItem('zeia-resource', 'water')
    mockRouter.pathname = '/energia/water/dashboard/panel'

    const user = userEvent.setup()
    render(<ResourceSwitcher />)

    await user.click(screen.getByRole('button', { name: /energía/i }))

    await waitFor(() => {
      expect(mockRouter.navigate).toHaveBeenCalledWith({ to: '/energia/dashboard/panel' })
    })
  })

  it('renders nothing when only one resource is enabled', () => {
    localStorage.setItem(
      'zeia-auth',
      JSON.stringify({ token: 'abc', user: mockUser({ is_user_water_monitoring: false }) })
    )
    const { container } = render(<ResourceSwitcher />)

    expect(container).toBeEmptyDOMElement()
  })
})
