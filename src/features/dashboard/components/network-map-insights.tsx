import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Gauge, Scale } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateShort } from '@/lib/date-utils'
import { fetchCurrentImbalanced } from '../api/current-imbalanced'
import { fetchVoltageImbalanced } from '../api/voltage-imbalanced'
import { fetchUnbalancedCurrentCountersGraph } from '../api/unbalanced-current'
import type { DeviceMeasurementPoint } from '../types'
import type { NetworkPowerState, NetworkUnbalanceState } from '../hooks/use-network-insights'
import {
  addDays,
  formatKw,
  parseDateKey,
  toDateKey,
  type NetworkMapModel,
  type NetworkPanelNode,
  type NetworkPeriodRange,
  type NetworkPointNode,
} from '../lib/network-map'
import {
  PEAK_HOURS_END,
  PEAK_HOURS_START,
  describeTimeAboveContracted,
  formatPowerMoment,
  type PowerAnalysis,
} from '../lib/network-power'
import { analyzePhases, latestEvent, type PhaseAnalysis } from '../lib/network-unbalance'
import {
  ErrorNote,
  InsightAction,
  InsightSection,
  ListSkeleton,
  MutedNote,
} from './network-map-ui'

type FactTone = 'ok' | 'warning' | 'danger' | 'neutral'

const FACT_DOT: Record<FactTone, string> = {
  ok: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-text-muted/50',
}

function Fact({ tone, children }: { tone: FactTone; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm leading-snug text-text-secondary">
      <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', FACT_DOT[tone])} aria-hidden="true" />
      <span>{children}</span>
    </li>
  )
}

function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-mono font-semibold tabular-nums text-foreground">{children}</strong>
}

const PEAK_HOURS_LABEL = `${String(PEAK_HOURS_START).padStart(2, '0')}:00–${PEAK_HOURS_END}:00`

// ─── Potencia ───────────────────────────────────────────────────────────────

function PowerGauge({ value, contracted, max, unit }: { value: number; contracted: number; max: number | null; unit: string }) {
  const scale = Math.max(value, contracted, max ?? 0) * 1.08
  const percent = (v: number) => Math.min(100, (v / scale) * 100)
  const pos = (v: number) => `${percent(v)}%`
  const fill = value > contracted ? '#E71D36' : value >= contracted * 0.9 ? '#FF6B35' : '#00B7CA'
  return (
    <div
      className="mt-3"
      role="img"
      aria-label={`Pico de ${formatKw(value)} ${unit} frente a una potencia contratada de ${formatKw(contracted)} ${unit}`}
    >
      <div className="relative h-2.5 rounded-full bg-muted">
        <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700" style={{ width: pos(value), backgroundColor: fill }} />
        <span className="absolute -top-1 h-[18px] w-0.5 rounded-full bg-[#FF6B35]" style={{ left: pos(contracted) }} />
        {max != null && max !== contracted && (
          <span className="absolute -top-1 h-[18px] w-0.5 rounded-full bg-danger" style={{ left: pos(max) }} title={`Máxima: ${formatKw(max)} ${unit}`} />
        )}
      </div>
      <div className="relative mt-1 h-4 text-[10px] font-medium text-text-muted">
        {/* Cerca del borde derecho, la etiqueta termina en la marca en vez de centrarse en ella. */}
        <span
          className={cn('absolute whitespace-nowrap', percent(contracted) > 80 ? '-translate-x-full' : '-translate-x-1/2')}
          style={{ left: pos(contracted) }}
        >
          Contratada {formatKw(contracted)} {unit}
        </span>
      </div>
    </div>
  )
}

function sampleValueAt(analysis: PowerAnalysis, time: number, channel: string): number | null {
  return analysis.samples.find((s) => s.time === time)?.values.get(channel) ?? null
}

