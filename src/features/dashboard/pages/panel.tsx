import { useQuery } from '@tanstack/react-query'
import { Gauge, BarChart3, Zap, LayoutGrid } from 'lucide-react'
import { DashboardShell } from '@/features/dashboard/components/shell'
import { DashboardFilters } from '@/features/dashboard/components/filters'
import { useDashboardFilters } from '@/features/dashboard/hooks/use-dashboard-filters'
import { usePanelReadingsFilters } from '@/features/dashboard/hooks/use-panel-readings-filters'
import { fetchConsumptionDistribution } from '@/features/dashboard/api/consumption'
import { ConsumptionPieChart } from '@/features/dashboard/components/consumption-pie-chart'
import { ConsumptionDistributionList } from '@/features/dashboard/components/consumption-distribution-list'
import { MeasurementPointsTable } from '@/features/dashboard/components/measurement-points-table'
import { PanelReadingsFilters } from '@/features/dashboard/components/panel-readings-filters'
import { PanelReadingsChart } from '@/features/dashboard/components/panel-readings-chart'
import { ScreenshotCard } from '@/features/dashboard/components/screenshot-card'
import { AllPanelsView } from '@/features/dashboard/components/all-panels-view'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateISO, formatDateReadable } from '@/lib/date-utils'
import { cn } from '@/lib/utils'

