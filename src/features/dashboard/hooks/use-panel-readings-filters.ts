import { useCallback, useMemo } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { fetchHeadquarters } from '../api/headquarters'
import { fetchDeviceMeasurementPointsList } from '../api/measurement-points'
import { getElectricParameter } from '@/lib/electric-parameters'

export const ENERGY_INDICATOR_KEYS = ['EPpos', 'EPneg', 'EQpos', 'EQneg'] as const
export type EnergyIndicatorKey = (typeof ENERGY_INDICATOR_KEYS)[number]

const DEFAULT_INDICATOR: EnergyIndicatorKey = 'EPpos'

function isEnergyIndicator(value: unknown): value is EnergyIndicatorKey {
  return (
    typeof value === 'string' &&
    (ENERGY_INDICATOR_KEYS as readonly string[]).includes(value)
  )
}

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

export function usePanelReadingsFilters() {
  const navigate = useNavigate({ from: '/energia/dashboard/panel' })
  const search = useSearch({ from: '/energia/dashboard/panel' })

  const today = useMemo(() => new Date(), [])

  const rawSedeId = typeof search.mp_sede === 'string' ? Number(search.mp_sede) : null
  const rawPanelId = typeof search.mp_panel === 'string' ? Number(search.mp_panel) : null
  const rawPuntoId = typeof search.mp_punto === 'string' ? Number(search.mp_punto) : null

  // Filtros de lecturas heredan de los filtros principales hasta que el usuario los modifica
  const mainSedeId = typeof search.sede === 'string' ? Number(search.sede) : null
  const mainPanelId = typeof search.panel === 'string' ? Number(search.panel) : null
  const indicador: EnergyIndicatorKey = isEnergyIndicator(search.mp_indicador)
    ? search.mp_indicador
    : DEFAULT_INDICATOR
  const weekday: Weekday = isWeekday(search.mp_weekday) ? search.mp_weekday : 'weekdays'
  const anio = readYearFromUrl(search.mp_anio, today.getFullYear())
  const mes = readMonthFromUrl(search.mp_mes, today.getMonth())

  const monthRange = useMemo(() => getMonthRange(anio, mes), [anio, mes])

  const { data: headquartersData, isLoading: isLoadingHeadquarters } = useQuery({
    queryKey: ['headquarters'],
    queryFn: fetchHeadquarters,
  })

  const headquarters = useMemo(() => headquartersData?.results ?? [], [headquartersData])

  // Descarta mp_sede de otra sesión: solo cuando ya cargaron las sedes
  // (mientras cargan se conserva para no disparar fetches intermedios).
  const rawSedeIsStale =
    rawSedeId != null &&
    headquarters.length > 0 &&
    !headquarters.some((h) => h.id === rawSedeId)
  const sedeId = rawSedeIsStale ? mainSedeId : (rawSedeId ?? mainSedeId)

  const currentHeadquarter = useMemo(() => {
    return headquarters.find((h) => h.id === sedeId) ?? null
  }, [headquarters, sedeId])

  const panels = useMemo(() => {
    return currentHeadquarter?.electrical_panels.filter((p) => p.is_active) ?? []
  }, [currentHeadquarter])

  // Descarta mp_panel de otra sesión (solo cuando ya cargaron los paneles).
  const rawPanelIsStale =
    rawPanelId != null && panels.length > 0 && !panels.some((p) => p.id === rawPanelId)
  const panelId = rawPanelIsStale ? mainPanelId : (rawPanelId ?? mainPanelId)

  const { data: measurementPointsData, isLoading: isLoadingMeasurementPoints } = useQuery({
    queryKey: ['device-measurement-points-list', sedeId, panelId],
    queryFn: () => {
      if (!sedeId || !panelId) throw new Error('Missing required parameters')
      return fetchDeviceMeasurementPointsList(sedeId, panelId)
    },
    enabled: !!sedeId && !!panelId,
  })

  const measurementPoints = useMemo(() => {
    return measurementPointsData?.results.filter((mp) => mp.is_active) ?? []
  }, [measurementPointsData])

  // Si no hay punto explícito en URL, usa el primer punto activo disponible.
  // Descarta mp_punto de otra sesión una vez que cargan los puntos.
  const puntoId = useMemo(() => {
    if (
      rawPuntoId != null &&
      measurementPoints.length > 0 &&
      !measurementPoints.some((mp) => mp.id === rawPuntoId)
    ) {
      return measurementPoints[0]?.id ?? null
    }
    return rawPuntoId ?? measurementPoints[0]?.id ?? null
  }, [rawPuntoId, measurementPoints])

  const setSedeId = useCallback(
    (id: number) => {
      navigate({
        search: {
          sede: search.sede,
          panel: search.panel,
          vista: search.vista,
          desde: search.desde,
          hasta: search.hasta,
          mp_sede: String(id),
          mp_panel: undefined,
          mp_punto: undefined,
          mp_indicador: indicador,
          mp_weekday: weekday,
          mp_anio: String(anio),
          mp_mes: String(mes),
        },
        ...NO_SCROLL,
      })
    },
    [
      navigate,
      search.sede,
      search.panel,
      search.vista,
      search.desde,
      search.hasta,
      indicador,
      weekday,
      anio,
      mes,
    ]
  )

  const setPanelId = useCallback(
    (id: number) => {
      navigate({
        search: {
          sede: search.sede,
          panel: search.panel,
          vista: search.vista,
          desde: search.desde,
          hasta: search.hasta,
          mp_sede: String(sedeId),
          mp_panel: String(id),
          mp_punto: undefined,
          mp_indicador: indicador,
          mp_weekday: weekday,
          mp_anio: String(anio),
          mp_mes: String(mes),
        },
        ...NO_SCROLL,
      })
    },
    [
      navigate,
      search.sede,
      search.panel,
      search.vista,
      search.desde,
      search.hasta,
      sedeId,
      indicador,
      weekday,
      anio,
      mes,
    ]
  )

  const setPuntoId = useCallback(
    (id: number) => {
      navigate({
        search: {
          sede: search.sede,
          panel: search.panel,
          vista: search.vista,
          desde: search.desde,
          hasta: search.hasta,
          mp_sede: String(sedeId),
          mp_panel: String(panelId),
          mp_punto: String(id),
          mp_indicador: indicador,
          mp_weekday: weekday,
          mp_anio: String(anio),
          mp_mes: String(mes),
        },
        ...NO_SCROLL,
      })
    },
    [
      navigate,
      search.sede,
      search.panel,
      search.vista,
      search.desde,
      search.hasta,
      sedeId,
      panelId,
      indicador,
      weekday,
      anio,
      mes,
    ]
  )

  const setIndicador = useCallback(
    (value: string) => {
      navigate({
        search: {
          sede: search.sede,
          panel: search.panel,
          vista: search.vista,
          desde: search.desde,
          hasta: search.hasta,
          mp_sede: String(sedeId),
          mp_panel: String(panelId),
          mp_punto: puntoId ? String(puntoId) : undefined,
          mp_indicador: value,
          mp_weekday: weekday,
          mp_anio: String(anio),
          mp_mes: String(mes),
        },
        ...NO_SCROLL,
      })
    },
    [
      navigate,
      search.sede,
      search.panel,
      search.vista,
      search.desde,
      search.hasta,
      sedeId,
      panelId,
      puntoId,
      weekday,
      anio,
      mes,
    ]
  )

  const setWeekday = useCallback(
    (value: Weekday) => {
      navigate({
        search: {
          sede: search.sede,
          panel: search.panel,
          vista: search.vista,
          desde: search.desde,
          hasta: search.hasta,
          mp_sede: String(sedeId),
          mp_panel: String(panelId),
          mp_punto: puntoId ? String(puntoId) : undefined,
          mp_indicador: indicador,
          mp_weekday: value,
          mp_anio: String(anio),
          mp_mes: String(mes),
        },
        ...NO_SCROLL,
      })
    },
    [
      navigate,
      search.sede,
      search.panel,
      search.vista,
      search.desde,
      search.hasta,
      sedeId,
      panelId,
      puntoId,
      indicador,
      anio,
      mes,
    ]
  )

  const setAnio = useCallback(
    (value: number) => {
      navigate({
        search: {
          sede: search.sede,
          panel: search.panel,
          vista: search.vista,
          desde: search.desde,
          hasta: search.hasta,
          mp_sede: String(sedeId),
          mp_panel: String(panelId),
          mp_punto: puntoId ? String(puntoId) : undefined,
          mp_indicador: indicador,
          mp_weekday: weekday,
          mp_anio: String(value),
          mp_mes: String(mes),
        },
        ...NO_SCROLL,
      })
    },
    [
      navigate,
      search.sede,
      search.panel,
      search.vista,
      search.desde,
      search.hasta,
      sedeId,
      panelId,
      puntoId,
      indicador,
      weekday,
      mes,
    ]
  )

  const setMes = useCallback(
    (value: number) => {
      navigate({
        search: {
          sede: search.sede,
          panel: search.panel,
          vista: search.vista,
          desde: search.desde,
          hasta: search.hasta,
          mp_sede: String(sedeId),
          mp_panel: String(panelId),
          mp_punto: puntoId ? String(puntoId) : undefined,
          mp_indicador: indicador,
          mp_weekday: weekday,
          mp_anio: String(anio),
          mp_mes: String(value),
        },
        ...NO_SCROLL,
      })
    },
    [
      navigate,
      search.sede,
      search.panel,
      search.vista,
      search.desde,
      search.hasta,
      sedeId,
      panelId,
      puntoId,
      indicador,
      weekday,
      anio,
    ]
  )

  const isReady =
    !!sedeId && !!panelId && !!puntoId && !!indicador && !!weekday && !!anio && mes !== null

  return {
    headquarters,
    panels,
    measurementPoints,
    currentHeadquarter,
    sedeId,
    panelId,
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
    setPanelId,
    setPuntoId,
    setIndicador,
    setWeekday,
    setAnio,
    setMes,
  }
}

export { getElectricParameter }
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
