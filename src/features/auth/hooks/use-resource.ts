import { useCallback, useSyncExternalStore } from 'react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import type { User } from '@/features/auth/types'

export type Resource = 'energy' | 'water'

const RESOURCE_STORAGE_KEY = 'zeia-resource'

export function isResource(value: string | null): value is Resource {
  return value === 'energy' || value === 'water'
}

export function getEnabledResources(user: User | null): Resource[] {
  if (!user) return []
  const resources: Resource[] = []
  if (user.is_user_energy_monitoring) resources.push('energy')
  if (user.is_user_water_monitoring) resources.push('water')
  return resources
}

function readStoredResource(): Resource | null {
  if (typeof window === 'undefined') return null
  const value = localStorage.getItem(RESOURCE_STORAGE_KEY)
  return isResource(value) ? value : null
}

const listeners = new Set<() => void>()

function emitChange() {
  listeners.forEach((listener) => listener())
}

export function subscribeToResource(callback: () => void) {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

export function getResourceSnapshot(): Resource | null {
  return readStoredResource()
}

export function useResource() {
  const { user } = useAuth()
  const storedResource = useSyncExternalStore(
    subscribeToResource,
    getResourceSnapshot,
    () => null
  )

  const enabledResources = getEnabledResources(user)
  const resource: Resource =
    storedResource && enabledResources.includes(storedResource)
      ? storedResource
      : enabledResources[0] ?? 'energy'
  const canSwitch = enabledResources.length > 1

  const setResource = useCallback(
    (next: Resource) => {
      if (!enabledResources.includes(next)) return
      localStorage.setItem(RESOURCE_STORAGE_KEY, next)
      emitChange()
    },
    [enabledResources]
  )

  return { resource, enabledResources, canSwitch, setResource }
}
