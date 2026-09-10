import { createFileRoute } from '@tanstack/react-router'
import { ArrowLeftRight, BarChart3 } from 'lucide-react'
import { DashboardShell } from '@/features/dashboard/components/shell'
import { TarifarioFilters } from '@/features/dashboard/components/tarifario-filters'
import { BillingComparison } from '@/features/dashboard/components/billing-comparison'
import { BillingCycleTable } from '@/features/dashboard/components/billing-cycle-table'
import { BillingDetailTable } from '@/features/dashboard/components/billing-detail-table'
import { MonthlyBillingView } from '@/features/dashboard/components/monthly-billing-view'
import { useTarifarioFilters } from '@/features/dashboard/hooks/use-tarifario-filters'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/energia/dashboard/tarifario')({
  component: TarifarioPage,
  validateSearch: (search) => ({
    sede: typeof search.sede === 'string' ? search.sede : undefined,
    tab: search.tab === 'comparador' || search.tab === 'mensual' ? search.tab : undefined,
  }),
})

function TarifarioPage() {
  const { sedeId, tab, setTab, isReady } = useTarifarioFilters()
  const activeTab = tab === 'comparador' ? 'comparador' : 'mensual'

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Consumo Tarifario</h1>
            <p className="text-text-secondary">Desglose de consumo por tarifa y horario</p>
          </div>
          <TarifarioFilters />
        </div>

        <div className="flex w-fit items-center gap-1 rounded-lg border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setTab('mensual')}
            className={cn(
              'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'mensual'
                ? 'bg-primary text-white shadow-soft'
                : 'text-text-secondary hover:bg-secondary hover:text-text-primary'
            )}
          >
            <BarChart3 className="h-4 w-4" />
            Mensual
          </button>
          <button
            type="button"
            onClick={() => setTab('comparador')}
            className={cn(
              'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'comparador'
                ? 'bg-primary text-white shadow-soft'
                : 'text-text-secondary hover:bg-secondary hover:text-text-primary'
            )}
          >
            <ArrowLeftRight className="h-4 w-4" />
            Comparador
          </button>
        </div>

        {isReady && sedeId && (
          <>
            {activeTab === 'mensual' ? (
              <MonthlyBillingView sedeId={sedeId} />
            ) : (
              <>
                <BillingComparison sedeId={sedeId} />
                <BillingCycleTable sedeId={sedeId} />
                <BillingDetailTable sedeId={sedeId} />
              </>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  )
}
