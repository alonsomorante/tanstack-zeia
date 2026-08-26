import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchWaterConsumptionSummary } from './water-consumption-summary'
import * as apiClient from '@/lib/api-client'

describe('fetchWaterConsumptionSummary', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('calls apiFetch with the consumption summary path', async () => {
    const apiFetchSpy = vi.spyOn(apiClient, 'apiFetch').mockResolvedValue({
      water_pipe_id: 1,
      water_pipe_name: 'Tubería Matriz Edificio A',
      today_consumption_litros: 1520.417,
      month_consumption_litros: 38420.55,
      month_average_daily_litros: 1536.822,
      date_range: { today: '2026-08-25', month_start: '2026-08-01', month_end: '2026-08-25' },
    })

    await fetchWaterConsumptionSummary(1)

    expect(apiFetchSpy).toHaveBeenCalledWith('/water_pipe/1/consumption-summary/')
  })
})
