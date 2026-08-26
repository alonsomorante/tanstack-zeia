import { useMemo } from 'react'
import type { WaterDistributionResult } from '../types'

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

function getColor(index: number): string {
  return PALETTE[index % PALETTE.length]
}

interface WaterDistributionListProps {
  results: WaterDistributionResult[]
  mainConsumptionLitros: number
}

export function WaterDistributionList({
  results,
  mainConsumptionLitros,
}: WaterDistributionListProps) {
  const mainPoint = useMemo(() => results.find((r) => r.is_main), [results])

  const secondaryPoints = useMemo(
    () =>
      results
        .filter((r) => !r.is_main)
        .sort((a, b) => b.consumption_percentage - a.consumption_percentage),
    [results]
  )

  const maxConsumption = useMemo(() => {
    if (secondaryPoints.length === 0) return 1
    return Math.max(...secondaryPoints.map((r) => r.consumption_litros))
  }, [secondaryPoints])

  const highestPoint = useMemo(() => results.find((r) => r.is_highest), [results])

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-card shadow-soft">
      {/* Header: punto principal */}
      {mainPoint && (
        <div className="flex items-center justify-between px-4 py-3 bg-primary">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-white/80" />
            <span className="text-white font-semibold text-sm">
              {mainPoint.measurement_point_water_name}
            </span>
          </div>
          <span className="text-white font-bold text-sm">100%</span>
        </div>
      )}

      {/* Lista de puntos secundarios */}
      <div className="divide-y divide-border">
        {secondaryPoints.map((point, index) => {
          const color = getColor(index)
          const barWidth =
            maxConsumption > 0 ? `${(point.consumption_litros / maxConsumption) * 100}%` : '0%'
          const isHighest = highestPoint?.measurement_point_water_id === point.measurement_point_water_id

          return (
            <div key={point.measurement_point_water_id ?? `other-${index}`} className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm font-medium text-text-primary truncate">
                    {point.measurement_point_water_name}
                  </span>
                  {isHighest && (
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary shrink-0">
                      Mayor consumo
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold text-text-primary shrink-0 ml-4">
                  {point.consumption_percentage.toFixed(2)}%
                </span>
              </div>

              {/* Barra de progreso */}
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: barWidth,
                    backgroundColor: color,
                  }}
                />
              </div>

              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-text-muted">
                  {point.consumption_litros.toLocaleString('es-PE', { maximumFractionDigits: 2 })} L
                </span>
                {point.last_reading_time && (
                  <span className="text-xs text-text-muted">
                    Últ. lectura: {point.last_reading_time.slice(0, 16)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer: consumo total */}
      <div className="px-4 py-3 bg-secondary/30 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Consumo Total
          </span>
          <span className="text-sm font-bold text-text-primary">
            {mainConsumptionLitros.toLocaleString('es-PE', { maximumFractionDigits: 2 })} L
          </span>
        </div>
      </div>
    </div>
  )
}
