import { createFileRoute } from '@tanstack/react-router'
import { MapaPage } from '@/features/dashboard/pages/mapa'
import { isNetworkPeriod } from '@/features/dashboard/lib/network-map'
import { isNetworkLayer } from '@/features/dashboard/lib/network-layers'

// Acepta también números: el parser de búsqueda convierte "?tablero=39" escrito a mano en 39.
function asParam(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return undefined
}

export const Route = createFileRoute('/energia/dashboard/mapa')({
  component: MapaPage,
  validateSearch: (search) => ({
    sede: asParam(search.sede),
    periodo: isNetworkPeriod(search.periodo) ? search.periodo : undefined,
    desde: typeof search.desde === 'string' ? search.desde : undefined,
    hasta: typeof search.hasta === 'string' ? search.hasta : undefined,
    capa: isNetworkLayer(search.capa) ? search.capa : undefined,
    tablero: asParam(search.tablero),
    punto: asParam(search.punto),
    comparar: asParam(search.comparar),
  }),
})
