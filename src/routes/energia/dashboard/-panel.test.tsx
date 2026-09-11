import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { PanelPage } from '@/features/dashboard/pages/panel'

// Mock matchMedia for theme hook
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Track URL state for the test
let mockSearch: Record<string, string | undefined> = {
  sede: '67',
  panel: '34',
  vista: 'tablero',
  desde: '2026-05-25',
  hasta: '2026-05-25',
}

const mockNavigate = vi.fn((opts) => {
  if (opts.search) {
    mockSearch = { ...mockSearch, ...opts.search }
    Object.keys(mockSearch).forEach((key) => {
      if (mockSearch[key] === undefined) delete mockSearch[key]
    })
  }
})

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    createFileRoute: () => () => ({
      component: () => null,
    }),
    Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
    useNavigate: () => mockNavigate,
    useSearch: () => mockSearch,
    useRouter: () => ({
      navigate: mockNavigate,
      state: { location: { pathname: '/energia/dashboard/panel' } },
    }),
    useRouterState: () => ({
      location: { pathname: '/energia/dashboard/panel' },
    }),
  }
})

const panel34Data = {
  headquarter_id: 67,
  electrical_panel_id: 34,
  electrical_panel_name: 'TTA-TR1',
  main_consumption_kwh: 422.5,
  total_measurement_points: 2,
  date_range: { type: 'day', start_date: '2026-05-25', end_date: '2026-05-25' },
  results: [
    {
      measurement_point_id: 1,
      measurement_point_name: 'Red normal',
      device_name: 'Medidor 1',
      is_main: true,
      is_active: true,
      consumption_kwh: 422.5,
      consumption_percentage: 100.0,
      channel: null,
      type: 'main',
      capacity: null,
      hardware: null,
      first_reading_value: 1000,
      last_reading_value: 1422.5,
      first_reading_time: '2026-05-25T00:00:00Z',
      last_reading_time: '2026-05-25T23:59:59Z',
    },
    {
      measurement_point_id: 2,
      measurement_point_name: 'Red de emergencia',
      device_name: 'Medidor 2',
      is_main: false,
      is_active: true,
      consumption_kwh: 0,
      consumption_percentage: 0.0,
      channel: null,
      type: 'clamp',
      capacity: null,
      hardware: null,
      first_reading_value: 500,
      last_reading_value: 500,
      first_reading_time: '2026-05-25T00:00:00Z',
      last_reading_time: '2026-05-25T23:59:59Z',
    },
  ],
}

const panel39Data = {
  headquarter_id: 67,
  electrical_panel_id: 39,
  electrical_panel_name: 'TG-TR2 (TF-AA) - HVAC',
  main_consumption_kwh: 1250.75,
  total_measurement_points: 4,
  date_range: { type: 'day', start_date: '2026-05-25', end_date: '2026-05-25' },
  results: [
    {
      measurement_point_id: 10,
      measurement_point_name: 'Chiller 1',
      device_name: 'Pinza 01',
      is_main: false,
      is_active: true,
      consumption_kwh: 750.5,
      consumption_percentage: 60.0,
      channel: 'CH1',
      type: 'clamp',
      capacity: '100',
      hardware: 'v1.2',
      first_reading_value: 1000,
      last_reading_value: 1750.5,
      first_reading_time: '2026-05-25T00:00:00Z',
      last_reading_time: '2026-05-25T23:59:59Z',
    },
    {
      measurement_point_id: 11,
      measurement_point_name: 'Chiller 2',
      device_name: 'Pinza 02',
      is_main: false,
      is_active: true,
      consumption_kwh: 300.25,
      consumption_percentage: 24.0,
      channel: 'CH2',
      type: 'clamp',
      capacity: '100',
      hardware: 'v1.2',
      first_reading_value: 500,
      last_reading_value: 800.25,
      first_reading_time: '2026-05-25T00:00:00Z',
      last_reading_time: '2026-05-25T23:59:59Z',
    },
    {
      measurement_point_id: 12,
      measurement_point_name: 'TF-UMAS 1',
      device_name: 'Pinza 03',
      is_main: false,
      is_active: true,
      consumption_kwh: 200.0,
      consumption_percentage: 16.0,
      channel: 'CH3',
      type: 'clamp',
      capacity: '63',
      hardware: 'v1.2',
      first_reading_value: 300,
      last_reading_value: 500,
      first_reading_time: '2026-05-25T00:00:00Z',
      last_reading_time: '2026-05-25T23:59:59Z',
    },
    {
      measurement_point_id: 1,
      measurement_point_name: 'Panel Principal',
      device_name: 'Medidor General',
      is_main: true,
      is_active: true,
      consumption_kwh: 1250.75,
      consumption_percentage: 100.0,
      channel: null,
      type: 'main',
      capacity: null,
      hardware: null,
      first_reading_value: 5000,
      last_reading_value: 6250.75,
      first_reading_time: '2026-05-25T00:00:00Z',
      last_reading_time: '2026-05-25T23:59:59Z',
    },
  ],
}

vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { first_name: 'Test', last_name: 'User', email: 'test@zeia.com' },
    logout: vi.fn(),
    isAuthenticated: true,
  }),
}))

vi.mock('@/features/dashboard/api/headquarters', () => ({
  fetchHeadquarters: vi.fn().mockResolvedValue({
    count: 1,
    results: [
      {
        id: 67,
        name: 'Salaverry',
        is_active: true,
        electrical_panels: [
          { id: 39, name: 'TG-TR2 (TF-AA) - HVAC', is_active: true, type: 'trifasico', threads: 3 },
          { id: 34, name: 'TTA-TR1', is_active: true, type: 'trifasico', threads: 3 },
          { id: 35, name: 'Tableros TGE-TR1', is_active: true, type: 'trifasico', threads: 3 },
        ],
      },
    ],
  }),
}))

vi.mock('@/features/dashboard/api/consumption', () => ({
  fetchConsumptionDistribution: vi.fn((_sedeId, panelId) => {
    if (panelId === 39) return Promise.resolve(panel39Data)
    return Promise.resolve(panel34Data)
  }),
}))

vi.mock('@/features/dashboard/api/measurement-points', () => ({
  fetchMeasurementPoints: vi.fn().mockResolvedValue({ count: 0, results: [] }),
  fetchDeviceMeasurementPointsList: vi.fn().mockResolvedValue({ count: 0, next: null, previous: null, results: [] }),
}))

vi.mock('@/features/dashboard/api/panel-readings-graph', () => ({
  fetchPanelReadingsGraph: vi.fn().mockResolvedValue([]),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('PanelPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearch = {
      sede: '67',
      panel: '34',
      vista: 'tablero',
      desde: '2026-05-25',
      hasta: '2026-05-25',
    }
  })

  it('auto-selects first sede and panel on empty URL without collisions', async () => {
    mockSearch = {}

    const { unmount } = render(<PanelPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          search: expect.objectContaining({
            sede: '67',
            panel: '39',
          }),
        })
      )
    })

    // Panel readings filters must not collide and overwrite sede/panel.
    // (useDashboardFilters may fire from two component instances, but every
    // navigation must keep sede=67 and panel=39.)
    const navigationsWithMainFilters = mockNavigate.mock.calls.filter((call) => {
      const search = call[0].search
      return search?.sede === '67' && search?.panel === '39'
    })
    expect(navigationsWithMainFilters.length).toBe(mockNavigate.mock.calls.length)

    unmount()

    // Re-render with updated URL (+ vista explícita) to verify data loads with auto-selected filters
    mockSearch.vista = 'tablero'
    function createWrapperEmpty() {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: 0 },
        },
      })
      return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      }
    }

    render(<PanelPage />, { wrapper: createWrapperEmpty() })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /distribución de consumo — tg-tr2/i })).toBeInTheDocument()
    })
  })

  it('renders initial panel data correctly', async () => {
    render(<PanelPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /distribución de consumo — tta-tr1/i })).toBeInTheDocument()
    })

    // Main point should be visible in the list header
    const redNormalElements = screen.getAllByText('Red normal')
    expect(redNormalElements.length).toBeGreaterThanOrEqual(1)
  })

  it('navigates to new panel when selected from dropdown', async () => {
    const user = userEvent.setup()
    render(<PanelPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /distribución de consumo — tta-tr1/i })).toBeInTheDocument()
    })

    // Open main panel dropdown (second combobox)
    const dropdowns = screen.getAllByRole('combobox')
    const panelDropdown = dropdowns[1]
    await user.click(panelDropdown)

    // Select the other panel from the open dropdown options
    const newPanelOption = await screen.findByRole('option', { name: 'TG-TR2 (TF-AA) - HVAC' })
    await user.click(newPanelOption)

    // Verify navigation was called with new panel
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          search: expect.objectContaining({ panel: '39' }),
        })
      )
    })
  })

  it('muestra Todos los tableros por defecto cuando no hay vista en la URL', async () => {
    delete mockSearch.vista
    render(<PanelPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText(/Esta sede consume/)).toBeInTheDocument()
    })
  })

  it('displays new panel data after URL updates', async () => {
    // Initial render with panel 34
    const { unmount } = render(<PanelPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /distribución de consumo — tta-tr1/i })).toBeInTheDocument()
    })

    unmount()

    // Update URL to panel 39 and re-render with fresh query client
    mockSearch.panel = '39'
    
    function createWrapper39() {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: 0 },
        },
      })
      return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      }
    }

    render(<PanelPage />, { wrapper: createWrapper39() })

    // Verify new panel data is displayed
    await waitFor(() => {
      expect(screen.getAllByText('TG-TR2 (TF-AA) - HVAC').length).toBeGreaterThanOrEqual(1)
    })

    // Verify consumption distribution heading updated
    expect(screen.getByRole('heading', { name: /distribución de consumo — tg-tr2/i })).toBeInTheDocument()
    
    // Verify new measurement points are shown (appears in both KPI and list)
    const chillerElements = screen.getAllByText('Chiller 1')
    expect(chillerElements.length).toBeGreaterThanOrEqual(1)
  })
})
