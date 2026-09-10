import { useMemo, useState } from 'react'
import { useMonthlyBilling } from '../hooks/use-monthly-billing'
import { MonthlyBillingChart } from './monthly-billing-chart'
import { MonthlyBillingDetail } from './monthly-billing-detail'
import { MonthlyBillingHero } from './monthly-billing-hero'

interface MonthlyBillingViewProps {
  sedeId: number
}

function daysInCycle(startDate: string, endDate: string): number | null {
  const parse = (s: string) => {
    const parts = s.split('-').map(Number)
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null
    return new Date(parts[0], parts[1] - 1, parts[2]).getTime()
  }
  const start = parse(startDate)
  const end = parse(endDate)
  if (start == null || end == null || end < start) return null
  return Math.round((end - start) / 86400000) + 1
}

export function MonthlyBillingView({ sedeId }: MonthlyBillingViewProps) {
  const {
    cycles,
    calculates,
    totalsByCycleId,
    displayCurrency,
    amounts,
    defaultCycle,
    isLoadingCycles,
    isLoadingCalculates,
  } = useMonthlyBilling(sedeId)

  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null)

  const selectedCycle = useMemo(() => {
    if (selectedCycleId == null) return defaultCycle
    return cycles.find((c) => c.id === selectedCycleId) ?? defaultCycle
  }, [selectedCycleId, cycles, defaultCycle])

  const selectedIndex = useMemo(() => {
    if (!selectedCycle) return -1
    return cycles.findIndex((c) => c.id === selectedCycle.id)
  }, [cycles, selectedCycle])

  const selectedData = selectedIndex >= 0 ? calculates[selectedIndex]?.data : undefined
  const isLoadingSelected =
    isLoadingCycles || (selectedIndex >= 0 && (calculates[selectedIndex]?.isLoading ?? false))

  const selectedTotals = useMemo(() => {
    if (!selectedCycle) return []
    return totalsByCycleId.get(selectedCycle.id) ?? []
  }, [totalsByCycleId, selectedCycle])

  const selectedTotal = useMemo(() => {
    if (!displayCurrency) return null
    const found = selectedTotals.find((t) => t.currency === displayCurrency)
    return found ? found.amount : null
  }, [selectedTotals, displayCurrency])

  const secondaryTotals = useMemo(
    () => selectedTotals.filter((t) => t.currency !== displayCurrency),
    [selectedTotals, displayCurrency]
  )

  const prevCycle = selectedIndex > 0 ? (cycles[selectedIndex - 1] ?? null) : null
  const prevTotal = useMemo(() => {
    if (!prevCycle || !displayCurrency) return null
    const totals = totalsByCycleId.get(prevCycle.id) ?? []
    return totals.find((t) => t.currency === displayCurrency)?.amount ?? null
  }, [totalsByCycleId, prevCycle, displayCurrency])

  const delta = selectedTotal != null && prevTotal != null ? selectedTotal - prevTotal : null
  const deltaPct = delta != null && prevTotal ? (delta / prevTotal) * 100 : null

  const dailyAvg = useMemo(() => {
    if (selectedTotal == null || !selectedCycle) return null
    const days = daysInCycle(selectedCycle.start_date, selectedCycle.end_date)
    if (!days) return null
    return selectedTotal / days
  }, [selectedTotal, selectedCycle])

  const { rank, maxCycle, maxAmount } = useMemo(() => {
    if (!displayCurrency || cycles.length === 0) {
      return { rank: null as number | null, maxCycle: null, maxAmount: null as number | null }
    }
    const ranked = cycles
      .map((cycle) => ({
        cycle,
        amount: (totalsByCycleId.get(cycle.id) ?? []).find((t) => t.currency === displayCurrency)
          ?.amount,
      }))
      .filter((r): r is { cycle: (typeof cycles)[number]; amount: number } => r.amount != null)
      .sort((a, b) => b.amount - a.amount)
    if (ranked.length === 0) {
      return { rank: null as number | null, maxCycle: null, maxAmount: null as number | null }
    }
    const rankIndex = selectedCycle
      ? ranked.findIndex((r) => r.cycle.id === selectedCycle.id)
      : -1
    return {
      rank: rankIndex >= 0 ? rankIndex + 1 : null,
      maxCycle: ranked[0]?.cycle ?? null,
      maxAmount: ranked[0]?.amount ?? null,
    }
  }, [cycles, totalsByCycleId, displayCurrency, selectedCycle])

  return (
    <div className="space-y-4">
      <MonthlyBillingHero
        sedeId={sedeId}
        selectedCycle={selectedCycle}
        displayCurrency={displayCurrency}
        selectedTotal={selectedTotal}
        secondaryTotals={secondaryTotals}
        prevCycle={prevCycle}
        delta={delta}
        deltaPct={deltaPct}
        dailyAvg={dailyAvg}
        rank={rank}
        rankTotal={cycles.length}
        maxCycle={maxCycle}
        maxAmount={maxAmount}
        isLoading={isLoadingCycles || isLoadingCalculates}
      />
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
        <MonthlyBillingChart
          cycles={cycles}
          amounts={amounts}
          displayCurrency={displayCurrency}
          selectedCycleId={selectedCycle?.id ?? null}
          onSelect={setSelectedCycleId}
          isLoading={isLoadingCycles || isLoadingCalculates}
        />
        <MonthlyBillingDetail
          selectedCycle={selectedCycle}
          billingData={selectedData}
          isLoadingCalculate={isLoadingSelected}
        />
      </div>
    </div>
  )
}
