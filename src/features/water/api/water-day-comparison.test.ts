import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchWaterDayComparison } from './water-day-comparison'
import * as apiClient from '@/lib/api-client'

describe('fetchWaterDayComparison', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('calls apiFetch with the graph-especific path and default last_by=hour', async () => {
    const apiFetchSpy = vi.spyOn(apiClient, 'apiFetch').mockResolvedValue([])

    await fetchWaterDayComparison(199, 1, 1, '2026-08-03', '2026-08-04')

    expect(apiFetchSpy).toHaveBeenCalledWith(
      '/headquarter/199/water_pipe/1/measurement_point_water/1/readings/graph-especific?last_by=hour&date_after=2026-08-03&date_before=2026-08-04'
    )
  })

  it('allows custom last_by and omits weekday when not provided', async () => {
    const apiFetchSpy = vi.spyOn(apiClient, 'apiFetch').mockResolvedValue([])

    await fetchWaterDayComparison(199, 1, 1, '2026-08-03', '2026-08-08', { lastBy: 'day' })

    expect(apiFetchSpy).toHaveBeenCalledWith(
      '/headquarter/199/water_pipe/1/measurement_point_water/1/readings/graph-especific?last_by=day&date_after=2026-08-03&date_before=2026-08-08'
    )
  })

  it('adds weekday when provided', async () => {
    const apiFetchSpy = vi.spyOn(apiClient, 'apiFetch').mockResolvedValue([])

    await fetchWaterDayComparison(199, 1, 1, '2026-08-03', '2026-08-08', {
      lastBy: 'hour',
      weekday: '1,2,3,4,5',
    })

    expect(apiFetchSpy).toHaveBeenCalledWith(
      '/headquarter/199/water_pipe/1/measurement_point_water/1/readings/graph-especific?last_by=hour&date_after=2026-08-03&date_before=2026-08-08&weekday=1%2C2%2C3%2C4%2C5'
    )
  })
})
