import { useEffect, useCallback, useMemo, useRef, useState } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { fetchHeadquarters } from '../api/headquarters'
import { fetchDeviceMeasurementPointsList } from '../api/measurement-points'
import { fetchFavoritePoints } from '../api/favorite-points'
import { formatDateISO, parseDateSafe } from '@/lib/date-utils'

export const VALID_CATEGORIES = ['power', 'energy', 'current', 'voltage'] as const
export type Category = (typeof VALID_CATEGORIES)[number]

export function useHomeFilters() {
  const navigate = useNavigate({ from: '/energia/dashboard/home' })
  const search = useSearch({ from: '/energia/dashboard/home' })

  // Read ALL state directly from URL — single source of truth
  const sedeId = typeof search.sede === 'string' ? Number(search.sede) : null
  const panelId = typeof search.panel === 'string' ? Number(search.panel) : null
  const puntoId = typeof search.punto === 'string' ? Number(search.punto) : null
  const category =
    typeof search.categoria === 'string' && VALID_CATEGORIES.includes(search.categoria as Category)
      ? (search.categoria as Category)
      : null
  const page = typeof search.pagina === 'string' ? Number(search.pagina) : 1
  const dateAfter = parseDateSafe(typeof search.desde === 'string' ? search.desde : undefined)
  const dateBefore = parseDateSafe(typeof search.hasta === 'string' ? search.hasta : undefined)

  const today = useMemo(() => new Date(), [])

  // Fetch favorite points
  const { data: favoritePointsData, isLoading: isLoadingFavoritePoints } = useQuery({
    queryKey: ['favorite-points'],
    queryFn: fetchFavoritePoints,
  })

  const favoritePoints = useMemo(() => favoritePointsData?.results ?? [], [favoritePointsData])

  // Track selected favorite point (not persisted in URL)
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<number | null>(null)

  // Sync selectedFavoriteId with URL params: if the current sede/panel/punto
  // no longer matches the selected favorite, clear it
  useEffect(() => {
    if (selectedFavoriteId === null) return
    const selected = favoritePoints.find((f) => f.id === selectedFavoriteId)
    if (!selected) return
    const matches =
      sedeId === selected.energy_headquarter_id &&
      panelId === selected.electrical_panel_id &&
      puntoId === selected.measurement_point
    if (!matches) {
      setSelectedFavoriteId(null)
    }
  }, [sedeId, panelId, puntoId, favoritePoints, selectedFavoriteId])

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

  const currentPanel = useMemo(() => {
    return panels.find((p) => p.id === panelId) ?? null
  }, [panels, panelId])

  // Fetch measurement points for current panel
  const { data: measurementPointsData, isLoading: isLoadingMeasurementPoints } = useQuery({
    queryKey: ['device-measurement-points-list', sedeId, panelId],
    queryFn: () => {
      if (!sedeId || !panelId) throw new Error('Missing required parameters')
      return fetchDeviceMeasurementPointsList(sedeId, panelId)
    },
    enabled: !!sedeId && !!panelId,
  })

  const measurementPoints = useMemo(() => {
    return measurementPointsData?.results.filter((mp) => mp.is_active) ?? []
  }, [measurementPointsData])

  // Auto-select: if URL is missing values, navigate to defaults
  const hasAutoSelected = useRef(false)
  // Firma de las sedes cargadas: si cambia (ej. otro usuario/sesión),
  // los filtros de la URL deben revalidarse en vez de respetarse a ciegas.
  const lastHeadquartersKey = useRef<string | null>(null)
  const hasAutoSelectedPunto = useRef(false)
  const lastPanelIdForPunto = useRef<number | null>(null)

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

    const targetCategory = category ?? 'power'

    const targetPage = page ?? 1

    const needsNavigation =
      sedeId !== targetSedeId ||
      panelId !== targetPanelId ||
      dateAfter?.getTime() !== targetDateAfter.getTime() ||
      dateBefore?.getTime() !== targetDateBefore.getTime() ||
      category !== targetCategory ||
      page !== targetPage

    if (needsNavigation) {
      hasAutoSelected.current = true
      navigate({
        search: {
          sede: String(targetSedeId),
          panel: targetPanelId ? String(targetPanelId) : undefined,
          punto: undefined,
          categoria: targetCategory,
          pagina: targetPage > 1 ? String(targetPage) : undefined,
          desde: formatDateISO(targetDateAfter),
          hasta: formatDateISO(targetDateBefore),
        },
      })
    }
  }, [
    headquarters,
    sedeId,
    panelId,
    category,
    page,
    dateAfter,
    dateBefore,
    today,
    navigate,
  ])

  useEffect(() => {
    if (panelId !== lastPanelIdForPunto.current) {
      hasAutoSelectedPunto.current = false
      lastPanelIdForPunto.current = panelId
    }

    // Punto válido = existe en los puntos cargados (pueden ser de otra sesión).
    const puntoIsValid =
      puntoId != null && measurementPoints.some((mp) => mp.id === puntoId)
    if (puntoIsValid) {
      hasAutoSelectedPunto.current = true
      return
    }
    if (puntoId == null && hasAutoSelectedPunto.current) return
    if (measurementPoints.length === 0) return

    hasAutoSelectedPunto.current = true
    navigate({
      search: {
        sede: String(sedeId),
        panel: String(panelId),
        punto: String(measurementPoints[0].id),
        categoria: category ?? 'power',
        pagina: page > 1 ? String(page) : undefined,
        desde: formatDateISO(dateAfter ?? today),
        hasta: formatDateISO(dateBefore ?? today),
      },
    })
  }, [measurementPoints, puntoId, panelId, sedeId, category, page, dateAfter, dateBefore, today, navigate])

  // Handlers — just navigate, no local state
  const setSedeId = useCallback(
    (id: number) => {
      navigate({
        search: {
          sede: String(id),
          panel: undefined,
          punto: undefined,
          categoria: category ?? 'power',
          pagina: undefined,
          desde: formatDateISO(dateAfter ?? today),
          hasta: formatDateISO(dateBefore ?? today),
        },
      })
    },
    [navigate, category, dateAfter, dateBefore, today]
  )

  const setPanelId = useCallback(
    (id: number) => {
      navigate({
        search: {
          sede: String(sedeId),
          panel: String(id),
          punto: undefined,
          categoria: category ?? 'power',
          pagina: undefined,
          desde: formatDateISO(dateAfter ?? today),
          hasta: formatDateISO(dateBefore ?? today),
        },
      })
    },
    [navigate, sedeId, category, dateAfter, dateBefore, today]
  )

  const setPuntoId = useCallback(
    (id: number) => {
      navigate({
        search: {
          sede: String(sedeId),
          panel: String(panelId),
          punto: String(id),
          categoria: category ?? 'power',
          pagina: undefined,
          desde: formatDateISO(dateAfter ?? today),
          hasta: formatDateISO(dateBefore ?? today),
        },
      })
    },
    [navigate, sedeId, panelId, category, dateAfter, dateBefore, today]
  )

  const setCategory = useCallback(
    (cat: Category) => {
      navigate({
        search: {
          sede: String(sedeId),
          panel: String(panelId),
          punto: String(puntoId),
          categoria: cat,
          pagina: undefined,
          desde: formatDateISO(dateAfter ?? today),
          hasta: formatDateISO(dateBefore ?? today),
        },
      })
    },
    [navigate, sedeId, panelId, puntoId, dateAfter, dateBefore, today]
  )

  const setDateRange = useCallback(
    (range: { startDate: Date | null; endDate: Date | null }) => {
      navigate({
        search: {
          sede: String(sedeId),
          panel: String(panelId),
          punto: String(puntoId),
          categoria: category ?? 'power',
          pagina: undefined,
          desde: formatDateISO(range.startDate),
          hasta: formatDateISO(range.endDate),
        },
      })
    },
    [navigate, sedeId, panelId, puntoId, category]
  )

  const setPage = useCallback(
    (newPage: number) => {
      navigate({
        search: {
          sede: String(sedeId),
          panel: String(panelId),
          punto: String(puntoId),
          categoria: category ?? 'power',
          pagina: newPage > 1 ? String(newPage) : undefined,
          desde: formatDateISO(dateAfter ?? today),
          hasta: formatDateISO(dateBefore ?? today),
        },
        resetScroll: false,
      })
    },
    [navigate, sedeId, panelId, puntoId, category, dateAfter, dateBefore, today]
  )

  const setFavoritePoint = useCallback(
    (favoriteId: number) => {
      const favorite = favoritePoints.find((f) => f.id === favoriteId)
      if (!favorite) return
      setSelectedFavoriteId(favoriteId)
      navigate({
        search: {
          sede: String(favorite.energy_headquarter_id),
          panel: String(favorite.electrical_panel_id),
          punto: String(favorite.measurement_point),
          categoria: category ?? 'power',
          pagina: undefined,
          desde: formatDateISO(dateAfter ?? today),
          hasta: formatDateISO(dateBefore ?? today),
        },
      })
    },
    [navigate, favoritePoints, category, dateAfter, dateBefore, today]
  )

  const isReady = !!sedeId && !!panelId && !!puntoId && !!dateAfter && !!dateBefore && !!category

  return {
    // Data
    headquarters,
    panels,
    measurementPoints,
    currentHeadquarter,
    currentPanel,
    favoritePoints,

    // State (from URL)
    sedeId,
    panelId,
    puntoId,
    category,
    page,
    dateAfter,
    dateBefore,

    // State (local UI)
    selectedFavoriteId,

    // Handlers
    setSedeId,
    setPanelId,
    setPuntoId,
    setCategory,
    setDateRange,
    setPage,
    setFavoritePoint,

    // Status
    isLoadingHeadquarters,
    isLoadingMeasurementPoints,
    isLoadingFavoritePoints,
    isReady,
  }
}
