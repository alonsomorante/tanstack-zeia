import { useCallback, useMemo } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { fetchHeadquarters } from '../api/headquarters'
import { fetchBillingCycles } from '../api/billing-cycles'
import { getPersistedFilterId } from '@/lib/filter-persistence'
import { formatDateShort } from '@/lib/date-utils'
import { getCycleLabel } from '../lib/billing-format'
import {
  MAX_COMPARE_POINTS,
  buildPeriodRange,
  getPresetPeriodRange,
  isNetworkPeriod,
  parseCompareIds,
  parseDateKey,
  selectionFromSearch,
  selectionToSearch,
  startOfDay,
  toDateKey,
  type NetworkPeriod,
  type NetworkPeriodRange,
  type NetworkSelection,
} from '../lib/network-map'
import { isNetworkLayer, type NetworkLayer } from '../lib/network-layers'

/**
 * Estado del Mapa de Red, todo en la URL: sede, período, capa, elemento
 * seleccionado (tablero/punto) y puntos en comparación. El mapa reemplaza a
 * los selectores: elegir en el diagrama es elegir el filtro.
 */
export type PeriodStatus = 'ready' | 'loading' | 'unavailable' | 'pick'

export function useMapaFilters() {
  const navigate = useNavigate({ from: '/energia/dashboard/mapa' })
  const search = useSearch({ from: '/energia/dashboard/mapa' })
  const today = useMemo(() => new Date(), [])

  const { data: headquartersData, isLoading: isLoadingHeadquarters } = useQuery({
    queryKey: ['headquarters'],
    queryFn: fetchHeadquarters,
  })
  const headquarters = useMemo(() => headquartersData?.results ?? [], [headquartersData])

  const urlSedeId = typeof search.sede === 'string' ? Number(search.sede) : null

  // Sede efectiva derivada en render (sin escribir la URL en un efecto):
  // URL válida → última selección persistida → primera sede activa.
  const sedeId = useMemo(() => {
    if (headquarters.length === 0) return null
    if (urlSedeId != null && headquarters.some((h) => h.id === urlSedeId)) return urlSedeId
    const fallback = headquarters.find((h) => h.is_active) ?? headquarters[0]
    return getPersistedFilterId('energy', 'sede', headquarters) ?? fallback.id
  }, [headquarters, urlSedeId])

  const currentHeadquarter = useMemo(
    () => headquarters.find((h) => h.id === sedeId) ?? null,
    [headquarters, sedeId]
  )

  // Mismo caché que el Consumo Tarifario.
  const { data: cyclesData, isLoading: isLoadingCycles } = useQuery({
    queryKey: ['billing-cycles', sedeId],
    queryFn: () => {
      if (sedeId == null) throw new Error('Missing sede')
      return fetchBillingCycles(sedeId)
    },
    enabled: sedeId != null,
  })
  const currentCycle = useMemo(
    () => cyclesData?.results.find((c) => c.is_current) ?? null,
    [cyclesData]
  )

  const periodo: NetworkPeriod = isNetworkPeriod(search.periodo) ? search.periodo : 'hoy'

  const { range, periodStatus } = useMemo((): { range: NetworkPeriodRange | null; periodStatus: PeriodStatus } => {
    const todayStart = startOfDay(today)
    if (periodo === 'ciclo') {
      if (sedeId == null || isLoadingCycles) return { range: null, periodStatus: 'loading' }
      const start = currentCycle ? parseDateKey(currentCycle.start_date) : null
      const cycleEnd = currentCycle ? parseDateKey(currentCycle.end_date) : null
      if (!currentCycle || !start || !cycleEnd || start > todayStart) {
        return { range: null, periodStatus: 'unavailable' }
      }
      const end = cycleEnd < todayStart ? cycleEnd : todayStart
      const label = `Ciclo ${getCycleLabel(currentCycle)} · ${formatDateShort(toDateKey(start))} → ${formatDateShort(toDateKey(end))}`
      return { range: buildPeriodRange(start, end, today, 'Ciclo actual', label), periodStatus: 'ready' }
    }
    if (periodo === 'custom') {
      const start = search.desde ? parseDateKey(search.desde) : null
      const rawEnd = search.hasta ? parseDateKey(search.hasta) : null
      if (!start || !rawEnd) return { range: null, periodStatus: 'pick' }
      const end = rawEnd > todayStart ? todayStart : rawEnd
      if (start > end) return { range: null, periodStatus: 'pick' }
      return { range: buildPeriodRange(start, end, today, 'Personalizado'), periodStatus: 'ready' }
    }
    return { range: getPresetPeriodRange(periodo, today), periodStatus: 'ready' }
  }, [periodo, today, sedeId, isLoadingCycles, currentCycle, search.desde, search.hasta])

  const layer: NetworkLayer = isNetworkLayer(search.capa) ? search.capa : 'consumo'
  const selection = useMemo(() => selectionFromSearch(search.tablero, search.punto), [search.tablero, search.punto])
  const compareIds = useMemo(() => parseCompareIds(search.comparar), [search.comparar])

  const setSedeId = useCallback(
    (id: number) => {
      // La selección y la comparación pertenecen a la sede anterior.
      navigate({
        search: (prev) => ({ ...prev, sede: String(id), tablero: undefined, punto: undefined, comparar: undefined }),
        resetScroll: false,
      })
    },
    [navigate]
  )

  const setPeriodo = useCallback(
    (value: Exclude<NetworkPeriod, 'custom'>) => {
      navigate({
        search: (prev) => ({ ...prev, periodo: value === 'hoy' ? undefined : value, desde: undefined, hasta: undefined }),
        resetScroll: false,
      })
    },
    [navigate]
  )

  const setCustomRange = useCallback(
    (start: Date | null, end: Date | null) => {
      navigate({
        search: (prev) =>
          start && end
            ? { ...prev, periodo: 'custom', desde: toDateKey(start), hasta: toDateKey(end) }
            : { ...prev, periodo: undefined, desde: undefined, hasta: undefined },
        resetScroll: false,
      })
    },
    [navigate]
  )

  // Capa, selección y comparación reemplazan la entrada del historial:
  // "atrás" vuelve a la página anterior, no recorre cada clic en el mapa.
  const setLayer = useCallback(
    (value: NetworkLayer) => {
      navigate({
        search: (prev) => ({ ...prev, capa: value === 'consumo' ? undefined : value }),
        replace: true,
        resetScroll: false,
      })
    },
    [navigate]
  )

  const setSelection = useCallback(
    (next: NetworkSelection) => {
      navigate({
        search: (prev) => ({ ...prev, ...selectionToSearch(next) }),
        replace: true,
        resetScroll: false,
      })
    },
    [navigate]
  )

  const setCompareIds = useCallback(
    (ids: number[]) => {
      navigate({
        search: (prev) => ({ ...prev, comparar: ids.length > 0 ? ids.join(',') : undefined }),
        replace: true,
        resetScroll: false,
      })
    },
    [navigate]
  )

  const toggleCompare = useCallback(
    (pointId: number) => {
      if (compareIds.includes(pointId)) {
        setCompareIds(compareIds.filter((id) => id !== pointId))
      } else if (compareIds.length < MAX_COMPARE_POINTS) {
        setCompareIds([...compareIds, pointId])
      }
    },
    [compareIds, setCompareIds]
  )

  return {
    today,
    headquarters,
    currentHeadquarter,
    sedeId,
    isLoadingHeadquarters,
    periodo,
    range,
    periodStatus,
    currentCycle,
    // Mientras cargan los ciclos se permite elegirlo; sin ciclo vigente, no.
    cycleAvailable: isLoadingCycles || currentCycle != null,
    customStart: periodo === 'custom' && search.desde ? parseDateKey(search.desde) : null,
    customEnd: periodo === 'custom' && search.hasta ? parseDateKey(search.hasta) : null,
    layer,
    selection,
    compareIds,
    setSedeId,
    setPeriodo,
    setCustomRange,
    setLayer,
    setSelection,
    setCompareIds,
    toggleCompare,
  }
}
