import { useQuery } from '@tanstack/react-query'
import { DashboardShell } from '@/features/dashboard/components/shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WaterHomeFilters } from '../components/water-home-filters'
import { WaterIndicatorGraph } from '../components/water-indicator-graph'
import { WaterReadingsTable } from '../components/water-readings-table'
import { useWaterHomeFilters } from '../hooks/use-water-home-filters'
import { fetchWaterReadingsTable } from '../api/water-readings'
import { formatDateISO, formatDateReadable } from '@/lib/date-utils'
import { WATER_INDICATOR_INFO } from '../lib/indicators'

const TABLE_PAGE_SIZE = 10

export function WaterIndicatorAnalysisPage() {
  const {
    sedeId,
    tuberiaId,
    puntoId,
    indicador,
    agrupacion,
    pagina,
    dateAfter,
    dateBefore,
    isReady,
    setPage,
  } = useWaterHomeFilters()

  const dateAfterStr = dateAfter ? (formatDateISO(dateAfter) ?? '') : ''
  const dateBeforeStr = dateBefore ? (formatDateISO(dateBefore) ?? '') : ''

  const { data: readingsData, isLoading: isLoadingReadings } = useQuery({
    queryKey: ['water-readings-table', sedeId, tuberiaId, puntoId, dateAfterStr, dateBeforeStr, indicador, pagina],
    queryFn: () => {
      if (!sedeId || !tuberiaId || !puntoId || !dateAfterStr || !dateBeforeStr) {
        throw new Error('Missing required parameters')
      }
      return fetchWaterReadingsTable(sedeId, tuberiaId, puntoId, {
        indicador,
        dateAfter: dateAfterStr,
        dateBefore: dateBeforeStr,
        page: pagina,
        pageSize: TABLE_PAGE_SIZE,
      })
    },
    enabled: isReady,
  })

  const indicatorInfo = WATER_INDICATOR_INFO[indicador]

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Análisis por Indicador</h1>
            <p className="text-primary">Métricas e indicadores de consumo de agua</p>
          </div>
          <WaterHomeFilters />
        </div>

        {isReady && dateAfter && dateBefore ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {indicatorInfo.label} — {formatDateReadable(formatDateISO(dateAfter) ?? '')} →{' '}
                  {formatDateReadable(formatDateISO(dateBefore) ?? '')}
                </CardTitle>
                <CardDescription>
                  {agrupacion === 'day'
                    ? 'Consumo diario del punto de medición'
                    : 'Consumo por hora del punto de medición'}
                </CardDescription>
              </CardHeader>
              <CardContent className="min-h-[340px]">
                <WaterIndicatorGraph
                  headquarterId={sedeId ?? 0}
                  waterPipeId={tuberiaId ?? 0}
                  measurementPointId={puntoId ?? 0}
                  dateAfter={dateAfterStr}
                  dateBefore={dateBeforeStr}
                  indicador={indicador}
                  agrupacion={agrupacion}
                  isReady={isReady}
                />
              </CardContent>
            </Card>

            <WaterReadingsTable
              data={readingsData}
              isLoading={isLoadingReadings}
              page={pagina}
              onPageChange={setPage}
              indicador={indicador}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-12 flex items-center justify-center text-text-muted min-h-[300px]">
            <div className="text-center space-y-2">
              <p>Seleccione sede, tubería, punto de medición y fechas para ver las lecturas</p>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
