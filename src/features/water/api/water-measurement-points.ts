import { apiFetch } from '@/lib/api-client'
import type { WaterMeasurementPointsResponse } from '../types'
import { USE_WATER_MOCKS } from '@/mocks/config'
import { makeWaterMeasurementPoints } from '@/mocks/water-data'

export function fetchWaterMeasurementPoints(
  headquarterId: number,
  waterPipeId: number
): Promise<WaterMeasurementPointsResponse> {
  if (USE_WATER_MOCKS) return Promise.resolve(makeWaterMeasurementPoints(headquarterId, waterPipeId))
  return apiFetch<WaterMeasurementPointsResponse>(
    `/headquarter/${headquarterId}/water_pipe/${waterPipeId}/measurement_points_water/list/?page=1&page_size=100`
  )
}