function SedePower({ analysis, singleDay, onSelectByName }: { analysis: PowerAnalysis; singleDay: boolean; onSelectByName: (name: string) => void }) {
  const peak = analysis.sedePeak
  if (!peak) {
    return (
      <MutedNote>
        No se encontró el medidor general en la curva de potencia, así que no se puede calcular la demanda de la sede.
      </MutedNote>
    )
  }
  const { contracted, max } = analysis.thresholds
  const unit = analysis.unit
  const pct = contracted ? (peak.value / contracted) * 100 : null
  const contributor = analysis.contributorAtPeak

  return (
    <>
      <p className="text-sm text-text-secondary">
        Pico de <Strong>{formatKw(peak.value)} {unit}</Strong> · {formatPowerMoment(peak.time, analysis.granularity, singleDay)}
      </p>
      {contracted != null && contracted > 0 && <PowerGauge value={peak.value} contracted={contracted} max={max} unit={unit} />}
      <ul className="mt-2 space-y-1.5">
        {pct != null && contracted != null && (
          <Fact tone={pct > 100 ? 'danger' : pct >= 90 ? 'warning' : 'ok'}>
            {pct > 100
              ? `Superó la contratada (${formatKw(contracted)} ${unit}): llegó al ${Math.round(pct)}%`
              : `${Math.round(pct)}% de la potencia contratada (${formatKw(contracted)} ${unit})`}
          </Fact>
        )}
        {contracted != null && contracted > 0 && (
          <Fact tone={analysis.bucketsAboveContracted > 0 ? 'danger' : 'ok'}>
            {describeTimeAboveContracted(analysis.bucketsAboveContracted, analysis.granularity)}
          </Fact>
        )}
        {analysis.granularity !== 'day' && (
          <Fact tone="neutral">
            {analysis.peakHoursPeak ? (
              <>
                En hora punta ({PEAK_HOURS_LABEL}): <Strong>{formatKw(analysis.peakHoursPeak.value)} {unit}</Strong> ·{' '}
                {formatPowerMoment(analysis.peakHoursPeak.time, analysis.granularity, singleDay)}
              </>
            ) : (
              `Sin lecturas en hora punta (${PEAK_HOURS_LABEL})`
            )}
          </Fact>
        )}
        {contributor && (
          <Fact tone="neutral">
            En el pico, el punto que más aportaba era{' '}
            <button
              type="button"
              onClick={() => onSelectByName(contributor.name)}
              className="font-semibold text-foreground underline decoration-primary/40 underline-offset-2 hover:text-primary"
            >
              {contributor.name}
            </button>
            : <Strong>{formatKw(contributor.value)} {unit}</Strong> ({Math.round(contributor.share)}%)
          </Fact>
        )}
      </ul>
    </>
  )
}

function PanelPower({
  analysis,
  model,
  panel,
  singleDay,
  onSelectPoint,
}: {
  analysis: PowerAnalysis
  model: NetworkMapModel
  panel: NetworkPanelNode
  singleDay: boolean
  onSelectPoint: (point: NetworkPointNode) => void
}) {
  const unit = analysis.unit
  const mainName = panel.mainMeterName
  const peak = mainName && !model.ambiguousNames.has(mainName) ? analysis.channelPeaks.get(mainName) : undefined
  const top = panel.points
    .filter((p) => !p.isOtherLoads && !model.ambiguousNames.has(p.name))
    .map((p) => ({ point: p, peak: analysis.channelPeaks.get(p.name) }))
    .filter((p): p is { point: NetworkPointNode; peak: NonNullable<typeof p.peak> } => p.peak != null)
    .reduce<{ point: NetworkPointNode; peak: { value: number; time: number } } | null>(
      (best, p) => (!best || p.peak.value > best.peak.value ? p : best),
      null
    )

  return (
    <>
      {peak ? (
        <p className="text-sm text-text-secondary">
          Pico del tablero: <Strong>{formatKw(peak.value)} {unit}</Strong> · {formatPowerMoment(peak.time, analysis.granularity, singleDay)}
        </p>
      ) : (
        <MutedNote>Sin curva de potencia para el medidor general de este tablero.</MutedNote>
      )}
      {top && (
        <p className="mt-1.5 text-sm text-text-secondary">
          Punto con mayor pico:{' '}
          <button
            type="button"
            onClick={() => onSelectPoint(top.point)}
            className="font-semibold text-foreground underline decoration-primary/40 underline-offset-2 hover:text-primary"
          >
            {top.point.name}
          </button>{' '}
          · <Strong>{formatKw(top.peak.value)} {unit}</Strong>
        </p>
      )}
    </>
  )
}

