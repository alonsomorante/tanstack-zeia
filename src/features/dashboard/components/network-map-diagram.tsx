import { useMemo, useState, type CSSProperties } from 'react'
import { Building2, Check, ChevronDown, ChevronUp, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  MAX_COMPARE_POINTS,
  formatKwh,
  type NetworkMapModel,
  type NetworkPanelNode,
  type NetworkPointNode,
  type NetworkSelection,
} from '../lib/network-map'
import { TONE_COLORS, type NetworkLayerView, type NodeView } from '../lib/network-layers'
import {
  NETWORK_LAYOUT as L,
  branchPath,
  feederPath,
  flowDuration,
  flowWidth,
  layoutNetworkMap,
} from '../lib/network-map-layout'

const FLOW_STRONG = '#008C9B'

/** Puntos visibles por tablero antes de agrupar el resto en "+N puntos más". */
const MAX_VISIBLE_POINTS = 5

const EMPTY_VIEW: NodeView = {
  value: null,
  unit: '',
  secondary: null,
  secondaryTone: 'muted',
  share: 0,
  tone: 'idle',
  dashed: true,
  badge: null,
  aria: 'sin datos',
}

/** En modo comparar no se enfoca nada: se eligen puntos de varios tableros a la vez. */
const NO_FOCUS: NetworkSelection = { kind: 'sede' }

type RowItem =
  | { kind: 'point'; key: string; point: NetworkPointNode }
  | { kind: 'more'; key: string; hiddenCount: number; hiddenKwh: number; expanded: boolean }
  | { kind: 'skeleton'; key: string }
  | { kind: 'message'; key: string; text: string; tone: 'muted' | 'warning' }

function buildRows(panel: NetworkPanelNode, expanded: boolean): RowItem[] {
  if (panel.status === 'loading') {
    return [0, 1, 2].map((i): RowItem => ({ kind: 'skeleton', key: `${panel.key}-skeleton-${i}` }))
  }
  if (panel.status === 'error') {
    return [{ kind: 'message', key: `${panel.key}-error`, text: 'No se pudo cargar este tablero', tone: 'warning' }]
  }
  if (panel.points.length === 0) {
    return [
      {
        kind: 'message',
        key: `${panel.key}-empty`,
        text: panel.mainMeterName ? 'Solo tiene medidor general' : 'Sin puntos de medición',
        tone: 'muted',
      },
    ]
  }

  // Solo se agrupa si oculta 2 o más puntos (no tiene sentido "+1 punto más").
  const collapsible = panel.points.length > MAX_VISIBLE_POINTS + 1
  const visible = collapsible && !expanded ? panel.points.slice(0, MAX_VISIBLE_POINTS) : panel.points
  const rows = visible.map((point): RowItem => ({ kind: 'point', key: point.key, point }))
  if (collapsible) {
    const hidden = panel.points.slice(MAX_VISIBLE_POINTS)
    rows.push({
      kind: 'more',
      key: `${panel.key}-more`,
      hiddenCount: hidden.length,
      hiddenKwh: hidden.reduce((sum, p) => sum + p.kwh, 0),
      expanded,
    })
  }
  return rows
}

function strokeOf(view: NodeView): { color: string; dashed: boolean } {
  return { color: TONE_COLORS[view.tone], dashed: view.dashed }
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0))
}

function delay(ms: number): CSSProperties {
  return { animationDelay: `${Math.min(ms, 1000)}ms` }
}

function fillTint(view: NodeView): string {
  if (view.tone === 'peak') return 'rgba(231,29,54,0.07)'
  if (view.tone === 'warning') return 'rgba(255,107,53,0.09)'
  return 'rgba(0,183,202,0.08)'
}

interface NetworkMapDiagramProps {
  sedeName: string
  periodShortLabel: string
  model: NetworkMapModel
  view: NetworkLayerView
  selection: NetworkSelection
  /** Modo comparar: un clic en un punto lo agrega o lo quita de la comparación (no lo selecciona). */
  compareMode: boolean
  /** Color de cada punto en comparación (id → color), el mismo de la bandeja y la gráfica. */
  compareColors: ReadonlyMap<number, string>
  canAddCompare: boolean
  onSelect: (selection: NetworkSelection) => void
  onToggleCompare: (pointId: number) => void
}

