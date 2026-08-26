import { useMemo, useState } from 'react'
import type { WaterDistributionResult } from '../types'

const PALETTE = [
  '#00B7CA',
  '#2EC4B6',
  '#FF6B35',
  '#E71D36',
  '#5EDFFF',
  '#FF9F43',
  '#A55EEA',
  '#26DE81',
  '#FD79A8',
  '#FDCB6E',
]

const SMALL_SLICE_THRESHOLD = 0.03 // 3%
const LABEL_MAX_LENGTH = 18

const VIEWBOX = 400
const CENTER = VIEWBOX / 2
const OUTER_RADIUS = 150
const INNER_RADIUS = 92
const LABEL_LINE_START_RADIUS = OUTER_RADIUS + 6
const LABEL_RADIUS = 196
const LABEL_BOX_HEIGHT = 24
const LABEL_GAP = 6
const LABEL_MARGIN_Y = 18

function getColor(index: number): string {
  return PALETTE[index % PALETTE.length]
}

function truncateLabel(label: string, maxLength: number): string {
  if (label.length <= maxLength) return label
  return `${label.slice(0, maxLength)}…`
}

interface GroupedSlice {
  label: string
  value: number
  percentage: number
  colorIndex: number
}

function groupSmallSlices(results: WaterDistributionResult[], totalLitros: number): GroupedSlice[] {
  const secondary = results
    .filter((r) => !r.is_main && r.consumption_litros > 0)
    .sort((a, b) => b.consumption_litros - a.consumption_litros)

  if (secondary.length === 0) return []

  const effectiveTotal =
    totalLitros > 0 ? totalLitros : secondary.reduce((sum, r) => sum + r.consumption_litros, 0)
  const slices: GroupedSlice[] = []
  let otherValue = 0
  let otherCount = 0

  secondary.forEach((item, index) => {
    const pct = effectiveTotal > 0 ? item.consumption_litros / effectiveTotal : 0
    if (pct >= SMALL_SLICE_THRESHOLD) {
      slices.push({
        label: item.measurement_point_water_name,
        value: item.consumption_litros,
        percentage: pct * 100,
        colorIndex: index,
      })
    } else {
      otherValue += item.consumption_litros
      otherCount += 1
    }
  })

  if (otherCount > 0) {
    slices.push({
      label: `Otros (${otherCount})`,
      value: otherValue,
      percentage: effectiveTotal > 0 ? (otherValue / effectiveTotal) * 100 : 0,
      colorIndex: slices.length,
    })
  }

  return slices
}

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  }
}

function describeArc(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const startOuter = polarToCartesian(cx, cy, outerRadius, endAngle)
  const endOuter = polarToCartesian(cx, cy, outerRadius, startAngle)
  const startInner = polarToCartesian(cx, cy, innerRadius, endAngle)
  const endInner = polarToCartesian(cx, cy, innerRadius, startAngle)
  const largeArc = endAngle - startAngle <= Math.PI ? 0 : 1

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ')
}

interface LabelInfo {
  index: number
  label: string
  percentage: number
  x: number
  y: number
  anchor: 'start' | 'end'
  lineStart: { x: number; y: number }
  lineEnd: { x: number; y: number }
  color: string
}

function avoidOverlap(labels: LabelInfo[], minY: number, maxY: number): LabelInfo[] {
  const sorted = [...labels].sort((a, b) => a.y - b.y)
  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i]
    if (curr.y < minY) curr.y = minY
    if (curr.y > maxY) curr.y = maxY
  }
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    const minSep = LABEL_BOX_HEIGHT + LABEL_GAP
    if (curr.y - prev.y < minSep) {
      curr.y = prev.y + minSep
    }
    if (curr.y > maxY) {
      curr.y = maxY
    }
  }
  return sorted
}

interface WaterConsumptionPieChartProps {
  results: WaterDistributionResult[]
  mainConsumptionLitros: number
}

