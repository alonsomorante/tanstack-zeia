import { apiFetch } from '@/lib/api-client'
import type { WaterHeadquartersResponse } from '../types'
import { USE_WATER_MOCKS } from '@/mocks/config'
import { WATER_HEADQUARTERS } from '@/mocks/water-data'

export function fetchWaterHeadquarters(): Promise<WaterHeadquartersResponse> {
  if (USE_WATER_MOCKS) return Promise.resolve(WATER_HEADQUARTERS)
  return apiFetch<WaterHeadquartersResponse>('/user/water-headquarters/')
}
