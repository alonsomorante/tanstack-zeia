import { formatDateShort } from '@/lib/date-utils'
import type { Agrupacion } from '../hooks/use-water-home-filters'
import type { WaterReadingGraphPoint } from '../types'

function parseBucketDate(value: string | null | undefined): Date | null {
  if (!value) return null
  let normalized = value
  if (!normalized.includes('T')) {
    if (normalized.includes(' ')) {
      normalized = normalized.replace(' ', 'T')
    } else if (/^\d{4}-\d{2}$/.test(normalized)) {
      normalized = `${normalized}-01T00:00:00`
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      normalized = `${normalized}T00:00:00`
    }
  }
  const d = new Date(normalized)
  return isNaN(d.getTime()) ? null : d
}

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Extrae "YYYY-MM-DD" directamente del string sin pasar por `new Date`,
 * para evitar corrimientos de día por zona horaria (p.ej. "2026-09-09T00:00:00Z"
 * visto en Lima como 8 de septiembre). El `period` del backend es la fuente
 * canónica del bucket diario/semanal/mensual.
 */
function extractDateKey(value: string | null | undefined): string | null {
  if (!value) return null
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

/** Construye un Date local (mediodía para evitar DST) desde "YYYY-MM-DD". */
function parseLocalDate(dateKey: string): Date | null {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Etiqueta del eje X. Usa la misma fuente que el tooltip (`period` para
 * día/semana/mes) para que nunca diverjan.
 */
export function formatWaterAxisLabel(period: string, agrupacion: Agrupacion): string {
  if (agrupacion === 'day' || agrupacion === 'week' || agrupacion === 'month') {
    return formatDateShort(extractDateKey(period) ?? period)
  }
  return period.includes('T') ? period.slice(11, 16) : period
}

function formatHM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Título del tooltip con el intervalo real del bucket:
 * - 30min/hora => "2 de septiembre · 14:00 – 14:30" (con fecha, antes solo "14:00")
 * - día => "2 de septiembre"
 * - semana => "31 de agosto → 6 de septiembre"
 * - mes => "1 de septiembre → 30 de septiembre"
 */
export function formatWaterTooltipTitle(
  point: WaterReadingGraphPoint,
  agrupacion: Agrupacion
): string {
  const periodStart = parseBucketDate(point.period)
  const first = parseBucketDate(point.first_reading) ?? periodStart

  if (agrupacion === '30min' || agrupacion === 'hour') {
    if (!first) return point.period
    const end = new Date(first.getTime())
    end.setMinutes(end.getMinutes() + (agrupacion === 'hour' ? 60 : 30))
    const startKey = toDateKey(first)
    const endKey = toDateKey(end)
    if (startKey === endKey) {
      return `${formatDateShort(startKey)} · ${formatHM(first)} – ${formatHM(end)}`
    }
    return `${formatDateShort(startKey)} ${formatHM(first)} → ${formatDateShort(endKey)} ${formatHM(end)}`
  }

  if (agrupacion === 'day') {
    // El bucket lo define `period`; usar `first_reading` aquí corría el día
    // cuando el timestamp venía en UTC (eje: 9, tooltip: 8).
    const periodKey = extractDateKey(point.period)
    if (periodKey) return formatDateShort(periodKey)
    if (first) return formatDateShort(toDateKey(first))
    return formatDateShort(point.period)
  }

  if (agrupacion === 'week') {
    const periodKey = extractDateKey(point.period)
    const anchor = (periodKey ? parseLocalDate(periodKey) : null) ?? periodStart ?? first
    if (!anchor) return formatDateShort(point.period)
    const end = new Date(anchor.getTime())
    end.setDate(end.getDate() + 6)
    return `${formatDateShort(toDateKey(anchor))} → ${formatDateShort(toDateKey(end))}`
  }

  // month: inicio de mes → fin de mes (rango del mes considerado)
  const periodKey = extractDateKey(point.period)
  const anchor = (periodKey ? parseLocalDate(periodKey) : null) ?? periodStart ?? first
  if (!anchor) return formatDateShort(point.period)
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  return `${formatDateShort(toDateKey(monthStart))} → ${formatDateShort(toDateKey(monthEnd))}`
}
