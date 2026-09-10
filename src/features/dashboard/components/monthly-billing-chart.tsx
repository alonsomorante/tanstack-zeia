import { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { BarChart3 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CURRENCY_SYMBOLS, formatMoney, formatCycleRange, getCycleLabel } from '../lib/billing-format'
import type { BillingCycleItem } from '../types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface MonthlyBillingChartProps {
  cycles: BillingCycleItem[]
  amounts: number[]
  displayCurrency: string | null
  selectedCycleId: number | null
  onSelect: (cycleId: number) => void
  isLoading: boolean
}

function getShortLabel(cycle: BillingCycleItem): string {
  const parts = cycle.start_date.split('-')
  if (parts.length !== 3) return getCycleLabel(cycle)
  const [year, month] = parts.map(Number)
  const date = new Date(year, month - 1, 1)
  const monthShort = date.toLocaleString('es-ES', { month: 'short' }).replace('.', '')
  const capitalized = monthShort.charAt(0).toUpperCase() + monthShort.slice(1)
  return `${capitalized} ${String(year).slice(2)}`
}

export function MonthlyBillingChart({
  cycles,
  amounts,
  displayCurrency,
  selectedCycleId,
  onSelect,
  isLoading,
}: MonthlyBillingChartProps) {
  const maxAmount = useMemo(
    () => (amounts.length > 0 ? Math.max(...amounts) : 0),
    [amounts]
  )

  const chartData: ChartData<'bar'> = useMemo(() => {
    return {
      labels: cycles.map((c) => getShortLabel(c)),
      datasets: [
        {
          label: 'Costo total',
          data: amounts,
          backgroundColor: cycles.map((c, i) => {
            if (c.id === selectedCycleId) return '#00B7CA'
            if (amounts[i] === maxAmount && maxAmount > 0) return '#E71D36'
            return '#E8E8E3'
          }),
          hoverBackgroundColor: cycles.map((c) =>
            c.id === selectedCycleId ? '#009EAE' : '#00B7CA'
          ),
          borderWidth: 0,
          borderRadius: 6,
          maxBarThickness: 56,
        },
      ],
    }
  }, [cycles, amounts, selectedCycleId, maxAmount])

  const options: ChartOptions<'bar'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      onClick: (_event, elements) => {
        const first = elements[0]
        if (first && cycles[first.index]) {
          onSelect(cycles[first.index].id)
        }
      },
      onHover: (event, elements) => {
        const canvas = event.native?.target as HTMLElement | undefined
        if (canvas?.style) {
          canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default'
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => {
              const item = items[0]
              const cycle = cycles[item?.dataIndex ?? 0]
              return cycle ? getCycleLabel(cycle) : ''
            },
            label: (context) => {
              const cycle = cycles[context.dataIndex]
              const value = context.raw as number
              const lines = [
                displayCurrency
                  ? `Total: ${formatMoney(value, displayCurrency)}`
                  : `Total: ${value}`,
              ]
              if (cycle) {
                lines.push(formatCycleRange(cycle.start_date, cycle.end_date))
                lines.push('Clic para ver el desglose')
              }
              return lines
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#88939b', font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(136, 147, 155, 0.1)' },
          ticks: {
            color: '#88939b',
            font: { size: 11 },
            maxTicksLimit: 6,
            callback: (value) => {
              const num = typeof value === 'number' ? value : Number(value)
              const symbol = displayCurrency ? (CURRENCY_SYMBOLS[displayCurrency] ?? '') : ''
              if (Number.isNaN(num)) return `${symbol}${value}`
              if (Math.abs(num) >= 1000) return `${symbol}${Math.round(num / 1000)}k`
              return `${symbol}${num}`
            },
          },
          title: {
            display: true,
            text: displayCurrency
              ? `Costo total (${CURRENCY_SYMBOLS[displayCurrency] ?? displayCurrency})`
              : 'Costo total',
            color: '#88939b',
            font: { size: 12, weight: 'bold' },
          },
        },
      },
    }),
    [cycles, displayCurrency, onSelect]
  )

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-primary" />
          Consumo tarifario por mes
        </CardTitle>
        <CardDescription>
          <span className="mr-3 inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" /> Seleccionado
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-danger" /> Mes más caro
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {isLoading ? (
          <div className="flex min-h-[320px] flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-text-muted">Cargando facturación mensual...</p>
            </div>
          </div>
        ) : cycles.length === 0 ? (
          <div className="flex min-h-[320px] flex-1 items-center justify-center text-text-muted">
            <div className="space-y-2 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-text-muted/40" />
              <p>No hay ciclos de facturación para esta sede</p>
            </div>
          </div>
        ) : (
          <div className="min-h-[320px] flex-1">
            <Bar data={chartData} options={options} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
