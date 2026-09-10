import { useMemo } from 'react'
import { Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PanelConsumption } from '../hooks/use-all-panels-consumption'

const PALETTE = [
  '#00B7CA',
  '#2EC4B6',
  '#FF6B35',
  '#E71D36',
  '#5EDFFF',
  '#FF9F43',
  '#A55EEA',
  '#26DE81',
  '#FD79A8',
  '#FDCB6E',
]

interface AllPanelsDetailProps {
  selected: PanelConsumption | null
  totalKwh: number
  isLoading: boolean
}

export function AllPanelsDetail({ selected, totalKwh, isLoading }: AllPanelsDetailProps) {
  const points = useMemo(() => {
    const results = selected?.data?.results ?? []
    return [...results]
      .filter((r) => !r.is_main)
      .sort((a, b) => b.consumption_kwh - a.consumption_kwh)
  }, [selected])

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="h-5 w-64 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-8 animate-pulse rounded bg-muted" />
            <div className="h-8 animate-pulse rounded bg-muted" />
            <div className="h-8 animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!selected) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" />
            Desglose del tablero
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-24 items-center justify-center text-sm text-text-muted">
            Seleccione un tablero de la gráfica para ver su desglose
          </div>
        </CardContent>
      </Card>
    )
  }

  const share = totalKwh > 0 ? (selected.mainKwh / totalKwh) * 100 : 0
  const maxPoint = points.length > 0 ? Math.max(...points.map((p) => p.consumption_kwh)) : 1

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" />
            Desglose — {selected.panel.name}
          </CardTitle>
          <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-xs font-bold tabular-nums text-primary">
            {share.toFixed(1)}% del total
          </span>
        </div>
        <p className="font-mono text-2xl font-bold tabular-nums text-text-primary">
          {selected.mainKwh.toLocaleString('es-PE', { maximumFractionDigits: 2 })}{' '}
          <span className="text-sm font-semibold">kWh</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {points.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-sm text-text-muted">
            Sin puntos de medición con consumo en este rango
          </div>
        ) : (
          <ul className="space-y-3">
            {points.map((point, index) => {
              const color = PALETTE[index % PALETTE.length]
              return (
                <li key={point.measurement_point_id ?? `other-${index}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="truncate text-sm font-medium text-text-primary">
                        {point.measurement_point_name}
                      </span>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-text-primary">
                      {point.consumption_kwh.toLocaleString('es-PE', {
                        maximumFractionDigits: 2,
                      })}{' '}
                      kWh
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${maxPoint > 0 ? (point.consumption_kwh / maxPoint) * 100 : 0}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-text-muted">
                      {point.consumption_percentage.toFixed(1)}%
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
