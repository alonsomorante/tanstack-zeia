import { apiFetch } from '@/lib/api-client'
import type { WaterDayComparisonResponse } from '../types'
import { USE_WATER_MOCKS } from '@/mocks/config'
import { makeWaterDayComparison } from '@/mocks/water-data'

export interface WaterDayComparisonOptions {
  lastBy?: string
  weekday?: string
}

export function fetchWaterDayComparison(
  headquarterId: number,
  waterPipeId: number,
  measurementPointId: number,
  dateAfter: string,
  dateBefore: string,
  options: WaterDayComparisonOptions = {}
): Promise<WaterDayComparisonResponse> {
  const lastBy = options.lastBy ?? 'hour'

  if (USE_WATER_MOCKS) {
    return Promise.resolve(
      makeWaterDayComparison({ dateAfter, dateBefore, lastBy, weekday: options.weekday })
    )
  }

  const params = new URLSearchParams({
    last_by: lastBy,
    date_after: dateAfter,
    date_before: dateBefore,
  })
  if (options.weekday) params.set('weekday', options.weekday)

  return apiFetch<WaterDayComparisonResponse>(
    `/headquarter/${headquarterId}/water_pipe/${waterPipeId}/measurement_point_water/${measurementPointId}/readings/graph-especific?${params.toString()}`
  )
}
