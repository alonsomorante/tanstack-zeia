import { describe, it, expect } from 'vitest'
import { formatWaterAxisLabel, formatWaterTooltipTitle } from './water-graph-labels'
import type { WaterReadingGraphPoint } from '../types'

function makePoint(overrides: Partial<WaterReadingGraphPoint>): WaterReadingGraphPoint {
  return {
    period: '2026-09-02',
    first_reading: '2026-09-02T14:00:00-05:00',
    last_reading: '2026-09-02T14:29:00-05:00',
    indicator: 'consumo_litros',
    unit: 'L',
    first_value: 10,
    last_value: 13,
    difference: 3,
    measurement_point: 'Punto 1',
    ...overrides,
  }
}

describe('formatWaterTooltipTitle', () => {
  it('hora incluye fecha + rango de la hora (imagen 1)', () => {
    const title = formatWaterTooltipTitle(
      makePoint({
        period: '2026-09-02T14:00:00-05:00',
        first_reading: '2026-09-02T14:00:00-05:00',
      }),
      'hour'
    )
    expect(title).toContain('2 de septiembre')
    expect(title).toContain('14:00')
    expect(title).toContain('15:00')
  })

  it('30min incluye fecha + rango de 30 minutos', () => {
    const title = formatWaterTooltipTitle(
      makePoint({
        period: '2026-09-02T14:00:00-05:00',
        first_reading: '2026-09-02T14:00:00-05:00',
      }),
      '30min'
    )
    expect(title).toContain('2 de septiembre')
    expect(title).toContain('14:00')
    expect(title).toContain('14:30')
  })

  it('mes muestra el rango del mes considerado (imagen 2)', () => {
    const title = formatWaterTooltipTitle(
      makePoint({ period: '2026-09-01', first_reading: '2026-09-01T00:00:00-05:00' }),
      'month'
    )
    expect(title).toContain('1 de septiembre')
    expect(title).toContain('30 de septiembre')
    expect(title).toContain('→')
  })

  it('semana muestra el intervalo del tal día a tal día (imagen 3)', () => {
    const title = formatWaterTooltipTitle(
      makePoint({ period: '2026-08-31', first_reading: '2026-09-01T00:00:00-05:00' }),
      'week'
    )
    expect(title).toContain('31 de agosto')
    expect(title).toContain('6 de septiembre')
    expect(title).toContain('→')
  })

  it('día usa period aunque first_reading en UTC caiga el día anterior (eje 9 vs tooltip 8)', () => {
    const point = makePoint({
      period: '2026-09-09',
      first_reading: '2026-09-09T00:00:00Z',
      last_reading: '2026-09-09T23:59:00Z',
    })
    expect(formatWaterTooltipTitle(point, 'day')).toBe('9 de septiembre')
    expect(formatWaterAxisLabel(point.period, 'day')).toBe('9 de septiembre')
    expect(formatWaterAxisLabel(point.period, 'day')).toBe(
      formatWaterTooltipTitle(point, 'day')
    )
  })
})
