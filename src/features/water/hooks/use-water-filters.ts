import { useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { fetchWaterHeadquarters } from '../api/water-headquarters'
import { formatDateISO, parseDateSafe } from '@/lib/date-utils'

export function useWaterFilters() {
  const navigate = useNavigate({ from: '/energia/water/dashboard/panel' })
  const search = useSearch({ from: '/energia/water/dashboard/panel' })

  // Read ALL state directly from URL — single source of truth
  const sedeId = typeof search.sede === 'string' ? Number(search.sede) : null
  const tuberiaId = typeof search.tuberia === 'string' ? Number(search.tuberia) : null
  const dateAfter = parseDateSafe(typeof search.desde === 'string' ? search.desde : undefined)
  const dateBefore = parseDateSafe(typeof search.hasta === 'string' ? search.hasta : undefined)

  const today = useMemo(() => new Date(), [])

  // Fetch water headquarters
  const { data: headquartersData, isLoading: isLoadingHeadquarters } = useQuery({
    queryKey: ['water-headquarters'],
    queryFn: fetchWaterHeadquarters,
  })

  const headquarters = useMemo(() => headquartersData?.results ?? [], [headquartersData])

  // Derived: current headquarter and pipes
  const currentHeadquarter = useMemo(() => {
    return headquarters.find((h) => h.id === sedeId) ?? null
  }, [headquarters, sedeId])

  const pipes = useMemo(() => {
    return currentHeadquarter?.water_pipes.filter((p) => p.is_active) ?? []
  }, [currentHeadquarter])

  // Auto-select: if URL is missing values, navigate to defaults
  const hasAutoSelected = useRef(false)

  useEffect(() => {
    if (hasAutoSelected.current) return
    if (headquarters.length === 0) return

    const firstActiveSede = headquarters.find((h) => h.is_active) ?? headquarters[0]
    const targetSedeId = sedeId ?? firstActiveSede?.id ?? null

    if (!targetSedeId) return

    const targetHeadquarter = headquarters.find((h) => h.id === targetSedeId)
    const availablePipes = targetHeadquarter?.water_pipes.filter((p) => p.is_active) ?? []
    const targetTuberiaId = tuberiaId ?? availablePipes[0]?.id ?? null

    const targetDateAfter = dateAfter ?? today
    const targetDateBefore = dateBefore ?? today

    const needsNavigation =
      sedeId !== targetSedeId ||
      tuberiaId !== targetTuberiaId ||
      dateAfter?.getTime() !== targetDateAfter.getTime() ||
      dateBefore?.getTime() !== targetDateBefore.getTime()

    if (needsNavigation) {
      hasAutoSelected.current = true
      navigate({
        search: {
          sede: String(targetSedeId),
          tuberia: targetTuberiaId ? String(targetTuberiaId) : undefined,
          desde: formatDateISO(targetDateAfter),
          hasta: formatDateISO(targetDateBefore),
          wmp_sede: search.wmp_sede,
          wmp_tuberia: search.wmp_tuberia,
          wmp_punto: search.wmp_punto,
          wmp_indicador: search.wmp_indicador,
          wmp_weekday: search.wmp_weekday,
          wmp_anio: search.wmp_anio,
          wmp_mes: search.wmp_mes,
        },
        resetScroll: false,
        hashScrollIntoView: false,
      })
    }
  }, [
    headquarters,
    sedeId,
    tuberiaId,
    dateAfter,
    dateBefore,
    today,
    navigate,
    search.wmp_sede,
    search.wmp_tuberia,
    search.wmp_punto,
    search.wmp_indicador,
    search.wmp_weekday,
    search.wmp_anio,
    search.wmp_mes,
  ])

  // Handlers — just navigate, no local state
  const setSedeId = useCallback(
    (id: number) => {
      navigate({
        search: {
          sede: String(id),
          tuberia: undefined, // Reset pipe when sede changes
          desde: formatDateISO(dateAfter ?? today),
          hasta: formatDateISO(dateBefore ?? today),
          wmp_sede: search.wmp_sede,
          wmp_tuberia: search.wmp_tuberia,
          wmp_punto: search.wmp_punto,
          wmp_indicador: search.wmp_indicador,
          wmp_weekday: search.wmp_weekday,
          wmp_anio: search.wmp_anio,
          wmp_mes: search.wmp_mes,
        },
        resetScroll: false,
        hashScrollIntoView: false,
      })
    },
    [
      navigate,
      dateAfter,
      dateBefore,
      today,
      search.wmp_sede,
      search.wmp_tuberia,
      search.wmp_punto,
      search.wmp_indicador,
      search.wmp_weekday,
      search.wmp_anio,
      search.wmp_mes,
    ]
  )

  const setTuberiaId = useCallback(
    (id: number) => {
      navigate({
        search: {
          sede: String(sedeId),
          tuberia: String(id),
          desde: formatDateISO(dateAfter ?? today),
          hasta: formatDateISO(dateBefore ?? today),
          wmp_sede: search.wmp_sede,
          wmp_tuberia: search.wmp_tuberia,
          wmp_punto: search.wmp_punto,
          wmp_indicador: search.wmp_indicador,
          wmp_weekday: search.wmp_weekday,
          wmp_anio: search.wmp_anio,
          wmp_mes: search.wmp_mes,
        },
        resetScroll: false,
        hashScrollIntoView: false,
      })
    },
    [
      navigate,
      sedeId,
      dateAfter,
      dateBefore,
      today,
      search.wmp_sede,
      search.wmp_tuberia,
      search.wmp_punto,
      search.wmp_indicador,
      search.wmp_weekday,
      search.wmp_anio,
      search.wmp_mes,
    ]
  )

  const setDateRange = useCallback(
    (range: { startDate: Date | null; endDate: Date | null }) => {
      navigate({
        search: {
          sede: String(sedeId),
          tuberia: tuberiaId ? String(tuberiaId) : undefined,
          desde: formatDateISO(range.startDate),
          hasta: formatDateISO(range.endDate),
          wmp_sede: search.wmp_sede,
          wmp_tuberia: search.wmp_tuberia,
          wmp_punto: search.wmp_punto,
          wmp_indicador: search.wmp_indicador,
          wmp_weekday: search.wmp_weekday,
          wmp_anio: search.wmp_anio,
          wmp_mes: search.wmp_mes,
        },
        resetScroll: false,
        hashScrollIntoView: false,
      })
    },
    [
      navigate,
      sedeId,
      tuberiaId,
      search.wmp_sede,
      search.wmp_tuberia,
      search.wmp_punto,
      search.wmp_indicador,
      search.wmp_weekday,
      search.wmp_anio,
      search.wmp_mes,
    ]
  )

  const currentPipe = useMemo(() => {
    return pipes.find((p) => p.id === tuberiaId) ?? null
  }, [pipes, tuberiaId])

  const isReady = !!sedeId && !!tuberiaId && !!dateAfter && !!dateBefore

  return {
    // Data
    headquarters,
    pipes,
    currentHeadquarter,
    currentPipe,

    // State (from URL)
    sedeId,
    tuberiaId,
    dateAfter,
    dateBefore,

    // Handlers
    setSedeId,
    setTuberiaId,
    setDateRange,

    // Status
    isLoadingHeadquarters,
    isReady,
  }
}
