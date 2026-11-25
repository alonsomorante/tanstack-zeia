import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Bell, CalendarRange, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  fetchAlertsLatestBySubtype,
  fetchCurrentMonitoringLatestByPhase,
  fetchHarmonicDistortionLatestByPhase,
  fetchPowerDemandLatestBySubtype,
  fetchVoltageFluctuationLatestByPhase,
} from '../api/alerts'
import { fetchReadingsGraphEspecific } from '../api/readings-graph-especific'
import type { AlertItem, AlertsLatestBySubtypeResponse, DeviceMeasurementPoint } from '../types'
import { formatKwh, type NetworkPeriodRange } from '../lib/network-map'
import {
  averageProfile,
  compareWithHabitual,
  getComparisonWindow,
  parseDayProfiles,
  sameWeekdayReferences,
  weekdayName,
  type HourlyValues,
} from '../lib/network-day-profile'
import {
  currentMetric,
  fetchLatestReading,
  formatRelativeTime,
  powerMetric,
  voltageMetric,
  type LiveCategory,
  type LiveMetric,
  type LiveStatus,
} from '../lib/network-live'
import { ErrorNote, InsightAction, InsightSection, ListSkeleton, MutedNote } from './network-map-ui'

// ─── Ahora ──────────────────────────────────────────────────────────────────

const LIVE_CATEGORIES: LiveCategory[] = ['power', 'voltage', 'current']

const STATUS_STYLES: Record<LiveStatus, { label: string; className: string }> = {
  ok: { label: 'En rango', className: 'bg-success/10 text-[#1E9E93]' },
  high: { label: 'Sobre límite', className: 'bg-danger/10 text-danger' },
  low: { label: 'Bajo límite', className: 'bg-warning/10 text-warning' },
  unknown: { label: 'Sin límite', className: 'bg-muted text-text-muted' },
}

function MetricTile({ metric }: { metric: LiveMetric }) {
  const status = STATUS_STYLES[metric.status]
  return (
    <div className="min-w-0 rounded-lg border border-border px-2.5 py-2" title={metric.limitText ? `Límite: ${metric.limitText}` : undefined}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">{metric.label}</p>
      <p className="mt-0.5 truncate font-mono text-sm font-semibold tabular-nums text-foreground">
        {metric.display} <span className="text-[10px] font-medium text-text-muted">{metric.unit}</span>
      </p>
      <span className={cn('mt-1 inline-block whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold', status.className)}>
        {status.label}
      </span>
    </div>
  )
}

interface LiveInsightProps {
  sedeId: number
  panelId: number
  pointId: number
  todayKey: string
  device: DeviceMeasurementPoint | undefined
  onOpenReadings: () => void
}

