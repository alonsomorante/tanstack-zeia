import { useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { fetchHeadquarters } from '../api/headquarters'

export function useTarifarioFilters() {
  const navigate = useNavigate({ from: '/energia/dashboard/tarifario' })
  const search = useSearch({ from: '/energia/dashboard/tarifario' })

  const sedeId = typeof search.sede === 'string' ? Number(search.sede) : null

  const { data: headquartersData, isLoading: isLoadingHeadquarters } = useQuery({
    queryKey: ['headquarters'],
    queryFn: fetchHeadquarters,
  })

  const headquarters = useMemo(() => headquartersData?.results ?? [], [headquartersData])

  const currentHeadquarter = useMemo(() => {
    return headquarters.find((h) => h.id === sedeId) ?? null
  }, [headquarters, sedeId])

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

    if (sedeId !== targetSedeId) {
      hasAutoSelected.current = true
      navigate({
        search: {
          sede: String(targetSedeId),
        },
      })
    }
  }, [headquarters, sedeId, navigate])

  const setSedeId = useCallback(
    (id: number) => {
      navigate({
        search: {
          sede: String(id),
        },
      })
    },
    [navigate]
  )

  const isReady = !!sedeId

  return {
    headquarters,
    currentHeadquarter,
    sedeId,
    setSedeId,
    isLoadingHeadquarters,
    isReady,
  }
}
