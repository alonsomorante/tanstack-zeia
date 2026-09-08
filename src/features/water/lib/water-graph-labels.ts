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
    if (first) return formatDateShort(toDateKey(first))
    return formatDateShort(point.period)
  }

  if (agrupacion === 'week') {
    const anchor = periodStart ?? first
    if (!anchor) return formatDateShort(point.period)
    const end = new Date(anchor.getTime())
    end.setDate(end.getDate() + 6)
    return `${formatDateShort(toDateKey(anchor))} → ${formatDateShort(toDateKey(end))}`
  }

  // month: inicio de mes → fin de mes (rango del mes considerado)
  const anchor = periodStart ?? first
  if (!anchor) return formatDateShort(point.period)
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  return `${formatDateShort(toDateKey(monthStart))} → ${formatDateShort(toDateKey(monthEnd))}`
}
