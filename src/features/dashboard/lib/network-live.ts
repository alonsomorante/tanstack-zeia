import { fetchReadings } from '../api/readings'
import type { DeviceMeasurementPoint, MeasurementPointThresholdRange, Reading } from '../types'
import { getVoltageBand } from './voltage-thresholds'

/**
 * "Ahora" de un punto: la última lectura del día de potencia, voltaje y
 * corriente, comparada con los umbrales configurados para ese punto.
 */

export type LiveCategory = 'power' | 'voltage' | 'current'
export type LiveStatus = 'ok' | 'high' | 'low' | 'unknown'

export interface LiveMetric {
  key: LiveCategory
  label: string
  display: string
  unit: string
  status: LiveStatus
  /** Rango permitido, p.ej. "209–231 V". */
  limitText: string | null
}

function readingTime(reading: Reading): number {
  const time = new Date(reading.created_at).getTime()
  return Number.isFinite(time) ? time : -Infinity
}

export function latestReading(results: Reading[] | undefined): Reading | null {
  let latest: Reading | null = null
  for (const reading of results ?? []) {
    if (!latest || readingTime(reading) > readingTime(latest)) latest = reading
  }
  return latest
}

/**
 * Última lectura del día de una categoría. El orden de la API no está
 * documentado: si la primera página viene en orden ascendente, la lectura más
 * reciente está en la última página y se pide esa.
 */
export async function fetchLatestReading(
  headquarterId: number,
  panelId: number,
  measurementPointId: number,
  day: string,
  category: LiveCategory
): Promise<Reading | null> {
  const first = await fetchReadings(headquarterId, panelId, measurementPointId, day, day, category, 1)
  const results = first.results ?? []
  if (results.length === 0) return null

  const ascending = results.length > 1 && readingTime(results[0]) < readingTime(results[results.length - 1])
  if (ascending && first.next && first.count > results.length) {
    const lastPage = Math.ceil(first.count / results.length)
    if (lastPage > 1) {
      const last = await fetchReadings(headquarterId, panelId, measurementPointId, day, day, category, lastPage)
      return latestReading(last.results) ?? latestReading(results)
    }
  }
  return latestReading(results)
}

function numericValues(reading: Reading | null, keys: string[]): Array<{ key: string; value: number }> {
  const values = reading?.indicators?.values ?? {}
  return keys
    .map((key) => ({ key, value: values[key] }))
    .filter((v): v is { key: string; value: number } => typeof v.value === 'number' && Number.isFinite(v.value))
}

type Range = Pick<MeasurementPointThresholdRange, 'lower_threshold' | 'upper_threshold'> | null | undefined

function statusFor(values: number[], range: Range): LiveStatus {
  if (!range || (range.lower_threshold == null && range.upper_threshold == null)) return 'unknown'
  if (range.upper_threshold != null && values.some((v) => v > range.upper_threshold!)) return 'high'
  if (range.lower_threshold != null && values.some((v) => v < range.lower_threshold!)) return 'low'
  return 'ok'
}

function formatNumber(value: number, digits: number): string {
  return value.toLocaleString('es-PE', { maximumFractionDigits: digits })
}

function describeRange(range: Range, unit: string, digits: number): string | null {
  if (!range) return null
  const { lower_threshold: lower, upper_threshold: upper } = range
  if (lower != null && upper != null) return `${formatNumber(lower, digits)}–${formatNumber(upper, digits)} ${unit}`
  if (upper != null) return `máx. ${formatNumber(upper, digits)} ${unit}`
  if (lower != null) return `mín. ${formatNumber(lower, digits)} ${unit}`
  return null
}

function spread(values: number[]): string {
  const min = Math.min(...values)
  const max = Math.max(...values)
  // Sin decimales desde 100 para que el rango quepa en la tarjeta ("166–203").
  const digits = max >= 100 ? 0 : 1
  const a = formatNumber(min, digits)
  const b = formatNumber(max, digits)
  return values.length > 1 && a !== b ? `${a}–${b}` : b
}

type PointProfile = Pick<DeviceMeasurementPoint, 'thresholds' | 'monitoring_topology'> | null | undefined

export function powerMetric(reading: Reading | null, point: PointProfile): LiveMetric | null {
  const values = numericValues(reading, ['P'])
  if (values.length === 0) return null
  const range = point?.thresholds?.power
  return {
    key: 'power',
    label: 'Potencia',
    display: formatNumber(values[0].value, 1),
    unit: 'kW',
    status: statusFor([values[0].value], range),
    limitText: describeRange(range, 'kW', 1),
  }
}

export function voltageMetric(reading: Reading | null, point: PointProfile): LiveMetric | null {
  // Fase-neutro si existe (3F-4H, 1F); si no, entre líneas (3F-3H).
  const phase = numericValues(reading, ['Ua', 'Ub', 'Uc'])
  const line = numericValues(reading, ['Uab', 'Ubc', 'Uac'])
  const single = numericValues(reading, ['U'])
  const values = phase.length > 0 ? phase : line.length > 0 ? line : single
  if (values.length === 0) return null
  const band = getVoltageBand(point, values[0].key)
  return {
    key: 'voltage',
    label: 'Voltaje',
    display: spread(values.map((v) => v.value)),
    unit: 'V',
    status: statusFor(values.map((v) => v.value), band),
    limitText: describeRange(band, 'V', 0),
  }
}

export function currentMetric(reading: Reading | null, point: PointProfile): LiveMetric | null {
  const values = numericValues(reading, ['Ia', 'Ib', 'Ic'])
  if (values.length === 0) return null
  const range = point?.thresholds?.current
  return {
    key: 'current',
    label: 'Corriente',
    display: spread(values.map((v) => v.value)),
    unit: 'A',
    status: statusFor(values.map((v) => v.value), range),
    limitText: describeRange(range, 'A', 1),
  }
}

const RELATIVE = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

/** "hace 2 minutos" / "hace 3 horas". */
export function formatRelativeTime(time: number, now: number): string {
  const minutes = Math.round((time - now) / 60_000)
  if (Math.abs(minutes) < 60) return RELATIVE.format(minutes, 'minute')
  return RELATIVE.format(Math.round(minutes / 60), 'hour')
}