export function WaterConsumptionPieChart({
  results,
  mainConsumptionLitros,
}: WaterConsumptionPieChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const slices = useMemo(
    () => groupSmallSlices(results, mainConsumptionLitros),
    [results, mainConsumptionLitros]
  )

  const { arcs, labels } = useMemo(() => {
    const total = slices.reduce((sum, s) => sum + s.value, 0)
    let cumulative = -Math.PI / 2
    const arcsData: {
      index: number
      path: string
      color: string
      label: string
      value: number
      percentage: number
    }[] = []
    const leftLabels: LabelInfo[] = []
    const rightLabels: LabelInfo[] = []

    slices.forEach((slice, index) => {
      const sliceAngle = total > 0 ? (slice.value / total) * 2 * Math.PI : 0
      const startAngle = cumulative
      const endAngle = cumulative + sliceAngle
      const midAngle = startAngle + sliceAngle / 2
      const color = getColor(index)

      let path: string
      if (sliceAngle >= 2 * Math.PI - 0.001) {
        path = describeArc(CENTER, CENTER, INNER_RADIUS, OUTER_RADIUS, 0, 2 * Math.PI - 0.001)
      } else {
        path = describeArc(CENTER, CENTER, INNER_RADIUS, OUTER_RADIUS, startAngle, endAngle)
      }

      arcsData.push({
        index,
        path,
        color,
        label: slice.label,
        value: slice.value,
        percentage: slice.percentage,
      })

      const labelPos = polarToCartesian(CENTER, CENTER, LABEL_RADIUS, midAngle)
      const lineStart = polarToCartesian(CENTER, CENTER, LABEL_LINE_START_RADIUS, midAngle)
      const isRight = labelPos.x >= CENTER
      const lineEnd = {
        x: isRight ? labelPos.x + 10 : labelPos.x - 10,
        y: Math.max(LABEL_MARGIN_Y, Math.min(VIEWBOX - LABEL_MARGIN_Y, labelPos.y)),
      }

      const info: LabelInfo = {
        index,
        label: truncateLabel(slice.label, LABEL_MAX_LENGTH),
        percentage: slice.percentage,
        x: isRight ? lineEnd.x + 6 : lineEnd.x - 6,
        y: lineEnd.y,
        anchor: isRight ? 'start' : 'end',
        lineStart,
        lineEnd,
        color,
      }

      if (isRight) {
        rightLabels.push(info)
      } else {
        leftLabels.push(info)
      }

      cumulative += sliceAngle
    })

    const adjustedLeft = avoidOverlap(leftLabels, LABEL_MARGIN_Y, VIEWBOX - LABEL_MARGIN_Y)
    const adjustedRight = avoidOverlap(rightLabels, LABEL_MARGIN_Y, VIEWBOX - LABEL_MARGIN_Y)

    const labelMap = new Map<number, LabelInfo>()
    ;[...adjustedLeft, ...adjustedRight].forEach((label) => {
      label.lineEnd.y = label.y
      labelMap.set(label.index, label)
    })

    return { arcs: arcsData, labels: Array.from(labelMap.values()).sort((a, b) => a.index - b.index) }
  }, [slices])

  const labelColor = '#00B7CA'

  if (slices.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-text-muted text-sm">
        No hay datos de consumo para graficar
      </div>
    )
  }

  return (
    <div className="h-[380px] w-full relative">
      <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} className="w-full h-full overflow-visible">
        <g>
          {arcs.map((arc) => (
            <path
              key={arc.index}
              d={arc.path}
              fill={arc.color}
              stroke="#ffffff"
              strokeWidth={2}
              className="transition-opacity duration-200"
              style={{
                opacity: hoveredIndex === null ? 1 : hoveredIndex === arc.index ? 1 : 0.45,
              }}
              onMouseEnter={() => setHoveredIndex(arc.index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <title>
                {`${arc.label}: ${arc.value.toLocaleString('es-PE', {
                  maximumFractionDigits: 2,
                })} L (${arc.percentage.toFixed(1)}%)`}
              </title>
            </path>
          ))}
        </g>

        <g>
          {labels.map((label) => (
            <line
              key={`line-${label.index}`}
              x1={label.lineStart.x}
              y1={label.lineStart.y}
              x2={label.lineEnd.x}
              y2={label.lineEnd.y}
              stroke={label.color}
              strokeWidth={1.5}
            />
          ))}
        </g>

        <g fontSize={11} fontFamily="Poppins, system-ui, sans-serif" fontWeight={700}>
          {labels.map((label) => (
            <text
              key={`text-${label.index}`}
              x={label.x}
              y={label.y}
              textAnchor={label.anchor}
              dominantBaseline="middle"
              fill={label.color}
              stroke="#ffffff"
              strokeWidth={3}
              paintOrder="stroke"
            >
              <tspan x={label.x} dy="-0.35em">
                {label.label}
              </tspan>
              <tspan x={label.x} dy="1.2em">
                {`${label.percentage.toFixed(1)}%`}
              </tspan>
            </text>
          ))}
        </g>

        <text
          x={CENTER}
          y={CENTER}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={labelColor}
          stroke="#ffffff"
          strokeWidth={3}
          paintOrder="stroke"
          fontSize={18}
          fontFamily="Poppins, system-ui, sans-serif"
          fontWeight={700}
        >
          {mainConsumptionLitros.toLocaleString('es-PE', { maximumFractionDigits: 2 })} L
        </text>
      </svg>
    </div>
  )
}
