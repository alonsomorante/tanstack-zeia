import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchWaterHeadquarters } from './water-headquarters'
import * as apiClient from '@/lib/api-client'

describe('fetchWaterHeadquarters', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('calls apiFetch with the water headquarters path', async () => {
    const apiFetchSpy = vi.spyOn(apiClient, 'apiFetch').mockResolvedValue({
      count: 1,
      results: [],
    })

    await fetchWaterHeadquarters()

    expect(apiFetchSpy).toHaveBeenCalledWith('/user/water-headquarters/')
  })
})
