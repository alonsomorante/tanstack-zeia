import { createFileRoute } from '@tanstack/react-router'
import { WaterDayComparisonPage } from '@/features/water/pages/comparador'

export const Route = createFileRoute('/energia/water/dashboard/comparador')({
  component: WaterDayComparisonPage,
  validateSearch: (search) => {
    return {
      sede: typeof search.sede === 'string' ? search.sede : undefined,
      tuberia: typeof search.tuberia === 'string' ? search.tuberia : undefined,
      punto: typeof search.punto === 'string' ? search.punto : undefined,
      agrupacion:
        typeof search.agrupacion === 'string' &&
        (search.agrupacion === 'day' || search.agrupacion === 'hour')
          ? search.agrupacion
          : undefined,
      desde: typeof search.desde === 'string' ? search.desde : undefined,
      hasta: typeof search.hasta === 'string' ? search.hasta : undefined,
    }
  },
})