export function PanelPage() {
  const { sedeId, panelId, dateAfter, dateBefore, isReady, vista, setVista, currentHeadquarter } =
    useDashboardFilters()
  const {
    sedeId: mpSedeId,
    panelId: mpPanelId,
    puntoId: mpPuntoId,
    indicador: mpIndicador,
    weekday: mpWeekday,
    monthRange: mpMonthRange,
    isReady: mpIsReady,
  } = usePanelReadingsFilters()

  const dateAfterStr = dateAfter ? formatDateISO(dateAfter) : ''
  const dateBeforeStr = dateBefore ? formatDateISO(dateBefore) : ''

  const { data: consumptionData, isLoading: isLoadingConsumption } = useQuery({
    queryKey: ['consumption-distribution', sedeId, panelId, dateAfterStr, dateBeforeStr],
    queryFn: () => {
      if (!sedeId || !panelId || !dateAfterStr || !dateBeforeStr) {
        throw new Error('Missing required parameters')
      }
      return fetchConsumptionDistribution(sedeId, panelId, dateAfterStr, dateBeforeStr)
    },
    enabled: isReady,
  })

  const topConsumer = consumptionData?.results
    .filter((r) => !r.is_main)
    .sort((a, b) => b.consumption_kwh - a.consumption_kwh)[0]

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Panel Dashboard</h1>
            <p className="text-primary">Vista general del sistema energético</p>
          </div>
          <DashboardFilters />
        </div>

        <div className="flex w-fit items-center gap-1 rounded-lg border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setVista('todos')}
            className={cn(
              'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              vista !== 'tablero'
                ? 'bg-primary text-white shadow-soft'
                : 'text-text-secondary hover:bg-secondary hover:text-text-primary'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Todos los tableros
          </button>
          <button
            type="button"
            onClick={() => setVista('tablero')}
            className={cn(
              'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              vista === 'tablero'
                ? 'bg-primary text-white shadow-soft'
                : 'text-text-secondary hover:bg-secondary hover:text-text-primary'
            )}
          >
            <Zap className="h-4 w-4" />
            Por tablero
          </button>
        </div>

        {vista === 'tablero' ? (
          <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          {/* Card 1: Puntos de Medición (estándar) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium truncate" style={{ color: '#88939b' }}>
                Puntos de Medición
              </CardTitle>
              <Gauge className="h-4 w-4 shrink-0" style={{ color: '#88939b' }} />
            </CardHeader>
            <CardContent>
              {isLoadingConsumption ? (
                <div className="space-y-2">
                  <div className="h-8 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-text-primary">
                    {consumptionData ? String(consumptionData.total_measurement_points) : '—'}
                  </div>
                  <p className="text-xs text-text-muted">Dispositivos activos</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Mayor Consumidor (destacada con misma paleta) */}
          <Card className="relative overflow-hidden border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium truncate" style={{ color: '#88939b' }}>
                Mayor Consumidor
              </CardTitle>
              <BarChart3 className="h-5 w-5 shrink-0 text-primary" />
            </CardHeader>
            <CardContent className="relative z-10">
              {isLoadingConsumption ? (
                <div className="space-y-2">
                  <div className="h-8 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
                </div>
              ) : topConsumer ? (
                <div className="space-y-1">
                  {/* Nombre del punto como valor principal (más grande y bold) */}
                  <div className="text-xl font-bold text-text-primary leading-tight">
                    {topConsumer.measurement_point_name}
                  </div>
                  
                  {/* Valor numérico en primary, grande */}
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-3xl font-bold text-primary">
                      {topConsumer.consumption_kwh.toLocaleString('es-PE', { maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-sm font-medium text-primary/80">kWh</span>
                  </div>
                  
                  {/* Porcentaje + badge */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-sm font-bold text-primary">
                      {topConsumer.consumption_percentage.toFixed(1)}%
                    </span>
                    <span className="text-xs text-text-muted">del consumo total del panel</span>
                  </div>
                </div>
              ) : (
                <div className="text-2xl font-bold text-text-primary">—</div>
              )}
            </CardContent>
          </Card>
        </div>

        <ScreenshotCard
          title="Distribución de Consumo"
          filename="distribucion-consumo"
          variant="browser"
          url="administrador.zeia.com.pe/energia/dashboard/panel"
          filters={<DashboardFilters />}
        >
          <Card>
            <CardHeader>
              <CardTitle>
                {consumptionData
                  ? `Distribución de Consumo — ${consumptionData.electrical_panel_name}`
                  : 'Resumen'}
              </CardTitle>
              <CardDescription>
                {consumptionData
                  ? `${formatDateReadable(consumptionData.date_range.start_date)} → ${formatDateReadable(consumptionData.date_range.end_date)}`
                  : 'Seleccione sede, panel y fechas para ver los datos'}
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[300px]">
              {isLoadingConsumption ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-text-muted">Cargando datos...</p>
                  </div>
                </div>
              ) : consumptionData ? (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="flex items-center justify-center">
                    <ConsumptionPieChart
                      results={consumptionData.results}
                      mainConsumptionKwh={consumptionData.main_consumption_kwh}
                    />
                  </div>
                  <div>
                    <ConsumptionDistributionList
                      results={consumptionData.results}
                      mainConsumptionKwh={consumptionData.main_consumption_kwh}
                    />
                  </div>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-text-muted">
                  <div className="text-center space-y-2">
                    <BarChart3 className="w-12 h-12 mx-auto text-text-muted/40" />
                    <p>Seleccione los filtros para cargar los datos de consumo</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </ScreenshotCard>

        {sedeId && panelId && (
          <MeasurementPointsTable
            headquarterId={sedeId}
            panelId={panelId}
          />
        )}

        <ScreenshotCard
          title="Lecturas de Panel"
          filename="lecturas-panel"
          variant="browser"
          url="administrador.zeia.com.pe/energia/dashboard/panel"
        >
          <Card>
            <CardContent className="pt-6 space-y-4">
              <PanelReadingsFilters />
              <PanelReadingsChart
                headquarterId={mpSedeId ?? 0}
                panelId={mpPanelId ?? 0}
                measurementPointId={mpPuntoId ?? 0}
                dateAfter={mpMonthRange.start}
                dateBefore={mpMonthRange.end}
                indicador={mpIndicador}
                weekday={mpWeekday}
                isReady={mpIsReady}
              />
            </CardContent>
          </Card>
        </ScreenshotCard>
          </>
        ) : sedeId != null && dateAfterStr && dateBeforeStr ? (
          <AllPanelsView
            sedeId={sedeId}
            sedeName={currentHeadquarter?.name ?? ''}
            dateAfterStr={dateAfterStr}
            dateBeforeStr={dateBeforeStr}
          />
        ) : (
          <Card>
            <CardContent className="flex h-[200px] items-center justify-center text-text-muted">
              <p>Seleccione sede y fechas para ver el consumo de todos los tableros</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  )
}
