/**
 * Geometría del diagrama unifilar del Mapa de Red.
 *
 * Columnas fijas (px): barra de la sede a la izquierda, tarjetas de tablero y
 * filas de puntos de medición a la derecha. Las alturas se calculan a partir de
 * la cantidad de filas de cada tablero, así los nodos HTML y los conductores SVG
 * comparten las mismas coordenadas sin medir el DOM.
 */
export interface NetworkLayoutConfig {
  sourceHeight: number
  busX: number
  panelX: number
  panelWidth: number
  panelHeight: number
  subBusOffset: number
  pointX: number
  pointMinWidth: number
  rowHeight: number
  rowGap: number
  firstBlockGap: number
  blockGap: number
  bottomPadding: number
}

export const NETWORK_LAYOUT: NetworkLayoutConfig = {
  sourceHeight: 84,
  // Centro del ícono de la tarjeta de sede: la barra "sale" de él.
  busX: 36,
  panelX: 68,
  panelWidth: 244,
  panelHeight: 108,
  subBusOffset: 28,
  pointX: 368,
  pointMinWidth: 264,
  rowHeight: 50,
  rowGap: 8,
  firstBlockGap: 36,
  blockGap: 28,
  bottomPadding: 8,
}

export interface NetworkRowLayout {
  top: number
  centerY: number
}

export interface NetworkPanelLayout {
  key: string
  blockTop: number
  blockHeight: number
  top: number
  centerY: number
  rows: NetworkRowLayout[]
}

export interface NetworkLayout {
  panels: NetworkPanelLayout[]
  height: number
  minWidth: number
  busTop: number
  busBottom: number
}

export function layoutNetworkMap(
  panels: Array<{ key: string; rowCount: number }>,
  L: NetworkLayoutConfig = NETWORK_LAYOUT
): NetworkLayout {
  let cursor = L.sourceHeight + L.firstBlockGap

  const out = panels.map(({ key, rowCount }) => {
    const rows = Math.max(1, rowCount)
    const rowsHeight = rows * L.rowHeight + (rows - 1) * L.rowGap
    const blockHeight = Math.max(L.panelHeight, rowsHeight)
    const blockTop = cursor
    // Tablero alineado arriba de su bloque; si tiene pocas filas, se centran junto a él.
    const rowsTop = rowsHeight < L.panelHeight ? blockTop + (L.panelHeight - rowsHeight) / 2 : blockTop
    const rowLayouts = Array.from({ length: rows }, (_, index) => {
      const top = rowsTop + index * (L.rowHeight + L.rowGap)
      return { top, centerY: top + L.rowHeight / 2 }
    })
    cursor = blockTop + blockHeight + L.blockGap
    return {
      key,
      blockTop,
      blockHeight,
      top: blockTop,
      centerY: blockTop + L.panelHeight / 2,
      rows: rowLayouts,
    }
  })

  const last = out[out.length - 1]
  return {
    panels: out,
    height: last ? last.blockTop + last.blockHeight + L.bottomPadding : L.sourceHeight + L.bottomPadding,
    minWidth: L.pointX + L.pointMinWidth,
    busTop: L.sourceHeight,
    busBottom: last ? last.centerY : L.sourceHeight,
  }
}

/** Derivación desde la barra de la sede hacia un tablero. */
export function feederPath(centerY: number, L: NetworkLayoutConfig = NETWORK_LAYOUT): string {
  return `M ${L.busX} ${centerY} H ${L.panelX}`
}

/** Circuito ortogonal tablero → punto, con esquinas redondeadas sobre la sub-barra. */
export function branchPath(fromY: number, toY: number, L: NetworkLayoutConfig = NETWORK_LAYOUT): string {
  const x0 = L.panelX + L.panelWidth
  const xs = x0 + L.subBusOffset
  const x1 = L.pointX
  const dy = toY - fromY
  if (Math.abs(dy) < 1) return `M ${x0} ${fromY} H ${x1}`
  const dir = dy > 0 ? 1 : -1
  const r = Math.min(10, Math.abs(dy) / 2)
  return [
    `M ${x0} ${fromY}`,
    `H ${xs - r}`,
    `Q ${xs} ${fromY} ${xs} ${fromY + dir * r}`,
    `V ${toY - dir * r}`,
    `Q ${xs} ${toY} ${xs + r} ${toY}`,
    `H ${x1}`,
  ].join(' ')
}

/** Grosor del conductor según la fracción de energía que transporta (escala raíz para que lo pequeño se vea). */
export function flowWidth(share: number, min: number, max: number): number {
  const s = Math.min(1, Math.max(0, Number.isFinite(share) ? share : 0))
  return min + (max - min) * Math.sqrt(s)
}

/** Más energía → el flujo animado avanza más rápido. */
export function flowDuration(share: number): string {
  const s = Math.min(1, Math.max(0, Number.isFinite(share) ? share : 0))
  return `${(2.6 - 1.4 * s).toFixed(2)}s`
}
