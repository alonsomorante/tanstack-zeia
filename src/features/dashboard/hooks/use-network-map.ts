import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchMeasurementPoints } from '../api/measurement-points'
import { buildNetworkMap, type NetworkPeriodRange } from '../lib/network-map'
import { useAllPanelsConsumption } from './use-all-panels-consumption'

/**
 * Datos del Mapa de Red de una sede: consumo de cada tablero activo (una llamada
 * a consumption-distribution por tablero, mismo caché que "Todos los tableros")
 * + estructura de medidores/puntos para la foto y fecha de instalación.
 * Sin rango (ciclo sin cargar, fechas sin elegir) no se pide consumo.
 */
export function useNetworkMap(sedeId: number | null, range: NetworkPeriodRange | null) {
  const { panels } = useAllPanelsConsumption(sedeId, range?.dateAfter ?? '', range?.dateBefore ?? '')

  const { data: structure } = useQuery({
    queryKey: ['measurement-points', sedeId],
    queryFn: () => {
      if (sedeId == null) throw new Error('Missing sede')
      return fetchMeasurementPoints(sedeId)
    },
    enabled: sedeId != null,
    staleTime: 10 * 60 * 1000,
  })

  const model = useMemo(() => buildNetworkMap(panels, structure), [panels, structure])

  return { model }
}
