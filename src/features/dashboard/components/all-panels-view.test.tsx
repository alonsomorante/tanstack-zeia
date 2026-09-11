import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AllPanelsView } from './all-panels-view'
import * as headquartersApi from '../api/headquarters'
import * as consumptionApi from '../api/consumption'
import type {
  ConsumptionDistributionResponse,
  HeadquartersResponse,
} from '../types'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))

vi.mock('react-chartjs-2', () => ({
  Bar: ({ data, options }: { data: { labels: string[] }; options?: { onClick?: (e: unknown, els: { index: number }[]) => void } }) => (
    <div data-testid="panels-bar">
      {(data.labels as string[]).map((label, i) => (
        <button
          key={`${label}-${i}`}
          onClick={() => options?.onClick?.({}, [{ index: i }])}
        >
          {label}
        </button>
      ))}
    </div>
  ),
}))

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

function renderWithProviders(ui: React.ReactNode) {
  return render(<QueryClientProvider client={createQueryClient()}>{ui}</QueryClientProvider>)
}

const mockHeadquarters: HeadquartersResponse = {
  count: 1,
  results: [
    {
      id: 67,
      name: 'Salaverry',
      is_active: true,
      electrical_panels: [
        { id: 39, name: 'TG-TR2', is_active: true, type: 'trifasico', threads: 3 },
        { id: 34, name: 'TTA-TR1', is_active: true, type: 'trifasico', threads: 3 },
      ],
    },
  ],
}

function buildDistribution(
  panelId: number,
  panelName: string,
  mainKwh: number
): ConsumptionDistributionResponse {
  const secondary = Math.round(mainKwh * 0.6)
  return {
    headquarter_id: 67,
    electrical_panel_id: panelId,
    electrical_panel_name: panelName,
    main_consumption_kwh: mainKwh,
    total_measurement_points: 2,
    date_range: { type: 'custom', start_date: '2026-07-01', end_date: '2026-07-31' },
    results: [
      {
        measurement_point_id: panelId * 10,
        measurement_point_name: 'Medidor principal',
        device_name: 'Device',
        is_main: true,
        is_active: true,
        channel: '1',
        type: 'energy',
        capacity: '',
        hardware: null,
        consumption_kwh: mainKwh,
        consumption_percentage: 100,
        first_reading_value: 0,
        last_reading_value: mainKwh,
        first_reading_time: '2026-07-01',
        last_reading_time: '2026-07-31',
      },
      {
        measurement_point_id: panelId * 10 + 1,
        measurement_point_name: 'Clima',
        device_name: 'Device',
        is_main: false,
        is_active: true,
        channel: '2',
        type: 'energy',
        capacity: '',
        hardware: null,
        consumption_kwh: secondary,
        consumption_percentage: 60,
        first_reading_value: 0,
        last_reading_value: secondary,
        first_reading_time: '2026-07-01',
        last_reading_time: '2026-07-31',
      },
    ],
  }
}

describe('AllPanelsView', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(headquartersApi, 'fetchHeadquarters').mockResolvedValue(mockHeadquarters)
    vi.spyOn(consumptionApi, 'fetchConsumptionDistribution').mockImplementation(
      (_hq: number, panelId: number) => {
        const main = panelId === 39 ? 1000 : 500
        const name = panelId === 39 ? 'TG-TR2' : 'TTA-TR1'
        return Promise.resolve(buildDistribution(panelId, name, main))
      }
    )
  })

  it('muestra el hero con el total sumado y el top', async () => {
    renderWithProviders(
      <AllPanelsView
        sedeId={67}
        sedeName="Salaverry"
        dateAfterStr="2026-07-01"
        dateBeforeStr="2026-07-31"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('panels-bar')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText(/Esta sede consume/)).toBeInTheDocument()
    })

    // Total = 1000 + 500
    expect(screen.getAllByText('1,500').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Tablero que más consume')).toBeInTheDocument()
    expect(screen.getAllByText(/TG-TR2/).length).toBeGreaterThanOrEqual(2)

    // Desglose por defecto = top (TG-TR2)
    expect(screen.getByText('Desglose — TG-TR2')).toBeInTheDocument()
    expect(screen.queryByText('Empresa Concesionaria')).not.toBeInTheDocument()
  })

  it('llama a consumption-distribution una vez por tablero y cambia el desglose al seleccionar', async () => {
    const user = userEvent.setup()
    const spy = vi.spyOn(consumptionApi, 'fetchConsumptionDistribution')
    renderWithProviders(
      <AllPanelsView
        sedeId={67}
        sedeName="Salaverry"
        dateAfterStr="2026-07-01"
        dateBeforeStr="2026-07-31"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Desglose — TG-TR2')).toBeInTheDocument()
    })

    expect(spy).toHaveBeenCalledWith(67, 39, '2026-07-01', '2026-07-31')
    expect(spy).toHaveBeenCalledWith(67, 34, '2026-07-01', '2026-07-31')

    await user.click(screen.getByRole('button', { name: 'TTA-TR1' }))

    await waitFor(() => {
      expect(screen.getByText('Desglose — TTA-TR1')).toBeInTheDocument()
    })
  })
})
