import { formatDateISO, formatDateShort } from '@/lib/date-utils'
import type {
  ConsumptionDistributionResponse,
  ElectricalPanel,
  MeasurementPointsResponse,
} from '../types'

// ─── Fechas ─────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function toDateKey(date: Date): string {
  return formatDateISO(date) ?? ''
}

/** "YYYY-MM-DD" → Date local (sin corrimiento por zona horaria). */
export function parseDateKey(key: string): Date | null {
  const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

// ─── Período ────────────────────────────────────────────────────────────────

export type NetworkPeriod = 'hoy' | '7d' | 'mes' | 'ciclo' | 'custom'
export type NetworkPresetPeriod = 'hoy' | '7d' | 'mes'

export const NETWORK_PERIOD_OPTIONS: ReadonlyArray<{ value: Exclude<NetworkPeriod, 'custom'>; label: string }> = [
  { value: 'hoy', label: 'Hoy' },
  { value: '7d', label: '7 días' },
  { value: 'mes', label: 'Este mes' },
  { value: 'ciclo', label: 'Ciclo actual' },
]

export function isNetworkPeriod(value: unknown): value is NetworkPeriod {
  return value === 'hoy' || value === '7d' || value === 'mes' || value === 'ciclo' || value === 'custom'
}

export interface NetworkPeriodRange {
  dateAfter: string
  dateBefore: string
  days: number
  /** Agrupación de la tendencia de un punto: por hora si el rango es de un solo día. */
  trendLastBy: 'hour' | 'day'
  /** Texto completo del rango ("Hoy · 9 de noviembre", "1 de noviembre → 9 de noviembre"). */
  label: string
  /** Texto corto para la tarjeta de la sede ("Hoy", "7 días", "Ciclo actual"). */
  shortLabel: string
  /** El rango termina hoy: el último día todavía está en curso. */
  endsToday: boolean
}

export function buildPeriodRange(
  start: Date,
  end: Date,
  today: Date,
  shortLabel: string,
  label?: string
): NetworkPeriodRange {
  const s = startOfDay(start)
  const e = startOfDay(end)
  const dateAfter = toDateKey(s)
  const dateBefore = toDateKey(e)
  const days = Math.round((e.getTime() - s.getTime()) / DAY_MS) + 1
  return {
    dateAfter,
    dateBefore,
    days,
    trendLastBy: days === 1 ? 'hour' : 'day',
    label:
      label ??
      (days === 1 ? formatDateShort(dateAfter) : `${formatDateShort(dateAfter)} → ${formatDateShort(dateBefore)}`),
    shortLabel,
    endsToday: dateBefore === toDateKey(startOfDay(today)),
  }
}

export function getPresetPeriodRange(period: NetworkPresetPeriod, today: Date): NetworkPeriodRange {
  const end = startOfDay(today)
  if (period === 'hoy') return buildPeriodRange(end, end, today, 'Hoy', `Hoy · ${formatDateShort(toDateKey(end))}`)
  if (period === '7d') return buildPeriodRange(addDays(end, -6), end, today, '7 días')
  return buildPeriodRange(new Date(end.getFullYear(), end.getMonth(), 1), end, today, 'Este mes')
}

// ─── Modelo de la red (sede → tableros → puntos) ────────────────────────────

export interface NetworkPanelInput {
  panel: ElectricalPanel
  data: ConsumptionDistributionResponse | undefined
  isError: boolean
}

export interface NetworkPointNode {
  key: string
  id: number | null
  panelId: number
  panelName: string
  name: string
  deviceName: string | null
  kwh: number
  /** % respecto al medidor general del tablero (dato del backend). */
  shareOfPanel: number
  /** % respecto al total de la sede (suma de tableros). */
  shareOfSede: number
  isActive: boolean
  /** Fila "otras cargas": energía del tablero que no pasa por un punto medido. */
  isOtherLoads: boolean
  isPeak: boolean
  description: string | null
  channel: string | null
  capacity: string | null
  hardware: string | null
  photoUrl: string | null
  locationText: string | null
  installationDate: string | null
}

export type NetworkPanelStatus = 'loading' | 'ready' | 'error'

export interface NetworkPanelNode {
  key: string
  id: number
  name: string
  typeLabel: string
  /** Tablero monofásico: el desbalance entre fases no aplica. */
  isSinglePhase: boolean
  status: NetworkPanelStatus
  kwh: number
  shareOfSede: number
  isPeak: boolean
  mainMeterName: string | null
  mainMeterId: number | null
  points: NetworkPointNode[]
}

export interface NetworkMapModel {
  panels: NetworkPanelNode[]
  totalKwh: number
  pointCount: number
  topPoints: NetworkPointNode[]
  /** true cuando todos los tableros terminaron de cargar (con datos o con error). */
  isComplete: boolean
  /**
   * Nombres de punto repetidos en la sede. La curva de potencia identifica los
   * puntos solo por nombre, así que a estos no se les puede asignar su potencia.
   */
  ambiguousNames: ReadonlySet<string>
}

export const EMPTY_NETWORK_MODEL: NetworkMapModel = {
  panels: [],
  totalKwh: 0,
  pointCount: 0,
  topPoints: [],
  isComplete: false,
  ambiguousNames: new Set<string>(),
}

const PANEL_TYPE_LABELS: Record<string, string> = {
  trifasico: 'Trifásico',
  monofasico: 'Monofásico',
  bifasico: 'Bifásico',
}

function normalizeSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

export function formatPanelType(type: string | null | undefined, threads: number | null | undefined): string {
  const typeLabel = type ? (PANEL_TYPE_LABELS[normalizeSlug(type)] ?? capitalize(type)) : null
  const threadsLabel = threads ? `${threads} hilos` : null
  return [typeLabel, threadsLabel].filter(Boolean).join(' · ')
}

function finite(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function isImageReference(value: string): boolean {
  return /^(https?:)?\/\//i.test(value) || value.startsWith('/') || value.startsWith('data:image/')
}

export function pointKey(panelId: number, pointId: number): string {
  return `point-${panelId}-${pointId}`
}

function otherLoadsKey(panelId: number, index: number): string {
  return index === 0 ? `other-${panelId}` : `other-${panelId}-${index}`
}

interface PointExtras {
  deviceName: string | null
  photoUrl: string | null
  locationText: string | null
  installationDate: string | null
}

/** Datos de instalación por punto (foto, fecha, medidor) desde /measurement-points/. */
function indexPointExtras(structure: MeasurementPointsResponse | undefined): Map<number, PointExtras> {
  const index = new Map<number, PointExtras>()
  for (const panel of structure?.results ?? []) {
    for (const device of panel.devices ?? []) {
      for (const mp of device.measurement_points ?? []) {
        const reference = mp.location_reference?.trim() ?? ''
        const isImage = reference !== '' && isImageReference(reference)
        index.set(mp.id, {
          deviceName: device.name || null,
          photoUrl: isImage ? reference : null,
          locationText: reference !== '' && !isImage ? reference : null,
          installationDate: mp.installation_date ?? null,
        })
      }
    }
  }
  return index
}

export function buildNetworkMap(
  inputs: NetworkPanelInput[],
  structure?: MeasurementPointsResponse
): NetworkMapModel {
  const extras = indexPointExtras(structure)

  const panels: NetworkPanelNode[] = inputs.map(({ panel, data, isError }) => {
    const status: NetworkPanelStatus = data ? 'ready' : isError ? 'error' : 'loading'
    const panelKwh = data ? finite(data.main_consumption_kwh) : 0
    const results = data?.results ?? []
    const main = results.find((r) => r.is_main) ?? null
    let otherIndex = 0

    const points: NetworkPointNode[] = results
      .filter((r) => !r.is_main)
      .map((r) => {
        const id = r.measurement_point_id
        const extra = id != null ? extras.get(id) : undefined
        const kwh = finite(r.consumption_kwh)
        const shareOfPanel = Number.isFinite(r.consumption_percentage)
          ? r.consumption_percentage
          : panelKwh > 0
            ? (kwh / panelKwh) * 100
            : 0
        return {
          key: id != null ? pointKey(panel.id, id) : otherLoadsKey(panel.id, otherIndex++),
          id,
          panelId: panel.id,
          panelName: panel.name,
          name: r.measurement_point_name,
          deviceName: r.device_name ?? extra?.deviceName ?? null,
          kwh,
          shareOfPanel,
          shareOfSede: 0,
          isActive: r.is_active !== false,
          isOtherLoads: Boolean(r.is_other_loads) || id == null,
          isPeak: false,
          description: r.description ?? null,
          channel: r.channel,
          capacity: r.capacity,
          hardware: r.hardware,
          photoUrl: extra?.photoUrl ?? null,
          locationText: extra?.locationText ?? null,
          installationDate: extra?.installationDate ?? null,
        }
      })
      // Puntos medidos de mayor a menor; "otras cargas" siempre al final.
      .sort((a, b) => Number(a.isOtherLoads) - Number(b.isOtherLoads) || b.kwh - a.kwh)

    return {
      key: `panel-${panel.id}`,
      id: panel.id,
      name: panel.name,
      typeLabel: formatPanelType(panel.type, panel.threads),
      isSinglePhase: normalizeSlug(panel.type ?? '').startsWith('mono'),
      status,
      kwh: panelKwh,
      shareOfSede: 0,
      isPeak: false,
      mainMeterName: main?.measurement_point_name ?? null,
      mainMeterId: main?.measurement_point_id ?? null,
      points,
    }
  })

  // Mismo criterio que "Todos los tableros": total de sede = suma de medidores generales.
  const totalKwh = panels.reduce((sum, p) => sum + p.kwh, 0)
  const isComplete = panels.every((p) => p.status !== 'loading')

  for (const panel of panels) {
    panel.shareOfSede = totalKwh > 0 ? (panel.kwh / totalKwh) * 100 : 0
    for (const point of panel.points) {
      point.shareOfSede = totalKwh > 0 ? (point.kwh / totalKwh) * 100 : 0
    }
  }

  const measuredPoints = panels.flatMap((p) => p.points.filter((pt) => !pt.isOtherLoads))
  const consumingPoints = measuredPoints.filter((p) => p.kwh > 0).sort((a, b) => b.kwh - a.kwh)
  const consumingPanels = panels.filter((p) => p.kwh > 0)

  // El "mayor consumo" solo se marca con todos los tableros cargados (evita parpadeos)
  // y si hay contra qué comparar.
  if (isComplete && consumingPanels.length > 1) {
    consumingPanels.reduce((best, p) => (p.kwh > best.kwh ? p : best)).isPeak = true
  }
  if (isComplete && consumingPoints.length > 1) {
    consumingPoints[0].isPeak = true
  }

  const nameCounts = new Map<string, number>()
  const countName = (name: string | null) => {
    if (name) nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1)
  }
  for (const panel of panels) {
    countName(panel.mainMeterName)
    panel.points.filter((p) => !p.isOtherLoads).forEach((p) => countName(p.name))
  }

  return {
    panels,
    totalKwh,
    pointCount: measuredPoints.length,
    topPoints: consumingPoints.slice(0, 5),
    isComplete,
    ambiguousNames: new Set([...nameCounts].filter(([, count]) => count > 1).map(([name]) => name)),
  }
}

export function findPointById(model: NetworkMapModel, pointId: number): NetworkPointNode | null {
  for (const panel of model.panels) {
    const point = panel.points.find((p) => p.id === pointId)
    if (point) return point
  }
  return null
}

// ─── Selección (vive en la URL: ?tablero=&punto=) ───────────────────────────

export type NetworkSelection =
  | { kind: 'sede' }
  | { kind: 'panel'; panelId: number }
  | { kind: 'point'; panelId: number; pointKey: string }

export type ResolvedNetworkSelection =
  | { kind: 'sede' }
  | { kind: 'panel'; panel: NetworkPanelNode }
  | { kind: 'point'; panel: NetworkPanelNode; point: NetworkPointNode }

/** Valor de `?punto=` para la fila "otras cargas" (no tiene id de punto). */
export const OTHER_LOADS_PARAM = 'otras'

function parsePositiveInt(value: string | undefined): number | null {
  if (value == null) return null
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

export function selectionFromSearch(tablero: string | undefined, punto: string | undefined): NetworkSelection {
  const panelId = parsePositiveInt(tablero)
  if (panelId == null) return { kind: 'sede' }
  if (punto === OTHER_LOADS_PARAM) return { kind: 'point', panelId, pointKey: otherLoadsKey(panelId, 0) }
  const pointId = parsePositiveInt(punto)
  return pointId != null ? { kind: 'point', panelId, pointKey: pointKey(panelId, pointId) } : { kind: 'panel', panelId }
}

export function selectionToSearch(selection: NetworkSelection): {
  tablero: string | undefined
  punto: string | undefined
} {
  if (selection.kind === 'sede') return { tablero: undefined, punto: undefined }
  if (selection.kind === 'panel') return { tablero: String(selection.panelId), punto: undefined }
  const match = selection.pointKey.match(/^point-\d+-(\d+)$/)
  return { tablero: String(selection.panelId), punto: match ? match[1] : OTHER_LOADS_PARAM }
}

export function resolveNetworkSelection(
  selection: NetworkSelection,
  model: NetworkMapModel
): ResolvedNetworkSelection {
  if (selection.kind === 'sede') return selection
  const panel = model.panels.find((p) => p.id === selection.panelId)
  if (!panel) return { kind: 'sede' }
  if (selection.kind === 'panel') return { kind: 'panel', panel }
  const point = panel.points.find((p) => p.key === selection.pointKey)
  // Mientras el tablero recarga (p.ej. cambio de período) se queda en el tablero.
  return point ? { kind: 'point', panel, point } : { kind: 'panel', panel }
}

export function toNetworkSelection(resolved: ResolvedNetworkSelection): NetworkSelection {
  if (resolved.kind === 'sede') return resolved
  if (resolved.kind === 'panel') return { kind: 'panel', panelId: resolved.panel.id }
  return { kind: 'point', panelId: resolved.panel.id, pointKey: resolved.point.key }
}

// ─── Comparación (vive en la URL: ?comparar=10,11) ──────────────────────────

/** Máximo de puntos comparados a la vez (cada uno tiene su color en la gráfica). */
export const MAX_COMPARE_POINTS = 6

/** Un color por punto comparado (bandeja, tabla y gráfica usan el mismo orden). */
export const COMPARE_COLORS = ['#00B7CA', '#FF6B35', '#9B5DE5', '#2EC4B6', '#E71D36', '#1C1C1E']

export function parseCompareIds(value: string | undefined): number[] {
  if (!value) return []
  const ids: number[] = []
  for (const part of value.split(',')) {
    const id = parsePositiveInt(part.trim())
    if (id != null && !ids.includes(id)) ids.push(id)
    if (ids.length === MAX_COMPARE_POINTS) break
  }
  return ids
}

// ─── Formato ────────────────────────────────────────────────────────────────

export function formatKwh(value: number, precise = false): string {
  const abs = Math.abs(value)
  const maximumFractionDigits = precise ? 2 : abs >= 1000 ? 0 : abs >= 100 ? 1 : 2
  return value.toLocaleString('es-PE', { maximumFractionDigits })
}

/** Misma regla de decimales que la energía, para kW. */
export const formatKw = formatKwh

export function formatShare(value: number): string {
  return `${value.toFixed(1)}%`
}

/** "2024-03-15" → "15 de marzo de 2024". */
export function formatInstallationDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return value
  return `${formatDateShort(`${match[1]}-${match[2]}-${match[3]}`)} de ${match[1]}`
}
