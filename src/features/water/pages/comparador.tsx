import { DashboardShell } from '@/features/dashboard/components/shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WaterComparadorFilters } from '../components/water-comparador-filters'
import { WaterDayComparisonChart } from '../components/water-day-comparison-chart'
import { useWaterComparadorFilters } from '../hooks/use-water-comparador-filters'
import { formatDateISO, formatDateReadable } from '@/lib/date-utils'

export function WaterDayComparisonPage() {
  const {
    sedeId,
    tuberiaId,
    puntoId,
    agrupacion,
    dateAfter,
    dateBefore,
    isReady,
  } = useWaterComparadorFilters()

  const dateAfterStr = dateAfter ? (formatDateISO(dateAfter) ?? '') : ''
  const dateBeforeStr = dateBefore ? (formatDateISO(dateBefore) ?? '') : ''
  const isChartReady =
    isReady && !!sedeId && !!tuberiaId && !!puntoId && !!dateAfterStr && !!dateBeforeStr

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Comparación por Día</h1>
            <p className="text-primary">Comparativa de consumo de agua entre días</p>
          </div>
          <WaterComparadorFilters />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {dateAfterStr && dateBeforeStr
                ? `Consumo de agua — ${formatDateReadable(dateAfterStr)} → ${formatDateReadable(dateBeforeStr)}`
                : 'Comparación de consumo de agua'}
            </CardTitle>
            <CardDescription>
              {agrupacion === 'hour'
                ? 'Consumo por hora de cada día seleccionado, con el perfil promedio habitual'
                : 'Consumo diario de cada fecha seleccionada'}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px]">
            {isChartReady ? (
              <WaterDayComparisonChart
                headquarterId={sedeId}
                waterPipeId={tuberiaId}
                measurementPointId={puntoId}
                dateAfter={dateAfterStr}
                dateBefore={dateBeforeStr}
                agrupacion={agrupacion}
                isReady={isChartReady}
              />
            ) : (
              <div className="rounded-xl border border-border bg-card p-12 flex items-center justify-center text-text-muted min-h-[300px]">
                <div className="text-center space-y-2">
                  <p>Seleccione sede, tubería, punto de medición y fechas para comparar</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
