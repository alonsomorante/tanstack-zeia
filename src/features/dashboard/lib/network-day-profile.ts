import type { ReadingsGraphEspecificResponse } from '../types'
import { addDays, parseDateKey, startOfDay, toDateKey } from './network-map'

/**
 * Perfil horario de consumo por día a partir de `readings/graph-especific`
 * (EPpos por hora). Alimenta "Hoy vs lo habitual" y la comparación de días.
 */

export interface DayProfile {
  date: string
  /** kWh consumidos en cada hora (0–23); null si no hay lectura. */
  hours: Array<number | null>
  total: number
  hoursWithData: number
}

export type HourlyValues = Array<number | null>

export function parseDayProfiles(response: ReadingsGraphEspecificResponse | undefined): Map<string, DayProfile> {
  const profiles = new Map<string, DayProfile>()
  if (!Array.isArray(response)) return profiles

  for (const item of response) {
    if (!item || typeof item !== 'object') continue
    for (const [key, entries] of Object.entries(item)) {
      // Solo fechas: el backend también envía la serie "habitual" (promedio del rango pedido).
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Array.isArray(entries)) continue
      const hours: HourlyValues = Array.from({ length: 24 }, () => null)
      for (const entry of entries) {
        const match = typeof entry?.time === 'string' ? entry.time.match(/(\d{1,2}):(\d{2})/) : null
        const hour = match ? Number(match[1]) : NaN
        if (!Number.isInteger(hour) || hour < 0 || hour > 23) continue
        if (typeof entry.value !== 'number' || !Number.isFinite(entry.value)) continue
        hours[hour] = (hours[hour] ?? 0) + Math.max(0, entry.value)
      }
      const hoursWithData = hours.filter((h) => h != null).length
      if (hoursWithData === 0) continue
      profiles.set(key, {
        date: key,
        hours,
        total: hours.reduce<number>((sum, h) => sum + (h ?? 0), 0),
        hoursWithData,
      })
    }
  }
  return profiles
}

export interface ComparisonWindow {
  dateAfter: string
  dateBefore: string
  todayKey: string
  /** Filas lunes → domingo; los días futuros de la semana actual también se incluyen. */
  weeks: string[][]
}

/** Ventana de 5 semanas (de lunes a domingo) que termina en la semana actual. */
export function getComparisonWindow(today: Date, weekCount = 5): ComparisonWindow {
  const t = startOfDay(today)
  const mondayOffset = (t.getDay() + 6) % 7
  const start = addDays(addDays(t, -mondayOffset), -7 * (weekCount - 1))
  const weeks = Array.from({ length: weekCount }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => toDateKey(addDays(start, w * 7 + d)))
  )
  return { dateAfter: toDateKey(start), dateBefore: toDateKey(t), todayKey: toDateKey(t), weeks }
}

export function averageProfile(profiles: DayProfile[]): HourlyValues {
  return Array.from({ length: 24 }, (_, hour) => {
    const values = profiles.map((p) => p.hours[hour]).filter((v): v is number => v != null)
    return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null
  })
}

/** Un día cuenta como referencia si tiene datos en al menos 18 de las 24 horas. */
function isCompleteDay(profile: DayProfile | undefined): profile is DayProfile {
  return profile != null && profile.hoursWithData >= 18
}

/** Los mismos días de la semana anteriores (hasta 4 semanas) con datos completos. */
export function sameWeekdayReferences(
  profiles: Map<string, DayProfile>,
  todayKey: string,
  maxWeeks = 4
): DayProfile[] {
  const today = parseDateKey(todayKey)
  if (!today) return []
  const references: DayProfile[] = []
  for (let week = 1; week <= maxWeeks; week++) {
    const profile = profiles.get(toDateKey(addDays(today, -7 * week)))
    if (isCompleteDay(profile)) references.push(profile)
  }
  return references
}

export function completeDays(profiles: DayProfile[]): DayProfile[] {
  return profiles.filter(isCompleteDay)
}

export interface TodayVsHabitual {
  todayKwh: number
  habitualKwh: number
  deltaPct: number
  /** Horas completas comparadas (de 00:00 hasta esta hora). */
  throughHour: number
}

/** Compara lo consumido hoy hasta la última hora completa con lo habitual en esas mismas horas. */
export function compareWithHabitual(
  today: DayProfile | undefined,
  habitual: HourlyValues,
  currentHour: number
): TodayVsHabitual | null {
  if (!today) return null
  let todayKwh = 0
  let habitualKwh = 0
  let throughHour = -1
  for (let hour = 0; hour < currentHour; hour++) {
    const t = today.hours[hour]
    const h = habitual[hour]
    if (t == null || h == null) continue
    todayKwh += t
    habitualKwh += h
    throughHour = hour + 1
  }
  if (throughHour < 1 || habitualKwh <= 0) return null
  return { todayKwh, habitualKwh, deltaPct: ((todayKwh - habitualKwh) / habitualKwh) * 100, throughHour }
}

// ─── Formato ────────────────────────────────────────────────────────────────

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const WEEKDAYS_PLURAL = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados']
const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function weekdayName(dateKey: string, plural = false): string {
  const date = parseDateKey(dateKey)
  if (!date) return ''
  return (plural ? WEEKDAYS_PLURAL : WEEKDAYS)[date.getDay()]
}

/** "Lun 3 nov" */
export function formatDayChip(dateKey: string): string {
  const date = parseDateKey(dateKey)
  if (!date) return dateKey
  return `${WEEKDAYS_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`
}

export const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`)
