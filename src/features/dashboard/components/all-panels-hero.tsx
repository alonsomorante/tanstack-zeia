import { ArrowRight, CalendarDays, Crown, LayoutGrid } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'

interface AllPanelsHeroProps {
  sedeId: number
  sedeName: string
  totalKwh: number
  dateRangeLabel: string
  dailyAvgKwh: number | null
  topPanelName: string | null
  topPanelKwh: number | null
  topPanelShare: number | null
  panelCount: number
  pointCount: number
  isLoading: boolean
}

function formatKwh(value: number): string {
  return `${value.toLocaleString('es-PE', { maximumFractionDigits: 2 })}`
}

export function AllPanelsHero({
  sedeId,
  sedeName,
  totalKwh,
  dateRangeLabel,
  dailyAvgKwh,
  topPanelName,
  topPanelKwh,
  topPanelShare,
  panelCount,
  pointCount,
  isLoading,
}: AllPanelsHeroProps) {
  return (
    <Card className="overflow-hidden border-primary-hover bg-primary text-white">
      <CardContent className="relative p-6 md:p-8">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-4 -top-10 select-none font-mono text-[10rem] font-bold leading-none text-white/10"
        >
          kWh
        </span>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-4 w-40 animate-pulse rounded bg-white/20" />
            <div className="h-14 w-72 max-w-full animate-pulse rounded bg-white/20" />
            <div className="h-6 w-56 max-w-full animate-pulse rounded bg-white/20" />
          </div>
        ) : (
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Esta sede consume — {sedeName}
            </p>

            <p className="mt-2 font-mono text-5xl font-bold tabular-nums tracking-tight md:text-6xl">
              {formatKwh(totalKwh)}{' '}
              <span className="text-2xl font-semibold md:text-3xl">kWh</span>
            </p>

            <p className="mt-2 text-sm text-white/85">{dateRangeLabel}</p>

            <Link
              to="/energia/dashboard/tarifario"
              search={{ sede: String(sedeId), tab: undefined }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/30"
            >
              ¿Cuánto cuesta? Ver tarifario
              <ArrowRight className="h-4 w-4" />
            </Link>

            <div className="mt-6 grid grid-cols-1 gap-4 border-t border-white/25 pt-5 sm:grid-cols-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/75">
                    Consumo por día
                  </p>
                  <p className="font-mono text-lg font-bold tabular-nums">
                    {dailyAvgKwh != null ? `≈ ${formatKwh(dailyAvgKwh)} kWh` : '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:border-l sm:border-white/25 sm:pl-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
                  <Crown className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/75">
                    Tablero que más consume
                  </p>
                  <p className="truncate text-lg font-bold">
                    {topPanelName ?? '—'}{' '}
                    {topPanelKwh != null && (
                      <span className="font-mono text-sm font-semibold tabular-nums text-white/85">
                        {formatKwh(topPanelKwh)} kWh
                      </span>
                    )}
                  </p>
                  {topPanelShare != null && (
                    <p className="font-mono text-xs tabular-nums text-white/75">
                      {topPanelShare.toFixed(1)}% del total
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 sm:border-l sm:border-white/25 sm:pl-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
                  <LayoutGrid className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/75">
                    Tableros y puntos
                  </p>
                  <p className="font-mono text-lg font-bold tabular-nums">
                    {panelCount}{' '}
                    <span className="font-sans text-xs font-medium text-white/75">
                      tableros · {pointCount} puntos
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
