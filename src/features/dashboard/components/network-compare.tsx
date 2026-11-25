import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Line } from 'react-chartjs-2'
import {
  CategoryScale,
  Chart as ChartJS,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { ArrowRight, GitCompareArrows, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchReadingsGraph } from '../api/readings-graph'
import type { ReadingGraphPoint } from '../types'
import type { NetworkPowerState } from '../hooks/use-network-insights'
import { formatReadingsAxisLabel } from '../lib/readings-graph-labels'
import {
  COMPARE_COLORS,
  MAX_COMPARE_POINTS,
  formatKw,
  formatKwh,
  formatShare,
  type NetworkMapModel,
  type NetworkPeriodRange,
  type NetworkPointNode,
} from '../lib/network-map'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip)

// Fuera del componente: `combine` estable → resultado estable mientras los datos no cambien.
const selectSeries = (results: Array<{ data?: ReadingGraphPoint[]; isLoading: boolean }>) => ({
  seriesData: results.map((r) => r.data),
  isLoading: results.some((r) => r.isLoading),
})

// ─── Modo comparar (botón sobre el mapa + bandeja) ──────────────────────────

export function NetworkCompareToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      title={active ? 'Salir del modo comparar' : 'Elige varios puntos del mapa para compararlos'}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        active
          ? 'border-primary bg-primary text-white shadow-soft hover:bg-primary-hover'
          : 'border-border bg-card text-text-secondary hover:border-primary/50 hover:text-primary'
      )}
    >
      <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
      Comparar puntos
    </button>
  )
}

interface NetworkCompareTrayProps {
  points: NetworkPointNode[]
  onRemove: (pointId: number) => void
  onExit: () => void
  onCompare: () => void
}

