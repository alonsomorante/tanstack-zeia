export const WATER_INDICATORS = [
  'consumo_total_litros',
  'consumo_total_m3',
  'litros_por_pulso',
] as const

export type WaterIndicator = (typeof WATER_INDICATORS)[number]

export const WATER_INDICATOR_INFO: Record<WaterIndicator, { label: string; unit: string }> = {
  consumo_total_litros: { label: 'Consumo total', unit: 'L' },
  consumo_total_m3: { label: 'Consumo total', unit: 'm³' },
  litros_por_pulso: { label: 'Litros por pulso', unit: 'L' },
}

export const WATER_INDICATOR_OPTIONS = WATER_INDICATORS.map((key) => ({
  value: key,
  label: `${WATER_INDICATOR_INFO[key].label} (${WATER_INDICATOR_INFO[key].unit})`,
}))

export function isWaterIndicator(value: unknown): value is WaterIndicator {
  return (
    typeof value === 'string' &&
    (WATER_INDICATORS as readonly string[]).includes(value)
  )
}
