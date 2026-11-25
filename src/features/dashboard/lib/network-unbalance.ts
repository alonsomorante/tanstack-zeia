import type { ImbalancedEvent, MostThreeUnbalancedResponse } from '../types'

/**
 * Desbalance de carga (IEEE 141): cuánto se reparte de forma desigual la
 * corriente (o el voltaje) entre las tres fases. Un desbalance sostenido
 * calienta conductores, motores y transformadores y aumenta las pérdidas.
 */

export interface UnbalanceRank {
  pointId: number
  name: string
  /** Posición en el ranking de la sede (1 = más desbalanceado). */
  rank: number
  currentCount: number
  voltageCount: number
  totalReadings: number
  /** % de las lecturas del período con desbalance de corriente. */
  currentPct: number
  /** % de las lecturas del período con desbalance de voltaje. */
  voltagePct: number
  worstPct: number
  worstKind: 'corriente' | 'voltaje'
}

/** Top 3 de la sede (`most-three-unbalanced`), sin los puntos que no registran desbalance. */
export function rankUnbalance(response: MostThreeUnbalancedResponse | undefined): UnbalanceRank[] {
  return (response?.top_unbalanced_measurement_points ?? [])
    .filter((p) => (p.current_unbalanced ?? 0) + (p.voltage_unbalanced ?? 0) > 0)
    .map((p, index) => {
      const total = p.total_readings > 0 ? p.total_readings : 0
      const currentPct = total > 0 ? (p.current_unbalanced / total) * 100 : 0
      const voltagePct = total > 0 ? (p.voltage_unbalanced / total) * 100 : 0
      return {
        pointId: p.measurement_point_id,
        name: p.measurement_point_name,
        rank: index + 1,
        currentCount: p.current_unbalanced,
        voltageCount: p.voltage_unbalanced,
        totalReadings: total,
        currentPct,
        voltagePct,
        worstPct: Math.max(currentPct, voltagePct),
        worstKind: voltagePct > currentPct ? 'voltaje' : 'corriente',
      }
    })
}

export interface PhaseReading {
  key: string
  label: string
  value: number
  /** Diferencia respecto al promedio de las fases, en %. */
  deviationPct: number
}

export interface PhaseAnalysis {
  phases: PhaseReading[]
  mean: number
  worst: PhaseReading
  unit: 'A' | 'V'
}

const CURRENT_PHASES = [
  { key: 'Ia', label: 'R' },
  { key: 'Ib', label: 'S' },
  { key: 'Ic', label: 'T' },
]

const VOLTAGE_LINES = [
  { key: 'Uab', label: 'RS' },
  { key: 'Ubc', label: 'ST' },
  { key: 'Uac', label: 'RT' },
]

/** Evento más reciente de una página de eventos (no se asume el orden del backend). */
export function latestEvent(events: ImbalancedEvent[] | undefined): ImbalancedEvent | undefined {
  let latest: ImbalancedEvent | undefined
  let latestTime = -Infinity
  for (const event of events ?? []) {
    const time = new Date(event.created_at).getTime()
    if (Number.isFinite(time) && time > latestTime) {
      latest = event
      latestTime = time
    }
  }
  return latest
}

export function analyzePhases(event: ImbalancedEvent | undefined, kind: 'current' | 'voltage'): PhaseAnalysis | null {
  const values = event?.values_per_channel?.[0]?.values ?? {}
  const definitions = kind === 'current' ? CURRENT_PHASES : VOLTAGE_LINES
  const readings = definitions
    .map((d) => ({ ...d, value: values[d.key] }))
    .filter((d): d is { key: string; label: string; value: number } => typeof d.value === 'number' && Number.isFinite(d.value))
  if (readings.length < 2) return null

  const mean = readings.reduce((sum, r) => sum + r.value, 0) / readings.length
  if (mean <= 0) return null

  const phases = readings.map((r) => ({ ...r, deviationPct: ((r.value - mean) / mean) * 100 }))
  const worst = phases.reduce((best, p) => (Math.abs(p.deviationPct) > Math.abs(best.deviationPct) ? p : best))
  return { phases, mean, worst, unit: kind === 'current' ? 'A' : 'V' }
}
