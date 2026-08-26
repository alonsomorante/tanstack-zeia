import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useWaterHomeFilters } from './use-water-home-filters'
import { formatDateISO } from '@/lib/date-utils'

const { navigateMock, searchState } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  searchState: {} as Record<string, string | undefined>,
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
  useSearch: () => searchState,
}))

vi.mock('../api/water-headquarters', () => ({
  fetchWaterHeadquarters: vi.fn().mockResolvedValue({
    count: 1,
    results: [
      {
        id: 199,
        name: 'Sede Principal San Isidro',
        is_active: true,
        water_pipes: [{ id: 1, name: 'Tubería Matriz Edificio A', is_active: true, is_main: true }],
      },
    ],
  }),
}))

vi.mock('../api/water-measurement-points', () => ({
  fetchWaterMeasurementPoints: vi.fn().mockResolvedValue({
    count: 2,
    next: null,
    previous: null,
    results: [
      { id: 1, name: 'Ingreso General de Red', is_active: true, is_main: true, water_pipe: 'Tubería Matriz Edificio A' },
      { id: 2, name: 'Medidor Comedor', is_active: true, is_main: false, water_pipe: 'Tubería Matriz Edificio A' },
    ],
  }),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useWaterHomeFilters', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    for (const key of Object.keys(searchState)) {
      delete searchState[key]
    }
  })

  it('auto-selects first sede, pipe, point and today dates on mount', async () => {
    renderHook(() => useWaterHomeFilters(), { wrapper: createWrapper() })

    const todayISO = formatDateISO(new Date())

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          search: {
            sede: '199',
            tuberia: '1',
            punto: undefined,
            indicador: 'consumo_total_litros',
            agrupacion: 'day',
            desde: todayISO,
            hasta: todayISO,
            pagina: '1',
          },
        })
      )
    })
  })

  it('derives the default measurement point once points load', async () => {
    searchState.sede = '199'
    searchState.tuberia = '1'
    searchState.desde = '2026-08-01'
    searchState.hasta = '2026-08-25'

    const { result } = renderHook(() => useWaterHomeFilters(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.puntoId).toBe(1)
    })

    expect(result.current.isReady).toBe(true)
  })

  it('is ready with explicit URL params and defaults indicator/agrupacion', async () => {
    searchState.sede = '199'
    searchState.tuberia = '1'
    searchState.punto = '2'
    searchState.desde = '2026-08-01'
    searchState.hasta = '2026-08-25'

    const { result } = renderHook(() => useWaterHomeFilters(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    expect(result.current.puntoId).toBe(2)
    expect(result.current.indicador).toBe('consumo_total_litros')
    expect(result.current.agrupacion).toBe('day')
    expect(result.current.pagina).toBe(1)
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
