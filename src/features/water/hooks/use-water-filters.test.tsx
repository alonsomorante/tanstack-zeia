import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useWaterFilters } from './use-water-filters'
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
        water_pipes: [
          { id: 1, name: 'Tubería Matriz Edificio A', is_active: true, is_main: true },
          { id: 2, name: 'Tubería Baños', is_active: false, is_main: false },
        ],
      },
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

describe('useWaterFilters', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    for (const key of Object.keys(searchState)) {
      delete searchState[key]
    }
  })

  it('auto-selects first active sede and pipe with today dates on mount', async () => {
    renderHook(() => useWaterFilters(), { wrapper: createWrapper() })

    const todayISO = formatDateISO(new Date())

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          search: {
            sede: '199',
            tuberia: '1',
            desde: todayISO,
            hasta: todayISO,
          },
        })
      )
    })
  })

  it('keeps explicit sede and pipe from the URL', async () => {
    searchState.sede = '199'
    searchState.tuberia = '1'
    searchState.desde = '2026-08-01'
    searchState.hasta = '2026-08-25'

    const { result } = renderHook(() => useWaterFilters(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    expect(result.current.sedeId).toBe(199)
    expect(result.current.tuberiaId).toBe(1)
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
