import { useCallback, useMemo } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { fetchWaterHeadquarters } from '../api/water-headquarters'
import { fetchWaterMeasurementPoints } from '../api/water-measurement-points'
import { isWaterIndicator, type WaterIndicator } from '../lib/indicators'

export const DEFAULT_WATER_INDICATOR: WaterIndicator = 'consumo_total_litros'

export const WEEKDAY_OPTIONS = ['weekdays', 'saturday', 'sunday'] as const
export type Weekday = (typeof WEEKDAY_OPTIONS)[number]

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  weekdays: 'L-V',
  saturday: 'S',
  sunday: 'D',
}

export const WEEKDAY_CSV: Record<Weekday, string> = {
  weekdays: '1,2,3,4,5',
  saturday: '6',
  sunday: '7',
}

export const MONTHS_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const

function isWeekday(value: unknown): value is Weekday {
  return typeof value === 'string' && (WEEKDAY_OPTIONS as readonly string[]).includes(value)
}

function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

function readYearFromUrl(value: unknown, fallback: number): number {
  if (typeof value !== 'string') return fallback
  const n = Number(value)
  return Number.isInteger(n) && n > 1970 && n < 3000 ? n : fallback
}

function readMonthFromUrl(value: unknown, fallback: number): number {
  if (typeof value !== 'string') return fallback
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 && n <= 11 ? n : fallback
}

const NO_SCROLL = { resetScroll: false, hashScrollIntoView: false } as const

