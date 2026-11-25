import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Line } from 'react-chartjs-2'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
  type Plugin,
} from 'chart.js'
import { Activity, X, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getElectricParameter } from '@/lib/electric-parameters'
import { fetchReadings } from '../api/readings'
import { fetchDeviceMeasurementPointsList } from '../api/measurement-points'
import type { Category } from '../hooks/use-home-filters'
import type { NetworkPowerState } from '../hooks/use-network-insights'
import { findFirstIndicatorWithData, resolveCategoryIndicators } from '../utils/indicators'
import { formatKw, parseDateKey, type NetworkPeriodRange } from '../lib/network-map'
import {
  buildPowerTickLabels,
  describeTimeAboveContracted,
  formatPowerMoment,
  isPeakHour,
} from '../lib/network-power'
import { ReadingsGraph } from './readings-graph'
import { ReadingsTable } from './readings-table'
import { UnbalancedCountersGraph, type UnbalancedType } from './unbalanced-counters-graph'
import { ImbalancedEventsTable } from './imbalanced-events-table'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

export type NetworkDetailKind = 'lecturas' | 'curva' | 'eventos' | 'dias' | 'comparar'

// ─── Contenedor ─────────────────────────────────────────────────────────────

interface NetworkDrawerProps {
  eyebrow: string
  title: string
  onClose: () => void
  children: ReactNode
}

/** Panel lateral sobre el mapa: el detalle se abre sin salir de la pantalla. */
export function NetworkDrawer({ eyebrow, title, onClose, children }: NetworkDrawerProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <div className="network-drawer-backdrop absolute inset-0 bg-[#0B1F24]/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div className="network-drawer-panel relative flex h-full w-full max-w-[1040px] flex-col bg-background shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border bg-card px-6 py-4">
          <div className="min-w-0">
            <p className="label-executive">{eyebrow}</p>
            <h2 className="mt-1 truncate text-lg font-semibold text-foreground">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin">{children}</div>
      </div>
    </div>,
    document.body
  )
}

function SegmentedButtons<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div className="flex w-fit items-center gap-1 rounded-lg border border-border bg-card p-1" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors',
            value === option.value ? 'bg-primary text-white shadow-soft' : 'text-text-secondary hover:bg-secondary hover:text-primary'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

// ─── Lecturas (antes: Análisis por Indicador) ───────────────────────────────

const CATEGORY_OPTIONS: ReadonlyArray<{ value: Category; label: string }> = [
  { value: 'power', label: 'Potencia' },
  { value: 'energy', label: 'Energía' },
  { value: 'current', label: 'Corriente' },
  { value: 'voltage', label: 'Voltaje' },
]

interface NetworkReadingsPanelProps {
  sedeId: number
  panelId: number
  pointId: number
  range: NetworkPeriodRange
}

