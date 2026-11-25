import type { ReactNode } from 'react'
import { ArrowRight, ChevronRight, TriangleAlert, X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatKwh, type NetworkPointNode } from '../lib/network-map'

export function Breadcrumb({ items }: { items: Array<{ label: string; onClick?: () => void }> }) {
  return (
    <nav aria-label="De qué depende" className="flex flex-wrap items-center gap-1 text-xs text-text-muted">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex min-w-0 items-center gap-1">
          {index > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
          {item.onClick ? (
            <button
              type="button"
              onClick={item.onClick}
              className="truncate font-medium text-text-secondary transition-colors hover:text-primary hover:underline"
            >
              {item.label}
            </button>
          ) : (
            <span className="truncate font-semibold text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

export function EnergyHero({ kwh, isLoading, children }: { kwh: number; isLoading: boolean; children?: ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border border-primary/15 bg-primary/5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Consumo</p>
      {isLoading ? (
        <div className="mt-2 h-9 w-40 animate-pulse rounded bg-muted" />
      ) : (
        <p className="mt-1 font-mono text-3xl font-bold tabular-nums tracking-tight text-text-primary">
          {formatKwh(kwh, true)} <span className="text-base font-semibold">kWh</span>
        </p>
      )}
      {children}
    </div>
  )
}

export function Chip({ children, tone }: { children: ReactNode; tone?: 'danger' | 'warning' | 'success' }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold tabular-nums',
        tone === 'danger'
          ? 'bg-danger/10 text-danger'
          : tone === 'warning'
            ? 'bg-warning/10 text-warning'
            : tone === 'success'
              ? 'bg-success/10 text-[#1E9E93]'
              : 'bg-white text-text-primary shadow-soft'
      )}
    >
      {children}
    </span>
  )
}

export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2.5">
      <dt className="text-[11px] leading-tight text-text-muted">{label}</dt>
      <dd className="mt-0.5 font-mono text-base font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  )
}

export function DetailRow({ label, value, tone }: { label: string; value: string; tone?: 'warning' }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <dt className="shrink-0 text-text-muted">{label}</dt>
      <dd className={cn('min-w-0 break-words text-right font-medium text-foreground', tone === 'warning' && 'text-warning')}>
        {value}
      </dd>
    </div>
  )
}

export function ErrorNote({ text }: { text: string }) {
  return (
    <p className="mt-2 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/5 px-3 py-2.5 text-sm text-warning">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      {text}
    </p>
  )
}

export function MutedNote({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-text-muted">{children}</p>
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mt-3 space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-1 w-full animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

/** Bloque de información con título, ícono y una acción opcional ("Ver curva →"). */
export function InsightSection({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: LucideIcon
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="border-t border-border/70 pt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="label-executive flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          {title}
        </h3>
        {action}
      </div>
      <div className="mt-2.5">{children}</div>
    </section>
  )
}

export function InsightAction({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex shrink-0 items-center gap-1 rounded-md text-xs font-semibold text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {children}
      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </button>
  )
}

interface PointListProps {
  points: NetworkPointNode[]
  maxKwh: number
  showPanel?: boolean
  onSelect: (point: NetworkPointNode) => void
}

export function PointList({ points, maxKwh, showPanel, onSelect }: PointListProps) {
  return (
    <ul className="-mx-2 mt-1 space-y-0.5">
      {points.map((point) => (
        <li key={point.key}>
          <button
            type="button"
            onClick={() => onSelect(point)}
            className="group w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground group-hover:text-primary">
                  {point.name}
                </span>
                {showPanel && <span className="block truncate text-[11px] text-text-muted">{point.panelName}</span>}
              </span>
              <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-text-primary">
                {formatKwh(point.kwh)} <span className="text-[10px]">kWh</span>
              </span>
            </span>
            <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${maxKwh > 0 ? Math.min(100, (point.kwh / maxKwh) * 100) : 0}%`,
                  backgroundColor: point.isPeak ? '#E71D36' : point.isOtherLoads ? '#8EDDE6' : '#00B7CA',
                }}
              />
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function PhotoModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Foto de instalación"
    >
      <div className="relative max-h-[90vh] max-w-[90vw]">
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="absolute -top-10 right-0 text-white transition-colors hover:text-primary"
          aria-label="Cerrar"
        >
          <X className="h-8 w-8" />
        </button>
        <img
          src={url}
          alt="Foto de instalación ampliada"
          className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  )
}