export function useWaterPanelReadingsFilters() {
  const navigate = useNavigate({ from: '/energia/water/dashboard/panel' })
  const search = useSearch({ from: '/energia/water/dashboard/panel' })

  const today = useMemo(() => new Date(), [])

  const rawSedeId = typeof search.wmp_sede === 'string' ? Number(search.wmp_sede) : null
  const rawTuberiaId = typeof search.wmp_tuberia === 'string' ? Number(search.wmp_tuberia) : null
  const rawPuntoId = typeof search.wmp_punto === 'string' ? Number(search.wmp_punto) : null

  // Filtros de lecturas heredan de los filtros principales hasta que el usuario los modifica
  const sedeId = rawSedeId ?? (typeof search.sede === 'string' ? Number(search.sede) : null)
  const tuberiaId =
    rawTuberiaId ?? (typeof search.tuberia === 'string' ? Number(search.tuberia) : null)
  const indicador: WaterIndicator = isWaterIndicator(search.wmp_indicador)
    ? search.wmp_indicador
    : DEFAULT_WATER_INDICATOR
  const weekday: Weekday = isWeekday(search.wmp_weekday) ? search.wmp_weekday : 'weekdays'
  const anio = readYearFromUrl(search.wmp_anio, today.getFullYear())
  const mes = readMonthFromUrl(search.wmp_mes, today.getMonth())

  const monthRange = useMemo(() => getMonthRange(anio, mes), [anio, mes])

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
  const puntoId = useMemo(() => {
    return rawPuntoId ?? measurementPoints[0]?.id ?? null
  }, [rawPuntoId, measurementPoints])

  const setSedeId = useCallback(
    (id: number) => {
      navigate({
        search: {
          sede: search.sede,
          tuberia: search.tuberia,
          desde: search.desde,
          hasta: search.hasta,
          wmp_sede: String(id),
          wmp_tuberia: undefined,
          wmp_punto: undefined,
          wmp_indicador: indicador,
          wmp_weekday: weekday,
          wmp_anio: String(anio),
          wmp_mes: String(mes),
        },
        ...NO_SCROLL,
      })
    },
    [navigate, search.sede, search.tuberia, search.desde, search.hasta, indicador, weekday, anio, mes]
  )

  const setTuberiaId = useCallback(
    (id: number) => {
      navigate({
        search: {
          sede: search.sede,
          tuberia: search.tuberia,
          desde: search.desde,
          hasta: search.hasta,
          wmp_sede: String(sedeId),
          wmp_tuberia: String(id),
          wmp_punto: undefined,
          wmp_indicador: indicador,
          wmp_weekday: weekday,
          wmp_anio: String(anio),
          wmp_mes: String(mes),
        },
        ...NO_SCROLL,
      })
    },
    [navigate, search.sede, search.tuberia, search.desde, search.hasta, sedeId, indicador, weekday, anio, mes]
  )

  const setPuntoId = useCallback(
    (id: number) => {
      navigate({
        search: {
          sede: search.sede,
          tuberia: search.tuberia,
          desde: search.desde,
          hasta: search.hasta,
          wmp_sede: String(sedeId),
          wmp_tuberia: String(tuberiaId),
          wmp_punto: String(id),
          wmp_indicador: indicador,
          wmp_weekday: weekday,
          wmp_anio: String(anio),
          wmp_mes: String(mes),
        },
        ...NO_SCROLL,
      })
    },
    [navigate, search.sede, search.tuberia, search.desde, search.hasta, sedeId, tuberiaId, indicador, weekday, anio, mes]
  )

  const setIndicador = useCallback(
    (value: string) => {
      navigate({
        search: {
          sede: search.sede,
          tuberia: search.tuberia,
          desde: search.desde,
          hasta: search.hasta,
          wmp_sede: String(sedeId),
          wmp_tuberia: String(tuberiaId),
          wmp_punto: puntoId ? String(puntoId) : undefined,
          wmp_indicador: value,
          wmp_weekday: weekday,
          wmp_anio: String(anio),
          wmp_mes: String(mes),
        },
        ...NO_SCROLL,
      })
    },
    [navigate, search.sede, search.tuberia, search.desde, search.hasta, sedeId, tuberiaId, puntoId, weekday, anio, mes]
  )

  const setWeekday = useCallback(
    (value: Weekday) => {
      navigate({
        search: {
          sede: search.sede,
          tuberia: search.tuberia,
          desde: search.desde,
          hasta: search.hasta,
          wmp_sede: String(sedeId),
          wmp_tuberia: String(tuberiaId),
          wmp_punto: puntoId ? String(puntoId) : undefined,
          wmp_indicador: indicador,
          wmp_weekday: value,
          wmp_anio: String(anio),
          wmp_mes: String(mes),
        },
        ...NO_SCROLL,
      })
    },
    [navigate, search.sede, search.tuberia, search.desde, search.hasta, sedeId, tuberiaId, puntoId, indicador, anio, mes]
  )

  const setAnio = useCallback(
    (value: number) => {
      navigate({
        search: {
          sede: search.sede,
          tuberia: search.tuberia,
          desde: search.desde,
          hasta: search.hasta,
          wmp_sede: String(sedeId),
          wmp_tuberia: String(tuberiaId),
          wmp_punto: puntoId ? String(puntoId) : undefined,
          wmp_indicador: indicador,
          wmp_weekday: weekday,
          wmp_anio: String(value),
          wmp_mes: String(mes),
        },
        ...NO_SCROLL,
      })
    },
    [navigate, search.sede, search.tuberia, search.desde, search.hasta, sedeId, tuberiaId, puntoId, indicador, weekday, mes]
  )

  const setMes = useCallback(
    (value: number) => {
      navigate({
        search: {
          sede: search.sede,
          tuberia: search.tuberia,
          desde: search.desde,
          hasta: search.hasta,
          wmp_sede: String(sedeId),
          wmp_tuberia: String(tuberiaId),
          wmp_punto: puntoId ? String(puntoId) : undefined,
          wmp_indicador: indicador,
          wmp_weekday: weekday,
          wmp_anio: String(anio),
          wmp_mes: String(value),
        },
        ...NO_SCROLL,
      })
    },
    [navigate, search.sede, search.tuberia, search.desde, search.hasta, sedeId, tuberiaId, puntoId, indicador, weekday, anio]
  )

  const isReady =
    !!sedeId && !!tuberiaId && !!puntoId && !!indicador && !!weekday && !!anio && mes !== null

  return {
    headquarters,
    pipes,
    measurementPoints,
    currentHeadquarter,
    sedeId,
    tuberiaId,
    puntoId,
    indicador,
    weekday,
    anio,
    mes,
    monthRange,
    isLoadingHeadquarters,
    isLoadingMeasurementPoints,
    isReady,
    setSedeId,
    setTuberiaId,
    setPuntoId,
    setIndicador,
    setWeekday,
    setAnio,
    setMes,
  }
}

export function getMonthLabel(month: number): string {
  return MONTHS_ES[month] ?? ''
}

export function buildAnioOptions(currentYear: number, range = 5): number[] {
  const start = currentYear - range
  const end = currentYear + 1
  const years: number[] = []
  for (let y = end; y >= start; y--) {
    years.push(y)
  }
  return years
}
