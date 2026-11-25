import type { DeviceMeasurementPoint } from '../types'
import {
  formatKw,
  formatKwh,
  formatShare,
  type NetworkMapModel,
  type NetworkPanelNode,
  type NetworkPointNode,
} from './network-map'
import { formatPowerMoment, type PowerAnalysis, type PowerMoment } from './network-power'
import type { UnbalanceRank } from './network-unbalance'

/**
 * Capas del mapa: el mismo diagrama muestra consumo, potencia o desbalance.
 * Cada capa traduce sus datos a lo que dibuja cada nodo (cifra, color, grosor).
 */

export type NetworkLayer = 'consumo' | 'potencia' | 'desbalance'

export const NETWORK_LAYER_OPTIONS: ReadonlyArray<{ value: NetworkLayer; label: string }> = [
  { value: 'consumo', label: 'Consumo' },
  { value: 'potencia', label: 'Potencia' },
  { value: 'desbalance', label: 'Desbalance' },
]

export function isNetworkLayer(value: unknown): value is NetworkLayer {
  return value === 'consumo' || value === 'potencia' || value === 'desbalance'
}

export type NodeTone = 'flow' | 'peak' | 'warning' | 'idle'

export const TONE_COLORS: Record<NodeTone, string> = {
  flow: '#00B7CA',
  peak: '#E71D36',
  warning: '#FF6B35',
  idle: '#C5CBCE',
}

export interface NodeView {
  /** Cifra principal ya formateada; null si no hay dato. */
  value: string | null
  unit: string
  secondary: string | null
  secondaryTone: 'muted' | 'warning'
  /** 0–1: relleno de la barra y grosor del conductor. */
  share: number
  tone: NodeTone
  dashed: boolean
  badge: string | null
  /** Resumen para lectores de pantalla. */
  aria: string
}

export interface SedeView {
  value: string | null
  unit: string
  caption: string | null
  badge: string | null
}

export interface NetworkLayerView {
  layer: NetworkLayer
  isLoading: boolean
  error: string | null
  sede: SedeView
  panels: Map<number, NodeView>
  points: Map<string, NodeView>
  /** La fila "+N puntos más" muestra los kWh ocultos (solo en consumo). */
  showHiddenTotals: boolean
}

export interface LayerInputs {
  power: { analysis: PowerAnalysis | null; isLoading: boolean; isError: boolean }
  unbalance: { ranks: UnbalanceRank[]; isLoading: boolean; isError: boolean }
  devicesById: ReadonlyMap<number, DeviceMeasurementPoint>
  /** El período es de un solo día (las horas se muestran sin fecha). */
  singleDay: boolean
}

const NO_DATA = (text: string, aria = text): NodeView => ({
  value: null,
  unit: '',
  secondary: text,
  secondaryTone: 'muted',
  share: 0,
  tone: 'idle',
  dashed: true,
  badge: null,
  aria,
})

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}

// ─── Consumo ────────────────────────────────────────────────────────────────

function consumptionPanel(panel: NetworkPanelNode): NodeView {
  if (panel.status === 'loading') return NO_DATA('Cargando…', 'cargando consumo')
  if (panel.status === 'error') {
    return { ...NO_DATA('Sin datos para este período'), secondaryTone: 'warning', tone: 'warning' }
  }
  const consuming = panel.kwh > 0
  return {
    value: formatKwh(panel.kwh),
    unit: 'kWh',
    secondary: formatShare(panel.shareOfSede),
    secondaryTone: 'muted',
    share: clamp01(panel.shareOfSede / 100),
    tone: panel.isPeak ? 'peak' : consuming ? 'flow' : 'idle',
    dashed: !consuming,
    badge: panel.isPeak ? 'Mayor consumo' : null,
    aria: `${formatKwh(panel.kwh, true)} kWh, ${formatShare(panel.shareOfSede)} de la sede`,
  }
}

function consumptionPoint(point: NetworkPointNode): NodeView {
  const consuming = point.isActive && point.kwh > 0
  return {
    value: formatKwh(point.kwh),
    unit: 'kWh',
    secondary: formatShare(point.shareOfPanel),
    secondaryTone: 'muted',
    share: clamp01(point.shareOfPanel / 100),
    tone: !consuming ? 'idle' : point.isPeak ? 'peak' : 'flow',
    dashed: !consuming || point.isOtherLoads,
    badge: null,
    aria: `${formatKwh(point.kwh, true)} kWh, ${formatShare(point.shareOfPanel)} del tablero`,
  }
}

