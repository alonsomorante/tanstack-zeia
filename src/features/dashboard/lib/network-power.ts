import type { PowerChannelValue, PowerGraphResponse } from '../types'

/**
 * Lectura de la curva de potencia de una sede (`/electrical_panel/powers/graph`)
 * convertida en cifras: pico, cuándo ocurrió, % de la potencia contratada,
 * tiempo sobre ese límite, pico en horas punta y qué punto aportaba más.
 *
 * La API devuelve todos los canales de la sede identificados solo por
 * `measurement_point_name`; la demanda de la sede se calcula como la suma de
 * los medidores generales de cada tablero en el mismo instante.
 */

export type PowerGranularity = 'minute' | 'hour' | 'day'

/** Por minuto solo para un día (1.440 filas); por hora hasta ~2 meses; si no, por día. */
export function getPowerGranularity(days: number): PowerGranularity {
  if (days <= 1) return 'minute'
  if (days <= 62) return 'hour'
  return 'day'
}

/** Horas punta tarifarias: de 18:00 a 23:00. */
export const PEAK_HOURS_START = 18
export const PEAK_HOURS_END = 23

export interface PowerSample {
  time: number
  iso: string
  values: Map<string, number>
}

export interface PowerMoment {
  time: number
  iso: string
  value: number
}

export interface PowerThresholdValues {
  contracted: number | null
  installed: number | null
  max: number | null
}

export interface PowerAnalysis {
  granularity: PowerGranularity
  unit: string
  samples: PowerSample[]
  /** Máximo de cada canal (punto o medidor general) en el período. */
  channelPeaks: Map<string, PowerMoment>
  /** Medidores generales encontrados en la curva (suman la demanda de la sede). */
  mainChannels: string[]
  sedeSeries: PowerMoment[]
  sedePeak: PowerMoment | null
  thresholds: PowerThresholdValues
  /** Minutos, horas o días (según la agrupación) con la sede sobre la potencia contratada. */
  bucketsAboveContracted: number
  /** Pico de la sede entre las 18:00 y las 23:00. null si la agrupación es por día. */
  peakHoursPeak: PowerMoment | null
  /** Punto (no medidor general) con más potencia en el instante del pico de la sede. */
  contributorAtPeak: { name: string; value: number; share: number } | null
}

const UNIT_LABELS: Record<string, string> = { KW: 'kW', W: 'W', MW: 'MW' }

