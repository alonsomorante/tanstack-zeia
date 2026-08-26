import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Activity } from 'lucide-react'
import { fetchWaterDayComparison } from '@/features/water/api/water-day-comparison'
import type { WaterDayComparisonEntry } from '@/features/water/types'
import type { Agrupacion } from '../hooks/use-water-comparador-filters'
import { formatDateReadable } from '@/lib/date-utils'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip)

const LINE_COLORS = [
  '#00B7CA',
  '#2EC4B6',
  '#FF6B35',
  '#E71D36',
  '#9B5DE5',
  '#F15BB5',
  '#00BBF9',
  '#FEE440',
]

interface WaterDayComparisonChartProps {
  headquarterId: number
  waterPipeId: number
  measurementPointId: number
  dateAfter: string
  dateBefore: string
  agrupacion: Agrupacion
  isReady: boolean
}

function formatTimeLabel(timeStr: string): string {
  const parts = timeStr.split(':')
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`
  }
  return timeStr
}

export function WaterDayComparisonChart({
  headquarterId,
  waterPipeId,
  measurementPointId,
  dateAfter,
  dateBefore,
  agrupacion,
  isReady,
}: WaterDayComparisonChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: [
      'water-day-comparison',
      headquarterId,
      waterPipeId,
      measurementPointId,
      dateAfter,
      dateBefore,
      agrupacion,
    ],
    queryFn: () =>
      fetchWaterDayComparison(headquarterId, waterPipeId, measurementPointId, dateAfter, dateBefore, {
        lastBy: agrupacion,
      }),
    enabled: isReady,
  })

  const dataMap = useMemo(() => {
    if (!data || !Array.isArray(data)) return {}
    const merged: Record<string, WaterDayComparisonEntry[]> = {}
    for (const item of data) {
      for (const [key, entries] of Object.entries(item)) {
        merged[key] = entries
      }
    }
    return merged
  }, [data])

  const unit = useMemo(() => {
    const firstEntries = Object.values(dataMap).find((entries) => entries.length > 0)
    return firstEntries?.[0]?.unit ?? 'L'
  }, [dataMap])

  const nonHabitualDates = useMemo(() => {
    return Object.keys(dataMap).filter((key) => key !== 'habitual').sort()
  }, [dataMap])

  const hasHabitual = 'habitual' in dataMap

  const [visibleDates, setVisibleDates] = useState<Set<string>>(new Set())
  const [visibleHabitual, setVisibleHabitual] = useState(true)

  useEffect(() => {
    setVisibleDates(new Set(nonHabitualDates))
  }, [nonHabitualDates])

  const dates = useMemo(() => {
    return hasHabitual ? [...nonHabitualDates, 'habitual'] : nonHabitualDates
  }, [hasHabitual, nonHabitualDates])

  const allDatesVisible = nonHabitualDates.length > 0 && nonHabitualDates.every((d) => visibleDates.has(d))

  const toggleDate = (date: string) => {
    setVisibleDates((prev) => {
      if (allDatesVisible) {
        return new Set([date])
      }
      const next = new Set(prev)
      if (next.has(date)) {
        next.delete(date)
      } else {
        next.add(date)
      }
      return next
    })
  }

  const showAllDates = () => {
    setVisibleDates(new Set(nonHabitualDates))
    setVisibleHabitual(true)
  }

  const chartData: ChartData<'line'> = useMemo(() => {
    if (dates.length === 0) return { labels: [], datasets: [] }

    const allTimes = new Set<string>()
    for (const date of dates) {
      for (const entry of dataMap[date] ?? []) {
        allTimes.add(formatTimeLabel(entry.time))
      }
    }
    const sortedTimes = Array.from(allTimes).sort((a, b) => a.localeCompare(b))

    const datasets: ChartData<'line'>['datasets'] = nonHabitualDates
      .filter((date) => visibleDates.has(date))
      .map((date, index) => {
        const color = LINE_COLORS[index % LINE_COLORS.length]
        const timeValueMap = new Map<string, number>()
        for (const entry of dataMap[date] ?? []) {
          timeValueMap.set(formatTimeLabel(entry.time), entry.value)
        }
        return {
          label: formatDateReadable(date),
          data: sortedTimes.map((time) => timeValueMap.get(time) ?? null),
          borderColor: color,
          backgroundColor: color + '1A',
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: false,
          spanGaps: true,
        }
      })

    if (hasHabitual) {
      if (visibleHabitual) {
        const timeValueMap = new Map<string, number>()
        for (const entry of dataMap.habitual ?? []) {
          timeValueMap.set(formatTimeLabel(entry.time), entry.value)
        }
        datasets.push({
          label: 'Consumo habitual',
          data: sortedTimes.map((time) => timeValueMap.get(time) ?? null),
          borderColor: '#000000',
          backgroundColor: 'transparent',
          borderWidth: 3.5,
          borderDash: [8, 4],
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.3,
          fill: false,
          spanGaps: true,
        })
      }
    }

    return {
      labels: sortedTimes,
      datasets,
    }
  }, [dataMap, dates, nonHabitualDates, visibleDates, visibleHabitual, hasHabitual])

  const options: ChartOptions<'line'> = useMemo(
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
            title: (items) => {
              if (items.length === 0) return ''
              return `Hora: ${items[0].label}`
            },
            label: (context) => {
              const dateLabel = context.dataset.label ?? ''
              const value = context.raw as number | null
              if (value === null) return ''
              return `${dateLabel}: ${value.toLocaleString('es-PE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} ${unit}`
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
            maxRotation: 45,
            minRotation: 45,
            maxTicksLimit: 20,
          },
        },
        y: {
          title: {
            display: true,
            text: `Consumo (${unit})`,
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
    [unit]
  )

  const isEmpty = !isLoading && dates.length === 0

  return (
    <div className="min-h-[400px]">
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text-muted">Cargando gráfico...</p>
          </div>
        </div>
      ) : isEmpty ? (
        <div className="flex items-center justify-center text-text-muted min-h-[400px]">
          <div className="text-center space-y-2">
            <Activity className="w-12 h-12 mx-auto text-text-muted/40" />
            <p>No hay datos para el rango de fechas seleccionado</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {hasHabitual && (
              <div className="flex items-center gap-3 p-3 bg-black/5 rounded-lg border border-black/10">
                <label className="flex items-center gap-3 cursor-pointer select-none hover:bg-black/5 transition-colors rounded px-2 py-1 -mx-2 -my-1">
                  <input
                    type="checkbox"
                    checked={visibleHabitual}
                    onChange={() => setVisibleHabitual((v) => !v)}
                    className="sr-only"
                  />
                  <span
                    className="relative w-10 h-5 rounded-full transition-colors"
                    style={{
                      backgroundColor: visibleHabitual ? '#000000' : '#d1d5db',
                    }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm"
                      style={{
                        transform: visibleHabitual ? 'translateX(20px)' : 'translateX(0)',
                      }}
                    />
                  </span>
                  <span
                    className="w-6 h-1 rounded"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(to right, #000 0, #000 5px, transparent 5px, transparent 8px)',
                      opacity: visibleHabitual ? 1 : 0.3,
                    }}
                  />
                  <span
                    className="text-sm font-semibold text-black"
                    style={{ opacity: visibleHabitual ? 1 : 0.5 }}
                  >
                    Consumo habitual
                  </span>
                </label>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg">
              {nonHabitualDates.map((date, index) => {
                const color = LINE_COLORS[index % LINE_COLORS.length]
                const isVisible = visibleDates.has(date)
                return (
                  <label key={date} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => toggleDate(date)}
                      className="sr-only"
                    />
                    <span
                      className="w-4 h-4 rounded border-2 flex items-center justify-center"
                      style={{
                        borderColor: color,
                        backgroundColor: isVisible ? color : 'transparent',
                      }}
                    >
                      {isVisible && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm text-text-secondary" style={{ opacity: isVisible ? 1 : 0.5 }}>
                      {formatDateReadable(date)}
                    </span>
                  </label>
                )
              })}
              {!allDatesVisible && (
                <button
                  onClick={showAllDates}
                  className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
                >
                  Mostrar todas
                </button>
              )}
            </div>
          </div>

          <div className="h-[400px]">
            <Line data={chartData} options={options} />
          </div>
        </div>
      )}
    </div>
  )
}
