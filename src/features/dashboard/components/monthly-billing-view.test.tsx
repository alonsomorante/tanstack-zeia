import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MonthlyBillingView } from './monthly-billing-view'
import * as billingCalculateApi from '../api/billing-calculate'
import * as billingCyclesApi from '../api/billing-cycles'
import type { BillingCalculateResponse, BillingCyclesResponse } from '../types'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))

vi.mock('react-chartjs-2', () => ({
  Bar: ({ data, options }: { data: { labels: string[] }; options?: { onClick?: (e: unknown, els: { index: number }[]) => void } }) => (
    <div data-testid="monthly-bar">
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

const mockCycles: BillingCyclesResponse = {
  count: 3,
  results: [
    {
      id: 0,
      energy_headquarter: 67,
      start_date: '2026-05-01',
      end_date: '2026-05-31',
      is_current: false,
    },
    {
      id: 1,
      energy_headquarter: 67,
      start_date: '2026-06-01',
      end_date: '2026-06-30',
      is_current: false,
    },
    {
      id: 2,
      energy_headquarter: 67,
      start_date: '2026-07-01',
      end_date: '2026-07-31',
      is_current: true,
    },
  ],
}

function buildCalculate(startDate: string, endDate: string, total: number): BillingCalculateResponse {
  return {
    headquarter_id: 67,
    start_date: startDate,
    end_date: endDate,
    results: [
      {
        code: 'energia_activa_horas_fuera_punta',
        name: 'Cargo por energía activa en horas fuera de punta',
        value: Math.round(total * 0.6),
        currency: 'USD',
        details: { consumption: 60, unit: 'MWh', rate: 39.15, rate_unit: 'USD/MWh' },
      },
      {
        code: 'energia_activa_horas_punta',
        name: 'Cargo por energía activa en horas punta',
        value: total - Math.round(total * 0.6),
        currency: 'USD',
        details: { consumption: 40, unit: 'MWh', rate: 39.15, rate_unit: 'USD/MWh' },
      },
    ],
    total_amount: total,
    currency: 'USD',
    totals_by_currency: { USD: total },
  }
}

describe('MonthlyBillingView', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(billingCyclesApi, 'fetchBillingCycles').mockResolvedValue(mockCycles)
    vi.spyOn(billingCalculateApi, 'fetchBillingCalculate').mockImplementation(
      (_id: number, startDate: string, endDate: string) => {
        const total = startDate.startsWith('2026-06')
          ? 3000
          : startDate.startsWith('2026-05')
            ? 2500
            : 2000
        return Promise.resolve(buildCalculate(startDate, endDate, total))
      }
    )
  })

  it('muestra el hero con el total del mes actual y el desglose', async () => {
    renderWithProviders(<MonthlyBillingView sedeId={67} />)

    await waitFor(() => {
      expect(screen.getByTestId('monthly-bar')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText(/Este mes vas a pagar/)).toBeInTheDocument()
    })

    // Hero: total gigante + comparativa vs junio (ahorro de $1,000 = 33.3%)
    expect(screen.getAllByText('$2,000.00').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/Ahorraste frente a/)).toBeInTheDocument()
    expect(screen.getByText('Te cuesta por día')).toBeInTheDocument()
    expect(screen.getByText('Ranking de gasto')).toBeInTheDocument()

    // Desglose simplificado: solo ciclo + cargos con importes claros
    expect(screen.getByText('Desglose — Julio 2026')).toBeInTheDocument()
    expect(
      screen.getAllByText('Cargo por energía activa en horas fuera de punta').length
    ).toBeGreaterThan(0)
    expect(screen.queryByText('Empresa Concesionaria')).not.toBeInTheDocument()
    expect(screen.queryByText('N° de Suministro')).not.toBeInTheDocument()
  })

  it('cambia el hero y el desglose al seleccionar otra barra', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MonthlyBillingView sedeId={67} />)

    await waitFor(() => {
      expect(screen.getByText('Desglose — Julio 2026')).toBeInTheDocument()
    })

    const juneButton = screen.getByRole('button', { name: /Jun 26/i })
    await user.click(juneButton)

    await waitFor(() => {
      expect(screen.getByText('Desglose — Junio 2026')).toBeInTheDocument()
    })
    expect(screen.getByText(/Ese mes pagaste/)).toBeInTheDocument()
    expect(screen.getAllByText('$3,000.00').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/Gastaste más que en/)).toBeInTheDocument()
  })
})