export function NetworkMapDiagram({
  sedeName,
  periodShortLabel,
  model,
  view,
  selection,
  compareMode,
  compareColors,
  canAddCompare,
  onSelect,
  onToggleCompare,
}: NetworkMapDiagramProps) {
  const [hovered, setHovered] = useState<NetworkSelection | null>(null)
  // Solo guarda lo que el usuario abrió o cerró a mano; si no, se decide solo.
  const [expandedOverrides, setExpandedOverrides] = useState<ReadonlyMap<number, boolean>>(() => new Map())

  const pointView = (point: NetworkPointNode) => view.points.get(point.key) ?? EMPTY_VIEW
  const panelView = (panel: NetworkPanelNode) => view.panels.get(panel.id) ?? EMPTY_VIEW

  const blocks = useMemo(
    () =>
      model.panels.map((panel) => {
        const hidden = panel.points.slice(MAX_VISIBLE_POINTS)
        // Se despliega solo si un punto agrupado está seleccionado, en comparación o destacado en la capa.
        const autoExpand = hidden.some((p) => {
          const tone = (view.points.get(p.key) ?? EMPTY_VIEW).tone
          return (
            (selection.kind === 'point' && selection.pointKey === p.key) ||
            (p.id != null && compareColors.has(p.id)) ||
            tone === 'peak' ||
            tone === 'warning'
          )
        })
        const expanded = expandedOverrides.get(panel.id) ?? autoExpand
        return { panel, rows: buildRows(panel, expanded) }
      }),
    [model.panels, expandedOverrides, selection, view.points, compareColors]
  )

  const layout = useMemo(
    () => layoutNetworkMap(blocks.map((b) => ({ key: b.panel.key, rowCount: b.rows.length }))),
    [blocks]
  )

  const setExpanded = (panelId: number, expanded: boolean) => {
    setExpandedOverrides((prev) => new Map(prev).set(panelId, expanded))
  }

  // Lo que se resalta: lo que está bajo el cursor o, si no, lo seleccionado.
  const active = compareMode ? NO_FOCUS : (hovered ?? selection)
  const focusPanelId = active.kind === 'sede' ? null : active.panelId
  const focusPointKey = active.kind === 'point' ? active.pointKey : null
  const isFocused = focusPanelId != null
  const focusIndex = isFocused ? blocks.findIndex((b) => b.panel.id === focusPanelId) : -1
  const focusBlock = focusIndex >= 0 ? blocks[focusIndex] : null
  const focusLayout = focusIndex >= 0 ? layout.panels[focusIndex] : null
  const focusStroke = focusBlock ? strokeOf(panelView(focusBlock.panel)) : null

  const isPanelLit = (panelId: number) => !isFocused || panelId === focusPanelId
  // Dentro del tablero enfocado, si hay un punto enfocado se atenúan sus hermanos.
  const isRowLit = (panelId: number, rowKey: string) =>
    !isFocused || panelId !== focusPanelId || focusPointKey == null || rowKey === focusPointKey

  const sedeHasFlow = view.layer === 'consumo' ? model.totalKwh > 0 : view.sede.value != null

  return (
    <div
      className="overflow-x-auto rounded-xl border border-border/70 p-4"
      style={{
        backgroundColor: '#FBFCFC',
        backgroundImage: 'radial-gradient(circle, rgba(136,147,155,0.22) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
      }}
    >
      <div
        className="relative"
        style={{ height: layout.height, minWidth: layout.minWidth }}
        role="group"
        aria-label={`Red eléctrica de la sede ${sedeName}`}
        onMouseLeave={() => setHovered(null)}
      >
        {/* ── Conductores ─────────────────────────────────────────────── */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <g className="transition-opacity duration-300" style={{ opacity: isFocused ? 0.3 : 1 }}>
            <line x1={L.busX} y1={layout.busTop} x2={L.busX} y2={layout.busBottom} stroke={TONE_COLORS.flow} strokeOpacity={0.16} strokeWidth={18} strokeLinecap="round" />
            <line x1={L.busX} y1={layout.busTop} x2={L.busX} y2={layout.busBottom} stroke={TONE_COLORS.flow} strokeWidth={8} strokeLinecap="round" />
            {sedeHasFlow && (
              <line
                x1={L.busX}
                y1={layout.busTop}
                x2={L.busX}
                y2={layout.busBottom}
                className="network-flow"
                stroke="#FFFFFF"
                strokeOpacity={0.85}
                strokeWidth={2.5}
                strokeLinecap="round"
                style={{ animationDuration: '1.3s' }}
              />
            )}
          </g>

          {/* Tramo de barra que alimenta al tablero enfocado */}
          {focusLayout && focusStroke && (
            <g>
              <line
                x1={L.busX}
                y1={layout.busTop}
                x2={L.busX}
                y2={focusLayout.centerY}
                stroke={focusStroke.dashed ? TONE_COLORS.idle : focusStroke.color === TONE_COLORS.flow ? FLOW_STRONG : focusStroke.color}
                strokeWidth={8}
                strokeLinecap="round"
              />
              {!focusStroke.dashed && (
                <line
                  x1={L.busX}
                  y1={layout.busTop}
                  x2={L.busX}
                  y2={focusLayout.centerY}
                  className="network-flow"
                  stroke="#FFFFFF"
                  strokeOpacity={0.9}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  style={{ animationDuration: '1.1s' }}
                />
              )}
            </g>
          )}

          {blocks.map(({ panel, rows }, i) => {
            const pl = layout.panels[i]
            const pv = panelView(panel)
            const stroke = strokeOf(pv)
            const width = stroke.dashed ? 2 : flowWidth(pv.share, 2.5, 12)
            const lit = isPanelLit(panel.id)
            const feeder = feederPath(pl.centerY)

            return (
              <g key={panel.key} className="transition-opacity duration-300" style={{ opacity: lit ? 1 : 0.2 }}>
                <path d={feeder} fill="none" stroke={stroke.color} strokeWidth={width} strokeDasharray={stroke.dashed ? '4 5' : undefined} />
                {!stroke.dashed && lit && (
                  <path
                    d={feeder}
                    fill="none"
                    className="network-flow"
                    stroke="#FFFFFF"
                    strokeOpacity={0.85}
                    strokeWidth={Math.max(1.5, width * 0.32)}
                    strokeLinecap="round"
                    style={{ animationDuration: flowDuration(pv.share) }}
                  />
                )}

                {rows.map((row, j) => {
                  const rl = pl.rows[j]
                  const rv = row.kind === 'point' ? pointView(row.point) : EMPTY_VIEW
                  const rs = row.kind === 'more' ? { color: TONE_COLORS.flow, dashed: true } : strokeOf(rv)
                  const rowWidth = rs.dashed ? 1.5 : flowWidth(rv.share, 1.5, 7)
                  const rowLit = isRowLit(panel.id, row.key)
                  const d = branchPath(pl.centerY, rl.centerY)
                  return (
                    <g key={row.key} className="transition-opacity duration-300" style={{ opacity: rowLit ? 1 : 0.22 }}>
                      <path
                        d={d}
                        fill="none"
                        stroke={rs.color}
                        strokeWidth={rowWidth}
                        strokeDasharray={rs.dashed ? '3 4' : undefined}
                        strokeLinejoin="round"
                      />
                      {!rs.dashed && lit && rowLit && (
                        <path
                          d={d}
                          fill="none"
                          className="network-flow"
                          stroke="#FFFFFF"
                          strokeOpacity={0.85}
                          strokeWidth={Math.max(1, rowWidth * 0.35)}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ animationDuration: flowDuration(rv.share) }}
                        />
                      )}
                    </g>
                  )
                })}

                {/* Bornes: derivación en la barra y salida del tablero */}
                <circle cx={L.busX} cy={pl.centerY} r={5} fill="#FFFFFF" stroke={stroke.color} strokeWidth={2.5} />
                <circle cx={L.panelX + L.panelWidth} cy={pl.centerY} r={4} fill="#FFFFFF" stroke={stroke.color} strokeWidth={2} />
              </g>
            )
          })}

          <circle cx={L.busX} cy={layout.busTop} r={6} fill="#FFFFFF" stroke={TONE_COLORS.flow} strokeWidth={3} />
        </svg>

        {/* ── Sede (acometida) ────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => onSelect({ kind: 'sede' })}
          onMouseEnter={() => setHovered(null)}
          aria-pressed={selection.kind === 'sede'}
          aria-label={`Sede ${sedeName}: ${view.sede.value ? `${view.sede.value} ${view.sede.unit}` : 'cargando'}${view.sede.caption ? `, ${view.sede.caption}` : ''}`}
          className={cn(
            'network-node-in absolute flex items-center gap-3 rounded-xl bg-primary px-4 text-left text-white shadow-medium transition-shadow duration-300',
            'hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            selection.kind === 'sede' && 'ring-2 ring-primary/40 ring-offset-2'
          )}
          style={{ left: 0, top: 0, width: L.panelX + L.panelWidth, height: L.sourceHeight }}
        >
          {view.sede.badge && (
            <span className="absolute -top-2.5 right-3 rounded-full bg-danger px-2 py-0.5 text-[10px] font-semibold text-white shadow-soft">
              {view.sede.badge}
            </span>
          )}
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20">
            <Building2 className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">
              Sede · {periodShortLabel}
            </span>
            <span className="block truncate text-base font-semibold leading-tight" title={sedeName}>
              {sedeName}
            </span>
            {view.sede.caption && (
              <span className="block truncate text-[11px] font-medium text-white/85">{view.sede.caption}</span>
            )}
          </span>
          <span className="shrink-0 text-right">
            {view.sede.value != null ? (
              <span className="block font-mono text-xl font-bold leading-tight tabular-nums">{view.sede.value}</span>
            ) : view.isLoading ? (
              <span className="block h-6 w-20 animate-pulse rounded bg-white/25" />
            ) : (
              <span className="block font-mono text-xl font-bold leading-tight text-white/70">—</span>
            )}
            <span className="block text-[10px] font-semibold tracking-wider text-white/75">{view.sede.unit}</span>
          </span>
        </button>

        {/* ── Tableros y puntos ───────────────────────────────────────── */}
        {blocks.map(({ panel, rows }, i) => {
          const pl = layout.panels[i]
          const pv = panelView(panel)
          const lit = isPanelLit(panel.id)
          const stroke = strokeOf(pv)
          const isPanelSelected = selection.kind === 'panel' && selection.panelId === panel.id
          const panelDelay = i * 60
          const isDanger = pv.tone === 'peak'

          return (
            <div key={panel.key}>
              <button
                type="button"
                onClick={() => onSelect({ kind: 'panel', panelId: panel.id })}
                onMouseEnter={() => setHovered({ kind: 'panel', panelId: panel.id })}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered({ kind: 'panel', panelId: panel.id })}
                onBlur={() => setHovered(null)}
                aria-pressed={isPanelSelected}
                aria-label={`Tablero ${panel.name}: ${pv.aria}`}
                className={cn(
                  'network-node-in absolute flex flex-col rounded-xl border bg-card px-4 py-3 text-left shadow-soft',
                  'transition-[box-shadow,border-color,opacity] duration-300',
                  'hover:shadow-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isPanelSelected
                    ? 'border-primary shadow-glow ring-2 ring-primary/30'
                    : isDanger
                      ? 'border-danger/40 hover:border-danger/60'
                      : pv.tone === 'warning'
                        ? 'border-warning/40 hover:border-warning/60'
                        : 'border-border hover:border-primary/40'
                )}
                style={{ left: L.panelX, top: pl.top, width: L.panelWidth, height: L.panelHeight, opacity: lit ? 1 : 0.45, ...delay(panelDelay) }}
              >
                <span aria-hidden className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full" style={{ backgroundColor: stroke.color }} />
                {/* Etiqueta sobre el borde: así no le quita espacio al tipo de tablero */}
                {pv.badge && (
                  <span
                    className={cn(
                      'absolute -top-2.5 right-3 max-w-[85%] truncate rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow-soft',
                      isDanger ? 'bg-danger' : 'bg-warning'
                    )}
                  >
                    {pv.badge}
                  </span>
                )}
                <span className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                  Tablero{panel.typeLabel ? ` · ${panel.typeLabel}` : ''}
                </span>
                <span className="mt-1 truncate text-sm font-semibold text-foreground" title={panel.name}>
                  {panel.name}
                </span>

                {panel.status === 'loading' || (pv.value == null && view.isLoading) ? (
                  <span className="mt-auto block space-y-1.5">
                    <span className="block h-5 w-24 animate-pulse rounded bg-muted" />
                    <span className="block h-1 w-full animate-pulse rounded bg-muted" />
                  </span>
                ) : pv.value == null ? (
                  <span
                    className={cn(
                      'mt-auto inline-flex items-center gap-1.5 text-xs font-medium',
                      pv.secondaryTone === 'warning' ? 'text-warning' : 'text-text-muted'
                    )}
                  >
                    {pv.secondaryTone === 'warning' && <TriangleAlert className="h-3.5 w-3.5" />}
                    {pv.secondary ?? 'Sin datos'}
                  </span>
                ) : (
                  <>
                    <span className="mt-auto flex items-baseline justify-between gap-2">
                      <span className="shrink-0 font-mono text-lg font-bold tabular-nums text-text-primary">
                        {pv.value} <span className="text-xs font-semibold">{pv.unit}</span>
                      </span>
                      {pv.secondary && (
                        <span
                          className={cn(
                            'truncate font-mono text-[11px] font-semibold tabular-nums',
                            pv.secondaryTone === 'warning' ? 'text-warning' : 'text-text-muted'
                          )}
                        >
                          {pv.secondary}
                        </span>
                      )}
                    </span>
                    <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full transition-[width] duration-500"
                        style={{ width: `${clampPercent(pv.share * 100)}%`, backgroundColor: stroke.color }}
                      />
                    </span>
                  </>
                )}
              </button>

              {rows.map((row, j) => {
                const rl = pl.rows[j]
                const rowStyle: CSSProperties = {
                  left: L.pointX,
                  right: 0,
                  top: rl.top,
                  height: L.rowHeight,
                  ...delay(panelDelay + (j + 1) * 40),
                }

                if (row.kind === 'skeleton') {
                  return (
                    <div
                      key={row.key}
                      className="network-node-in absolute flex flex-col justify-center gap-1.5 rounded-lg border border-border bg-card px-3"
                      style={rowStyle}
                    >
                      <span className="block h-3 w-1/2 animate-pulse rounded bg-muted" />
                      <span className="block h-2.5 w-1/4 animate-pulse rounded bg-muted" />
                    </div>
                  )
                }

                if (row.kind === 'message') {
                  return (
                    <div
                      key={row.key}
                      className={cn(
                        'network-node-in absolute flex items-center gap-2 rounded-lg border border-dashed bg-card/80 px-3 text-xs',
                        row.tone === 'warning' ? 'border-warning/50 text-warning' : 'border-border text-text-muted'
                      )}
                      style={{ ...rowStyle, opacity: lit ? 1 : 0.45 }}
                    >
                      {row.tone === 'warning' && <TriangleAlert className="h-3.5 w-3.5 shrink-0" />}
                      {row.text}
                    </div>
                  )
                }

                if (row.kind === 'more') {
                  return (
                    <button
                      key={row.key}
                      type="button"
                      onClick={() => setExpanded(panel.id, !row.expanded)}
                      aria-expanded={row.expanded}
                      className={cn(
                        'network-node-in absolute flex items-center gap-3 rounded-lg border border-dashed border-border bg-card/80 px-3 text-left text-xs font-medium text-text-secondary',
                        'transition-[border-color,color,opacity] duration-300 hover:border-primary/50 hover:text-primary',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
                      )}
                      style={{ ...rowStyle, opacity: lit ? 1 : 0.45 }}
                    >
                      {row.expanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                      <span className="flex-1">{row.expanded ? 'Mostrar menos' : `+${row.hiddenCount} puntos más`}</span>
                      {!row.expanded && view.showHiddenTotals && (
                        <span className="font-mono tabular-nums text-text-muted">{formatKwh(row.hiddenKwh)} kWh</span>
                      )}
                    </button>
                  )
                }

                const { point } = row
                const rv = pointView(point)
                const rs = strokeOf(rv)
                const isSelected = !compareMode && selection.kind === 'point' && selection.pointKey === point.key
                const rowLit = lit && isRowLit(panel.id, point.key)
                const pointSelection: NetworkSelection = { kind: 'point', panelId: panel.id, pointKey: point.key }
                const canCompare = point.id != null && !point.isOtherLoads
                const compareColor = point.id != null ? compareColors.get(point.id) : undefined
                const isCompared = compareColor != null
                const compareBlocked = compareMode && (!canCompare || (!isCompared && !canAddCompare))

                const handleClick = () => {
                  if (!compareMode) onSelect(pointSelection)
                  else if (canCompare && point.id != null) onToggleCompare(point.id)
                }

                const ariaLabel = !compareMode
                  ? `Punto ${point.name}: ${rv.aria}`
                  : !canCompare
                    ? `${point.name}: sin medición directa, no se puede comparar`
                    : isCompared
                      ? `Quitar ${point.name} de la comparación`
                      : `Agregar ${point.name} a la comparación`

                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={handleClick}
                    onMouseEnter={() => setHovered(pointSelection)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(pointSelection)}
                    onBlur={() => setHovered(null)}
                    disabled={compareBlocked}
                    aria-pressed={compareMode ? isCompared : isSelected}
                    aria-label={ariaLabel}
                    title={
                      compareBlocked
                        ? canCompare
                          ? `Máximo ${MAX_COMPARE_POINTS} puntos en la comparación`
                          : 'Sin medición directa: no se puede comparar'
                        : undefined
                    }
                    className={cn(
                      'network-node-in absolute flex items-center gap-3 overflow-hidden rounded-lg border bg-card pr-3 text-left',
                      compareMode && canCompare ? 'pl-10' : 'pl-3',
                      'transition-[box-shadow,border-color,opacity] duration-300 disabled:cursor-not-allowed',
                      'hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      isSelected ? 'border-primary shadow-glow ring-2 ring-primary/30' : !isCompared && 'border-border hover:border-primary/40',
                      point.isOtherLoads && !isSelected && 'border-dashed'
                    )}
                    style={{
                      ...rowStyle,
                      opacity: compareBlocked ? 0.45 : rowLit ? 1 : 0.4,
                      // El color del punto en la bandeja y la gráfica.
                      ...(compareColor ? { borderColor: compareColor, boxShadow: `0 0 0 1px ${compareColor}` } : null),
                    }}
                  >
                    {/* Relleno proporcional a la cifra de la capa */}
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 transition-[width] duration-500"
                      style={{ width: `${clampPercent(rv.share * 100)}%`, backgroundColor: fillTint(rv) }}
                    />
                    {/* Casilla de comparación (solo en modo comparar; toda la fila es el botón) */}
                    {compareMode && canCompare && (
                      <span
                        aria-hidden
                        className={cn(
                          'absolute left-3 top-1/2 flex h-[18px] w-[18px] -translate-y-1/2 items-center justify-center rounded-[5px] border-2 transition-colors',
                          isCompared ? 'text-white' : 'border-[#9AA4AA] bg-white'
                        )}
                        style={compareColor ? { borderColor: compareColor, backgroundColor: compareColor } : undefined}
                      >
                        {isCompared && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                    )}
                    <span
                      aria-hidden
                      className="relative h-2.5 w-2.5 shrink-0 rounded-full"
                      style={
                        rs.dashed
                          ? { border: `2px solid ${rs.color}`, backgroundColor: '#FFFFFF' }
                          : { backgroundColor: rs.color, boxShadow: `0 0 0 3px ${rs.color}26` }
                      }
                    />
                    <span className="relative min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium leading-tight text-foreground" title={point.name}>
                        {point.name}
                      </span>
                      <span className="block truncate text-[11px] leading-tight text-text-muted">
                        {point.isOtherLoads ? 'Sin medición directa' : !point.isActive ? 'Inactivo' : (point.deviceName ?? '—')}
                      </span>
                    </span>
                    <span className="relative max-w-[55%] shrink-0 text-right">
                      {view.isLoading && rv.value == null ? (
                        <span className="ml-auto block h-3.5 w-16 animate-pulse rounded bg-muted" />
                      ) : rv.value == null ? (
                        // Sin cifra en esta capa: solo el motivo, sin un "—" suelto.
                        <span
                          className={cn(
                            'block truncate text-[11px] leading-tight',
                            rv.secondaryTone === 'warning' ? 'font-semibold text-warning' : 'text-text-muted'
                          )}
                        >
                          {rv.secondary ?? 'Sin datos'}
                        </span>
                      ) : (
                        <>
                          <span className="block font-mono text-[13px] font-semibold leading-tight tabular-nums text-text-primary">
                            {rv.value} <span className="text-[10px]">{rv.unit}</span>
                          </span>
                          {rv.secondary && (
                            <span
                              className={cn(
                                'block truncate font-mono text-[11px] leading-tight tabular-nums',
                                rv.secondaryTone === 'warning' ? 'font-semibold text-warning' : 'text-text-muted'
                              )}
                            >
                              {rv.secondary}
                            </span>
                          )}
                        </>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
