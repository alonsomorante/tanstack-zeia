import { useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useResource } from '@/features/auth/hooks/use-resource'
import { normalizeModuleUrl } from '@/features/auth/lib/modules'
import { cn } from '@/lib/utils'

export function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { user } = useAuth()
  const { resource } = useResource()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  const modules =
    resource === 'water'
      ? (user?.water_modules ?? [])
      : (user?.energy_modules ?? [])

  return (
    <aside
      className={cn(
        'flex flex-col bg-card border-r border-border shrink-0 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header: Company name + chevron */}
      <div className="h-16 border-b border-border shrink-0 flex items-center px-4 relative">
        <span className={cn(
            'absolute left-1/2 -translate-x-1/2 font-semibold text-text-primary text-sm tracking-tight',
            collapsed && 'hidden'
          )}>
          {user?.companies?.[0]?.name || 'ZEIA Energy'}
        </span>
        <button
          className={cn(
            'w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-secondary transition-all',
            !collapsed && 'ml-auto',
            collapsed && 'mx-auto'
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" fill='none'/>}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {modules.length === 0 && !collapsed && (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-text-muted">Cargando módulos...</p>
          </div>
        )}
        {modules.map((module, moduleIndex) => {
          const moduleUrl = normalizeModuleUrl(module.url)
          return (
            <div key={moduleIndex} className="mb-1">
              {/* Module header */}
              {moduleUrl ? (
                <SidebarLink
                  href={moduleUrl}
                  icon={module.icon}
                  label={module.name}
                  collapsed={collapsed}
                  active={currentPath === moduleUrl}
                />
              ) : !collapsed && (
                <div className="px-3 py-2 mt-4 mb-1">
                  <span className="label-executive">{module.name}</span>
                </div>
              )}

              {/* Children */}
              {module.children?.map((child, childIndex) => {
                const childUrl = normalizeModuleUrl(child.url)
                return (
                  <SidebarLink
                    key={childIndex}
                    href={childUrl ?? '#'}
                    icon={child.icon}
                    label={child.name}
                    collapsed={collapsed}
                    active={currentPath === childUrl}
                    indent={!moduleUrl && !collapsed}
                  />
                )
              })}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

interface SidebarLinkProps {
  href: string
  icon: string
  label: string
  collapsed: boolean
  active: boolean
  indent?: boolean
}

function SidebarLink({ href, icon, label, collapsed, active, indent }: SidebarLinkProps) {
  const isBase64Svg = icon.startsWith('data:image/svg+xml;base64,')
  const svgContent = isBase64Svg
    ? atob(icon.replace('data:image/svg+xml;base64,', ''))
    : null

  return (
    <Link
      to={href}
      onClick={(e) => {
        if (active) {
          e.preventDefault()
        }
      }}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 relative group',
        active
          ? 'bg-primary/10 text-primary font-semibold'
          : 'text-text-secondary hover:text-text-primary hover:bg-secondary',
        collapsed && 'justify-center px-2',
        indent && !collapsed && 'ml-4'
      )}
      title={collapsed ? label : undefined}
    >
      {/* Active indicator */}
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
      )}

      {/* Icon */}
      {svgContent ? (
        <span
          className="shrink-0 w-5 h-5 flex items-center justify-center"
          dangerouslySetInnerHTML={{
            __html: svgContent
              .replace(/fill="[^"]*"/g, 'fill="none"')
              .replace(/stroke="[^"]*"/g, `stroke="currentColor"`),
          }}
        />
      ) : (
        <Zap className="w-5 h-5 shrink-0" />
      )}
      
      {!collapsed && <span className="font-medium truncate">{label}</span>}
    </Link>
  )
}
