import { useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { fetchWaterHeadquarters } from '../api/water-headquarters'
import { fetchWaterMeasurementPoints } from '../api/water-measurement-points'
import { formatDateISO, parseDateSafe } from '@/lib/date-utils'

export const AGRUPACION_OPTIONS = ['day', 'hour'] as const
export type Agrupacion = (typeof AGRUPACION_OPTIONS)[number]

export const AGRUPACION_LABELS: Record<Agrupacion, string> = {
  day: 'Día',
  hour: 'Hora',
}

function isAgrupacion(value: unknown): value is Agrupacion {
  return typeof value === 'string' && (AGRUPACION_OPTIONS as readonly string[]).includes(value)
}

export function useWaterComparadorFilters() {
  const navigate = useNavigate({ from: '/energia/water/dashboard/comparador' })
  const search = useSearch({ from: '/energia/water/dashboard/comparador' })

  // Read ALL state directly from URL — single source of truth
  const sedeId = typeof search.sede === 'string' ? Number(search.sede) : null
  const tuberiaId = typeof search.tuberia === 'string' ? Number(search.tuberia) : null
  const rawPuntoId = typeof search.punto === 'string' ? Number(search.punto) : null
  const agrupacion: Agrupacion = isAgrupacion(search.agrupacion) ? search.agrupacion : 'hour'
  const dateAfter = parseDateSafe(typeof search.desde === 'string' ? search.desde : undefined)
  const dateBefore = parseDateSafe(typeof search.hasta === 'string' ? search.hasta : undefined)

  const today = useMemo(() => new Date(), [])

  // Fetch water headquarters + measurement points
  const { data: headquartersData, isLoading: isLoadingHeadquarters } = useQuery({
    queryKey: ['water-headquarters'],
    queryFn: fetchWaterHeadquarters,
  })

  const headquarters = useMemo(() => headquartersData?.results ?? [], [headquartersData])

  const currentHeadquarter = useMemo(() => {
    return headquarters.find((h) => h.id === sedeId) ?? null
  }, [headquarters, sedeId])

  const pipes = useMemo(() => {
    return currentHeadquarter?.water_pipes.filter((p) => p.is_active) ?? []
  }, [currentHeadquarter])

  const { data: measurementPointsData, isLoading: isLoadingMeasurementPoints } = useQuery({
    queryKey: ['water-measurement-points', sedeId, tuberiaId],
    queryFn: () => {
      if (!sedeId || !tuberiaId) throw new Error('Missing required parameters')
      return fetchWaterMeasurementPoints(sedeId, tuberiaId)
    },
    enabled: !!sedeId && !!tuberiaId,
  })

  const measurementPoints = useMemo(() => {
    return measurementPointsData?.results.filter((mp) => mp.is_active) ?? []
  }, [measurementPointsData])

  // Si no hay punto explícito en URL, usa el primer punto activo disponible
  const puntoId = rawPuntoId ?? measurementPoints[0]?.id ?? null

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
          // El punto por defecto se deriva de los puntos cargados (no se navega)
          punto: rawPuntoId ? String(rawPuntoId) : undefined,
          agrupacion,
          desde: formatDateISO(targetDateAfter),
          hasta: formatDateISO(targetDateBefore),
        },
        resetScroll: false,
        hashScrollIntoView: false,
      })
    }
  }, [
    headquarters,
    sedeId,
    tuberiaId,
    rawPuntoId,
    agrupacion,
    dateAfter,
    dateBefore,
    today,
    navigate,
  ])

  // Handlers — just navigate, no local state
  const setSedeId = useCallback(
    (id: number) => {
      navigate({
        search: {
          sede: String(id),
          tuberia: undefined, // Reset pipe when sede changes
          punto: undefined, // Reset point when sede changes
          agrupacion,
          desde: formatDateISO(dateAfter ?? today),
          hasta: formatDateISO(dateBefore ?? today),
        },
        resetScroll: false,
        hashScrollIntoView: false,
      })
    },
    [navigate, agrupacion, dateAfter, dateBefore, today]
  )

  const setTuberiaId = useCallback(
    (id: number) => {
      navigate({
        search: {
          sede: String(sedeId),
          tuberia: String(id),
          punto: undefined, // Reset point when pipe changes
          agrupacion,
          desde: formatDateISO(dateAfter ?? today),
          hasta: formatDateISO(dateBefore ?? today),
        },
        resetScroll: false,
        hashScrollIntoView: false,
      })
    },
    [navigate, sedeId, agrupacion, dateAfter, dateBefore, today]
  )

  const setPuntoId = useCallback(
    (id: number) => {
      navigate({
        search: {
          sede: String(sedeId),
          tuberia: String(tuberiaId),
          punto: String(id),
          agrupacion,
          desde: formatDateISO(dateAfter ?? today),
          hasta: formatDateISO(dateBefore ?? today),
        },
        resetScroll: false,
        hashScrollIntoView: false,
      })
    },
    [navigate, sedeId, tuberiaId, agrupacion, dateAfter, dateBefore, today]
  )

  const setAgrupacion = useCallback(
    (value: Agrupacion) => {
      navigate({
        search: {
          sede: String(sedeId),
          tuberia: tuberiaId ? String(tuberiaId) : undefined,
          punto: puntoId ? String(puntoId) : undefined,
          agrupacion: value,
          desde: formatDateISO(dateAfter ?? today),
          hasta: formatDateISO(dateBefore ?? today),
        },
        resetScroll: false,
        hashScrollIntoView: false,
      })
    },
    [navigate, sedeId, tuberiaId, puntoId, dateAfter, dateBefore, today]
  )

  const setDateRange = useCallback(
    (range: { startDate: Date | null; endDate: Date | null }) => {
      navigate({
        search: {
          sede: String(sedeId),
          tuberia: tuberiaId ? String(tuberiaId) : undefined,
          punto: puntoId ? String(puntoId) : undefined,
          agrupacion,
          desde: formatDateISO(range.startDate),
          hasta: formatDateISO(range.endDate),
        },
        resetScroll: false,
        hashScrollIntoView: false,
      })
    },
    [navigate, sedeId, tuberiaId, puntoId, agrupacion]
  )

  const isReady = !!sedeId && !!tuberiaId && !!puntoId && !!dateAfter && !!dateBefore

  return {
    // Data
    headquarters,
    pipes,
    measurementPoints,
    currentHeadquarter,

    // State (from URL)
    sedeId,
    tuberiaId,
    puntoId,
    agrupacion,
    dateAfter,
    dateBefore,

    // Handlers
    setSedeId,
    setTuberiaId,
    setPuntoId,
    setAgrupacion,
    setDateRange,

    // Status
    isLoadingHeadquarters,
    isLoadingMeasurementPoints,
    isReady,
  }
}
