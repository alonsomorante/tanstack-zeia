import { apiFetch } from '@/lib/api-client'
import type { WaterReadingsGraphResponse } from '../types'
import { USE_WATER_MOCKS } from '@/mocks/config'
import { makeWaterReadingsGraph } from '@/mocks/water-data'

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
  if (USE_WATER_MOCKS) {
    return Promise.resolve(
      makeWaterReadingsGraph({ dateAfter, dateBefore, indicador, weekday, lastBy })
    )
  }
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