function PointPower({
  analysis,
  model,
  point,
  limit,
  singleDay,
}: {
  analysis: PowerAnalysis
  model: NetworkMapModel
  point: NetworkPointNode
  limit: number | null
  singleDay: boolean
}) {
  const unit = analysis.unit
  if (model.ambiguousNames.has(point.name)) {
    return <MutedNote>Hay otro punto con el mismo nombre en la sede y la curva de potencia no permite distinguirlos.</MutedNote>
  }
  const peak = analysis.channelPeaks.get(point.name)
  if (!peak) return <MutedNote>Sin curva de potencia para este punto en el período.</MutedNote>

  const atSedePeak = analysis.sedePeak ? sampleValueAt(analysis, analysis.sedePeak.time, point.name) : null
  const shareAtPeak = atSedePeak != null && analysis.sedePeak && analysis.sedePeak.value > 0 ? (atSedePeak / analysis.sedePeak.value) * 100 : null

  return (
    <>
      <p className="text-sm text-text-secondary">
        Pico de <Strong>{formatKw(peak.value)} {unit}</Strong> · {formatPowerMoment(peak.time, analysis.granularity, singleDay)}
      </p>
      <ul className="mt-2 space-y-1.5">
        {limit != null && (
          <Fact tone={peak.value > limit ? 'danger' : 'ok'}>
            {peak.value > limit
              ? `Superó su límite de ${formatKw(limit)} ${unit}`
              : `Dentro de su límite (máx. ${formatKw(limit)} ${unit})`}
          </Fact>
        )}
        {atSedePeak != null && shareAtPeak != null && (
          <Fact tone="neutral">
            En el pico de la sede aportaba <Strong>{formatKw(atSedePeak)} {unit}</Strong> ({Math.round(shareAtPeak)}%)
          </Fact>
        )}
      </ul>
    </>
  )
}

interface PowerInsightProps {
  scope: 'sede' | 'panel' | 'point'
  power: NetworkPowerState
  model: NetworkMapModel
  singleDay: boolean
  panel?: NetworkPanelNode
  point?: NetworkPointNode
  pointLimit?: number | null
  onSelectPoint: (point: NetworkPointNode) => void
  onOpenCurve: () => void
}

export function PowerInsight({ scope, power, model, singleDay, panel, point, pointLimit = null, onSelectPoint, onOpenCurve }: PowerInsightProps) {
  const { analysis, isLoading, isError, granularity } = power
  const hasData = analysis != null && analysis.samples.length > 0

  const selectByName = (name: string) => {
    for (const p of model.panels) {
      const match = p.points.find((pt) => pt.name === name && !pt.isOtherLoads)
      if (match) return onSelectPoint(match)
    }
  }

  return (
    <InsightSection
      icon={Gauge}
      title="Potencia"
      action={hasData ? <InsightAction onClick={onOpenCurve}>Ver curva</InsightAction> : undefined}
    >
      {isLoading ? (
        <ListSkeleton rows={2} />
      ) : isError ? (
        <ErrorNote text="No se pudo cargar la potencia de la sede." />
      ) : !hasData ? (
        <MutedNote>Sin lecturas de potencia en este período.</MutedNote>
      ) : scope === 'sede' ? (
        <SedePower analysis={analysis} singleDay={singleDay} onSelectByName={selectByName} />
      ) : scope === 'panel' && panel ? (
        <PanelPower analysis={analysis} model={model} panel={panel} singleDay={singleDay} onSelectPoint={onSelectPoint} />
      ) : point ? (
        <PointPower analysis={analysis} model={model} point={point} limit={pointLimit} singleDay={singleDay} />
      ) : null}
      {hasData && granularity !== 'minute' && (
        <p className="mt-2 text-[11px] leading-snug text-text-muted">
          {granularity === 'hour'
            ? 'Calculado con el máximo de cada hora: el pico exacto ocurrió dentro de esa hora.'
            : 'Calculado con el máximo de cada día.'}
        </p>
      )}
    </InsightSection>
  )
}

// ─── Desbalance: resumen de la sede o de un tablero ─────────────────────────

interface UnbalanceSummaryProps {
  unbalance: NetworkUnbalanceState
  model: NetworkMapModel
  panel?: NetworkPanelNode
  onSelectPoint: (point: NetworkPointNode) => void
  onSelectPanel: (panel: NetworkPanelNode) => void
}

