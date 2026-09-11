import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { fetchHeadquarters } from '../api/headquarters'
import { fetchConsumptionDistribution } from '../api/consumption'
import type { ConsumptionDistributionResponse, ElectricalPanel } from '../types'

export interface PanelConsumption {
  panel: ElectricalPanel
  data: ConsumptionDistributionResponse | undefined
  isLoading: boolean
  mainKwh: number
}

export function useAllPanelsConsumption(
  sedeId: number | null,
  dateAfterStr: string,
  dateBeforeStr: string
) {
  const { data: headquartersData, isLoading: isLoadingHeadquarters } = useQuery({
    queryKey: ['headquarters'],
    queryFn: fetchHeadquarters,
  })

  const panels: ElectricalPanel[] = useMemo(() => {
    if (sedeId == null) return []
    const hq = (headquartersData?.results ?? []).find((h) => h.id === sedeId)
    return (hq?.electrical_panels ?? []).filter((p) => p.is_active)
  }, [headquartersData, sedeId])

  const hasRange = dateAfterStr !== '' && dateBeforeStr !== ''

  const distributions = useQueries({
    queries: panels.map((panel) => ({
      queryKey: ['consumption-distribution', sedeId, panel.id, dateAfterStr, dateBeforeStr],
      queryFn: () => {
        if (sedeId == null) throw new Error('Missing sede')
        return fetchConsumptionDistribution(sedeId, panel.id, dateAfterStr, dateBeforeStr)
      },
      enabled: sedeId != null && hasRange,
      staleTime: 5 * 60 * 1000,
    })),
  })

  const panelsData: PanelConsumption[] = useMemo(() => {
    return panels.map((panel, index) => {
      const query = distributions[index]
      const data = query?.data
      return {
        panel,
        data,
        isLoading: query?.isLoading ?? false,
        mainKwh: data?.main_consumption_kwh ?? 0,
      }
    })
  }, [panels, distributions])

  const isLoadingPanels = distributions.some((q) => q.isLoading)
  const isLoading = isLoadingHeadquarters || isLoadingPanels

  const totalKwh = useMemo(
    () => panelsData.reduce((sum, p) => sum + p.mainKwh, 0),
    [panelsData]
  )

  const topPanel = useMemo(() => {
    if (panelsData.length === 0) return null
    return panelsData.reduce((best, p) => (p.mainKwh > best.mainKwh ? p : best))
  }, [panelsData])

  return {
    panels: panelsData,
    totalKwh,
    topPanel,
    isLoading,
    isLoadingHeadquarters,
  }
}
