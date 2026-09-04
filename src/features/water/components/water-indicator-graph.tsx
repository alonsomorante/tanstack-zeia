import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
  type TooltipItem,
} from 'chart.js'
import zoomPlugin from 'chartjs-plugin-zoom'
import { Activity, BarChart3, Clock, LineChart, ZoomOut } from 'lucide-react'
import { ZeiaSelect } from '@/components/ui/select'
import { fetchWaterReadingsGraph } from '@/features/water/api/water-readings-graph'
import { formatDateShort } from '@/lib/date-utils'
import { WATER_INDICATOR_INFO } from '@/features/water/lib/indicators'
import { cn } from '@/lib/utils'
import { AGRUPACION_LABELS, AGRUPACION_OPTIONS, type Agrupacion } from '../hooks/use-water-home-filters'
import type { WaterIndicator } from '../lib/indicators'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  zoomPlugin
)

interface WaterIndicatorGraphProps {
  headquarterId: number
  waterPipeId: number
  measurementPointId: number
  dateAfter: string
  dateBefore: string
  indicador: WaterIndicator
  agrupacion: Agrupacion
  onAgrupacionChange: (value: Agrupacion) => void
  isReady: boolean
}

function formatPeriodLabel(period: string, agrupacion: Agrupacion): string {
  // Granularidades gruesas => fecha corta; finas => hora:minuto (igual que energía).
  if (agrupacion === 'day' || agrupacion === 'week' || agrupacion === 'month') {
    return formatDateShort(period)
  }
  return period.includes('T') ? period.slice(11, 16) : period
}

function formatValue(value: number): string {
  return value.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function WaterIndicatorGraph({
  headquarterId,
  waterPipeId,
  measurementPointId,
  dateAfter,
  dateBefore,
  indicador,
  agrupacion,
  onAgrupacionChange,
  isReady,
}: WaterIndicatorGraphProps) {
  // Mismos controles que el gráfico de Análisis por Indicador de energía.
  const [chartType, setChartType] = useState<'line' | 'bar'>('bar')
  const lineChartRef = useRef<ChartJS<'line'> | null>(null)
  const barChartRef = useRef<ChartJS<'bar'> | null>(null)

  const handleResetZoom = useCallback(() => {
    const chart = lineChartRef.current ?? barChartRef.current
    chart?.resetZoom()
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: [
      'water-indicator-graph',
      headquarterId,
      waterPipeId,
      measurementPointId,
      dateAfter,
      dateBefore,
      indicador,
      agrupacion,
    ],
    queryFn: () =>
      fetchWaterReadingsGraph(
        headquarterId,
        waterPipeId,
        measurementPointId,
        dateAfter,
        dateBefore,
        indicador,
        undefined,
        agrupacion
      ),
    enabled: isReady,
  })

  // Los datos son nuevos => la ventana de zoom anterior ya no aplica.
  useEffect(() => {
    handleResetZoom()
  }, [handleResetZoom, headquarterId, waterPipeId, measurementPointId, dateAfter, dateBefore, indicador, agrupacion])

  const indicatorInfo = WATER_INDICATOR_INFO[indicador]
  const yAxisLabel = `${indicatorInfo.label} (${indicatorInfo.unit})`

  const chartData = useMemo(() => {
    const results = data ?? []
    return {
      labels: results.map((r) => formatPeriodLabel(r.period, agrupacion)),
      datasets: [
        {
          label: indicatorInfo.label,
          data: results.map((r) => r.difference),
          borderColor: '#00B7CA',
          backgroundColor:
            chartType === 'bar' ? 'rgba(0, 183, 202, 0.6)' : 'rgba(0, 183, 202, 0.1)',
          borderWidth: chartType === 'bar' ? 1 : 2,
          pointRadius: chartType === 'bar' ? 0 : 2,
          pointHoverRadius: chartType === 'bar' ? 0 : 5,
          tension: 0.3,
          fill: chartType === 'line',
          ...(chartType === 'bar' && {
            borderRadius: 2,
            borderSkipped: false,
            barPercentage: 0.9,
            categoryPercentage: 0.9,
            maxBarThickness: 48,
          }),
        },
      ],
    }
  }, [data, agrupacion, indicatorInfo, chartType])

  const options: ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        datalabels: {
          display: false,
        },
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            title: (items: TooltipItem<'line'>[]) => {
              const item = items[0]
              const results = data ?? []
              const raw = results[item?.dataIndex ?? 0]
              return raw ? formatPeriodLabel(raw.period, agrupacion) : ''
            },
            label: (context: TooltipItem<'line'>) => {
              const value = context.raw as number
              return `${indicatorInfo.label}: ${formatValue(value)} ${indicatorInfo.unit}`
            },
          },
        },
        zoom: {
          limits: {
            x: { min: 'original', max: 'original' },
            y: { min: 'original', max: 'original' },
          },
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            drag: {
              enabled: true,
              backgroundColor: 'rgba(0, 183, 202, 0.12)',
              borderColor: 'rgba(0, 183, 202, 0.5)',
              borderWidth: 1,
            },
            mode: 'x',
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(136, 147, 155, 0.1)',
          },
          ticks: {
            color: '#88939b',
            maxRotation: 0,
            minRotation: 0,
            autoSkip: true,
            maxTicksLimit: 16,
          },
        },
        y: {
          title: {
            display: true,
            text: yAxisLabel,
            color: '#88939b',
            font: {
              size: 12,
              weight: 'bold',
            },
          },
          grid: {
            color: 'rgba(136, 147, 155, 0.1)',
          },
          ticks: {
            color: '#88939b',
          },
        },
      },
    }),
    [data, agrupacion, indicatorInfo, yAxisLabel]
  )

  return (
    <div className="min-h-[340px]">
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[340px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text-muted">Cargando gráfico...</p>
          </div>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="flex items-center justify-center text-text-muted min-h-[340px]">
          <div className="text-center space-y-2">
            <Activity className="w-12 h-12 mx-auto text-text-muted/40" />
            <p>No hay datos para el período y filtro seleccionados</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleResetZoom}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border bg-card text-text-secondary border-border hover:border-primary/50"
              title="Restablecer zoom"
              aria-label="Restablecer zoom"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                handleResetZoom()
                setChartType((prev) => (prev === 'line' ? 'bar' : 'line'))
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border',
                chartType === 'line'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-card text-text-secondary border-border hover:border-primary/50'
              )}
              title={chartType === 'line' ? 'Cambiar a barras' : 'Cambiar a líneas'}
            >
              {chartType === 'line' ? (
                <BarChart3 className="h-4 w-4" />
              ) : (
                <LineChart className="h-4 w-4" />
              )}
              {chartType === 'line' ? 'Barras' : 'Línea'}
            </button>
            <div className="min-w-[140px]">
              <ZeiaSelect
                options={AGRUPACION_OPTIONS.map((opt) => ({
                  value: opt,
                  label: AGRUPACION_LABELS[opt],
                }))}
                value={agrupacion}
                onChange={(val) => {
                  handleResetZoom()
                  onAgrupacionChange(val as Agrupacion)
                }}
                placeholder="Agrupar por"
                icon={Clock}
              />
            </div>
          </div>
          <div className="h-[380px]">
            {chartType === 'line' ? (
              <Line
                ref={lineChartRef}
                data={chartData as ChartData<'line'>}
                options={options}
              />
            ) : (
              <Bar
                ref={barChartRef}
                data={chartData as ChartData<'bar'>}
                options={options as ChartOptions<'bar'>}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
