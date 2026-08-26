import { describe, it, expect } from 'vitest'
import {
  WATER_HEADQUARTERS,
  makeWaterMeasurementPoints,
  makeWaterConsumptionSummary,
  makeWaterConsumptionDistribution,
  makeWaterReadingsGraph,
  makeWaterReadingsTable,
} from './water-data'

describe('mocks de agua', () => {
  it('expone sedes con tuberías activas y punto principal', () => {
    const sede = WATER_HEADQUARTERS.results[0]
    expect(sede.id).toBe(199)
    expect(sede.water_pipes[0].is_main).toBe(true)
  })

  it('resuelve puntos de medición por sede-tubería', () => {
    const points = makeWaterMeasurementPoints(199, 1)
    expect(points.results[0].is_main).toBe(true)
    expect(points.results).toHaveLength(3)
  })

  it('genera un resumen con consumo hoy y del mes', () => {
    const summary = makeWaterConsumptionSummary(1)
    expect(summary.today_consumption_litros).toBeGreaterThan(0)
    expect(summary.month_consumption_litros).toBeGreaterThan(0)
    expect(summary.date_range.month_start <= summary.date_range.today).toBe(true)
  })

  it('genera una distribución con el punto principal primero y un is_highest', () => {
    const distribution = makeWaterConsumptionDistribution(1, '2026-08-01', '2026-08-25')
    expect(distribution.results[0].is_main).toBe(true)
    expect(distribution.results.filter((r) => r.is_highest)).toHaveLength(1)
  })

  it('genera lecturas diarias respetando weekday en la gráfica', () => {
    const graph = makeWaterReadingsGraph({
      dateAfter: '2026-08-02',
      dateBefore: '2026-08-08',
      indicador: 'consumo_total_litros',
      weekday: '1,2,3,4,5',
      lastBy: 'day',
    })
    expect(graph.length).toBeGreaterThan(0)
    expect(graph.every((r) => r.difference > 0)).toBe(true)
  })

  it('genera 24 barras horarias para last_by=hour', () => {
    const graph = makeWaterReadingsGraph({
      dateAfter: '2026-08-03',
      dateBefore: '2026-08-03',
      indicador: 'consumo_total_litros',
      lastBy: 'hour',
    })
    expect(graph).toHaveLength(24)
  })

  it('pagina la tabla de lecturas', () => {
    const page1 = makeWaterReadingsTable({ indicador: 'consumo_total_litros', page: 1, pageSize: 10 })
    const page2 = makeWaterReadingsTable({ indicador: 'consumo_total_litros', page: 2, pageSize: 10 })
    expect(page1.results).toHaveLength(10)
    expect(page2.results).toHaveLength(10)
    expect(page1.results[0].indicators.id).toBeGreaterThan(page2.results[0].indicators.id)
  })
})
