import { createFileRoute } from '@tanstack/react-router'
import { PanelPage } from '@/features/dashboard/pages/panel'

export const Route = createFileRoute('/energia/dashboard/panel')({
  component: PanelPage,
  validateSearch: (search) => {
    return {
      sede: typeof search.sede === 'string' ? search.sede : undefined,
      panel: typeof search.panel === 'string' ? search.panel : undefined,
      vista: search.vista === 'todos' || search.vista === 'tablero' ? search.vista : undefined,
      desde: typeof search.desde === 'string' ? search.desde : undefined,
      hasta: typeof search.hasta === 'string' ? search.hasta : undefined,
      mp_sede: typeof search.mp_sede === 'string' ? search.mp_sede : undefined,
      mp_panel: typeof search.mp_panel === 'string' ? search.mp_panel : undefined,
      mp_punto: typeof search.mp_punto === 'string' ? search.mp_punto : undefined,
      mp_indicador: typeof search.mp_indicador === 'string' ? search.mp_indicador : undefined,
      mp_weekday:
        typeof search.mp_weekday === 'string' &&
        (search.mp_weekday === 'weekdays' ||
          search.mp_weekday === 'saturday' ||
          search.mp_weekday === 'sunday')
          ? search.mp_weekday
          : undefined,
      mp_anio: typeof search.mp_anio === 'string' ? search.mp_anio : undefined,
      mp_mes: typeof search.mp_mes === 'string' ? search.mp_mes : undefined,
    }
  },
})
