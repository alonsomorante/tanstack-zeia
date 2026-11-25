import type { User } from '@/features/auth/types'
import { getEnabledResources, type Resource } from '@/features/auth/hooks/use-resource'

/** Inicio de energía: el Mapa de Red es la forma principal de recorrer la app. */
export const ENERGY_HOME_URL = '/energia/dashboard/mapa'

export function normalizeModuleUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export function getResourceModules(user: User | null, resource: Resource) {
  if (!user) return []
  return resource === 'water' ? (user.water_modules ?? []) : (user.energy_modules ?? [])
}

export function getResourceModuleUrls(user: User | null, resource: Resource): string[] {
  const modules = getResourceModules(user, resource)
  const urls: string[] = []
  for (const module of modules) {
    const moduleUrl = normalizeModuleUrl(module.url)
    if (moduleUrl) urls.push(moduleUrl)
    for (const child of module.children ?? []) {
      const childUrl = normalizeModuleUrl(child.url)
      if (childUrl) urls.push(childUrl)
    }
  }
  return urls
}

export function getFirstResourceModuleUrl(user: User | null, resource: Resource): string | null {
  const modules = getResourceModules(user, resource)
  for (const module of modules) {
    const childUrl = normalizeModuleUrl(module.children?.[0]?.url)
    if (childUrl) return childUrl
    const moduleUrl = normalizeModuleUrl(module.url)
    if (moduleUrl) return moduleUrl
  }
  return null
}

/** Página de inicio de un recurso: en energía el Mapa de Red; en agua, su primer módulo. */
export function getResourceHomeUrl(user: User | null, resource: Resource): string | null {
  if (resource === 'energy') return user ? ENERGY_HOME_URL : null
  return getFirstResourceModuleUrl(user, resource)
}

/** A dónde va el usuario después del login. */
export function getDefaultLandingUrl(user: User): string {
  if (getEnabledResources(user).includes('energy')) return ENERGY_HOME_URL
  return (
    getFirstResourceModuleUrl(user, 'energy') ??
    getFirstResourceModuleUrl(user, 'water') ??
    '/energia/dashboard/panel'
  )
}