export function NetworkReadingsPanel({ sedeId, panelId, pointId, range }: NetworkReadingsPanelProps) {
  const [category, setCategory] = useState<Category>('power')
  const [page, setPage] = useState(1)
  const [indicatorSelection, setIndicatorSelection] = useState<{ category: Category; indicator: string } | null>(null)
  const dateAfter = parseDateKey(range.dateAfter)
  const dateBefore = parseDateKey(range.dateBefore)

  // Umbrales y topología del punto (mismo caché que los otros módulos).
  const { data: devices } = useQuery({
    queryKey: ['device-measurement-points-list', sedeId, panelId],
    queryFn: () => fetchDeviceMeasurementPointsList(sedeId, panelId),
    staleTime: 10 * 60 * 1000,
  })
  const measurementPoint = devices?.results.find((p) => p.id === pointId) ?? null

  const { data, isLoading } = useQuery({
    queryKey: ['readings', sedeId, panelId, pointId, range.dateAfter, range.dateBefore, category, page],
    queryFn: () => fetchReadings(sedeId, panelId, pointId, range.dateAfter, range.dateBefore, category, page),
  })

  const indicatorKeys = data && data.results.length > 0 ? Object.keys(data.results[0].indicators.values) : []
  const categoryIndicatorKeys = resolveCategoryIndicators(indicatorKeys, category)
  const chosen = indicatorSelection?.category === category ? indicatorSelection.indicator : null
  const firstWithData = data ? findFirstIndicatorWithData(categoryIndicatorKeys, data.results) : null
  const activeIndicator =
    chosen && categoryIndicatorKeys.includes(chosen) ? chosen : (firstWithData ?? categoryIndicatorKeys[0] ?? 'P')
  const indicatorLabel = getElectricParameter(activeIndicator)?.parameter ?? activeIndicator

  if (!dateAfter || !dateBefore) return null

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedButtons
          label="Tipo de lectura"
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={(value) => {
            setCategory(value)
            setPage(1)
          }}
        />
        <Link
          to="/energia/dashboard/home"
          search={{
            sede: String(sedeId),
            panel: String(panelId),
            punto: String(pointId),
            categoria: category,
            pagina: undefined,
            desde: range.dateAfter,
            hasta: range.dateBefore,
          }}
          className="text-xs font-semibold text-primary hover:text-primary-hover"
        >
          Abrir en Análisis por Indicador (descargas) →
        </Link>
      </div>
      <ReadingsGraph
        key={category}
        headquarterId={sedeId}
        panelId={panelId}
        measurementPointId={pointId}
        dateAfter={dateAfter}
        dateBefore={dateBefore}
        category={category}
        availableIndicators={categoryIndicatorKeys}
        activeIndicator={activeIndicator}
        onIndicatorChange={(indicator) => setIndicatorSelection({ category, indicator })}
        measurementPoint={measurementPoint}
      />
      <ReadingsTable
        data={data}
        isLoading={isLoading}
        dateAfter={dateAfter}
        dateBefore={dateBefore}
        page={page}
        onPageChange={setPage}
        indicatorLabel={indicatorLabel}
      />
    </div>
  )
}

// ─── Curva de potencia (antes: Monitoreo de Potencia) ───────────────────────

