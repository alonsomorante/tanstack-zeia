export const WATER_INDICATORS = [
  'consumo_litros',
  'consumo_m3',
  'litros_por_pulso',
] as const

export type WaterIndicator = (typeof WATER_INDICATORS)[number]

export const WATER_INDICATOR_INFO: Record<WaterIndicator, { label: string; unit: string }> = {
  consumo_litros: { label: 'Consumo total', unit: 'L' },
  consumo_m3: { label: 'Consumo total', unit: 'm³' },
  litros_por_pulso: { label: 'Litros por pulso', unit: 'L' },
}

// Opciones visibles en el filtro de indicador.
// `litros_por_pulso` se oculta por ahora (sigue existiendo en el tipo/API
// para no romper lecturas que lo incluyan, pero no se ofrece en la UI).
export const VISIBLE_WATER_INDICATORS = ['consumo_litros', 'consumo_m3'] as const

export type VisibleWaterIndicator = (typeof VISIBLE_WATER_INDICATORS)[number]

export const WATER_INDICATOR_OPTIONS = VISIBLE_WATER_INDICATORS.map((key) => ({
  value: key,
  label: `${WATER_INDICATOR_INFO[key].label} (${WATER_INDICATOR_INFO[key].unit})`,
}))

export function isWaterIndicator(value: unknown): value is WaterIndicator {
  return (
    typeof value === 'string' &&
    (WATER_INDICATORS as readonly string[]).includes(value)
  )
}

export function isVisibleWaterIndicator(value: unknown): value is VisibleWaterIndicator {
  return (
    typeof value === 'string' &&
    (VISIBLE_WATER_INDICATORS as readonly string[]).includes(value)
  )
}
