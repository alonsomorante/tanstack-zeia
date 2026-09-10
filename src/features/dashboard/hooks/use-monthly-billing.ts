import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useBillingCycles } from './use-billing-cycles'
import { fetchBillingCalculate } from '../api/billing-calculate'
import { getBillingTotals } from '../lib/billing-format'
import type { BillingCycleItem } from '../types'

const MAX_MONTHS = 12

export function useMonthlyBilling(sedeId: number) {
  const { data: cyclesData, isLoading: isLoadingCycles } = useBillingCycles(sedeId)

  const cycles: BillingCycleItem[] = useMemo(() => {
    const results = cyclesData?.results ?? []
    const sortedDesc = [...results].sort((a, b) => b.start_date.localeCompare(a.start_date))
    const recent = sortedDesc.slice(0, MAX_MONTHS)
    return recent.sort((a, b) => a.start_date.localeCompare(b.start_date))
  }, [cyclesData])

  const calculates = useQueries({
    queries: cycles.map((cycle) => ({
      queryKey: ['billing-calculate', sedeId, cycle.start_date, cycle.end_date],
      queryFn: () => fetchBillingCalculate(sedeId, cycle.start_date, cycle.end_date),
      enabled: !!sedeId,
      staleTime: 5 * 60 * 1000,
    })),
  })

  const isLoadingCalculates = calculates.some((q) => q.isLoading)

  const totalsByCycleId = useMemo(() => {
    const map = new Map<number, { currency: string; amount: number }[]>()
    cycles.forEach((cycle, index) => {
      const data = calculates[index]?.data
      if (data) {
        map.set(cycle.id, getBillingTotals(data))
      } else {
        map.set(cycle.id, [])
      }
    })
    return map
  }, [cycles, calculates])

  const displayCurrency: string | null = useMemo(() => {
    const sums = new Map<string, number>()
    for (const totals of totalsByCycleId.values()) {
      for (const { currency, amount } of totals) {
        sums.set(currency, (sums.get(currency) ?? 0) + amount)
      }
    }
    let best: string | null = null
    let bestSum = -Infinity
    for (const [currency, sum] of sums) {
      if (sum > bestSum) {
        bestSum = sum
        best = currency
      }
    }
    return best
  }, [totalsByCycleId])

  const amounts = useMemo(() => {
    return cycles.map((cycle) => {
      const totals = totalsByCycleId.get(cycle.id) ?? []
      if (!displayCurrency) return 0
      return totals.find((t) => t.currency === displayCurrency)?.amount ?? 0
    })
  }, [cycles, totalsByCycleId, displayCurrency])

  const defaultCycle: BillingCycleItem | null = useMemo(() => {
    if (cycles.length === 0) return null
    return cycles.find((c) => c.is_current) ?? cycles[cycles.length - 1] ?? null
  }, [cycles])

  return {
    cycles,
    calculates,
    totalsByCycleId,
    displayCurrency,
    amounts,
    defaultCycle,
    isLoadingCycles,
    isLoadingCalculates,
    isLoading: isLoadingCycles || isLoadingCalculates,
  }
}