function StatBox({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone?: 'danger' | 'warning' }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className={cn('mt-1 font-mono text-xl font-bold tabular-nums', tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-foreground')}>
        {value}
      </p>
      {detail && <p className="mt-0.5 text-xs text-text-muted">{detail}</p>}
    </div>
  )
}

interface NetworkPowerCurvePanelProps {
  power: NetworkPowerState
  /** Elemento resaltado junto a la sede (medidor de un tablero o un punto). */
  focus: { label: string; channel: string } | null
  singleDay: boolean
}

export function NetworkPowerCurvePanel({ power, focus, singleDay }: NetworkPowerCurvePanelProps) {
  const { analysis, granularity } = power

  const chart = useMemo(() => {
    if (!analysis) return null
    const samples = analysis.samples
    const sedeByTime = new Map(analysis.sedeSeries.map((p) => [p.time, p.value]))
    const peakIndex = analysis.sedePeak ? samples.findIndex((s) => s.time === analysis.sedePeak!.time) : -1
    const { contracted, max } = analysis.thresholds
    const flat = (value: number) => samples.map(() => value)
    const threshold = (label: string, value: number, color: string) => ({
      label,
      data: flat(value),
      borderColor: color,
      borderDash: [6, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      pointHoverRadius: 0,
      fill: false,
    })

    const datasets: ChartData<'line'>['datasets'] = []
    if (analysis.sedeSeries.length > 0) {
      datasets.push({
        label: 'Demanda de la sede',
        data: samples.map((s) => sedeByTime.get(s.time) ?? null),
        borderColor: '#00B7CA',
        backgroundColor: 'rgba(0,183,202,0.12)',
        borderWidth: 2,
        fill: true,
        tension: 0.25,
        spanGaps: true,
        pointRadius: samples.map((_, i) => (i === peakIndex ? 5 : 0)),
        pointBackgroundColor: '#E71D36',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
      })
    }
    if (focus) {
      datasets.push({
        label: focus.label,
        data: samples.map((s) => s.values.get(focus.channel) ?? null),
        borderColor: '#9B5DE5',
        borderWidth: 2,
        fill: false,
        tension: 0.25,
        spanGaps: true,
        pointRadius: 0,
      })
    }
    if (contracted != null) datasets.push(threshold(`Contratada: ${formatKw(contracted)} ${analysis.unit}`, contracted, '#FF6B35'))
    if (max != null) datasets.push(threshold(`Máxima: ${formatKw(max)} ${analysis.unit}`, max, '#E71D36'))
    // La potencia instalada no se dibuja: suele duplicar la contratada y aplasta la curva.

    const data: ChartData<'line'> = {
      labels: buildPowerTickLabels(samples.map((s) => s.time), analysis.granularity),
      datasets,
    }
    return { data, samples }
  }, [analysis, focus])

  // Franja de horas punta (18:00–23:00) detrás de la curva.
  const peakBand = useMemo<Plugin<'line'>>(
    () => ({
      id: 'networkPeakBand',
      beforeDatasetsDraw: (instance) => {
        const samples = chart?.samples ?? []
        if (granularity === 'day' || samples.length < 2) return
        const { ctx, chartArea, scales } = instance
        const x = scales.x
        if (!chartArea || !x) return
        const step = x.getPixelForValue(1) - x.getPixelForValue(0)
        ctx.save()
        ctx.fillStyle = 'rgba(231, 29, 54, 0.07)'
        let start: number | null = null
        samples.forEach((sample, i) => {
          const inside = isPeakHour(sample.time)
          if (inside && start === null) start = i
          if ((!inside || i === samples.length - 1) && start !== null) {
            const end = inside ? i : i - 1
            const left = x.getPixelForValue(start) - step / 2
            const right = x.getPixelForValue(end) + step / 2
            ctx.fillRect(left, chartArea.top, right - left, chartArea.bottom - chartArea.top)
            start = null
          }
        })
        ctx.restore()
      },
    }),
    [chart, granularity]
  )

  const unit = analysis?.unit ?? 'kW'
  const samplesForTooltip = chart?.samples
  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        datalabels: { display: false },
        legend: { display: false },
        tooltip: {
          callbacks: {
            // El eje solo rotula horas redondas: el título muestra el instante exacto.
            title: (items) => {
              const sample = items[0] ? samplesForTooltip?.[items[0].dataIndex] : undefined
              return sample ? formatPowerMoment(sample.time, granularity, singleDay) : ''
            },
            label: (context) => {
              const value = context.raw as number | null
              if (value == null) return ''
              return `${context.dataset.label}: ${value.toLocaleString('es-PE', { maximumFractionDigits: 2 })} ${unit}`
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#88939b', autoSkip: false, maxRotation: 0 } },
        y: {
          beginAtZero: true,
          // Aire sobre la línea de la contratada para que no quede pegada al borde.
          grace: '8%',
          grid: { color: 'rgba(136,147,155,0.1)' },
          ticks: { color: '#88939b' },
          title: { display: true, text: `Potencia (${unit})`, color: '#88939b', font: { size: 12, weight: 'bold' } },
        },
      },
    }),
    [unit, samplesForTooltip, granularity, singleDay]
  )

  if (!analysis || !chart) return null
  const peak = analysis.sedePeak
  const contracted = analysis.thresholds.contracted
  const pct = peak && contracted ? (peak.value / contracted) * 100 : null

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatBox
          label="Pico de la sede"
          value={peak ? `${formatKw(peak.value)} ${unit}` : '—'}
          detail={peak ? formatPowerMoment(peak.time, analysis.granularity, singleDay) : 'Sin medidor general en la curva'}
        />
        <StatBox
          label="De la contratada"
          value={pct != null ? `${Math.round(pct)}%` : '—'}
          detail={contracted != null ? `${formatKw(contracted)} ${unit} contratados` : 'Sin potencia contratada'}
          tone={pct != null && pct > 100 ? 'danger' : pct != null && pct >= 90 ? 'warning' : undefined}
        />
        <StatBox
          label="Sobre la contratada"
          value={contracted != null ? String(analysis.bucketsAboveContracted) : '—'}
          detail={contracted != null ? describeTimeAboveContracted(analysis.bucketsAboveContracted, analysis.granularity).replace(/^\d+\s/, '') : undefined}
          tone={analysis.bucketsAboveContracted > 0 ? 'danger' : undefined}
        />
        <StatBox
          label="Hora punta 18:00–23:00"
          value={analysis.peakHoursPeak ? `${formatKw(analysis.peakHoursPeak.value)} ${unit}` : '—'}
          detail={
            analysis.peakHoursPeak
              ? formatPowerMoment(analysis.peakHoursPeak.time, analysis.granularity, singleDay)
              : analysis.granularity === 'day'
                ? 'No disponible con datos por día'
                : 'Sin lecturas en ese horario'
          }
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-secondary">
          {analysis.sedeSeries.length > 0 && (
            <span className="inline-flex items-center gap-2">
              <span className="h-0.5 w-5 rounded bg-primary" /> Demanda de la sede
            </span>
          )}
          {focus && (
            <span className="inline-flex items-center gap-2">
              <span className="h-0.5 w-5 rounded" style={{ backgroundColor: '#9B5DE5' }} /> {focus.label}
            </span>
          )}
          <span className="inline-flex items-center gap-2">
            <span className="h-0 w-5 border-t-2 border-dashed border-[#FF6B35]" /> Contratada
          </span>
          {granularity !== 'day' && (
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-4 rounded-sm bg-danger/10" /> Hora punta
            </span>
          )}
          <span className="ml-auto text-text-muted">
            {granularity === 'minute' ? 'Lecturas por minuto' : granularity === 'hour' ? 'Máximo de cada hora' : 'Máximo de cada día'}
          </span>
        </div>
        {chart.samples.length === 0 ? (
          <div className="flex h-[360px] items-center justify-center gap-2 text-sm text-text-muted">
            <Activity className="h-5 w-5" /> Sin lecturas de potencia en este período
          </div>
        ) : (
          <div className="h-[380px]">
            <Line data={chart.data} options={options} plugins={[peakBand]} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Eventos de desbalance (antes: Desbalance de Carga) ─────────────────────

const UNBALANCE_OPTIONS: ReadonlyArray<{ value: UnbalancedType; label: string }> = [
  { value: 'current', label: 'Corriente' },
  { value: 'voltage', label: 'Voltaje' },
]

interface NetworkUnbalancePanelProps {
  sedeId: number
  panelId: number
  pointId: number
  range: NetworkPeriodRange
}

export function NetworkUnbalancePanel({ sedeId, panelId, pointId, range }: NetworkUnbalancePanelProps) {
  const [type, setType] = useState<UnbalancedType>('current')
  const dateAfter = parseDateKey(range.dateAfter)
  const dateBefore = parseDateKey(range.dateBefore)
  if (!dateAfter || !dateBefore) return null

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedButtons label="Tipo de desbalance" options={UNBALANCE_OPTIONS} value={type} onChange={setType} />
        <p className="flex items-center gap-1.5 text-xs text-text-muted">
          <Zap className="h-3.5 w-3.5" /> Cálculo según la norma IEEE 141
        </p>
      </div>
      <UnbalancedCountersGraph
        key={`counters-${type}`}
        headquarterId={sedeId}
        panelId={panelId}
        measurementPointId={pointId}
        dateAfter={dateAfter}
        dateBefore={dateBefore}
        type={type}
      />
      <ImbalancedEventsTable
        key={`events-${type}`}
        headquarterId={sedeId}
        panelId={panelId}
        measurementPointId={pointId}
        dateAfter={dateAfter}
        dateBefore={dateBefore}
        type={type}
      />
    </div>
  )
}
