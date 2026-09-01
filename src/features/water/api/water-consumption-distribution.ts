import { apiFetch } from '@/lib/api-client'
import type { WaterDistributionResponse } from '../types'

export function fetchWaterConsumptionDistribution(
  waterPipeId: number,
  dateAfter: string,
  dateBefore: string
): Promise<WaterDistributionResponse> {
  const params = new URLSearchParams({
    date_after: dateAfter,
    date_before: dateBefore,
  })
  return apiFetch<WaterDistributionResponse>(
    `/water_pipe/${waterPipeId}/consumption-distribution/?${params.toString()}`
  )
}
