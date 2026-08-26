import { Droplets, Zap } from 'lucide-react'
import { useRouter, useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useResource } from '@/features/auth/hooks/use-resource'
import type { Resource } from '@/features/auth/hooks/use-resource'
import { getFirstResourceModuleUrl, getResourceModuleUrls } from '@/features/auth/lib/modules'

const RESOURCE_OPTIONS: Array<{ value: Resource; label: string; icon: typeof Zap }> = [
  { value: 'energy', label: 'Energía', icon: Zap },
  { value: 'water', label: 'Agua', icon: Droplets },
]

export function ResourceSwitcher() {
  const { resource, canSwitch, setResource } = useResource()
  const { user } = useAuth()
  const router = useRouter()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  if (!canSwitch) return null

  const handleSelect = (next: Resource) => {
    if (next === resource) return
    setResource(next)

    // Si la página actual existe también en el recurso destino, se mantiene.
    // Si no existe, se navega al primer módulo del recurso destino.
    const targetUrls = getResourceModuleUrls(user, next)
    if (targetUrls.includes(currentPath)) return

    const firstUrl = getFirstResourceModuleUrl(user, next)
    if (firstUrl) {
      router.navigate({ to: firstUrl })
    }
  }

  return (
    <div
      className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-secondary border border-border"
      role="group"
      aria-label="Cambiar recurso"
    >
      {RESOURCE_OPTIONS.map((option) => {
        const Icon = option.icon
        const active = resource === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            aria-pressed={active}
            title={`Ver módulos de ${option.label.toLowerCase()}`}
            className={cn(
              'flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold transition-all duration-200',
              active
                ? 'bg-primary text-primary-foreground shadow-glow'
                : 'text-text-muted hover:text-text-primary hover:bg-accent'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
