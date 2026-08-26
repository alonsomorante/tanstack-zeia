import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  type TooltipItem,
} from 'chart.js'
import { Activity } from 'lucide-react'
import { fetchWaterReadingsGraph } from '@/features/water/api/water-readings-graph'
import { formatDateReadable } from '@/lib/date-utils'
import { WATER_INDICATOR_INFO, type WaterIndicator } from '@/features/water/lib/indicators'
import { WEEKDAY_CSV, type Weekday } from '../hooks/use-water-panel-readings-filters'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface WaterReadingsChartProps {
  headquarterId: number
  waterPipeId: number
  measurementPointId: number
  dateAfter: string
  dateBefore: string
  indicador: WaterIndicator
  weekday: Weekday
  isReady: boolean
}

export function WaterReadingsChart({
  headquarterId,
  waterPipeId,
  measurementPointId,
  dateAfter,
  dateBefore,
  indicador,
  weekday,
  isReady,
}: WaterReadingsChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: [
      'water-readings-graph',
      headquarterId,
      waterPipeId,
      measurementPointId,
      dateAfter,
      dateBefore,
      indicador,
      weekday,
    ],
    queryFn: () =>
      fetchWaterReadingsGraph(
        headquarterId,
        waterPipeId,
        measurementPointId,
        dateAfter,
        dateBefore,
        indicador,
        WEEKDAY_CSV[weekday]
      ),
    enabled: isReady,
  })

  const indicatorInfo = WATER_INDICATOR_INFO[indicador]
  const yAxisLabel = `${indicatorInfo.label} (${indicatorInfo.unit})`

  const chartData: ChartData<'bar'> = useMemo(() => {
    const results = data ?? []
    return {
      labels: results.map((r) => formatDateReadable(r.first_reading)),
      datasets: [
        {
          label: indicatorInfo.label,
          data: results.map((r) => r.difference),
          backgroundColor: 'rgba(0, 183, 202, 0.6)',
          borderColor: '#00B7CA',
          borderWidth: 1,
          borderRadius: 2,
          borderSkipped: false,
          barPercentage: 0.9,
          categoryPercentage: 0.9,
          maxBarThickness: 48,
        },
      ],
    }
  }, [data, indicatorInfo])

  const options: ChartOptions<'bar'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
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
            title: (items: TooltipItem<'bar'>[]) => {
              const item = items[0]
              const results = data ?? []
              const rawIndex = item?.dataIndex ?? 0
              const raw = results[rawIndex]
              return raw ? formatDateReadable(raw.first_reading) : ''
            },
            label: (context: TooltipItem<'bar'>) => {
              const value = context.raw as number
              return `${indicatorInfo.label}: ${value.toLocaleString('es-PE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} ${indicatorInfo.unit}`
            },
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
            maxTicksLimit: 12,
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
    [data, indicatorInfo, yAxisLabel]
  )

  return (
    <div className="min-h-[360px]">
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[360px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text-muted">Cargando gráfico...</p>
          </div>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="flex items-center justify-center text-text-muted min-h-[360px]">
          <div className="text-center space-y-2">
            <Activity className="w-12 h-12 mx-auto text-text-muted/40" />
            <p>No hay datos para el período y filtro seleccionados</p>
          </div>
        </div>
      ) : (
        <div className="h-[400px]">
          <Bar data={chartData} options={options} />
        </div>
      )}
    </div>
  )
}
