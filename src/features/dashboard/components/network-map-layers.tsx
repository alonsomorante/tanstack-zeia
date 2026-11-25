import { Gauge, Scale, Zap, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NETWORK_LAYER_OPTIONS, TONE_COLORS, type NetworkLayer } from '../lib/network-layers'

const LAYER_ICONS: Record<NetworkLayer, LucideIcon> = {
  consumo: Zap,
  potencia: Gauge,
  desbalance: Scale,
}

const LAYER_HINTS: Record<NetworkLayer, string> = {
  consumo: 'Cuánta energía pasa por cada elemento',
  potencia: 'El pico de demanda de cada elemento',
  desbalance: 'Dónde se reparte mal la carga entre fases',
}

export function NetworkLayerSwitch({ layer, onChange }: { layer: NetworkLayer; onChange: (layer: NetworkLayer) => void }) {
  return (
    <div className="flex w-fit items-center gap-1 rounded-lg border border-border bg-card p-1" role="group" aria-label="Capa del mapa">
      {NETWORK_LAYER_OPTIONS.map((option) => {
        const Icon = LAYER_ICONS[option.value]
        const isActive = layer === option.value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            title={LAYER_HINTS[option.value]}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              isActive ? 'bg-primary text-white shadow-soft' : 'text-text-secondary hover:bg-secondary hover:text-primary'
            )}
          >
            <Icon className="h-4 w-4" />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function LineSample({ color, widths = [2, 5], dashed = false }: { color: string; widths?: number[]; dashed?: boolean }) {
  return (
    <svg width="34" height="12" aria-hidden="true">
      {dashed ? (
        <line x1="2" y1="6" x2="32" y2="6" stroke={color} strokeWidth="2" strokeDasharray="3 4" />
      ) : (
        widths.map((w, i) => (
          <line key={w} x1="2" y1={widths.length === 1 ? 6 : 3 + i * 6} x2="32" y2={widths.length === 1 ? 6 : 3 + i * 6} stroke={color} strokeWidth={w} strokeLinecap="round" />
        ))
      )}
    </svg>
  )
}

function Dot({ color }: { color: string }) {
  return <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
}

export function NetworkLayerLegend({ layer }: { layer: NetworkLayer }) {
  const items =
    layer === 'potencia'
      ? [
          { sample: <LineSample color={TONE_COLORS.flow} />, label: 'Más grosor, mayor pico' },
          { sample: <Dot color={TONE_COLORS.peak} />, label: 'Mayor pico' },
          { sample: <Dot color={TONE_COLORS.warning} />, label: 'Sobre el límite del punto' },
          { sample: <LineSample color={TONE_COLORS.idle} dashed />, label: 'Sin datos de potencia' },
        ]
      : layer === 'desbalance'
        ? [
            { sample: <Dot color={TONE_COLORS.peak} />, label: 'El de más desbalance' },
            { sample: <Dot color={TONE_COLORS.warning} />, label: 'Entre los 3 con más desbalance' },
            { sample: <LineSample color={TONE_COLORS.idle} dashed />, label: 'Fuera del top 3: selecciona el punto para ver el suyo' },
          ]
        : [
            { sample: <LineSample color={TONE_COLORS.flow} />, label: 'Más grosor, más energía' },
            { sample: <Dot color={TONE_COLORS.peak} />, label: 'Mayor consumo' },
            { sample: <LineSample color={TONE_COLORS.idle} dashed />, label: 'Sin consumo o sin datos' },
          ]

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-secondary">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2">
          {item.sample}
          {item.label}
        </span>
      ))}
    </div>
  )
}