export function UnbalanceSummary({ unbalance, model, panel, onSelectPoint, onSelectPanel }: UnbalanceSummaryProps) {
  const { ranks, isLoading, isError } = unbalance
  const visible = panel
    ? ranks.filter((r) => r.pointId === panel.mainMeterId || panel.points.some((p) => p.id === r.pointId))
    : ranks

  const locate = (pointId: number) => {
    for (const p of model.panels) {
      const point = p.points.find((pt) => pt.id === pointId)
      if (point) return { panel: p, point }
      if (p.mainMeterId === pointId) return { panel: p, point: null }
    }
    return null
  }

  return (
    <InsightSection icon={Scale} title="Desbalance entre fases">
      {panel?.isSinglePhase ? (
        <MutedNote>No aplica: es un tablero monofásico.</MutedNote>
      ) : isLoading ? (
        <ListSkeleton rows={2} />
      ) : isError ? (
        <ErrorNote text="No se pudo cargar el desbalance de la sede." />
      ) : visible.length === 0 ? (
        <MutedNote>
          {panel
            ? 'Ningún punto de este tablero está entre los 3 con más desbalance de la sede.'
            : 'Ningún punto registró desbalance en este período.'}
        </MutedNote>
      ) : (
        <>
          <ul className="-mx-2 space-y-0.5">
            {visible.map((rank) => {
              const place = locate(rank.pointId)
              return (
                <li key={rank.pointId}>
                  <button
                    type="button"
                    disabled={!place}
                    onClick={() => {
                      if (place?.point) onSelectPoint(place.point)
                      else if (place) onSelectPanel(place.panel)
                    }}
                    className="group w-full rounded-lg px-2 py-2 text-left transition-colors enabled:hover:bg-warning/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold text-white',
                            rank.rank === 1 ? 'bg-danger' : 'bg-warning'
                          )}
                        >
                          {rank.rank}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground group-hover:text-primary">
                            {rank.name}
                          </span>
                          <span className="block truncate text-[11px] text-text-muted">
                            {place ? (place.point ? place.panel.name : `Medidor general de ${place.panel.name}`) : 'Punto de la sede'}
                          </span>
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-mono text-sm font-semibold tabular-nums text-foreground">
                          {rank.worstPct.toFixed(1)}%
                        </span>
                        <span className="block text-[11px] text-text-muted">{rank.worstKind}</span>
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-[11px] leading-snug text-text-muted">
            % de las lecturas del período con desbalance (IEEE 141). Un desbalance sostenido calienta cables, motores y
            transformadores.
          </p>
        </>
      )}
    </InsightSection>
  )
}

// ─── Desbalance de un punto ─────────────────────────────────────────────────

function PhaseBars({ analysis }: { analysis: PhaseAnalysis }) {
  const max = Math.max(...analysis.phases.map((p) => p.value))
  return (
    <div className="mt-3 flex items-end gap-3" role="img" aria-label={`Fases: ${analysis.phases.map((p) => `${p.label} ${p.value.toFixed(1)} ${analysis.unit}`).join(', ')}`}>
      {analysis.phases.map((phase) => {
        const isWorst = phase.key === analysis.worst.key
        return (
          <div key={phase.key} className="flex flex-1 flex-col items-center gap-1">
            <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground">
              {phase.value.toLocaleString('es-PE', { maximumFractionDigits: 1 })}
            </span>
            <div className="flex h-14 w-full items-end rounded-md bg-muted/70">
              <div
                className="w-full rounded-md transition-[height] duration-500"
                style={{ height: `${max > 0 ? (phase.value / max) * 100 : 0}%`, backgroundColor: isWorst ? '#FF6B35' : '#00B7CA' }}
              />
            </div>
            <span className={cn('text-[11px] font-semibold', isWorst ? 'text-warning' : 'text-text-muted')}>{phase.label}</span>
          </div>
        )
      })}
      <span className="pb-6 text-[10px] text-text-muted">{analysis.unit}</span>
    </div>
  )
}

function CountStrip({ counts }: { counts: Array<{ date: string; unbalanced_count: number }> }) {
  const max = Math.max(0, ...counts.map((c) => c.unbalanced_count))
  if (counts.length === 0 || max === 0) return null
  return (
    <div className="mt-3">
      <p className="text-[11px] font-medium text-text-muted">Lecturas con desbalance de corriente por día</p>
      <div className="mt-1.5 flex h-10 items-end gap-[3px]">
        {counts.map((c) => (
          <div
            key={c.date}
            title={`${formatDateShort(c.date)}: ${c.unbalanced_count} lecturas`}
            className="flex-1 rounded-t-sm"
            style={{
              height: `${Math.max(c.unbalanced_count > 0 ? 8 : 3, (c.unbalanced_count / max) * 100)}%`,
              backgroundColor: c.unbalanced_count > 0 ? 'rgba(255,107,53,0.75)' : '#E8E8E3',
            }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-text-muted">
        <span>{formatDateShort(counts[0].date)}</span>
        {counts.length > 1 && <span>{formatDateShort(counts[counts.length - 1].date)}</span>}
      </div>
    </div>
  )
}

interface PointUnbalanceInsightProps {
  sedeId: number
  panel: NetworkPanelNode
  pointId: number
  range: NetworkPeriodRange
  device: DeviceMeasurementPoint | undefined
  onOpenEvents: () => void
}

export function PointUnbalanceInsight({ sedeId, panel, pointId, range, device, onOpenEvents }: PointUnbalanceInsightProps) {
  const singlePhase = panel.isSinglePhase || device?.monitoring_topology === 'mono_1f'
  // La tira de días cubre el período y, como mínimo, los últimos 7 días.
  const end = parseDateKey(range.dateBefore)
  const weekStart = end ? toDateKey(addDays(end, -6)) : range.dateAfter
  const stripAfter = weekStart < range.dateAfter ? weekStart : range.dateAfter

  // Mismas keys que la tabla de eventos y la gráfica de conteos del módulo Desbalance.
  const current = useQuery({
    queryKey: ['current-imbalanced-events', sedeId, panel.id, pointId, range.dateAfter, range.dateBefore, 1],
    queryFn: () => fetchCurrentImbalanced(sedeId, panel.id, pointId, range.dateAfter, range.dateBefore, 1),
    enabled: !singlePhase,
    staleTime: 5 * 60 * 1000,
  })
  const voltage = useQuery({
    queryKey: ['voltage-imbalanced-events', sedeId, panel.id, pointId, range.dateAfter, range.dateBefore, 1],
    queryFn: () => fetchVoltageImbalanced(sedeId, panel.id, pointId, range.dateAfter, range.dateBefore, 1),
    enabled: !singlePhase,
    staleTime: 5 * 60 * 1000,
  })
  const counters = useQuery({
    queryKey: ['unbalanced-current-counters', sedeId, panel.id, pointId, stripAfter, range.dateBefore],
    queryFn: () => fetchUnbalancedCurrentCountersGraph(sedeId, panel.id, pointId, stripAfter, range.dateBefore),
    enabled: !singlePhase,
    staleTime: 5 * 60 * 1000,
  })

  const currentCount = current.data?.count ?? 0
  const voltageCount = voltage.data?.count ?? 0
  const lastEvent = latestEvent(current.data?.results)
  const phases = analyzePhases(lastEvent, 'current')
  const hasEvents = currentCount + voltageCount > 0

  return (
    <InsightSection
      icon={Scale}
      title="Desbalance entre fases"
      action={!singlePhase && hasEvents ? <InsightAction onClick={onOpenEvents}>Ver eventos</InsightAction> : undefined}
    >
      {singlePhase ? (
        <MutedNote>No aplica: es un punto monofásico.</MutedNote>
      ) : current.isLoading || voltage.isLoading ? (
        <ListSkeleton rows={2} />
      ) : current.isError && voltage.isError ? (
        <ErrorNote text="No se pudo cargar el desbalance de este punto." />
      ) : !hasEvents ? (
        <ul>
          <Fact tone="ok">Sin desbalance en este período.</Fact>
        </ul>
      ) : (
        <>
          <p className="text-sm text-text-secondary">
            <Strong>{currentCount.toLocaleString('es-PE')}</Strong> lecturas con desbalance de corriente y{' '}
            <Strong>{voltageCount.toLocaleString('es-PE')}</Strong> de voltaje.
          </p>
          {phases && lastEvent && (
            <>
              <PhaseBars analysis={phases} />
              <p className="mt-2 text-sm leading-snug text-text-secondary">
                Último evento ({new Date(lastEvent.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })}): la fase{' '}
                <strong className="text-foreground">{phases.worst.label}</strong> lleva{' '}
                <Strong>{Math.abs(phases.worst.deviationPct).toFixed(0)}%</Strong>{' '}
                {phases.worst.deviationPct >= 0 ? 'más' : 'menos'} corriente que el promedio de las fases.
              </p>
            </>
          )}
        </>
      )}
      {!singlePhase && <CountStrip counts={counters.data?.[0]?.results ?? []} />}
    </InsightSection>
  )
}
