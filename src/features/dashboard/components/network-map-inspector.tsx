import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, CalendarRange, Camera, Check, Cpu, GitCompareArrows, Info, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  MAX_COMPARE_POINTS,
  formatInstallationDate,
  formatShare,
  toDateKey,
  type NetworkMapModel,
  type NetworkPanelNode,
  type NetworkPeriodRange,
  type NetworkPointNode,
  type NetworkSelection,
  type ResolvedNetworkSelection,
} from '../lib/network-map'
import type { DeviceMeasurementPoint, Headquarter } from '../types'
import type { NetworkPowerState, NetworkUnbalanceState } from '../hooks/use-network-insights'
import type { NetworkDetailKind } from './network-map-drawers'
import { PointUnbalanceInsight, PowerInsight, UnbalanceSummary } from './network-map-insights'
import { AlertsInsight, HabitualInsight, LiveInsight } from './network-point-insights'
import { NetworkMapTrend } from './network-map-trend'
import {
  Breadcrumb,
  Chip,
  DetailRow,
  EnergyHero,
  InsightAction,
  InsightSection,
  PhotoModal,
  PointList,
  StatTile,
} from './network-map-ui'

interface NetworkMapInspectorProps {
  sedeId: number
  headquarter: Headquarter
  model: NetworkMapModel
  selection: ResolvedNetworkSelection
  range: NetworkPeriodRange
  today: Date
  power: NetworkPowerState
  unbalance: NetworkUnbalanceState
  devicesById: ReadonlyMap<number, DeviceMeasurementPoint>
  compareIds: number[]
  onSelect: (selection: NetworkSelection) => void
  onToggleCompare: (pointId: number) => void
  onOpenDetail: (detail: NetworkDetailKind) => void
  className?: string
}

export function NetworkMapInspector(props: NetworkMapInspectorProps) {
  const { selection, className } = props
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null)
  const selectionKey =
    selection.kind === 'sede' ? 'sede' : selection.kind === 'panel' ? selection.panel.key : selection.point.key

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-5">
        <div key={selectionKey} className="animate-fade-in">
          {selection.kind === 'sede' ? (
            <SedeDetail {...props} />
          ) : selection.kind === 'panel' ? (
            <PanelDetail {...props} panel={selection.panel} />
          ) : (
            <PointDetail {...props} panel={selection.panel} point={selection.point} onZoomPhoto={setZoomPhoto} />
          )}
        </div>
      </CardContent>
      {zoomPhoto && <PhotoModal url={zoomPhoto} onClose={() => setZoomPhoto(null)} />}
    </Card>
  )
}

function selectPoint(onSelect: NetworkMapInspectorProps['onSelect']) {
  return (point: NetworkPointNode) => onSelect({ kind: 'point', panelId: point.panelId, pointKey: point.key })
}

/** Botones de acción del punto (Comparar días / Comparar con otros). */
const POINT_ACTION =
  'inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-40'

// ─── Sede ───────────────────────────────────────────────────────────────────

function SedeDetail({ sedeId, headquarter, model, range, power, unbalance, onSelect, onOpenDetail }: NetworkMapInspectorProps) {
  const isLoading = !model.isComplete
  const maxKwh = model.topPoints[0]?.kwh ?? 0
  const singleDay = range.days === 1

  return (
    <div>
      <p className="label-executive">Sede · {range.label}</p>
      <h2 className="mt-1 text-lg font-semibold leading-tight text-foreground">{headquarter.name}</h2>

      <EnergyHero kwh={model.totalKwh} isLoading={isLoading}>
        {!isLoading && range.days > 1 && (
          <p className="mt-1 font-mono text-xs tabular-nums text-text-muted">
            ≈ {(model.totalKwh / range.days).toLocaleString('es-PE', { maximumFractionDigits: 0 })} kWh por día
          </p>
        )}
      </EnergyHero>

      <dl className="mt-4 grid grid-cols-2 gap-2">
        <StatTile label="Tableros" value={String(model.panels.length)} />
        <StatTile label="Puntos de medición" value={isLoading ? '…' : String(model.pointCount)} />
      </dl>

      <div className="mt-4 space-y-4">
        <PowerInsight
          scope="sede"
          power={power}
          model={model}
          singleDay={singleDay}
          onSelectPoint={selectPoint(onSelect)}
          onOpenCurve={() => onOpenDetail('curva')}
        />
        <UnbalanceSummary
          unbalance={unbalance}
          model={model}
          onSelectPoint={selectPoint(onSelect)}
          onSelectPanel={(panel) => onSelect({ kind: 'panel', panelId: panel.id })}
        />
        <InsightSection icon={Zap} title="Dónde se consume más">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          ) : model.topPoints.length === 0 ? (
            <p className="text-sm text-text-muted">Sin consumo registrado en este período.</p>
          ) : (
            <PointList points={model.topPoints} maxKwh={maxKwh} showPanel onSelect={selectPoint(onSelect)} />
          )}
        </InsightSection>
      </div>

      <p className="mt-5 flex items-start gap-2 rounded-lg bg-secondary px-3 py-2.5 text-xs leading-relaxed text-text-secondary">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        Haz clic en un tablero o punto para ver aquí su detalle. Para comparar puntos, usa «Comparar puntos» sobre el mapa.
      </p>

      <Link
        to="/energia/dashboard/tarifario"
        search={{ sede: String(sedeId), tab: undefined }}
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
      >
        ¿Cuánto cuesta? Ver tarifario
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

