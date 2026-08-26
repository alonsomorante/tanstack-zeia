import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchWaterConsumptionDistribution } from './water-consumption-distribution'
import * as apiClient from '@/lib/api-client'

describe('fetchWaterConsumptionDistribution', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('calls apiFetch with the distribution path and date params', async () => {
    const apiFetchSpy = vi.spyOn(apiClient, 'apiFetch').mockResolvedValue({
      water_pipe_id: 1,
      water_pipe_name: 'Tubería Matriz Edificio A',
      main_consumption_litros: 38420.55,
      total_measurement_points: 3,
      date_range: { type: 'custom', start_date: '2026-08-01', end_date: '2026-08-25' },
      results: [],
    })

    await fetchWaterConsumptionDistribution(1, '2026-08-01', '2026-08-25')

    expect(apiFetchSpy).toHaveBeenCalledWith(
      '/water_pipe/1/consumption-distribution/?date_after=2026-08-01&date_before=2026-08-25'
    )
  })
})
