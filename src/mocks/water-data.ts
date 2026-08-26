import type {
  WaterConsumptionSummary,
  WaterDayComparisonEntry,
  WaterDayComparisonResponse,
  WaterDistributionResponse,
  WaterHeadquartersResponse,
  WaterMeasurementPointsResponse,
  WaterReading,
  WaterReadingsGraphResponse,
  WaterReadingsResponse,
} from '@/features/water/types'

export interface WaterGraphArgs {
  dateAfter: string
  dateBefore: string
  indicador: string
  weekday?: string
  lastBy: string
}

export interface WaterReadingsTableArgs {
  indicador?: string
  dateAfter?: string
  dateBefore?: string
  hourAfter?: string
  hourBefore?: string
  weekday?: string
  lastDays?: number
  page?: number
  pageSize?: number
}

// ── Sedes y Tuberías ────────────────────────────────────────────────

export const WATER_HEADQUARTERS: WaterHeadquartersResponse = {
  count: 2,
  results: [
    {
      id: 199,
      name: 'Sede Principal San Isidro',
      is_active: true,
      water_pipes: [
        { id: 1, name: 'Tubería Matriz Edificio A', is_active: true, is_main: true },
        { id: 2, name: 'Tubería Baños y Comedor Piso 1', is_active: true, is_main: false },
      ],
    },
    {
      id: 200,
      name: 'Planta Industrial Lurín',
      is_active: true,
      water_pipes: [
        { id: 3, name: 'Tubería de Producción', is_active: true, is_main: true },
      ],
    },
  ],
}

// ── Puntos de Medición por Tubería ──────────────────────────────────

const WATER_POINTS_BY_PIPE: Record<string, WaterMeasurementPointsResponse> = {
  '199-1': {
    count: 3,
    next: null,
    previous: null,
    results: [
      { id: 1, name: 'Ingreso General de Red', is_active: true, is_main: true, water_pipe: 'Tubería Matriz Edificio A' },
      { id: 2, name: 'Medidor Comedor', is_active: true, is_main: false, water_pipe: 'Tubería Matriz Edificio A' },
      { id: 3, name: 'Medidor Servicios Higiénicos', is_active: true, is_main: false, water_pipe: 'Tubería Matriz Edificio A' },
    ],
  },
  '199-2': {
    count: 2,
    next: null,
    previous: null,
    results: [
      { id: 4, name: 'Medidor Baños Piso 1', is_active: true, is_main: true, water_pipe: 'Tubería Baños y Comedor Piso 1' },
      { id: 5, name: 'Medidor Comedor Piso 1', is_active: true, is_main: false, water_pipe: 'Tubería Baños y Comedor Piso 1' },
    ],
  },
  '200-3': {
    count: 2,
    next: null,
    previous: null,
    results: [
      { id: 6, name: 'Medidor Producción', is_active: true, is_main: true, water_pipe: 'Tubería de Producción' },
      { id: 7, name: 'Medidor Oficinas Lurín', is_active: true, is_main: false, water_pipe: 'Tubería de Producción' },
    ],
  },
}

export function makeWaterMeasurementPoints(
  headquarterId: number,
  waterPipeId: number
): WaterMeasurementPointsResponse {
  return (
    WATER_POINTS_BY_PIPE[`${headquarterId}-${waterPipeId}`] ?? {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: waterPipeId * 10,
          name: 'Medidor Punto Principal',
          is_active: true,
          is_main: true,
          water_pipe: `Tubería ${waterPipeId}`,
        },
      ],
    }
  )
}

// ── Resumen de Consumo (KPIs) ───────────────────────────────────────

