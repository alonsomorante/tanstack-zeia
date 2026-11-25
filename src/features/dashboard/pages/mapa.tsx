import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Building2, CalendarDays, Network } from 'lucide-react'
import { DashboardShell } from '@/features/dashboard/components/shell'
import { NetworkMapFilters } from '@/features/dashboard/components/network-map-filters'
import { NetworkMapDiagram } from '@/features/dashboard/components/network-map-diagram'
import { NetworkLayerLegend, NetworkLayerSwitch } from '@/features/dashboard/components/network-map-layers'
import { NetworkMapInspector } from '@/features/dashboard/components/network-map-inspector'
import {
  NetworkDrawer,
  NetworkPowerCurvePanel,
  NetworkReadingsPanel,
  NetworkUnbalancePanel,
  type NetworkDetailKind,
} from '@/features/dashboard/components/network-map-drawers'
import { NetworkDayComparisonPanel } from '@/features/dashboard/components/network-day-comparison'
import { NetworkComparePanel, NetworkCompareToggle, NetworkCompareTray } from '@/features/dashboard/components/network-compare'
import { ModulesMenu } from '@/features/dashboard/components/modules-menu'
import { ErrorNote } from '@/features/dashboard/components/network-map-ui'
import { useMapaFilters } from '@/features/dashboard/hooks/use-mapa-filters'
import { useNetworkMap } from '@/features/dashboard/hooks/use-network-map'
import { useNetworkDevices, useNetworkPower, useNetworkUnbalance } from '@/features/dashboard/hooks/use-network-insights'
import {
  COMPARE_COLORS,
  MAX_COMPARE_POINTS,
  findPointById,
  resolveNetworkSelection,
  toNetworkSelection,
  type NetworkPointNode,
} from '@/features/dashboard/lib/network-map'
import { buildLayerView } from '@/features/dashboard/lib/network-layers'
import { getCycleLabel } from '@/features/dashboard/lib/billing-format'
import { usePersistFilterSelection } from '@/hooks/use-persist-filter-selection'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function MapaPage() {
  const filters = useMapaFilters()
  const { sedeId, currentHeadquarter, range, periodStatus, layer, selection, compareIds, today } = filters

  const { model } = useNetworkMap(sedeId, range)
  const power = useNetworkPower(sedeId, range, model, currentHeadquarter)
  const unbalance = useNetworkUnbalance(sedeId, range)

  const resolved = resolveNetworkSelection(selection, model)
  const selectedPanelId = resolved.kind === 'point' ? resolved.panel.id : null

  // Umbrales por punto: de todos los tableros en la capa Potencia; si no, solo del punto elegido.
  const devicePanelIds =
    layer === 'potencia' ? model.panels.map((p) => p.id) : selectedPanelId != null ? [selectedPanelId] : []
  const devicesById = useNetworkDevices(sedeId, devicePanelIds)

  const singleDay = range?.days === 1
  const view = useMemo(
    () =>
      buildLayerView(layer, model, {
        power: { analysis: power.analysis, isLoading: power.isLoading, isError: power.isError },
        unbalance: { ranks: unbalance.ranks, isLoading: unbalance.isLoading, isError: unbalance.isError },
        devicesById,
        singleDay,
      }),
    [layer, model, power.analysis, power.isLoading, power.isError, unbalance.ranks, unbalance.isLoading, unbalance.isError, devicesById, singleDay]
  )

  const comparePoints = useMemo(
    () => compareIds.map((id) => findPointById(model, id)).filter((p): p is NetworkPointNode => p != null),
    [compareIds, model]
  )
  // Mismo color por punto en el mapa, la bandeja y la gráfica (orden de la bandeja).
  const compareColors = useMemo(() => {
    const colors = new Map<number, string>()
    comparePoints.forEach((point, index) => {
      if (point.id != null) colors.set(point.id, COMPARE_COLORS[index % COMPARE_COLORS.length])
    })
    return colors
  }, [comparePoints])

  // Modo comparar: activo por el botón o porque la URL ya trae puntos (?comparar=).
  const [compareModeOn, setCompareModeOn] = useState(false)
  const isComparing = compareModeOn || compareIds.length > 0
  const exitCompare = () => {
    setCompareModeOn(false)
    filters.setCompareIds([])
  }

  const [detail, setDetail] = useState<NetworkDetailKind | null>(null)
  const closeDetail = useCallback(() => setDetail(null), [])

  // La selección del mapa es el filtro de los demás módulos: se persiste igual que sus selects.
  const panelCandidates = useMemo(() => model.panels.map((p) => ({ id: p.id })), [model.panels])
  const pointCandidates = useMemo(
    () => model.panels.flatMap((p) => p.points.flatMap((pt) => (pt.id != null ? [{ id: pt.id }] : []))),
    [model.panels]
  )
  usePersistFilterSelection('energy', {
    sede: { value: sedeId, candidates: filters.headquarters },
    panel: { value: resolved.kind === 'sede' ? null : resolved.panel.id, candidates: panelCandidates },
    punto: { value: resolved.kind === 'point' ? resolved.point.id : null, candidates: pointCandidates },
  })

  const handleSedeChange = (id: number) => {
    setDetail(null)
    setCompareModeOn(false)
    filters.setSedeId(id)
  }

  const header = (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="flex items-center gap-4">
        {/* Sin sidebar en el mapa: los demás módulos quedan en este menú */}
        <ModulesMenu />
        <div>
          <h1 className="text-2xl font-bold text-primary">Mapa de Red</h1>
          <p className="text-primary">Tu red eléctrica de un vistazo: de la acometida a cada punto de medición</p>
        </div>
      </div>
      <NetworkMapFilters
        headquarters={filters.headquarters}
        sedeId={sedeId}
        periodo={filters.periodo}
        isLoading={filters.isLoadingHeadquarters}
        cycleAvailable={filters.cycleAvailable}
        cycleTitle={filters.currentCycle ? `Ciclo ${getCycleLabel(filters.currentCycle)}` : null}
        customStart={filters.customStart}
        customEnd={filters.customEnd}
        onSedeChange={handleSedeChange}
        onPeriodoChange={filters.setPeriodo}
        onCustomRange={filters.setCustomRange}
      />
    </div>
  )

  let body: ReactNode
  if (filters.isLoadingHeadquarters || periodStatus === 'loading') {
    body = (
      <Card>
        <CardContent className="flex h-[360px] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-text-muted">Cargando datos...</p>
          </div>
        </CardContent>
      </Card>
    )
  } else if (!currentHeadquarter || sedeId == null) {
    body = <EmptyState icon={<Building2 className="mx-auto h-12 w-12 text-text-muted/40" />} text="No hay sedes disponibles para tu usuario" />
  } else if (periodStatus === 'unavailable') {
    body = (
      <EmptyState
        icon={<CalendarDays className="mx-auto h-12 w-12 text-text-muted/40" />}
        text={`${currentHeadquarter.name} no tiene un ciclo de facturación vigente.`}
        action={{ label: 'Ver hoy', onClick: () => filters.setPeriodo('hoy') }}
      />
    )
  } else if (periodStatus === 'pick' || !range) {
    body = (
      <EmptyState
        icon={<CalendarDays className="mx-auto h-12 w-12 text-text-muted/40" />}
        text="Elige el rango de fechas en «Personalizado» para ver la red en ese período."
      />
    )
  } else if (model.panels.length === 0) {
    body = <EmptyState icon={<Building2 className="mx-auto h-12 w-12 text-text-muted/40" />} text={`${currentHeadquarter.name} no tiene tableros activos`} />
  } else {
    body = (
      // Sin sidebar, el detalle cabe al lado del mapa desde 1160 px (el diagrama mide 632 px como mínimo).
      <div className="grid items-start gap-4 min-[1160px]:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0">
          <CardHeader className="gap-3 space-y-0 pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Network className="h-4 w-4 text-primary" />
                  Red eléctrica · {currentHeadquarter.name}
                </CardTitle>
                <CardDescription className="mt-1">
                  {range.label} · {model.panels.length} tablero{model.panels.length !== 1 ? 's' : ''}
                  {model.isComplete && ` · ${model.pointCount} punto${model.pointCount !== 1 ? 's' : ''} de medición`}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <NetworkLayerSwitch layer={layer} onChange={filters.setLayer} />
                <NetworkCompareToggle active={isComparing} onToggle={isComparing ? exitCompare : () => setCompareModeOn(true)} />
              </div>
            </div>
            <NetworkLayerLegend layer={layer} />
            {view.error && <ErrorNote text={view.error} />}
          </CardHeader>
          <CardContent>
            <NetworkMapDiagram
              sedeName={currentHeadquarter.name}
              periodShortLabel={range.shortLabel}
              model={model}
              view={view}
              selection={toNetworkSelection(resolved)}
              compareMode={isComparing}
              compareColors={compareColors}
              canAddCompare={compareIds.length < MAX_COMPARE_POINTS}
              onSelect={filters.setSelection}
              onToggleCompare={filters.toggleCompare}
            />
            {isComparing && (
              <NetworkCompareTray
                points={comparePoints}
                onRemove={filters.toggleCompare}
                onExit={exitCompare}
                onCompare={() => setDetail('comparar')}
              />
            )}
          </CardContent>
        </Card>

        <NetworkMapInspector
          sedeId={sedeId}
          headquarter={currentHeadquarter}
          model={model}
          selection={resolved}
          range={range}
          today={today}
          power={power}
          unbalance={unbalance}
          devicesById={devicesById}
          compareIds={compareIds}
          onSelect={filters.setSelection}
          onToggleCompare={filters.toggleCompare}
          onOpenDetail={setDetail}
          className="min-[1160px]:sticky min-[1160px]:top-0 min-[1160px]:max-h-[calc(100dvh-7rem)] min-[1160px]:overflow-y-auto scrollbar-thin"
        />
      </div>
    )
  }

  // ─── Detalle a pedido (sin salir del mapa) ────────────────────────────────
  let drawer: ReactNode = null
  if (detail && range && sedeId != null && currentHeadquarter) {
    const point = resolved.kind === 'point' && resolved.point.id != null ? resolved.point : null
    const panel = resolved.kind === 'sede' ? null : resolved.panel

    if (detail === 'comparar' && comparePoints.length >= 2) {
      drawer = (
        <NetworkDrawer eyebrow={`Comparar puntos · ${range.label}`} title={comparePoints.map((p) => p.name).join(' · ')} onClose={closeDetail}>
          <NetworkComparePanel sedeId={sedeId} points={comparePoints} model={model} range={range} power={power} />
        </NetworkDrawer>
      )
    } else if (detail === 'curva') {
      const channel = point ? point.name : panel?.mainMeterName ?? null
      const focus =
        channel && !model.ambiguousNames.has(channel)
          ? { label: point ? point.name : `Medidor general · ${panel?.name ?? ''}`, channel }
          : null
      drawer = (
        <NetworkDrawer
          eyebrow={`Curva de potencia · ${range.label}`}
          title={point ? `${point.name} · ${panel?.name}` : panel ? panel.name : currentHeadquarter.name}
          onClose={closeDetail}
        >
          <NetworkPowerCurvePanel power={power} focus={focus} singleDay={singleDay} />
        </NetworkDrawer>
      )
    } else if (point && panel && point.id != null) {
      const title = `${point.name} · ${panel.name}`
      if (detail === 'lecturas') {
        drawer = (
          <NetworkDrawer eyebrow={`Lecturas · ${range.label}`} title={title} onClose={closeDetail}>
            <NetworkReadingsPanel sedeId={sedeId} panelId={panel.id} pointId={point.id} range={range} />
          </NetworkDrawer>
        )
      } else if (detail === 'eventos') {
        drawer = (
          <NetworkDrawer eyebrow={`Desbalance entre fases · ${range.label}`} title={title} onClose={closeDetail}>
            <NetworkUnbalancePanel sedeId={sedeId} panelId={panel.id} pointId={point.id} range={range} />
          </NetworkDrawer>
        )
      } else if (detail === 'dias') {
        drawer = (
          <NetworkDrawer eyebrow="Comparar días · últimas 5 semanas" title={title} onClose={closeDetail}>
            <NetworkDayComparisonPanel sedeId={sedeId} panelId={panel.id} pointId={point.id} today={today} />
          </NetworkDrawer>
        )
      }
    }
  }

  return (
    <DashboardShell showSidebar={false}>
      <div className="space-y-6">
        {header}
        {body}
      </div>
      {drawer}
    </DashboardShell>
  )
}

function EmptyState({ icon, text, action }: { icon: ReactNode; text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <Card>
      <CardContent className="flex h-[300px] items-center justify-center text-text-muted">
        <div className="space-y-3 text-center">
          {icon}
          <p>{text}</p>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              {action.label}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