export function LiveInsight({ sedeId, panelId, pointId, todayKey, device, onOpenReadings }: LiveInsightProps) {
  const queries = useQueries({
    queries: LIVE_CATEGORIES.map((category) => ({
      queryKey: ['network-latest-reading', sedeId, panelId, pointId, todayKey, category],
      queryFn: () => fetchLatestReading(sedeId, panelId, pointId, todayKey, category),
      staleTime: 60 * 1000,
      refetchInterval: 60 * 1000,
    })),
  })
  const [power, voltage, current] = queries
  const metrics = [
    powerMetric(power.data ?? null, device),
    voltageMetric(voltage.data ?? null, device),
    currentMetric(current.data ?? null, device),
  ].filter((m): m is LiveMetric => m != null)

  const readings = queries.map((q) => q.data).filter((r) => r != null)
  const latestTime = Math.max(-Infinity, ...readings.map((r) => new Date(r.created_at).getTime()).filter(Number.isFinite))
  const checkedAt = Math.max(...queries.map((q) => q.dataUpdatedAt))
  const isStale = Number.isFinite(latestTime) && checkedAt - latestTime > 30 * 60 * 1000

  return (
    <InsightSection icon={Radio} title="Ahora" action={<InsightAction onClick={onOpenReadings}>Ver lecturas</InsightAction>}>
      {queries.some((q) => q.isLoading) ? (
        <ListSkeleton rows={1} />
      ) : queries.every((q) => q.isError) ? (
        <ErrorNote text="No se pudieron cargar las lecturas de hoy." />
      ) : metrics.length === 0 ? (
        <MutedNote>Sin lecturas hoy.</MutedNote>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {metrics.map((metric) => (
              <MetricTile key={metric.key} metric={metric} />
            ))}
          </div>
          {Number.isFinite(latestTime) && (
            <p className={cn('mt-2 flex items-center gap-1.5 text-[11px]', isStale ? 'text-warning' : 'text-text-muted')}>
              <span className={cn('h-1.5 w-1.5 rounded-full', isStale ? 'bg-warning' : 'animate-pulse bg-success')} aria-hidden="true" />
              {isStale ? 'Sin lecturas recientes · última ' : 'Última lectura '}
              {formatRelativeTime(latestTime, checkedAt)} ·{' '}
              {new Date(latestTime).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </p>
          )}
        </>
      )}
    </InsightSection>
  )
}

// ─── Hoy vs lo habitual ─────────────────────────────────────────────────────

function DaySparkline({ today, habitual, throughHour }: { today: HourlyValues; habitual: HourlyValues; throughHour: number }) {
  const width = 280
  const height = 64
  const values = [...today, ...habitual].filter((v): v is number => v != null)
  const max = Math.max(0, ...values)
  if (max <= 0) return null
  const x = (hour: number) => (hour / 23) * width
  const y = (value: number) => height - 4 - (value / max) * (height - 10)
  const path = (series: HourlyValues, untilHour = 24) => {
    let d = ''
    let open = false
    series.forEach((v, hour) => {
      if (v == null || hour >= untilHour) {
        open = false
        return
      }
      d += `${open ? 'L' : 'M'} ${x(hour).toFixed(1)} ${y(v).toFixed(1)} `
      open = true
    })
    return d.trim()
  }
  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full overflow-visible" role="img" aria-label="Consumo por hora de hoy frente a lo habitual">
        {throughHour > 0 && throughHour < 24 && (
          <rect x={x(throughHour)} y={0} width={width - x(throughHour)} height={height} fill="#F5F5F0" />
        )}
        <path d={path(habitual)} fill="none" stroke="#4D5A63" strokeOpacity={0.55} strokeWidth={1.75} strokeDasharray="4 4" />
        <path d={path(today)} fill="none" stroke="#00B7CA" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-text-muted">
        <span>00:00</span>
        <span className="flex items-center gap-3 font-sans">
          <span className="inline-flex items-center gap-1">
            <span className="h-0.5 w-3 rounded bg-primary" /> Hoy
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-0 w-3 border-t-2 border-dashed border-[#4D5A63]/60" /> Habitual
          </span>
        </span>
        <span>23:00</span>
      </div>
    </div>
  )
}

interface HabitualInsightProps {
  sedeId: number
  panelId: number
  pointId: number
  today: Date
  onOpenDays: () => void
}

export function HabitualInsight({ sedeId, panelId, pointId, today, onOpenDays }: HabitualInsightProps) {
  const window = useMemo(() => getComparisonWindow(today), [today])
  // Misma consulta (5 semanas) que la comparación de días: abrirla no vuelve a pedir datos.
  const { data, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ['readings-graph-especific', sedeId, panelId, pointId, window.dateAfter, window.dateBefore],
    queryFn: () => fetchReadingsGraphEspecific(sedeId, panelId, pointId, window.dateAfter, window.dateBefore),
    staleTime: 5 * 60 * 1000,
  })

  const profiles = useMemo(() => parseDayProfiles(data), [data])
  const todayProfile = profiles.get(window.todayKey)
  const references = sameWeekdayReferences(profiles, window.todayKey)
  const habitual = averageProfile(references)
  const currentHour = new Date(dataUpdatedAt || today.getTime()).getHours()
  const comparison = compareWithHabitual(todayProfile, habitual, currentHour)
  const weekday = weekdayName(window.todayKey)
  const weekdays = weekdayName(window.todayKey, true)

  let headline: string
  let tone: 'up' | 'down' | 'same' = 'same'
  if (comparison) {
    const delta = Math.round(comparison.deltaPct)
    if (delta >= 5) {
      tone = 'up'
      headline = `Hoy va ${delta}% por encima de un ${weekday} habitual`
    } else if (delta <= -5) {
      tone = 'down'
      headline = `Hoy va ${Math.abs(delta)}% por debajo de un ${weekday} habitual`
    } else {
      headline = `Hoy va igual que un ${weekday} habitual`
    }
  } else if (!todayProfile) {
    headline = 'Aún no hay consumo registrado hoy.'
  } else if (references.length === 0) {
    headline = `Aún no hay ${weekdays} anteriores completos para comparar.`
  } else {
    headline = 'Todavía no hay horas completas para comparar.'
  }

  return (
    <InsightSection icon={CalendarRange} title="Hoy vs lo habitual" action={<InsightAction onClick={onOpenDays}>Comparar días</InsightAction>}>
      {isLoading ? (
        <ListSkeleton rows={2} />
      ) : isError ? (
        <ErrorNote text="No se pudo cargar el consumo por hora de este punto." />
      ) : (
        <>
          <p
            className={cn(
              'text-sm font-semibold leading-snug',
              tone === 'up' ? 'text-warning' : tone === 'down' ? 'text-[#1E9E93]' : 'text-foreground'
            )}
          >
            {headline}
          </p>
          {comparison && (
            <p className="mt-1 text-xs text-text-secondary">
              <span className="font-mono tabular-nums">{formatKwh(comparison.todayKwh)} kWh</span> frente a{' '}
              <span className="font-mono tabular-nums">{formatKwh(comparison.habitualKwh)} kWh</span> de 00:00 a{' '}
              {String(comparison.throughHour).padStart(2, '0')}:00
            </p>
          )}
          {todayProfile && (
            <DaySparkline today={todayProfile.hours} habitual={habitual} throughHour={Math.min(24, currentHour + 1)} />
          )}
          {references.length > 0 && (
            <p className="mt-1.5 text-[11px] text-text-muted">
              Habitual: promedio de {references.length === 1 ? `el ${weekday} anterior` : `los ${references.length} ${weekdays} anteriores`}.
            </p>
          )}
        </>
      )}
    </InsightSection>
  )
}

