import { createFileRoute } from '@tanstack/react-router'
import { WaterIndicatorAnalysisPage } from '@/features/water/pages/home'

export const Route = createFileRoute('/energia/water/dashboard/home')({
  component: WaterIndicatorAnalysisPage,
  validateSearch: (search) => {
    return {
      sede: typeof search.sede === 'string' ? search.sede : undefined,
      tuberia: typeof search.tuberia === 'string' ? search.tuberia : undefined,
      punto: typeof search.punto === 'string' ? search.punto : undefined,
      indicador: typeof search.indicador === 'string' ? search.indicador : undefined,
      agrupacion:
        typeof search.agrupacion === 'string' &&
        (search.agrupacion === 'day' || search.agrupacion === 'hour')
          ? search.agrupacion
          : undefined,
      desde: typeof search.desde === 'string' ? search.desde : undefined,
      hasta: typeof search.hasta === 'string' ? search.hasta : undefined,
      pagina: typeof search.pagina === 'string' ? search.pagina : undefined,
    }
  },
})
