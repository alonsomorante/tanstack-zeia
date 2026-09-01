import { apiFetch } from '@/lib/api-client'
import type { WaterReadingsGraphResponse } from '../types'

export function fetchWaterReadingsGraph(
  headquarterId: number,
  waterPipeId: number,
  measurementPointId: number,
  dateAfter: string,
  dateBefore: string,
  indicador: string,
  weekday?: string,
  lastBy: string = 'day'
): Promise<WaterReadingsGraphResponse> {
  const params = new URLSearchParams({
    last_by: lastBy,
    date_after: dateAfter,
    date_before: dateBefore,
    indicador,
  })
  if (weekday) params.set('weekday', weekday)

  return apiFetch<WaterReadingsGraphResponse>(
    `/headquarter/${headquarterId}/water_pipe/${waterPipeId}/measurement_point_water/${measurementPointId}/readings/graph?${params.toString()}`
  )
}