export function formatPowerUnit(unit: string | null | undefined): string {
  if (!unit) return 'kW'
  return UNIT_LABELS[unit.toUpperCase()] ?? unit
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function channelValue(channel: PowerChannelValue, granularity: PowerGranularity): number | null {
  // Por minuto llega la lectura (`power`); en buckets mayores, el máximo del bucket (`power_peak`).
  const ordered =
    granularity === 'minute'
      ? [channel.power, channel.power_peak, channel.power_avg]
      : [channel.power_peak, channel.power, channel.power_avg]
  for (const value of ordered) {
    const n = finiteOrNull(value)
    if (n != null) return n
  }
  return null
}

export function isPeakHour(time: number): boolean {
  const hour = new Date(time).getHours()
  return hour >= PEAK_HOURS_START && hour < PEAK_HOURS_END
}

function maxMoment(points: PowerMoment[]): PowerMoment | null {
  let best: PowerMoment | null = null
  for (const point of points) {
    if (!best || point.value > best.value) best = point
  }
  return best
}

export function analyzePower(
  response: PowerGraphResponse | undefined,
  mainNames: string[],
  granularity: PowerGranularity,
  fallback: PowerThresholdValues
): PowerAnalysis {
  // Las filas pueden venir una por instante o una por medidor e instante: se agrupan por hora exacta.
  const byTime = new Map<number, PowerSample>()
  for (const row of response?.results ?? []) {
    const time = new Date(row.created_at).getTime()
    if (!Number.isFinite(time)) continue
    let sample = byTime.get(time)
    if (!sample) {
      sample = { time, iso: row.created_at, values: new Map() }
      byTime.set(time, sample)
    }
    for (const channel of row.values_per_channel ?? []) {
      const name = channel.measurement_point_name
      const value = name ? channelValue(channel, granularity) : null
      if (!name || value == null) continue
      const prev = sample.values.get(name)
      sample.values.set(name, prev == null ? value : Math.max(prev, value))
    }
  }
  const samples = [...byTime.values()].sort((a, b) => a.time - b.time)

  const channelPeaks = new Map<string, PowerMoment>()
  for (const sample of samples) {
    for (const [name, value] of sample.values) {
      const best = channelPeaks.get(name)
      if (!best || value > best.value) channelPeaks.set(name, { time: sample.time, iso: sample.iso, value })
    }
  }

  const mainChannels = [...new Set(mainNames)].filter((name) => channelPeaks.has(name))
  const mainSet = new Set(mainChannels)
  const sedeSeries: PowerMoment[] =
    mainChannels.length === 0
      ? []
      : samples
          .filter((s) => mainChannels.some((name) => s.values.has(name)))
          .map((s) => ({
            time: s.time,
            iso: s.iso,
            value: mainChannels.reduce((sum, name) => sum + (s.values.get(name) ?? 0), 0),
          }))

  const sedePeak = maxMoment(sedeSeries)
  const thresholds: PowerThresholdValues = {
    contracted: finiteOrNull(response?.power_thresholds?.power_contracted) ?? fallback.contracted,
    installed: finiteOrNull(response?.power_thresholds?.power_installed) ?? fallback.installed,
    max: finiteOrNull(response?.power_thresholds?.power_max) ?? fallback.max,
  }
  const contracted = thresholds.contracted
  const bucketsAboveContracted =
    contracted != null && contracted > 0 ? sedeSeries.filter((p) => p.value > contracted).length : 0
  const peakHoursPeak = granularity === 'day' ? null : maxMoment(sedeSeries.filter((p) => isPeakHour(p.time)))

  let contributorAtPeak: PowerAnalysis['contributorAtPeak'] = null
  const peakSample = sedePeak ? byTime.get(sedePeak.time) : undefined
  if (sedePeak && peakSample && sedePeak.value > 0) {
    for (const [name, value] of peakSample.values) {
      if (mainSet.has(name) || value <= 0) continue
      if (!contributorAtPeak || value > contributorAtPeak.value) {
        contributorAtPeak = { name, value, share: (value / sedePeak.value) * 100 }
      }
    }
  }

  return {
    granularity,
    unit: formatPowerUnit(response?.results?.[0]?.unit),
    samples,
    channelPeaks,
    mainChannels,
    sedeSeries,
    sedePeak,
    thresholds,
    bucketsAboveContracted,
    peakHoursPeak,
    contributorAtPeak,
  }
}

// ─── Formato ────────────────────────────────────────────────────────────────

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MONTHS_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** "11:15" · "11:00 – 12:00" · "4 nov, 11:00 – 12:00" · "4 de noviembre". */
export function formatPowerMoment(time: number, granularity: PowerGranularity, singleDay: boolean): string {
  const d = new Date(time)
  if (granularity === 'day') return `${d.getDate()} de ${MONTHS_LONG[d.getMonth()]}`
  const clock =
    granularity === 'hour'
      ? `${pad(d.getHours())}:00 – ${pad((d.getHours() + 1) % 24)}:00`
      : `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return singleDay ? clock : `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${clock}`
}

/** Etiqueta corta para el eje X de la curva. */
export function formatPowerTick(time: number, granularity: PowerGranularity, singleDay: boolean): string {
  const d = new Date(time)
  if (granularity === 'day') return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
  const clock = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return singleDay ? clock : `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${clock}`
}

/**
 * Etiquetas del eje X en puntos redondos: cada 2 horas en un día por minuto,
 * o el primer instante de cada día (como máximo ~10 días rotulados). El resto queda vacío.
 */
export function buildPowerTickLabels(times: number[], granularity: PowerGranularity): string[] {
  if (granularity === 'minute') {
    return times.map((t) => {
      const d = new Date(t)
      return d.getMinutes() === 0 && d.getHours() % 2 === 0 ? `${pad(d.getHours())}:00` : ''
    })
  }
  const dayCount = new Set(times.map((t) => new Date(t).toDateString())).size
  const step = Math.max(1, Math.ceil(dayCount / 10))
  let lastDay = ''
  let dayIndex = -1
  return times.map((t) => {
    const d = new Date(t)
    const day = d.toDateString()
    if (day === lastDay) return ''
    lastDay = day
    dayIndex++
    return dayIndex % step === 0 ? `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}` : ''
  })
}

export function describeTimeAboveContracted(buckets: number, granularity: PowerGranularity): string {
  if (granularity === 'minute') return `${buckets} min sobre la contratada`
  if (granularity === 'hour') return `${buckets} ${buckets === 1 ? 'hora' : 'horas'} con picos sobre la contratada`
  return `${buckets} ${buckets === 1 ? 'día' : 'días'} con picos sobre la contratada`
}
