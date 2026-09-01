import { apiFetch } from '@/lib/api-client'
import type { WaterHeadquartersResponse } from '../types'

export function fetchWaterHeadquarters(): Promise<WaterHeadquartersResponse> {
  return apiFetch<WaterHeadquartersResponse>('/user/water-headquarters/')
}
