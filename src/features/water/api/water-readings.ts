import { apiFetch } from '@/lib/api-client'
import type { WaterReadingsResponse } from '../types'

export interface WaterReadingsTableParams {
  indicador?: string
  dateAfter?: string
  dateBefore?: string
  hourAfter?: string
  hourBefore?: string
  weekday?: string
  lastDays?: number
  page?: number
  pageSize?: number
}

export function fetchWaterReadingsTable(
  headquarterId: number,
  waterPipeId: number,
  measurementPointId: number,
  params: WaterReadingsTableParams
): Promise<WaterReadingsResponse> {
  const query = new URLSearchParams()

  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.pageSize !== undefined) query.set('page_size', String(params.pageSize))
  if (params.indicador) query.set('indicador', params.indicador)
  if (params.dateAfter) query.set('date_after', params.dateAfter)
  if (params.dateBefore) query.set('date_before', params.dateBefore)
  if (params.hourAfter) query.set('hour_after', params.hourAfter)
  if (params.hourBefore) query.set('hour_before', params.hourBefore)
  if (params.weekday) query.set('weekday', params.weekday)
  if (params.lastDays !== undefined) query.set('last_days', String(params.lastDays))

  return apiFetch<WaterReadingsResponse>(
    `/headquarter/${headquarterId}/water_pipe/${waterPipeId}/measurement_point_water/${measurementPointId}/readings?${query.toString()}`
  )
}
