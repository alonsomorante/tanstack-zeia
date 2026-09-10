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
import type { PanelConsumption } from '../hooks/use-all-panels-consumption'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface AllPanelsChartProps {
  panels: PanelConsumption[]
  selectedPanelId: number | null
  onSelect: (panelId: number) => void
  isLoading: boolean
}

export function AllPanelsChart({
  panels,
  selectedPanelId,
  onSelect,
  isLoading,
}: AllPanelsChartProps) {
  const maxKwh = useMemo(
    () => (panels.length > 0 ? Math.max(...panels.map((p) => p.mainKwh)) : 0),
    [panels]
  )

  const chartData: ChartData<'bar'> = useMemo(() => {
    return {
      labels: panels.map((p) => p.panel.name),
      datasets: [
        {
          label: 'Consumo (kWh)',
          data: panels.map((p) => p.mainKwh),
          backgroundColor: panels.map((p) => {
            if (p.panel.id === selectedPanelId) return '#00B7CA'
            if (p.mainKwh === maxKwh && maxKwh > 0) return '#E71D36'
            return '#E8E8E3'
          }),
          hoverBackgroundColor: panels.map((p) =>
            p.panel.id === selectedPanelId ? '#009EAE' : '#00B7CA'
          ),
          borderWidth: 0,
          borderRadius: 6,
          maxBarThickness: 72,
        },
      ],
    }
  }, [panels, selectedPanelId, maxKwh])

  const options: ChartOptions<'bar'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      onClick: (_event, elements) => {
        const first = elements[0]
        if (first && panels[first.index]) {
          onSelect(panels[first.index].panel.id)
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
              return panels[item?.dataIndex ?? 0]?.panel.name ?? ''
            },
            label: (context) => {
              const value = context.raw as number
              const total = panels.reduce((sum, p) => sum + p.mainKwh, 0)
              const share = total > 0 ? (value / total) * 100 : 0
              return [
                `${value.toLocaleString('es-PE', { maximumFractionDigits: 2 })} kWh (${share.toFixed(1)}%)`,
                'Clic para ver el desglose',
              ]
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
              if (Number.isNaN(num)) return `${value}`
              if (Math.abs(num) >= 1000) return `${Math.round(num / 1000)}k`
              return `${num}`
            },
          },
          title: {
            display: true,
            text: 'Consumo (kWh)',
            color: '#88939b',
            font: { size: 12, weight: 'bold' },
          },
        },
      },
    }),
    [panels, onSelect]
  )

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-primary" />
          Consumo por tablero
        </CardTitle>
        <CardDescription>
          <span className="mr-3 inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" /> Seleccionado
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-danger" /> Mayor consumo
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {isLoading ? (
          <div className="flex min-h-[320px] flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-text-muted">Cargando consumo por tablero...</p>
            </div>
          </div>
        ) : panels.length === 0 ? (
          <div className="flex min-h-[320px] flex-1 items-center justify-center text-text-muted">
            <div className="space-y-2 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-text-muted/40" />
              <p>No hay tableros activos en esta sede</p>
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
