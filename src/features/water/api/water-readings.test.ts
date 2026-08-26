import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchWaterReadingsTable } from './water-readings'
import * as apiClient from '@/lib/api-client'

describe('fetchWaterReadingsTable', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('calls apiFetch with the readings path and default pagination', async () => {
    const apiFetchSpy = vi.spyOn(apiClient, 'apiFetch').mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await fetchWaterReadingsTable(199, 1, 1, { page: 1, pageSize: 10 })

    expect(apiFetchSpy).toHaveBeenCalledWith(
      '/headquarter/199/water_pipe/1/measurement_point_water/1/readings?page=1&page_size=10'
    )
  })

  it('includes optional filters when provided', async () => {
    const apiFetchSpy = vi.spyOn(apiClient, 'apiFetch').mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await fetchWaterReadingsTable(199, 1, 1, {
      indicador: 'consumo_total_litros',
      dateAfter: '2026-08-01',
      dateBefore: '2026-08-30',
      hourAfter: '08:00',
      hourBefore: '18:00',
      weekday: '1,2,3,4,5',
      lastDays: 7,
    })

    expect(apiFetchSpy).toHaveBeenCalledWith(
      '/headquarter/199/water_pipe/1/measurement_point_water/1/readings?indicador=consumo_total_litros&date_after=2026-08-01&date_before=2026-08-30&hour_after=08%3A00&hour_before=18%3A00&weekday=1%2C2%2C3%2C4%2C5&last_days=7'
    )
  })

  it('omits filters that are undefined', async () => {
    const apiFetchSpy = vi.spyOn(apiClient, 'apiFetch').mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    await fetchWaterReadingsTable(199, 1, 1, {})

    expect(apiFetchSpy).toHaveBeenCalledWith(
      '/headquarter/199/water_pipe/1/measurement_point_water/1/readings?'
    )
  })
})
