import { useMemo, useState } from 'react'
import { useAllPanelsConsumption } from '../hooks/use-all-panels-consumption'
import { AllPanelsHero } from './all-panels-hero'
import { AllPanelsChart } from './all-panels-chart'
import { AllPanelsDetail } from './all-panels-detail'
import { formatDateReadable } from '@/lib/date-utils'

interface AllPanelsViewProps {
  sedeId: number
  sedeName: string
  dateAfterStr: string
  dateBeforeStr: string
}

function daysInRange(dateAfterStr: string, dateBeforeStr: string): number | null {
  const parse = (s: string) => {
    const parts = s.split('-').map(Number)
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null
    return new Date(parts[0], parts[1] - 1, parts[2]).getTime()
  }
  const start = parse(dateAfterStr)
  const end = parse(dateBeforeStr)
  if (start == null || end == null || end < start) return null
  return Math.round((end - start) / 86400000) + 1
}

export function AllPanelsView({ sedeId, sedeName, dateAfterStr, dateBeforeStr }: AllPanelsViewProps) {
  const { panels, totalKwh, topPanel, isLoading } = useAllPanelsConsumption(
    sedeId,
    dateAfterStr,
    dateBeforeStr
  )

  const [selectedPanelId, setSelectedPanelId] = useState<number | null>(null)

  const selected = useMemo(() => {
    if (selectedPanelId != null) {
      return panels.find((p) => p.panel.id === selectedPanelId) ?? topPanel
    }
    return topPanel
  }, [selectedPanelId, panels, topPanel])

  const pointCount = useMemo(
    () => panels.reduce((sum, p) => sum + (p.data?.total_measurement_points ?? 0), 0),
    [panels]
  )

  const days = daysInRange(dateAfterStr, dateBeforeStr)
  const dailyAvg = days ? totalKwh / days : null
  const topShare = topPanel && totalKwh > 0 ? (topPanel.mainKwh / totalKwh) * 100 : null

  return (
    <div className="space-y-4">
      <AllPanelsHero
        sedeId={sedeId}
        sedeName={sedeName}
        totalKwh={totalKwh}
        dateRangeLabel={`${formatDateReadable(dateAfterStr)} → ${formatDateReadable(dateBeforeStr)}`}
        dailyAvgKwh={dailyAvg}
        topPanelName={topPanel?.panel.name ?? null}
        topPanelKwh={topPanel?.mainKwh ?? null}
        topPanelShare={topShare}
        panelCount={panels.length}
        pointCount={pointCount}
        isLoading={isLoading}
      />
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
        <AllPanelsChart
          panels={panels}
          selectedPanelId={selected?.panel.id ?? null}
          onSelect={setSelectedPanelId}
          isLoading={isLoading}
        />
        <AllPanelsDetail
          selected={selected}
          totalKwh={totalKwh}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