// ─── Tablero ────────────────────────────────────────────────────────────────

function PanelDetail({
  sedeId,
  headquarter,
  model,
  range,
  power,
  unbalance,
  onSelect,
  onOpenDetail,
  panel,
}: NetworkMapInspectorProps & { panel: NetworkPanelNode }) {
  const maxKwh = panel.points.reduce((max, p) => Math.max(max, p.kwh), 0)
  const measuredCount = panel.points.filter((p) => !p.isOtherLoads).length

  return (
    <div>
      <Breadcrumb items={[{ label: headquarter.name, onClick: () => onSelect({ kind: 'sede' }) }, { label: panel.name }]} />
      <p className="label-executive mt-3">Tablero{panel.typeLabel ? ` · ${panel.typeLabel}` : ''}</p>
      <h2 className="mt-1 text-lg font-semibold leading-tight text-foreground">{panel.name}</h2>

      {panel.status === 'error' ? (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/5 px-3 py-2.5 text-sm text-warning">
          No se pudo cargar el consumo de este tablero para el período elegido.
        </p>
      ) : (
        <EnergyHero kwh={panel.kwh} isLoading={panel.status === 'loading'}>
          {panel.status === 'ready' && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip>{formatShare(panel.shareOfSede)} de la sede</Chip>
              {panel.isPeak && <Chip tone="danger">Mayor consumo</Chip>}
            </div>
          )}
        </EnergyHero>
      )}

      <dl className="mt-4 space-y-2 text-sm">
        <DetailRow label="Medidor general" value={panel.mainMeterName ?? '—'} />
      </dl>

      <div className="mt-4 space-y-4">
        <PowerInsight
          scope="panel"
          power={power}
          model={model}
          panel={panel}
          singleDay={range.days === 1}
          onSelectPoint={selectPoint(onSelect)}
          onOpenCurve={() => onOpenDetail('curva')}
        />
        <UnbalanceSummary
          unbalance={unbalance}
          model={model}
          panel={panel}
          onSelectPoint={selectPoint(onSelect)}
          onSelectPanel={(p) => onSelect({ kind: 'panel', panelId: p.id })}
        />
        <InsightSection icon={Zap} title={`Puntos de medición${panel.status === 'ready' ? ` (${measuredCount})` : ''}`}>
          {panel.status === 'loading' ? (
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          ) : panel.points.length === 0 ? (
            <p className="text-sm text-text-muted">
              {panel.status === 'error' ? 'Sin datos.' : 'Este tablero solo tiene medidor general.'}
            </p>
          ) : (
            <PointList points={panel.points} maxKwh={maxKwh} onSelect={selectPoint(onSelect)} />
          )}
        </InsightSection>
      </div>

      <Link
        to="/energia/dashboard/panel"
        search={{
          sede: String(sedeId),
          panel: String(panel.id),
          vista: 'tablero',
          desde: range.dateAfter,
          hasta: range.dateBefore,
          mp_sede: undefined,
          mp_panel: undefined,
          mp_punto: undefined,
          mp_indicador: undefined,
          mp_weekday: undefined,
          mp_anio: undefined,
          mp_mes: undefined,
        }}
        className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover"
      >
        Abrir en Panel Dashboard →
      </Link>
    </div>
  )
}

// ─── Punto ──────────────────────────────────────────────────────────────────

