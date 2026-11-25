import type { ReactNode } from 'react'
import { DashboardHeader } from '@/features/dashboard/components/header'
import { DashboardSidebar } from '@/features/dashboard/components/sidebar'

interface DashboardShellProps {
  children: ReactNode
  /**
   * `false` en pantallas que usan todo el ancho (Mapa de Red): la navegación
   * pasa al menú «Módulos» de la página (`ModulesMenu`).
   */
  showSidebar?: boolean
}

export function DashboardShell({ children, showSidebar = true }: DashboardShellProps) {
  return (
    // Alto fijo (h-dvh): el scroll vive en <main>, así el header y el sidebar no se
    // desplazan y los elementos `sticky` del contenido (p. ej. el detalle y la bandeja
    // del Mapa de Red) funcionan. Con `min-h-screen` scrolleaba la ventana y `sticky` no.
    <div className="h-dvh flex flex-col bg-[#F2F2F2]">
      <DashboardHeader />
      <div className="flex flex-1 overflow-hidden">
        {showSidebar && <DashboardSidebar />}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
