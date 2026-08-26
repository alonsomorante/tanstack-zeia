import { apiFetch } from '@/lib/api-client'
import type { WaterDistributionResponse } from '../types'
import { USE_WATER_MOCKS } from '@/mocks/config'
import { makeWaterConsumptionDistribution } from '@/mocks/water-data'

export function fetchWaterConsumptionDistribution(
  waterPipeId: number,
  dateAfter: string,
  dateBefore: string
): Promise<WaterDistributionResponse> {
  if (USE_WATER_MOCKS) {
    return Promise.resolve(makeWaterConsumptionDistribution(waterPipeId, dateAfter, dateBefore))
  }
  const params = new URLSearchParams({
    date_after: dateAfter,
    date_before: dateBefore,
  })
  return apiFetch<WaterDistributionResponse>(
    `/water_pipe/${waterPipeId}/consumption-distribution/?${params.toString()}`
  )
}
