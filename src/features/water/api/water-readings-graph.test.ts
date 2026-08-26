import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchWaterReadingsGraph } from './water-readings-graph'
import * as apiClient from '@/lib/api-client'

describe('fetchWaterReadingsGraph', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('calls apiFetch with the graph path and query params', async () => {
    const apiFetchSpy = vi.spyOn(apiClient, 'apiFetch').mockResolvedValue([])

    await fetchWaterReadingsGraph(199, 1, 1, '2026-08-01', '2026-08-30', 'consumo_total_litros', '1,2,3,4,5')

    expect(apiFetchSpy).toHaveBeenCalledWith(
      '/headquarter/199/water_pipe/1/measurement_point_water/1/readings/graph?last_by=day&date_after=2026-08-01&date_before=2026-08-30&indicador=consumo_total_litros&weekday=1%2C2%2C3%2C4%2C5'
    )
  })

  it('applies last_by and omits weekday when not provided', async () => {
    const apiFetchSpy = vi.spyOn(apiClient, 'apiFetch').mockResolvedValue([])

    await fetchWaterReadingsGraph(
      199,
      1,
      1,
      '2026-08-03',
      '2026-08-03',
      'consumo_total_litros',
      undefined,
      'hour'
    )

    expect(apiFetchSpy).toHaveBeenCalledWith(
      '/headquarter/199/water_pipe/1/measurement_point_water/1/readings/graph?last_by=hour&date_after=2026-08-03&date_before=2026-08-03&indicador=consumo_total_litros'
    )
  })
})
