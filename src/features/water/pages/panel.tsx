import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { DashboardShell } from '@/features/dashboard/components/shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WaterFilters } from '../components/water-filters'
import { WaterKpiRow } from '../components/water-kpi-row'
import { WaterConsumptionPieChart } from '../components/water-consumption-pie-chart'
import { WaterDistributionList } from '../components/water-distribution-list'
import { WaterPanelReadingsFilters } from '../components/water-panel-readings-filters'
import { WaterReadingsChart } from '../components/water-readings-chart'
import { useWaterFilters } from '../hooks/use-water-filters'
import { useWaterPanelReadingsFilters } from '../hooks/use-water-panel-readings-filters'
import { fetchWaterConsumptionSummary } from '../api/water-consumption-summary'
import { fetchWaterConsumptionDistribution } from '../api/water-consumption-distribution'
import { formatDateISO, formatDateReadable } from '@/lib/date-utils'

export function WaterPanelPage() {
  const { tuberiaId, dateAfter, dateBefore, isReady } = useWaterFilters()
  const {
    sedeId: wSedeId,
    tuberiaId: wTuberiaId,
    puntoId: wPuntoId,
    indicador: wIndicador,
    weekday: wWeekday,
    monthRange: wMonthRange,
    isReady: wIsReady,
  } = useWaterPanelReadingsFilters()

  const dateAfterStr = dateAfter ? formatDateISO(dateAfter) : ''
  const dateBeforeStr = dateBefore ? formatDateISO(dateBefore) : ''

  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['water-consumption-summary', tuberiaId],
    queryFn: () => {
      if (!tuberiaId) throw new Error('Missing required parameters')
      return fetchWaterConsumptionSummary(tuberiaId)
    },
    enabled: isReady,
  })

  const { data: distributionData, isLoading: isLoadingDistribution } = useQuery({
    queryKey: ['water-consumption-distribution', tuberiaId, dateAfterStr, dateBeforeStr],
    queryFn: () => {
      if (!tuberiaId || !dateAfterStr || !dateBeforeStr) {
        throw new Error('Missing required parameters')
      }
      return fetchWaterConsumptionDistribution(tuberiaId, dateAfterStr, dateBeforeStr)
    },
    enabled: isReady,
  })

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Panel Dashboard</h1>
            <p className="text-primary">Vista general del sistema de agua</p>
          </div>
          <WaterFilters />
        </div>

        <WaterKpiRow summary={summaryData} isLoading={isLoadingSummary} />

        <Card>
          <CardHeader>
            <CardTitle>
              {distributionData
                ? `Distribución de Consumo — ${distributionData.water_pipe_name}`
                : 'Distribución de Consumo'}
            </CardTitle>
            <CardDescription>
              {distributionData
                ? `${formatDateReadable(distributionData.date_range.start_date)} → ${formatDateReadable(distributionData.date_range.end_date)}`
                : 'Seleccione sede, tubería y fechas para ver los datos'}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px]">
            {isLoadingDistribution ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-text-muted">Cargando datos...</p>
                </div>
              </div>
            ) : distributionData && distributionData.results.length > 0 ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="flex items-center justify-center">
                  <WaterConsumptionPieChart
                    results={distributionData.results}
                    mainConsumptionLitros={distributionData.main_consumption_litros}
                  />
                </div>
                <div>
                  <WaterDistributionList
                    results={distributionData.results}
                    mainConsumptionLitros={distributionData.main_consumption_litros}
                  />
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-text-muted">
                <div className="text-center space-y-2 max-w-md">
                  <AlertTriangle className="w-12 h-12 mx-auto text-text-muted/40" />
                  <p>No hay datos de consumo para la tubería y período seleccionados</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lecturas de la Tubería</CardTitle>
            <CardDescription>
              Consumo diario por punto de medición con filtros por indicador, días y período
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <WaterPanelReadingsFilters />
            <WaterReadingsChart
              headquarterId={wSedeId ?? 0}
              waterPipeId={wTuberiaId ?? 0}
              measurementPointId={wPuntoId ?? 0}
              dateAfter={wMonthRange.start}
              dateBefore={wMonthRange.end}
              indicador={wIndicador}
              weekday={wWeekday}
              isReady={wIsReady}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