function dateISO(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function makeWaterConsumptionSummary(waterPipeId: number): WaterConsumptionSummary {
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  return {
    water_pipe_id: waterPipeId,
    water_pipe_name: 'Tubería Matriz Edificio A',
    today_consumption_litros: 1492.617,
    month_consumption_litros: 38420.553,
    month_average_daily_litros: 1480.82,
    date_range: {
      today: dateISO(today),
      month_start: dateISO(monthStart),
      month_end: dateISO(today),
    },
  }
}

// ── Distribución de Consumo ─────────────────────────────────────────

const WATER_DISTRIBUTION_RESULTS: WaterDistributionResponse['results'] = [
  {
    measurement_point_water_id: 1,
    measurement_point_water_name: 'Ingreso General de Red',
    dev_eui: '24E124136C123456',
    is_main: true,
    is_active: true,
    consumption_litros: 38420.553,
    consumption_percentage: 100.0,
    first_reading_value: 124500.0,
    last_reading_value: 162920.553,
    first_reading_time: '2026-08-01T00:05:00-05:00',
    last_reading_time: '2026-08-25T11:32:00-05:00',
    is_highest: false,
  },
  {
    measurement_point_water_id: 2,
    measurement_point_water_name: 'Medidor Comedor',
    dev_eui: '24E124136C123457',
    is_main: false,
    is_active: true,
    consumption_litros: 23052.332,
    consumption_percentage: 60.0,
    first_reading_value: 45000.0,
    last_reading_value: 68052.332,
    first_reading_time: '2026-08-01T00:05:00-05:00',
    last_reading_time: '2026-08-25T11:38:00-05:00',
    is_highest: true,
  },
  {
    measurement_point_water_id: 3,
    measurement_point_water_name: 'Medidor Servicios Higiénicos',
    dev_eui: '24E124136C123458',
    is_main: false,
    is_active: true,
    consumption_litros: 15368.224,
    consumption_percentage: 40.0,
    first_reading_value: 31000.0,
    last_reading_value: 46368.224,
    first_reading_time: '2026-08-01T00:05:00-05:00',
    last_reading_time: '2026-08-25T11:41:00-05:00',
    is_highest: false,
  },
]

export function makeWaterConsumptionDistribution(
  waterPipeId: number,
  dateAfter: string,
  dateBefore: string
): WaterDistributionResponse {
  return {
    water_pipe_id: waterPipeId,
    water_pipe_name: 'Tubería Matriz Edificio A',
    main_consumption_litros: 38420.553,
    total_measurement_points: 3,
    date_range: {
      type: 'custom',
      start_date: dateAfter,
      end_date: dateBefore,
    },
    results: WATER_DISTRIBUTION_RESULTS,
  }
}

// ── Gráfica de Lecturas ─────────────────────────────────────────────

function parseDateSafe(value: string): Date | null {
  const d = new Date(`${value}T00:00:00`)
  return isNaN(d.getTime()) ? null : d
}

function isWeekdayIncluded(weekday: string | undefined, date: Date): boolean {
  if (!weekday) return true
  const weekdayNumber = date.getDay() === 0 ? 7 : date.getDay() // ISO: 1=Lu…7=Do
  return weekday.split(',').map(Number).includes(weekdayNumber)
}

export function makeWaterReadingsGraph(args: WaterGraphArgs): WaterReadingsGraphResponse {
  const { lastBy, weekday } = args
  const start = parseDateSafe(args.dateAfter) ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const end = parseDateSafe(args.dateBefore) ?? new Date()
  const results: WaterReadingsGraphResponse = []

  // last_by=hour → 24 barras del primer día del rango
  if (lastBy === 'hour') {
    const firstDay = new Date(start)
    const dayISO = dateISO(firstDay)
    let cumulative = 125000
    for (let hour = 0; hour < 24; hour++) {
      const diff = hour >= 6 && hour <= 21 ? 140 + (hour % 5) * 12 : 20 + (hour % 4) * 3
      const firstValue = cumulative
      cumulative += diff
      results.push({
        period: `${dayISO}T${String(hour).padStart(2, '0')}:00:00-05:00`,
        first_reading: `${dayISO}T${String(hour).padStart(2, '0')}:05:00-05:00`,
        last_reading: `${dayISO}T${String(hour).padStart(2, '0')}:57:00-05:00`,
        indicator: args.indicador,
        unit: 'L',
        first_value: firstValue,
        last_value: cumulative,
        difference: diff,
        measurement_point: 'Ingreso General de Red',
      })
    }
    return results
  }

  // last_by=day (default) → un bar por día dentro del rango (máx. 31)
  let cumulative = 124500
  const maxDays = 31
  let day = new Date(start)
  let count = 0
  while (day <= end && count < maxDays) {
    if (isWeekdayIncluded(weekday, day)) {
      const diff = 1250 + ((day.getDate() * 37) % 450)
      const firstValue = cumulative
      cumulative += diff
      results.push({
        period: `${dateISO(day)}T00:00:00-05:00`,
        first_reading: `${dateISO(day)}T00:05:00-05:00`,
        last_reading: `${dateISO(day)}T23:55:00-05:00`,
        indicator: args.indicador,
        unit: 'L',
        first_value: firstValue,
        last_value: cumulative,
        difference: diff,
        measurement_point: 'Ingreso General de Red',
      })
    }
    day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
    count++
  }
  return results
}

export interface WaterDayComparisonArgs {
  dateAfter: string
  dateBefore: string
  lastBy: string
  weekday?: string
}

function dayDifference(dateStr: string): number {
  const d = parseDateSafe(dateStr)
  if (!d) return 0
  return Math.floor(d.getTime() / 86400000)
}

export function makeWaterDayComparison(args: WaterDayComparisonArgs): WaterDayComparisonResponse {
  const start = parseDateSafe(args.dateAfter)
  const end = parseDateSafe(args.dateBefore)
  const result: WaterDayComparisonResponse = []

  const isHourMode = args.lastBy === 'hour'
  const inclusiveDays = (): string[] => {
    // Semana siguiente Lunes→Domingo simulada para tener 2+ fechas en modo hora
    const dates: string[] = []
    const base = start ?? new Date()
    const stop = end ?? new Date(base.getTime() + 3 * 86400000)
    let d = new Date(base)
    while (d <= stop && dates.length < 4) {
      if (isWeekdayIncluded(args.weekday, d)) dates.push(dateISO(d))
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    }
    return dates
  }

  if (isHourMode) {
    const dates = inclusiveDays()

    for (const dayISOStr of dates) {
      const entries: WaterDayComparisonEntry[] = []
      for (let hour = 0; hour < 24; hour++) {
        const base = 55 + hour * 3.5 + (dayDifference(dayISOStr) % 7) * 4
        const variation = (Math.sin((hour + dayDifference(dayISOStr)) * 0.8) + 1) * 12
        const value = Number((base + variation).toFixed(2))
        const hasConsumption = hour < 2 || (hour >= 6 && hour <= 21)
        if (!hasConsumption) continue
        entries.push({
          time: `${String(hour).padStart(2, '0')}:00:00`,
          indicator: 'consumo_total_litros',
          unit: 'L',
          value,
          is_average: false,
          device: '24E124136C123456',
          measurement_point: 'Ingreso General de Red',
        })
      }
      result.push({ [dayISOStr]: entries })
    }

    if (dates.length >= 2) {
      const habitual: WaterDayComparisonEntry[] = []
      for (let hour = 0; hour < 24; hour++) {
        const time = `${String(hour).padStart(2, '0')}:00:00`
        const values = dates
          .map((dayISOStr) => {
            const day = result.find((item) => item[dayISOStr])
            return day?.[dayISOStr]?.find((e) => e.time === time)?.value
          })
          .filter((v): v is number => v !== undefined)
        if (values.length < 2) continue
        habitual.push({
          time,
          indicator: 'consumo_total_litros',
          unit: 'L',
          value: Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(4)),
          is_average: true,
          sample_count: values.length,
          device: '24E124136C123456',
          measurement_point: 'Ingreso General de Red',
        })
      }
      result.push({ habitual })
    }

    return result
  }

  // last_by=day → un solo valor por fecha
  const dates = inclusiveDays().slice(0, 8)
  for (const dayISOStr of dates) {
    result.push({
      [dayISOStr]: [
        {
          time: '00:00:00',
          indicator: 'consumo_total_litros',
          unit: 'L',
          value: Number((1400 + (dayDifference(dayISOStr) % 5) * 120 + (dayDifference(dayISOStr) % 3) * 33).toFixed(2)),
          is_average: false,
          device: '24E124136C123456',
          measurement_point: 'Ingreso General de Red',
        },
      ],
    })
  }

  return result
}