function buildConsumption(model: NetworkMapModel): Omit<NetworkLayerView, 'layer'> {
  const panels = new Map<number, NodeView>()
  const points = new Map<string, NodeView>()
  for (const panel of model.panels) {
    panels.set(panel.id, consumptionPanel(panel))
    for (const point of panel.points) points.set(point.key, consumptionPoint(point))
  }
  return {
    isLoading: !model.isComplete,
    error: null,
    sede: { value: model.isComplete ? formatKwh(model.totalKwh) : null, unit: 'kWh', caption: null, badge: null },
    panels,
    points,
    showHiddenTotals: true,
  }
}

// ─── Potencia ───────────────────────────────────────────────────────────────

function buildPower(model: NetworkMapModel, inputs: LayerInputs): Omit<NetworkLayerView, 'layer'> {
  const { analysis, isLoading, isError } = inputs.power
  const panels = new Map<number, NodeView>()
  const points = new Map<string, NodeView>()
  const peakOf = (name: string | null): PowerMoment | null =>
    name && analysis && !model.ambiguousNames.has(name) ? (analysis.channelPeaks.get(name) ?? null) : null
  const when = (moment: PowerMoment) =>
    formatPowerMoment(moment.time, analysis?.granularity ?? 'hour', inputs.singleDay)
  const emptyText = isLoading ? 'Cargando…' : 'Sin datos de potencia'
  const unit = analysis?.unit ?? 'kW'

  const panelPeaks = model.panels.map((panel) => ({ panel, peak: peakOf(panel.mainMeterName) }))
  const withPanelPeak = panelPeaks.filter((p) => p.peak != null)
  const maxPanelPeak = Math.max(0, ...withPanelPeak.map((p) => p.peak!.value))
  const topPanelId =
    withPanelPeak.length > 1 ? withPanelPeak.reduce((best, p) => (p.peak!.value > best.peak!.value ? p : best)).panel.id : null

  const pointPeaks = model.panels.flatMap((panel) =>
    panel.points.map((point) => ({ point, peak: point.isOtherLoads ? null : peakOf(point.name) }))
  )
  const withPointPeak = pointPeaks.filter((p) => p.peak != null)
  const topPointKey =
    withPointPeak.length > 1
      ? withPointPeak.reduce((best, p) => (p.peak!.value > best.peak!.value ? p : best)).point.key
      : null

  for (const { panel, peak } of panelPeaks) {
    if (!peak) {
      panels.set(panel.id, NO_DATA(panel.status === 'loading' ? 'Cargando…' : emptyText))
      continue
    }
    const isTop = panel.id === topPanelId
    panels.set(panel.id, {
      value: formatKw(peak.value),
      unit,
      secondary: when(peak),
      secondaryTone: 'muted',
      share: maxPanelPeak > 0 ? clamp01(peak.value / maxPanelPeak) : 0,
      tone: isTop ? 'peak' : 'flow',
      dashed: false,
      badge: isTop ? 'Mayor pico' : null,
      aria: `pico de ${formatKw(peak.value, true)} ${unit}, ${when(peak)}`,
    })
  }

  for (const panel of model.panels) {
    const inPanel = pointPeaks.filter((p) => p.point.panelId === panel.id && p.peak)
    const maxInPanel = Math.max(0, ...inPanel.map((p) => p.peak!.value))
    for (const point of panel.points) {
      const peak = pointPeaks.find((p) => p.point.key === point.key)?.peak ?? null
      if (!peak) {
        points.set(point.key, NO_DATA(point.isOtherLoads ? 'Sin medición directa' : emptyText))
        continue
      }
      const limit = point.id != null ? inputs.devicesById.get(point.id)?.thresholds?.power?.upper_threshold : null
      const overLimit = limit != null && peak.value > limit
      const isTop = point.key === topPointKey
      points.set(point.key, {
        value: formatKw(peak.value),
        unit,
        secondary: overLimit ? `sobre su límite (${formatKw(limit)})` : when(peak),
        secondaryTone: overLimit ? 'warning' : 'muted',
        share: maxInPanel > 0 ? clamp01(peak.value / maxInPanel) : 0,
        tone: overLimit ? 'warning' : isTop ? 'peak' : 'flow',
        dashed: false,
        badge: null,
        aria: `pico de ${formatKw(peak.value, true)} ${unit}, ${when(peak)}${overLimit ? ', sobre su límite' : ''}`,
      })
    }
  }

  const sedePeak = analysis?.sedePeak ?? null
  const contracted = analysis?.thresholds.contracted ?? null
  const pct = sedePeak && contracted ? (sedePeak.value / contracted) * 100 : null
  return {
    isLoading: isLoading || !model.isComplete,
    error: isError ? 'No se pudo cargar la potencia de la sede' : null,
    sede: {
      value: sedePeak ? formatKw(sedePeak.value) : null,
      unit,
      caption: sedePeak
        ? pct != null
          ? `Pico · ${Math.round(pct)}% de la contratada`
          : 'Pico del período'
        : isLoading
          ? null
          : 'Sin datos de potencia',
      badge: pct != null && pct > 100 ? 'Superó la contratada' : null,
    },
    panels,
    points,
    showHiddenTotals: false,
  }
}

