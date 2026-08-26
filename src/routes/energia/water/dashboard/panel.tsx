import { createFileRoute } from '@tanstack/react-router'
import { WaterPanelPage } from '@/features/water/pages/panel'

export const Route = createFileRoute('/energia/water/dashboard/panel')({
  component: WaterPanelPage,
  validateSearch: (search) => {
    return {
      sede: typeof search.sede === 'string' ? search.sede : undefined,
      tuberia: typeof search.tuberia === 'string' ? search.tuberia : undefined,
      desde: typeof search.desde === 'string' ? search.desde : undefined,
      hasta: typeof search.hasta === 'string' ? search.hasta : undefined,
      wmp_sede: typeof search.wmp_sede === 'string' ? search.wmp_sede : undefined,
      wmp_tuberia: typeof search.wmp_tuberia === 'string' ? search.wmp_tuberia : undefined,
      wmp_punto: typeof search.wmp_punto === 'string' ? search.wmp_punto : undefined,
      wmp_indicador:
        typeof search.wmp_indicador === 'string' ? search.wmp_indicador : undefined,
      wmp_weekday:
        typeof search.wmp_weekday === 'string' &&
        (search.wmp_weekday === 'weekdays' ||
          search.wmp_weekday === 'saturday' ||
          search.wmp_weekday === 'sunday')
          ? search.wmp_weekday
          : undefined,
      wmp_anio: typeof search.wmp_anio === 'string' ? search.wmp_anio : undefined,
      wmp_mes: typeof search.wmp_mes === 'string' ? search.wmp_mes : undefined,
    }
  },
})
