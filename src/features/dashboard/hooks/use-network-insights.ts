import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { fetchPowerGraph } from '../api/power-graph'
import { fetchMostThreeUnbalanced } from '../api/most-three-unbalanced'
import { fetchDeviceMeasurementPointsList } from '../api/measurement-points'
import type { DeviceMeasurementPoint, DeviceMeasurementPointsListResponse, Headquarter } from '../types'
import type { NetworkMapModel, NetworkPeriodRange } from '../lib/network-map'
import { analyzePower, getPowerGranularity, type PowerAnalysis, type PowerGranularity } from '../lib/network-power'
import { rankUnbalance, type UnbalanceRank } from '../lib/network-unbalance'

export interface NetworkPowerState {
  analysis: PowerAnalysis | null
  granularity: PowerGranularity
  isLoading: boolean
  isError: boolean
}

/**
 * Curva de potencia de la sede (una llamada para todos los puntos). Misma key
 * que el Monitoreo de Potencia, así comparten caché.
 */
export function useNetworkPower(
  sedeId: number | null,
  range: NetworkPeriodRange | null,
  model: NetworkMapModel,
  headquarter: Headquarter | null
): NetworkPowerState {
  const granularity = getPowerGranularity(range?.days ?? 1)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['power-graph', sedeId, range?.dateAfter ?? '', range?.dateBefore ?? '', granularity],
    queryFn: () => {
      if (sedeId == null || !range) throw new Error('Missing parameters')
      return fetchPowerGraph(sedeId, range.dateAfter, range.dateBefore, granularity)
    },
    enabled: sedeId != null && range != null,
    staleTime: 5 * 60 * 1000,
  })

  // Medidores generales con nombre único: sus curvas suman la demanda de la sede.
  const mainNamesKey = model.panels
    .map((p) => p.mainMeterName)
    .filter((name): name is string => name != null && !model.ambiguousNames.has(name))
    .join('\u0000')
  const power = headquarter?.powers?.[0]
  const contracted = power?.power_contracted ?? null
  const installed = power?.power_installed ?? null
  const max = power?.power_max ?? null

  const analysis = useMemo(() => {
    if (!data) return null
    const mainNames = mainNamesKey ? mainNamesKey.split('\u0000') : []
    return analyzePower(data, mainNames, granularity, { contracted, installed, max })
  }, [data, mainNamesKey, granularity, contracted, installed, max])

  return { analysis, granularity, isLoading, isError }
}

export interface NetworkUnbalanceState {
  ranks: UnbalanceRank[]
  isLoading: boolean
  isError: boolean
}

/** Top 3 de puntos con más desbalance de la sede (una llamada). */
export function useNetworkUnbalance(sedeId: number | null, range: NetworkPeriodRange | null): NetworkUnbalanceState {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['most-three-unbalanced', sedeId, range?.dateAfter ?? '', range?.dateBefore ?? ''],
    queryFn: () => {
      if (sedeId == null || !range) throw new Error('Missing parameters')
      return fetchMostThreeUnbalanced(sedeId, range.dateAfter, range.dateBefore)
    },
    enabled: sedeId != null && range != null,
    staleTime: 5 * 60 * 1000,
  })
  const ranks = useMemo(() => rankUnbalance(data), [data])
  return { ranks, isLoading, isError }
}

const selectDeviceLists = (results: Array<{ data?: DeviceMeasurementPointsListResponse }>) =>
  results.map((r) => r.data)

/**
 * Umbrales y topología de los puntos (una llamada por tablero, mismo caché que
 * los otros módulos). Solo se piden los tableros indicados.
 */
export function useNetworkDevices(sedeId: number | null, panelIds: number[]): ReadonlyMap<number, DeviceMeasurementPoint> {
  const lists = useQueries({
    queries: panelIds.map((panelId) => ({
      queryKey: ['device-measurement-points-list', sedeId, panelId],
      queryFn: () => {
        if (sedeId == null) throw new Error('Missing sede')
        return fetchDeviceMeasurementPointsList(sedeId, panelId)
      },
      enabled: sedeId != null,
      staleTime: 10 * 60 * 1000,
    })),
    combine: selectDeviceLists,
  })

  return useMemo(() => {
    const byId = new Map<number, DeviceMeasurementPoint>()
    for (const list of lists) {
      for (const point of list?.results ?? []) byId.set(point.id, point)
    }
    return byId
  }, [lists])
}
