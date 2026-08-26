import { apiFetch } from '@/lib/api-client'
import type { WaterConsumptionSummary } from '../types'
import { USE_WATER_MOCKS } from '@/mocks/config'
import { makeWaterConsumptionSummary } from '@/mocks/water-data'

export function fetchWaterConsumptionSummary(
  waterPipeId: number
): Promise<WaterConsumptionSummary> {
  if (USE_WATER_MOCKS) return Promise.resolve(makeWaterConsumptionSummary(waterPipeId))
  return apiFetch<WaterConsumptionSummary>(`/water_pipe/${waterPipeId}/consumption-summary/`)
}
