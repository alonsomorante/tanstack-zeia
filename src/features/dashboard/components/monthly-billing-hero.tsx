import { ArrowRight, CalendarDays, Flame, TrendingDown, TrendingUp, Trophy } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { formatMoney, formatCycleRange, getCycleLabel } from '../lib/billing-format'
import { cn } from '@/lib/utils'
import type { BillingCycleItem } from '../types'

interface MonthlyBillingHeroProps {
  sedeId: number
  selectedCycle: BillingCycleItem | null
  displayCurrency: string | null
  selectedTotal: number | null
  secondaryTotals: { currency: string; amount: number }[]
  prevCycle: BillingCycleItem | null
  delta: number | null
  deltaPct: number | null
  dailyAvg: number | null
  rank: number | null
  rankTotal: number
  maxCycle: BillingCycleItem | null
  maxAmount: number | null
  isLoading: boolean
}

function getPrevLabel(prevCycle: BillingCycleItem | null): string {
  if (!prevCycle) return ''
  return getCycleLabel(prevCycle).split(' ')[0] ?? getCycleLabel(prevCycle)
}

export function MonthlyBillingHero({
  sedeId,
  selectedCycle,
  displayCurrency,
  selectedTotal,
  secondaryTotals,
  prevCycle,
  delta,
  deltaPct,
  dailyAvg,
  rank,
  rankTotal,
  maxCycle,
  maxAmount,
  isLoading,
}: MonthlyBillingHeroProps) {
  const isCurrent = selectedCycle?.is_current ?? false
  const isSaving = (delta ?? 0) <= 0

  return (
    <Card className="overflow-hidden border-primary-hover bg-primary text-white">
      <CardContent className="relative p-6 md:p-8">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-4 -top-10 select-none font-mono text-[10rem] font-bold leading-none text-white/10"
        >
          $
        </span>

        {isLoading || !selectedCycle || selectedTotal == null || !displayCurrency ? (
          <div className="space-y-4">
            <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
            <div className="h-14 w-72 max-w-full animate-pulse rounded bg-white/10" />
            <div className="h-6 w-56 max-w-full animate-pulse rounded bg-white/10" />
          </div>
        ) : (
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                {isCurrent ? 'Este mes vas a pagar' : 'Ese mes pagaste'} —{' '}
                {getCycleLabel(selectedCycle)}
              </p>
              {isCurrent && (
                <span className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold text-white">
                  Mes actual
                </span>
              )}
            </div>

            <p className="mt-2 font-mono text-5xl font-bold tabular-nums tracking-tight md:text-6xl">
              {formatMoney(selectedTotal, displayCurrency)}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="text-white/85">
                {formatCycleRange(selectedCycle.start_date, selectedCycle.end_date)}
              </span>
              {secondaryTotals.map((t) => (
                <span key={t.currency} className="text-white/85">
                  + {formatMoney(t.amount, t.currency)} en {t.currency}
                </span>
              ))}
            </div>

            {delta != null && deltaPct != null && prevCycle && displayCurrency && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-mono text-sm font-bold',
                    isSaving ? 'text-emerald-600' : 'text-danger'
                  )}
                >
                  {isSaving ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : (
                    <TrendingUp className="h-4 w-4" />
                  )}
                  {isSaving ? '−' : '+'}
                  {formatMoney(Math.abs(delta), displayCurrency)} (
                  {Math.abs(deltaPct).toFixed(1)}%) vs {getPrevLabel(prevCycle)}
                </span>
                <span className="text-sm text-white/85">
                  {isSaving
                    ? `Ahorraste frente a ${getCycleLabel(prevCycle).toLowerCase()}`
                    : `Gastaste más que en ${getCycleLabel(prevCycle).toLowerCase()}`}
                </span>
              </div>
            )}

            <Link
              to="/energia/dashboard/panel"
              search={{
                sede: String(sedeId),
                panel: undefined,
                vista: 'todos',
                desde: undefined,
                hasta: undefined,
                mp_sede: undefined,
                mp_panel: undefined,
                mp_punto: undefined,
                mp_indicador: undefined,
                mp_weekday: undefined,
                mp_anio: undefined,
                mp_mes: undefined,
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/30"
            >
              ¿Dónde se consume? Ver tableros
              <ArrowRight className="h-4 w-4" />
            </Link>

            <div className="mt-6 grid grid-cols-1 gap-4 border-t border-white/25 pt-5 sm:grid-cols-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/75">
                    Te cuesta por día
                  </p>
                  <p className="font-mono text-lg font-bold tabular-nums">
                    {dailyAvg != null && displayCurrency
                      ? `≈ ${formatMoney(dailyAvg, displayCurrency)}`
                      : '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:border-l sm:border-white/25 sm:pl-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
                  <Trophy className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/75">
                    Ranking de gasto
                  </p>
                  <p className="font-mono text-lg font-bold tabular-nums">
                    {rank != null ? (
                      <>
                        #{rank} <span className="text-sm font-medium text-white/75">de {rankTotal}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:border-l sm:border-white/25 sm:pl-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
                  <Flame className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/75">
                    Tu pico máximo
                  </p>
                  <p className="font-mono text-lg font-bold tabular-nums">
                    {maxCycle && maxAmount != null && displayCurrency ? (
                      <>
                        {formatMoney(maxAmount, displayCurrency)}{' '}
                        <span className="font-sans text-xs font-medium text-white/75">
                          {getCycleLabel(maxCycle)}
                        </span>
                      </>
                    ) : (
                      '—'
                    )}
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
