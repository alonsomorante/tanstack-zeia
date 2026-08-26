import { Droplets, CalendarDays, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateReadable } from '@/lib/date-utils'
import type { WaterConsumptionSummary } from '../types'

interface WaterKpiRowProps {
  summary: WaterConsumptionSummary | undefined
  isLoading: boolean
}

function formatLitros(value: number | undefined): string {
  if (value === undefined || value === null) return '—'
  return value.toLocaleString('es-PE', { maximumFractionDigits: 2 })
}

function KpiSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-8 w-3/4 bg-muted rounded animate-pulse" />
      <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
    </div>
  )
}

export function WaterKpiRow({ summary, isLoading }: WaterKpiRowProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Consumo de Hoy */}
      <Card className="relative overflow-hidden border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium truncate" style={{ color: '#88939b' }}>
            Consumo de Hoy
          </CardTitle>
          <Droplets className="h-5 w-5 shrink-0 text-primary" />
        </CardHeader>
        <CardContent className="relative z-10">
          {isLoading ? (
            <KpiSkeleton />
          ) : (
            <div className="space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-text-primary font-mono">
                  {formatLitros(summary?.today_consumption_litros)}
                </span>
                <span className="text-sm font-medium text-text-muted">L</span>
              </div>
              <p className="text-xs text-text-muted">Consumo acumulado hoy</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consumo del Mes */}
      <Card className="relative overflow-hidden border-l-4 border-l-success">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium truncate" style={{ color: '#88939b' }}>
            Consumo del Mes
          </CardTitle>
          <CalendarDays className="h-5 w-5 shrink-0 text-success" />
        </CardHeader>
        <CardContent className="relative z-10">
          {isLoading ? (
            <KpiSkeleton />
          ) : (
            <div className="space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-text-primary font-mono">
                  {formatLitros(summary?.month_consumption_litros)}
                </span>
                <span className="text-sm font-medium text-text-muted">L</span>
              </div>
              <p className="text-xs text-text-muted">
                {summary
                  ? `${formatDateReadable(summary.date_range.month_start)} → ${formatDateReadable(summary.date_range.today)}`
                  : 'Acumulado del mes en curso'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Promedio Diario */}
      <Card className="relative overflow-hidden border-l-4 border-l-warning">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium truncate" style={{ color: '#88939b' }}>
            Promedio Diario
          </CardTitle>
          <TrendingUp className="h-5 w-5 shrink-0 text-warning" />
        </CardHeader>
        <CardContent className="relative z-10">
          {isLoading ? (
            <KpiSkeleton />
          ) : (
            <div className="space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-text-primary font-mono">
                  {formatLitros(summary?.month_average_daily_litros)}
                </span>
                <span className="text-sm font-medium text-text-muted">L/día</span>
              </div>
              <p className="text-xs text-text-muted">Consumo promedio diario del mes</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