/** Se muestra mientras el modo comparar está activo, aunque todavía no haya puntos elegidos. */
export function NetworkCompareTray({ points, onRemove, onExit, onCompare }: NetworkCompareTrayProps) {
  const ready = points.length >= 2
  const hint =
    points.length === 0
      ? `Toca de 2 a ${MAX_COMPARE_POINTS} puntos en el mapa para compararlos`
      : points.length === 1
        ? 'Elige al menos 1 punto más'
        : `${points.length}/${MAX_COMPARE_POINTS} puntos`
  return (
    <div
      role="region"
      aria-label="Comparación de puntos"
      className="network-tray-in sticky bottom-3 z-20 mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-card/95 px-3 py-2.5 shadow-medium backdrop-blur"
    >
      <span className="label-executive flex items-center gap-1.5 pr-1 text-primary">
        <GitCompareArrows className="h-3.5 w-3.5" /> Comparar
      </span>
      {points.map((point, index) => (
        <span key={point.key} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background py-1 pl-2.5 pr-1 text-xs font-medium text-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COMPARE_COLORS[index % COMPARE_COLORS.length] }} />
          <span className="max-w-[160px] truncate">{point.name}</span>
          <button
            type="button"
            onClick={() => point.id != null && onRemove(point.id)}
            aria-label={`Quitar ${point.name}`}
            className="flex h-5 w-5 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <span aria-live="polite" className={cn(ready ? 'text-[11px] text-text-muted' : 'text-xs font-medium text-primary')}>
        {hint}
      </span>
      <span className="flex-1" />
      <button type="button" onClick={onExit} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-secondary hover:text-foreground">
        Salir
      </button>
      <button
        type="button"
        onClick={onCompare}
        disabled={!ready}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        {ready ? `Comparar ${points.length}` : 'Comparar'}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

// ─── Panel de comparación ───────────────────────────────────────────────────

interface NetworkComparePanelProps {
  sedeId: number
  points: NetworkPointNode[]
  model: NetworkMapModel
  range: NetworkPeriodRange
  power: NetworkPowerState
}

export function NetworkComparePanel({ sedeId, points, model, range, power }: NetworkComparePanelProps) {
  const lastBy = range.trendLastBy
  // Mismas keys que la tendencia de cada punto en el detalle: comparten caché.
  const { seriesData, isLoading } = useQueries({
    queries: points.map((point) => ({
      queryKey: ['readings-graph', sedeId, point.panelId, point.id, range.dateAfter, range.dateBefore, 'EPpos', 'energy', lastBy],
      queryFn: () => fetchReadingsGraph(sedeId, point.panelId, point.id!, range.dateAfter, range.dateBefore, 'EPpos', lastBy),
      enabled: point.id != null,
      staleTime: 5 * 60 * 1000,
    })),
    combine: selectSeries,
  })

  const ranked = useMemo(
    () => points.map((point, index) => ({ point, color: COMPARE_COLORS[index % COMPARE_COLORS.length] })).sort((a, b) => b.point.kwh - a.point.kwh),
    [points]
  )
  const top = ranked[0]?.point
  const bottom = [...ranked].reverse().find((r) => r.point.kwh > 0)?.point
  const ratio = top && bottom && bottom.kwh > 0 && top.key !== bottom.key ? top.kwh / bottom.kwh : null
  const together = points.reduce((sum, p) => sum + p.kwh, 0)
  const togetherShare = model.totalKwh > 0 ? (together / model.totalKwh) * 100 : 0
  const maxKwh = Math.max(0, ...points.map((p) => p.kwh))

  const peakOf = (point: NetworkPointNode) =>
    !model.ambiguousNames.has(point.name) ? (power.analysis?.channelPeaks.get(point.name) ?? null) : null

  const chartData = useMemo((): ChartData<'line'> => {
    // Eje X = unión de períodos de todos los puntos, en orden.
    const labels = new Map<string, string>()
    seriesData.forEach((data) =>
      (data ?? []).forEach((p: ReadingGraphPoint) => {
        if (!labels.has(p.period)) labels.set(p.period, formatReadingsAxisLabel(p, lastBy))
      })
    )
    const periods = [...labels.keys()].sort()
    return {
      labels: periods.map((p) => labels.get(p) ?? p),
      datasets: points.map((point, index) => {
        const byPeriod = new Map((seriesData[index] ?? []).map((p) => [p.period, Math.max(0, p.difference ?? 0)]))
        return {
          label: point.name,
          data: periods.map((p) => byPeriod.get(p) ?? null),
          borderColor: COMPARE_COLORS[index % COMPARE_COLORS.length],
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          pointRadius: lastBy === 'day' ? 3 : 0,
          pointHoverRadius: 5,
          tension: 0.3,
          spanGaps: true,
        }
      }),
    }
  }, [seriesData, points, lastBy])

  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        datalabels: { display: false },
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.raw as number | null
              return value == null ? '' : `${context.dataset.label}: ${value.toLocaleString('es-PE', { maximumFractionDigits: 2 })} kWh`
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#88939b', maxTicksLimit: 12, maxRotation: 0 } },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(136,147,155,0.1)' },
          ticks: { color: '#88939b' },
          title: { display: true, text: lastBy === 'hour' ? 'Consumo por hora (kWh)' : 'Consumo por día (kWh)', color: '#88939b', font: { size: 12, weight: 'bold' } },
        },
      },
    }),
    [lastBy]
  )

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <p className="text-lg font-semibold leading-snug text-foreground">
          {ratio != null && ratio >= 1.1 && top && bottom ? (
            <>
              {top.name} consumió <span className="font-mono text-primary">{ratio.toFixed(1)}×</span> lo de {bottom.name}.
            </>
          ) : (
            'Los puntos elegidos consumieron casi lo mismo.'
          )}
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          Juntos suman <strong className="font-mono text-foreground">{formatKwh(together)} kWh</strong>, el{' '}
          <strong className="font-mono text-foreground">{formatShare(togetherShare)}</strong> de la sede · {range.label}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wide text-text-muted">
              <th className="px-4 py-2.5 font-semibold">Punto</th>
              <th className="px-4 py-2.5 text-right font-semibold">Consumo</th>
              <th className="hidden px-4 py-2.5 text-right font-semibold sm:table-cell">De la sede</th>
              <th className="px-4 py-2.5 text-right font-semibold">Pico</th>
              <th className="hidden w-[28%] px-4 py-2.5 font-semibold md:table-cell" aria-label="Proporción" />
            </tr>
          </thead>
          <tbody>
            {ranked.map(({ point, color }) => {
              const peak = peakOf(point)
              return (
                <tr key={point.key} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">{point.name}</span>
                        <span className="block truncate text-[11px] text-text-muted">{point.panelName}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-foreground">{formatKwh(point.kwh)} kWh</td>
                  <td className="hidden px-4 py-3 text-right font-mono tabular-nums text-text-secondary sm:table-cell">{formatShare(point.shareOfSede)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                    {peak ? `${formatKw(peak.value)} ${power.analysis?.unit ?? 'kW'}` : '—'}
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className="block h-2 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full rounded-full" style={{ width: `${maxKwh > 0 ? (point.kwh / maxKwh) * 100 : 0}%`, backgroundColor: color }} />
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <h3 className="text-base font-semibold text-foreground">{lastBy === 'hour' ? 'Consumo por hora' : 'Consumo por día'}</h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-text-secondary">
          {points.map((point, index) => (
            <span key={point.key} className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded" style={{ backgroundColor: COMPARE_COLORS[index % COMPARE_COLORS.length] }} />
              {point.name}
            </span>
          ))}
        </div>
        <div className={cn('mt-4 h-[340px]', isLoading && 'animate-pulse rounded-lg bg-muted')}>
          {!isLoading && <Line data={chartData} options={options} />}
        </div>
      </section>
    </div>
  )
}