// ─── Desbalance ─────────────────────────────────────────────────────────────

function buildUnbalance(model: NetworkMapModel, inputs: LayerInputs): Omit<NetworkLayerView, 'layer'> {
  const { ranks, isLoading, isError } = inputs.unbalance
  const byPoint = new Map(ranks.map((r) => [r.pointId, r]))
  const panels = new Map<number, NodeView>()
  const points = new Map<string, NodeView>()
  const outside = isLoading ? 'Cargando…' : 'Fuera del top 3'

  for (const panel of model.panels) {
    if (panel.isSinglePhase) {
      panels.set(panel.id, NO_DATA('Monofásico: no aplica'))
      panel.points.forEach((p) => points.set(p.key, NO_DATA('No aplica')))
      continue
    }

    const inPanel = ranks.filter(
      (r) => r.pointId === panel.mainMeterId || panel.points.some((p) => p.id === r.pointId)
    )
    if (inPanel.length === 0) {
      panels.set(panel.id, NO_DATA(outside))
    } else {
      const hasFirst = inPanel.some((r) => r.rank === 1)
      const mainRank = panel.mainMeterId != null ? byPoint.get(panel.mainMeterId) : undefined
      panels.set(panel.id, {
        value: String(inPanel.length),
        unit: inPanel.length === 1 ? 'punto' : 'puntos',
        secondary: 'en el top 3',
        secondaryTone: 'muted',
        share: clamp01(Math.max(...inPanel.map((r) => r.worstPct)) / 100),
        tone: hasFirst ? 'peak' : 'warning',
        dashed: false,
        badge: mainRank ? 'Medidor general con desbalance' : null,
        aria: `${inPanel.length} ${inPanel.length === 1 ? 'punto' : 'puntos'} entre los 3 con más desbalance`,
      })
    }

    for (const point of panel.points) {
      const rank = point.id != null ? byPoint.get(point.id) : undefined
      if (!rank) {
        points.set(point.key, NO_DATA(point.isOtherLoads ? 'Sin medición directa' : outside))
        continue
      }
      points.set(point.key, {
        value: rank.worstPct.toFixed(1),
        unit: '%',
        secondary: `del tiempo · ${rank.worstKind}`,
        secondaryTone: 'muted',
        share: clamp01(rank.worstPct / 100),
        tone: rank.rank === 1 ? 'peak' : 'warning',
        dashed: false,
        badge: null,
        aria: `desbalance de ${rank.worstKind} en el ${rank.worstPct.toFixed(1)}% de las lecturas, puesto ${rank.rank}`,
      })
    }
  }

  return {
    isLoading,
    error: isError ? 'No se pudo cargar el desbalance de la sede' : null,
    sede: {
      value: isLoading ? null : String(ranks.length),
      unit: ranks.length === 1 ? 'punto' : 'puntos',
      caption: isLoading ? null : ranks.length > 0 ? 'con más desbalance' : 'Sin desbalance registrado',
      badge: null,
    },
    panels,
    points,
    showHiddenTotals: false,
  }
}

export function buildLayerView(layer: NetworkLayer, model: NetworkMapModel, inputs: LayerInputs): NetworkLayerView {
  const view =
    layer === 'potencia' ? buildPower(model, inputs) : layer === 'desbalance' ? buildUnbalance(model, inputs) : buildConsumption(model)
  return { layer, ...view }
}