// ── Tabla de Lecturas ───────────────────────────────────────────────

const UTC_MINUS_05 = '-05:00'

function buildWaterReadingsValues(
  indicador: string | undefined,
  litros: number
): Record<string, number> {
  if (indicador === 'consumo_total_m3') {
    return { consumo_total_m3: Number((litros / 1000).toFixed(3)) }
  }
  if (indicador === 'litros_por_pulso') {
    return { litros_por_pulso: 10.0 }
  }
  return {
    consumo_total_litros: litros,
    consumo_total_m3: Number((litros / 1000).toFixed(3)),
    litros_por_pulso: 10.0,
  }
}

function toIsoWithOffset(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${UTC_MINUS_05}`
  )
}

export function makeWaterReadingsTable(args: WaterReadingsTableArgs): WaterReadingsResponse {
  const totalCount = 60
  const page = args.page ?? 1
  const pageSize = args.pageSize ?? 10
  const startIndex = (page - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalCount)

  const results: WaterReading[] = []
  const base = new Date()

  for (let i = startIndex; i < endIndex; i++) {
    const readingTime = new Date(base.getTime() - i * 5 * 60 * 1000)
    const rowLitros = Number((163420.553 - i * 2.41).toFixed(3))
    results.push({
      created_at: toIsoWithOffset(readingTime),
      indicators: {
        id: 2000 - i,
        measurement_point_name: 'Ingreso General de Red',
        values: buildWaterReadingsValues(args.indicador, rowLitros),
      },
    })
  }

  return {
    count: totalCount,
    next: endIndex < totalCount ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results,
  }
}
