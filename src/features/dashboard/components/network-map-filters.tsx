import { Building2 } from 'lucide-react'
import { ZeiaSelect } from '@/components/ui/select'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { cn } from '@/lib/utils'
import { NETWORK_PERIOD_OPTIONS, type NetworkPeriod } from '../lib/network-map'
import type { Headquarter } from '../types'

/** Con pocas sedes se muestran como botones (un clic); con muchas, como selector. */
const MAX_SEDE_PILLS = 6

interface NetworkMapFiltersProps {
  headquarters: Headquarter[]
  sedeId: number | null
  periodo: NetworkPeriod
  isLoading: boolean
  /** false cuando la sede no tiene un ciclo de facturación vigente. */
  cycleAvailable: boolean
  cycleTitle: string | null
  customStart: Date | null
  customEnd: Date | null
  onSedeChange: (id: number) => void
  onPeriodoChange: (value: Exclude<NetworkPeriod, 'custom'>) => void
  onCustomRange: (start: Date | null, end: Date | null) => void
}

export function NetworkMapFilters({
  headquarters,
  sedeId,
  periodo,
  isLoading,
  cycleAvailable,
  cycleTitle,
  customStart,
  customEnd,
  onSedeChange,
  onPeriodoChange,
  onCustomRange,
}: NetworkMapFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="label-executive" style={{ color: '#88939b' }}>
          Sede
        </span>
        {isLoading ? (
          <div className="flex gap-2">
            <div className="h-[38px] w-28 animate-pulse rounded-full border border-border bg-card" />
            <div className="h-[38px] w-24 animate-pulse rounded-full border border-border bg-card" />
          </div>
        ) : headquarters.length <= MAX_SEDE_PILLS ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Sede">
            {headquarters.map((hq) => {
              const isActive = hq.id === sedeId
              return (
                <button
                  key={hq.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onSedeChange(hq.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    isActive
                      ? 'border-primary bg-primary text-white shadow-soft'
                      : 'border-border bg-card text-text-secondary hover:border-primary/40 hover:text-primary',
                    !hq.is_active && !isActive && 'opacity-60'
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  {hq.name}
                </button>
              )
            })}
          </div>
        ) : (
          <ZeiaSelect
            className="min-w-[220px]"
            options={headquarters.map((hq) => ({ value: String(hq.id), label: hq.name }))}
            value={sedeId ? String(sedeId) : ''}
            onChange={(value) => onSedeChange(Number(value))}
            placeholder="Seleccionar sede"
            icon={Building2}
          />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="label-executive" style={{ color: '#88939b' }}>
          Período
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex w-fit items-center gap-1 rounded-lg border border-border bg-card p-1" role="group" aria-label="Período">
            {NETWORK_PERIOD_OPTIONS.map((option) => {
              const isCycle = option.value === 'ciclo'
              const disabled = isCycle && !cycleAvailable
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={periodo === option.value}
                  disabled={disabled}
                  title={isCycle ? (disabled ? 'Esta sede no tiene un ciclo de facturación vigente' : (cycleTitle ?? undefined)) : undefined}
                  onClick={() => onPeriodoChange(option.value)}
                  className={cn(
                    'rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    'disabled:cursor-not-allowed disabled:opacity-40',
                    periodo === option.value
                      ? 'bg-primary text-white shadow-soft'
                      : 'text-text-secondary enabled:hover:bg-secondary enabled:hover:text-primary'
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
          <div className={cn('rounded-lg', periodo === 'custom' && 'ring-2 ring-primary/50')}>
            <DateRangePicker
              value={{ startDate: customStart, endDate: customEnd }}
              onChange={(range) => onCustomRange(range.startDate, range.endDate)}
              placeholder="Personalizado"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
