import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchWaterMeasurementPoints } from './water-measurement-points'
import * as apiClient from '@/lib/api-client'

describe('fetchWaterMeasurementPoints', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('calls apiFetch with the correct water pipe path and pagination', async () => {
    const apiFetchSpy = vi.spyOn(apiClient, 'apiFetch').mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await fetchWaterMeasurementPoints(199, 1)

    expect(apiFetchSpy).toHaveBeenCalledWith(
      '/headquarter/199/water_pipe/1/measurement_points_water/list/?page=1&page_size=100'
    )
  })
})
