import { Activity, FileText, Gauge, Receipt, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  formatCycleRange,
  formatMoney,
  getBillingTotals,
  getChargeDetailLine,
  getCycleLabel,
} from '../lib/billing-format'
import { cn } from '@/lib/utils'
import type { BillingCalculateResponse, BillingCycleItem } from '../types'

interface MonthlyBillingDetailProps {
  selectedCycle: BillingCycleItem | null
  billingData: BillingCalculateResponse | undefined
  isLoadingCalculate: boolean
}

function getChargeIcon(code: string): { Icon: LucideIcon; className: string } {
  if (code.includes('potencia')) {
    return { Icon: Gauge, className: 'bg-text-secondary/10 text-text-secondary' }
  }
  if (code.includes('reactiva')) {
    return { Icon: Activity, className: 'bg-warning/10 text-warning' }
  }
  if (code.includes('energia')) {
    return { Icon: Zap, className: 'bg-primary/10 text-primary' }
  }
  if (code.includes('fijo')) {
    return { Icon: Receipt, className: 'bg-text-muted/10 text-text-muted' }
  }
  return { Icon: FileText, className: 'bg-primary/10 text-primary' }
}

export function MonthlyBillingDetail({
  selectedCycle,
  billingData,
  isLoadingCalculate,
}: MonthlyBillingDetailProps) {
  if (isLoadingCalculate) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="h-5 w-64 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-8 animate-pulse rounded bg-muted" />
            <div className="h-8 animate-pulse rounded bg-muted" />
            <div className="h-8 animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!selectedCycle || !billingData) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4 text-primary" />
            Desglose del mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-24 items-center justify-center text-sm text-text-muted">
            Seleccione un mes de la gráfica para ver su desglose
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4 text-primary" />
            Desglose — {getCycleLabel(selectedCycle)}
          </CardTitle>
          {selectedCycle.is_current && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Mes actual
            </span>
          )}
        </div>
        <p className="text-xs text-text-muted">
          {formatCycleRange(selectedCycle.start_date, selectedCycle.end_date)} ·{' '}
          {billingData.results.length} cargos
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-3">
          {billingData.results.map((item) => {
            const consumption = getChargeDetailLine(item)
            const { Icon, className } = getChargeIcon(item.code)
            return (
              <li
                key={item.code}
                className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-secondary/30"
              >
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                    className
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-snug text-text-primary">
                    {item.name}
                  </p>
                  {consumption && (
                    <p className="mt-0.5 font-mono text-xs tabular-nums text-text-muted">
                      {consumption}
                    </p>
                  )}
                </div>
                <span className="shrink-0 font-mono text-base font-bold tabular-nums text-text-primary">
                  {formatMoney(item.value, item.currency)}
                </span>
              </li>
            )
          })}
        </ul>

        <div className="space-y-2 rounded-lg bg-danger/5 p-4">
          {getBillingTotals(billingData).map((total, _index, totals) => (
            <div key={total.currency} className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-danger">
                Total{totals.length > 1 ? ` ${total.currency}` : ''}
              </span>
              <span className="font-mono text-lg font-bold tabular-nums text-danger">
                {formatMoney(total.amount, total.currency)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
