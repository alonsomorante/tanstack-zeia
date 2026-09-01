import { apiFetch } from '@/lib/api-client'
import type { WaterConsumptionSummary } from '../types'

export function fetchWaterConsumptionSummary(
  waterPipeId: number
): Promise<WaterConsumptionSummary> {
  return apiFetch<WaterConsumptionSummary>(`/water_pipe/${waterPipeId}/consumption-summary/`)
}
