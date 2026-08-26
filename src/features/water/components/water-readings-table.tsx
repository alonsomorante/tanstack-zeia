import { Activity, ChevronLeft, ChevronRight, Database } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WATER_INDICATOR_INFO, type WaterIndicator } from '../lib/indicators'
import type { WaterReadingsResponse } from '../types'
import { formatDateTimeShort } from '@/lib/date-utils'

const PAGE_SIZE = 10

interface WaterReadingsTableProps {
  data: WaterReadingsResponse | undefined
  isLoading: boolean
  page: number
  onPageChange: (page: number) => void
  indicador: WaterIndicator
}

export function WaterReadingsTable({
  data,
  isLoading,
  page,
  onPageChange,
  indicador,
}: WaterReadingsTableProps) {
  const indicatorInfo = WATER_INDICATOR_INFO[indicador]
  const totalCount = data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const hasPrevious = page > 1
  const hasNext = page < totalPages

  const results = data?.results ?? []

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lecturas Registradas</CardTitle>
          <CardDescription>Tabla de lecturas crudas del punto de medición</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[200px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text-muted">Cargando datos...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lecturas Registradas</CardTitle>
          <CardDescription>No se encontraron registros para los filtros seleccionados</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[200px] flex items-center justify-center text-text-muted">
          <div className="text-center space-y-2">
            <Activity className="w-12 h-12 mx-auto text-text-muted/40" />
            <p>No hay lecturas para el punto y período seleccionados</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lecturas Registradas</CardTitle>
        <CardDescription>
          {totalCount} registro{totalCount !== 1 ? 's' : ''} — Página {page} de {totalPages}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 font-medium text-text-secondary whitespace-nowrap">
                  Fecha y Hora
                </th>
                <th className="text-left py-3 px-2 font-medium text-text-secondary whitespace-nowrap">
                  Punto de Medición
                </th>
                <th className="text-left py-3 px-2 font-medium text-text-secondary whitespace-nowrap">
                  {indicatorInfo.label} ({indicatorInfo.unit})
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((reading, index) => (
                <tr
                  key={reading.indicators.id ?? index}
                  className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                >
                  <td className="py-3 px-2 font-medium text-text-primary whitespace-nowrap">
                    {formatDateTimeShort(reading.created_at)}
                  </td>
                  <td className="py-3 px-2 text-text-secondary whitespace-nowrap">
                    {reading.indicators.measurement_point_name}
                  </td>
                  <td className="py-3 px-2 text-text-secondary whitespace-nowrap font-mono">
                    <span className="flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-text-muted/50" />
                      {reading.indicators.values[indicador] !== undefined &&
                      reading.indicators.values[indicador] !== null
                        ? Number(reading.indicators.values[indicador]).toLocaleString('es-PE', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <div className="text-sm text-text-muted">
            Mostrando {results.length} de {totalCount} registros
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={!hasPrevious}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary text-text-primary"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
            <span className="text-sm font-medium text-text-primary px-2">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={!hasNext}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary text-text-primary"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