function PointDetail({
  sedeId,
  headquarter,
  model,
  range,
  today,
  power,
  devicesById,
  compareIds,
  onSelect,
  onToggleCompare,
  onOpenDetail,
  panel,
  point,
  onZoomPhoto,
}: NetworkMapInspectorProps & { panel: NetworkPanelNode; point: NetworkPointNode; onZoomPhoto: (url: string) => void }) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null)
  const photoUrl = point.photoUrl && point.photoUrl !== failedPhoto ? point.photoUrl : null
  const hardwareUnassigned = point.hardware === 'No asignado'
  const device = point.id != null ? devicesById.get(point.id) : undefined
  const isCompared = point.id != null && compareIds.includes(point.id)
  const canCompare = point.id != null && !point.isOtherLoads
  const compareFull = !isCompared && compareIds.length >= MAX_COMPARE_POINTS
  const isLiveDay = range.days === 1 && range.endsToday

  return (
    <div>
      <Breadcrumb
        items={[
          { label: headquarter.name, onClick: () => onSelect({ kind: 'sede' }) },
          { label: panel.name, onClick: () => onSelect({ kind: 'panel', panelId: panel.id }) },
          { label: point.name },
        ]}
      />
      <p className="label-executive mt-3">{point.isOtherLoads ? 'Cargas sin medición' : 'Punto de medición'}</p>
      <h2 className="mt-1 text-lg font-semibold leading-tight text-foreground">{point.name}</h2>

      <EnergyHero kwh={point.kwh} isLoading={false}>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip>{formatShare(point.shareOfPanel)} del tablero</Chip>
          <Chip>{formatShare(point.shareOfSede)} de la sede</Chip>
          {point.isPeak && <Chip tone="danger">Mayor consumo de la sede</Chip>}
        </div>
      </EnergyHero>

      {canCompare && point.id != null && (
        // Lado a lado si caben (panel ancho); si no, uno debajo del otro, sin cortar el texto.
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onOpenDetail('dias')}
            className={cn(POINT_ACTION, 'border-primary/40 bg-primary-light text-primary hover:border-primary hover:bg-primary hover:text-white')}
          >
            <CalendarRange className="h-4 w-4 shrink-0" aria-hidden="true" />
            Comparar días
          </button>
          <button
            type="button"
            onClick={() => onToggleCompare(point.id!)}
            disabled={compareFull}
            aria-pressed={isCompared}
            title={compareFull ? `Máximo ${MAX_COMPARE_POINTS} puntos en la comparación` : 'Agrega este punto y elige otros en el mapa'}
            className={cn(
              POINT_ACTION,
              isCompared
                ? 'border-primary bg-primary text-white hover:bg-primary-hover'
                : 'border-border bg-card text-text-secondary enabled:hover:border-primary/50 enabled:hover:text-primary'
            )}
          >
            {isCompared ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : <GitCompareArrows className="h-4 w-4 shrink-0" aria-hidden="true" />}
            {isCompared ? 'En comparación' : 'Comparar con otros puntos'}
          </button>
        </div>
      )}

      {point.isOtherLoads && (
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          {point.description ?? 'Energía que entra al tablero y no pasa por ninguno de sus puntos medidos.'}
        </p>
      )}

      {photoUrl && (
        <button
          type="button"
          onClick={() => onZoomPhoto(photoUrl)}
          className="group relative mt-4 block w-full overflow-hidden rounded-xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <img
            src={photoUrl}
            alt={`Ubicación de ${point.name}`}
            loading="lazy"
            className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setFailedPhoto(photoUrl)}
          />
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white">
            <Camera className="h-3.5 w-3.5" />
            Foto de instalación
          </span>
        </button>
      )}

      {point.id != null && (
        <div className="mt-4 space-y-4">
          <LiveInsight
            sedeId={sedeId}
            panelId={panel.id}
            pointId={point.id}
            todayKey={toDateKey(today)}
            device={device}
            onOpenReadings={() => onOpenDetail('lecturas')}
          />
          {isLiveDay ? (
            <HabitualInsight sedeId={sedeId} panelId={panel.id} pointId={point.id} today={today} onOpenDays={() => onOpenDetail('dias')} />
          ) : (
            <NetworkMapTrend
              headquarterId={sedeId}
              panelId={panel.id}
              measurementPointId={point.id}
              dateAfter={range.dateAfter}
              dateBefore={range.dateBefore}
              lastBy={range.trendLastBy}
              action={<InsightAction onClick={() => onOpenDetail('dias')}>Comparar días</InsightAction>}
            />
          )}
          <PowerInsight
            scope="point"
            power={power}
            model={model}
            point={point}
            pointLimit={device?.thresholds?.power?.upper_threshold ?? null}
            singleDay={range.days === 1}
            onSelectPoint={selectPoint(onSelect)}
            onOpenCurve={() => onOpenDetail('curva')}
          />
          <PointUnbalanceInsight
            sedeId={sedeId}
            panel={panel}
            pointId={point.id}
            range={range}
            device={device}
            onOpenEvents={() => onOpenDetail('eventos')}
          />
          <AlertsInsight sedeId={sedeId} panelId={panel.id} pointId={point.id} range={range} />
          <InsightSection icon={Cpu} title="Medidor">
            <dl className="space-y-2 text-sm">
              <DetailRow label="Medidor" value={point.deviceName ?? '—'} />
              <DetailRow label="Canal" value={point.channel || '—'} />
              <DetailRow label="Capacidad" value={point.capacity || '—'} />
              <DetailRow
                label="Hardware"
                value={hardwareUnassigned ? 'No asignado — sin monitoreo' : (point.hardware ?? '—')}
                tone={hardwareUnassigned ? 'warning' : undefined}
              />
              {point.locationText && <DetailRow label="Ubicación" value={point.locationText} />}
              {point.installationDate && <DetailRow label="Instalación" value={formatInstallationDate(point.installationDate)} />}
              <DetailRow label="Estado" value={point.isActive ? 'Activo' : 'Inactivo'} />
            </dl>
          </InsightSection>
        </div>
      )}
    </div>
  )
}
