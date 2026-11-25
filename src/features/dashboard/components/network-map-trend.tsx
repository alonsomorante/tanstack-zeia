import { useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, ChartColumn } from 'lucide-react'
import { fetchReadingsGraph } from '../api/readings-graph'
import { formatReadingsAxisLabel, formatReadingsTooltipTitle } from '../lib/readings-graph-labels'
import { formatKwh } from '../lib/network-map'
import { InsightSection } from './network-map-ui'

/** Energía activa consumida: `difference` de cada período es el consumo del intervalo. */
const CONSUMPTION_INDICATOR = 'EPpos'

interface NetworkMapTrendProps {
  headquarterId: number
  panelId: number
  measurementPointId: number
  dateAfter: string
  dateBefore: string
  lastBy: 'hour' | 'day'
  action?: ReactNode
}

export function NetworkMapTrend({
  headquarterId,
  panelId,
  measurementPointId,
  dateAfter,
  dateBefore,
  lastBy,
  action,
}: NetworkMapTrendProps) {
  const { data, isLoading, isError } = useQuery({
    // Misma forma de key que la gráfica de Análisis por Indicador (comparten caché).
    queryKey: [
      'readings-graph',
      headquarterId,
      panelId,
      measurementPointId,
      dateAfter,
      dateBefore,
      CONSUMPTION_INDICATOR,
      'energy',
      lastBy,
    ],
    queryFn: () =>
      fetchReadingsGraph(
        headquarterId,
        panelId,
        measurementPointId,
        dateAfter,
        dateBefore,
        CONSUMPTION_INDICATOR,
        lastBy
      ),
    staleTime: 5 * 60 * 1000,
  })

  const bars = useMemo(
    () =>
      (data ?? []).map((point) => ({
        label: formatReadingsAxisLabel(point, lastBy),
        title: formatReadingsTooltipTitle(point, lastBy),
        value: Math.max(0, point.difference ?? 0),
      })),
    [data, lastBy]
  )

  const max = bars.reduce((m, b) => Math.max(m, b.value), 0)
  const peakIndex = max > 0 ? bars.findIndex((b) => b.value === max) : -1
  const peak = peakIndex >= 0 ? bars[peakIndex] : null
  const title = lastBy === 'hour' ? 'Consumo por hora' : 'Consumo por día'

  return (
    <InsightSection icon={ChartColumn} title={title} action={action}>
      {peak && (
        <p className="font-mono text-[11px] tabular-nums text-text-muted">
          Pico {formatKwh(peak.value)} kWh · {peak.label}
        </p>
      )}

      {isLoading ? (
        <div className="mt-3 flex h-20 items-end gap-[3px]">
          {Array.from({ length: 14 }, (_, i) => (
            <div
              key={i}
              className="flex-1 animate-pulse rounded-t-sm bg-muted"
              style={{ height: `${30 + ((i * 37) % 60)}%` }}
            />
          ))}
        </div>
      ) : isError ? (
        <p className="mt-3 rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-text-muted">
          No se pudo cargar la tendencia de este punto
        </p>
      ) : bars.length === 0 || max === 0 ? (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-4 text-xs text-text-muted">
          <Activity className="h-4 w-4" />
          Sin consumo registrado en este período
        </div>
      ) : (
        <>
          <div
            className="mt-3 flex h-20 items-end gap-[3px]"
            role="img"
            aria-label={`${title}: pico de ${formatKwh(max)} kWh${peak ? ` (${peak.title})` : ''}`}
          >
            {bars.map((bar, index) => (
              <div
                key={`${bar.title}-${index}`}
                title={`${bar.title}: ${formatKwh(bar.value, true)} kWh`}
                className="flex-1 rounded-t-sm transition-[height] duration-500"
                style={{
                  height: `${Math.max(3, (bar.value / max) * 100)}%`,
                  backgroundColor: index === peakIndex ? '#E71D36' : 'rgba(0,183,202,0.55)',
                }}
              />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[10px] tabular-nums text-text-muted">
            <span>{bars[0].label}</span>
            {bars.length > 1 && <span>{bars[bars.length - 1].label}</span>}
          </div>
        </>
      )}
    </InsightSection>
  )
}
