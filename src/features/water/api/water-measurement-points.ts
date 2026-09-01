import { apiFetch } from '@/lib/api-client'
import type { WaterMeasurementPointsResponse } from '../types'

export function fetchWaterMeasurementPoints(
  headquarterId: number,
  waterPipeId: number
): Promise<WaterMeasurementPointsResponse> {
  return apiFetch<WaterMeasurementPointsResponse>(
    `/headquarter/${headquarterId}/water_pipe/${waterPipeId}/measurement_points_water/list/?page=1&page_size=100`
  )
}
