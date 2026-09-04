import { useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { fetchHeadquarters } from '../api/headquarters'
import { formatDateISO, parseDateSafe } from '@/lib/date-utils'

export function useDashboardFilters() {
  const navigate = useNavigate({ from: '/energia/dashboard/panel' })
  const search = useSearch({ from: '/energia/dashboard/panel' })

  // Read ALL state directly from URL — single source of truth
  const sedeId = typeof search.sede === 'string' ? Number(search.sede) : null
  const panelId = typeof search.panel === 'string' ? Number(search.panel) : null
  const dateAfter = parseDateSafe(typeof search.desde === 'string' ? search.desde : undefined)
  const dateBefore = parseDateSafe(typeof search.hasta === 'string' ? search.hasta : undefined)

  const today = useMemo(() => new Date(), [])

  // Fetch headquarters
  const { data: headquartersData, isLoading: isLoadingHeadquarters } = useQuery({
    queryKey: ['headquarters'],
    queryFn: fetchHeadquarters,
  })

  const headquarters = useMemo(() => headquartersData?.results ?? [], [headquartersData])

  // Derived: current headquarter and panels
  const currentHeadquarter = useMemo(() => {
    return headquarters.find((h) => h.id === sedeId) ?? null
  }, [headquarters, sedeId])

  const panels = useMemo(() => {
    return currentHeadquarter?.electrical_panels.filter((p) => p.is_active) ?? []
  }, [currentHeadquarter])

  // Auto-select: if URL is missing values, navigate to defaults
  const hasAutoSelected = useRef(false)
  // Firma de las sedes cargadas: si cambia (ej. otro usuario/sesión),
  // los filtros de la URL deben revalidarse en vez de respetarse a ciegas.
  const lastHeadquartersKey = useRef<string | null>(null)

  useEffect(() => {
    if (headquarters.length === 0) return

    const headquartersKey = headquarters.map((h) => h.id).join(',')
    if (lastHeadquartersKey.current !== headquartersKey) {
      lastHeadquartersKey.current = headquartersKey
      hasAutoSelected.current = false
    }
    if (hasAutoSelected.current) return

    const firstActiveSede = headquarters.find((h) => h.is_active) ?? headquarters[0]
    // Ignora la sede de la URL si no pertenece al usuario actual (sesión anterior).
    const targetSedeId =
      sedeId != null && headquarters.some((h) => h.id === sedeId)
        ? sedeId
        : (firstActiveSede?.id ?? null)

    if (!targetSedeId) return

    const targetHeadquarter = headquarters.find((h) => h.id === targetSedeId)
    const availablePanels = targetHeadquarter?.electrical_panels.filter((p) => p.is_active) ?? []
    // Ignora el panel de la URL si no pertenece a la sede actual.
    const targetPanelId =
      panelId != null && availablePanels.some((p) => p.id === panelId)
        ? panelId
        : (availablePanels[0]?.id ?? null)

    const targetDateAfter = dateAfter ?? today
    const targetDateBefore = dateBefore ?? today

    const needsNavigation =
      sedeId !== targetSedeId ||
      panelId !== targetPanelId ||
      dateAfter?.getTime() !== targetDateAfter.getTime() ||
      dateBefore?.getTime() !== targetDateBefore.getTime()

    if (needsNavigation) {
      hasAutoSelected.current = true
      navigate({
        search: {
          sede: String(targetSedeId),
          panel: targetPanelId ? String(targetPanelId) : undefined,
          desde: formatDateISO(targetDateAfter),
          hasta: formatDateISO(targetDateBefore),
          mp_sede: search.mp_sede,
          mp_panel: search.mp_panel,
          mp_punto: search.mp_punto,
          mp_indicador: search.mp_indicador,
          mp_weekday: search.mp_weekday,
          mp_anio: search.mp_anio,
          mp_mes: search.mp_mes,
        },
        resetScroll: false,
        hashScrollIntoView: false,
      })
    }
  }, [
    headquarters,
    sedeId,
    panelId,
    dateAfter,
    dateBefore,
    today,
    navigate,
    search.mp_sede,
    search.mp_panel,
    search.mp_punto,
    search.mp_indicador,
    search.mp_weekday,
    search.mp_anio,
    search.mp_mes,
  ])

  // Handlers — just navigate, no local state
  const setSedeId = useCallback(
    (id: number) => {
      navigate({
        search: {
          sede: String(id),
          panel: undefined, // Reset panel when sede changes
          desde: formatDateISO(dateAfter ?? today),
          hasta: formatDateISO(dateBefore ?? today),
          mp_sede: search.mp_sede,
          mp_panel: search.mp_panel,
          mp_punto: search.mp_punto,
          mp_indicador: search.mp_indicador,
          mp_weekday: search.mp_weekday,
          mp_anio: search.mp_anio,
          mp_mes: search.mp_mes,
        },
        resetScroll: false,
        hashScrollIntoView: false,
      })
    },
    [navigate, dateAfter, dateBefore, today, search.mp_sede, search.mp_panel, search.mp_punto, search.mp_indicador, search.mp_weekday, search.mp_anio, search.mp_mes]
  )

  const setPanelId = useCallback(
    (id: number) => {
      navigate({
        search: {
          sede: String(sedeId),
          panel: String(id),
          desde: formatDateISO(dateAfter ?? today),
          hasta: formatDateISO(dateBefore ?? today),
          mp_sede: search.mp_sede,
          mp_panel: search.mp_panel,
          mp_punto: search.mp_punto,
          mp_indicador: search.mp_indicador,
          mp_weekday: search.mp_weekday,
          mp_anio: search.mp_anio,
          mp_mes: search.mp_mes,
        },
        resetScroll: false,
        hashScrollIntoView: false,
      })
    },
    [navigate, sedeId, dateAfter, dateBefore, today, search.mp_sede, search.mp_panel, search.mp_punto, search.mp_indicador, search.mp_weekday, search.mp_anio, search.mp_mes]
  )

  const setDateRange = useCallback(
    (range: { startDate: Date | null; endDate: Date | null }) => {
      navigate({
        search: {
          sede: String(sedeId),
          panel: panelId ? String(panelId) : undefined,
          desde: formatDateISO(range.startDate),
          hasta: formatDateISO(range.endDate),
          mp_sede: search.mp_sede,
          mp_panel: search.mp_panel,
          mp_punto: search.mp_punto,
          mp_indicador: search.mp_indicador,
          mp_weekday: search.mp_weekday,
          mp_anio: search.mp_anio,
          mp_mes: search.mp_mes,
        },
        resetScroll: false,
        hashScrollIntoView: false,
      })
    },
    [navigate, sedeId, panelId, search.mp_sede, search.mp_panel, search.mp_punto, search.mp_indicador, search.mp_weekday, search.mp_anio, search.mp_mes]
  )

  const currentPanel = useMemo(() => {
    return panels.find((p) => p.id === panelId) ?? null
  }, [panels, panelId])

  const isReady = !!sedeId && !!panelId && !!dateAfter && !!dateBefore

  return {
    // Data
    headquarters,
    panels,
    currentHeadquarter,
    currentPanel,

    // State (from URL)
    sedeId,
    panelId,
    dateAfter,
    dateBefore,

    // Handlers
    setSedeId,
    setPanelId,
    setDateRange,

    // Status
    isLoadingHeadquarters,
    isReady,
  }
}
