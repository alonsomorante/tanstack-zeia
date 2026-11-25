import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarNav } from './sidebar'

/**
 * Menú «Módulos»: la misma navegación del sidebar en un desplegable, para las
 * pantallas que usan todo el ancho (el Mapa de Red no muestra sidebar).
 */
export function ModulesMenu({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="modules-menu"
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-semibold transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          open ? 'border-primary text-primary' : 'border-border text-foreground hover:border-primary/50 hover:text-primary'
        )}
      >
        <LayoutGrid className="h-4 w-4" aria-hidden="true" />
        Módulos
        <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div
          id="modules-menu"
          className="absolute left-0 top-full z-40 mt-2 w-72 animate-fade-in rounded-xl border border-border bg-card p-1 shadow-medium"
        >
          <SidebarNav className="max-h-[70vh] overflow-y-auto p-1" onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}