// ─── Alertas de hoy ─────────────────────────────────────────────────────────

const ALERT_SOURCES: Array<{
  label: string
  key: string
  fetch: (id: number) => Promise<AlertsLatestBySubtypeResponse>
}> = [
  // Mismas keys que el resumen del módulo Alertas: comparten caché.
  { label: 'Energía', key: 'alerts-latest-by-subtype', fetch: (id) => fetchAlertsLatestBySubtype({ measurementPointId: id }) },
  { label: 'Voltaje', key: 'voltage-fluctuation-latest-by-phase', fetch: (id) => fetchVoltageFluctuationLatestByPhase({ measurementPointId: id }) },
  { label: 'Potencia', key: 'power-demand-latest-by-subtype', fetch: (id) => fetchPowerDemandLatestBySubtype({ measurementPointId: id }) },
  { label: 'Corriente', key: 'current-monitoring-latest-by-phase', fetch: (id) => fetchCurrentMonitoringLatestByPhase({ measurementPointId: id }) },
  { label: 'Armónicos', key: 'harmonic-distortion-latest-by-phase', fetch: (id) => fetchHarmonicDistortionLatestByPhase({ measurementPointId: id }) },
]

function formatAlertNumber(value: number | null): string {
  return value == null ? '—' : value.toLocaleString('es-PE', { maximumFractionDigits: 2 })
}

interface AlertsInsightProps {
  sedeId: number
  panelId: number
  pointId: number
  range: NetworkPeriodRange
}

export function AlertsInsight({ sedeId, panelId, pointId, range }: AlertsInsightProps) {
  const queries = useQueries({
    queries: ALERT_SOURCES.map((source) => ({
      queryKey: [source.key, pointId],
      queryFn: () => source.fetch(pointId),
      staleTime: 2 * 60 * 1000,
    })),
  })

  const isLoading = queries.some((q) => q.isLoading)
  const failed = queries.filter((q) => q.isError).length
  const byCategory = ALERT_SOURCES.map((source, i) => ({
    label: source.label,
    count: queries[i].data?.today_count ?? 0,
    results: queries[i].data?.results ?? [],
  }))
  const total = byCategory.reduce((sum, c) => sum + c.count, 0)
  const latest: Array<AlertItem & { category: string }> = byCategory
    .filter((c) => c.count > 0)
    .flatMap((c) => c.results.slice(0, 2).map((item) => ({ ...item, category: c.label })))
    .slice(0, 3)

  return (
    <InsightSection
      icon={Bell}
      title="Alertas de hoy"
      action={
        <Link
          to="/energia/dashboard/alertas-historial"
          search={{
            sede: String(sedeId),
            panel: String(panelId),
            punto: String(pointId),
            desde: range.dateAfter,
            hasta: range.dateBefore,
            pagina: undefined,
            subtype: undefined,
            category: undefined,
            indicator: undefined,
            phase: undefined,
          }}
          className="shrink-0 text-xs font-semibold text-primary hover:text-primary-hover"
        >
          Historial →
        </Link>
      }
    >
      {isLoading ? (
        <ListSkeleton rows={1} />
      ) : failed === ALERT_SOURCES.length ? (
        <ErrorNote text="No se pudieron cargar las alertas de este punto." />
      ) : total === 0 ? (
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
          Sin alertas hoy.
        </p>
      ) : (
        <>
          <p className="text-sm text-text-secondary">
            <strong className="font-mono text-base font-semibold tabular-nums text-danger">{total}</strong>{' '}
            {total === 1 ? 'alerta' : 'alertas'} hoy
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {byCategory
              .filter((c) => c.count > 0)
              .map((c) => (
                <span key={c.label} className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
                  {c.label} · {c.count}
                </span>
              ))}
          </div>
          {latest.length > 0 && (
            <ul className="mt-3 space-y-2">
              {latest.map((alert) => (
                <li key={`${alert.category}-${alert.id}`} className="rounded-lg border border-border px-3 py-2">
                  <p className="flex items-center justify-between gap-2 text-[13px] font-medium text-foreground">
                    <span className="truncate">{alert.subindicator_name || alert.indicator_name}</span>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-text-muted">{alert.time}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-text-muted">
                    {alert.category}
                    {alert.origin ? ` · ${alert.origin}` : ''} · valor {formatAlertNumber(alert.value)} · límite{' '}
                    {formatAlertNumber(alert.limit)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {failed > 0 && failed < ALERT_SOURCES.length && (
        <p className="mt-2 text-[11px] text-warning">No se pudieron cargar {failed} de las 5 categorías.</p>
      )}
    </InsightSection>
  )
}
