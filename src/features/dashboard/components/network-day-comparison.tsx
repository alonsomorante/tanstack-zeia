import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Line } from 'react-chartjs-2'
import {
  CategoryScale,
  Chart as ChartJS,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchReadingsGraphEspecific } from '../api/readings-graph-especific'
import { addDays, formatKwh, parseDateKey, toDateKey } from '../lib/network-map'
import {
  HOUR_LABELS,
  averageProfile,
  completeDays,
  formatDayChip,
  getComparisonWindow,
  parseDayProfiles,
  weekdayName,
  type DayProfile,
} from '../lib/network-day-profile'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip)

/** Hoy siempre en cian; el resto con la paleta del comparador original (amarillo oscurecido para leerse en blanco). */
const DAY_COLORS = ['#00B7CA', '#FF6B35', '#2EC4B6', '#E71D36', '#9B5DE5', '#F15BB5', '#00BBF9', '#B8860B']
const MAX_DAYS = DAY_COLORS.length

/** Intensidad del calendario según los kWh del día (5 niveles). */
const HEAT = ['#E6F9FB', '#B9EEF3', '#7FDDE8', '#36C8D9', '#009EAE']

const WEEKDAY_HEADERS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']

interface Preset {
  id: string
  label: string
  days: string[]
}

function buildPresets(todayKey: string): Preset[] {
  const today = parseDateKey(todayKey)
  if (!today) return []
  const back = (n: number) => toDateKey(addDays(today, -n))
  return [
    { id: 'ayer', label: 'Hoy vs ayer', days: [todayKey, back(1)] },
    { id: 'semana', label: 'Hoy vs hace una semana', days: [todayKey, back(7)] },
    { id: 'mismo-dia', label: `Hoy vs los últimos 4 ${weekdayName(todayKey, true)}`, days: [todayKey, back(7), back(14), back(21), back(28)] },
    { id: '7dias', label: 'Últimos 7 días', days: Array.from({ length: 7 }, (_, i) => back(i)) },
  ]
}

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((d) => b.includes(d))
}

function heatLevel(total: number, thresholds: number[]): number {
  let level = 0
  while (level < thresholds.length && total > thresholds[level]) level++
  return level
}

interface NetworkDayComparisonPanelProps {
  sedeId: number
  panelId: number
  pointId: number
  today: Date
}

export function NetworkDayComparisonPanel({ sedeId, panelId, pointId, today }: NetworkDayComparisonPanelProps) {
  const window = useMemo(() => getComparisonWindow(today), [today])
  const presets = useMemo(() => buildPresets(window.todayKey), [window.todayKey])
  const [selected, setSelected] = useState<string[]>(() => presets.find((p) => p.id === 'mismo-dia')?.days ?? [window.todayKey])

  // Una sola consulta de 5 semanas: alimenta el calendario y la gráfica (misma key que "Hoy vs lo habitual").
  const { data, isLoading, isError } = useQuery({
    queryKey: ['readings-graph-especific', sedeId, panelId, pointId, window.dateAfter, window.dateBefore],
    queryFn: () => fetchReadingsGraphEspecific(sedeId, panelId, pointId, window.dateAfter, window.dateBefore),
    staleTime: 5 * 60 * 1000,
  })
  const profiles = useMemo(() => parseDayProfiles(data), [data])

  // Cuantiles de los días completos (el día en curso no define la escala).
  const thresholds = useMemo(() => {
    const totals = completeDays([...profiles.values()]).map((p) => p.total).sort((a, b) => a - b)
    if (totals.length === 0) return []
    return [0.2, 0.4, 0.6, 0.8].map((q) => totals[Math.min(totals.length - 1, Math.floor(q * totals.length))])
  }, [profiles])

  // Más reciente primero: hoy queda en cian.
  const ordered = useMemo(() => [...selected].sort((a, b) => (a < b ? 1 : -1)), [selected])
  const colorOf = (key: string) => DAY_COLORS[ordered.indexOf(key) % DAY_COLORS.length]
  const { selectedProfiles, complete, average } = useMemo(() => {
    const chosen = ordered.map((key) => profiles.get(key)).filter((p): p is DayProfile => p != null)
    // El promedio usa solo días completos: hoy (en curso) no entra.
    const full = completeDays(chosen.filter((p) => p.date !== window.todayKey))
    return { selectedProfiles: chosen, complete: full, average: full.length >= 2 ? averageProfile(full) : null }
  }, [ordered, profiles, window.todayKey])

  const toggleDay = (key: string) => {
    setSelected((prev) => {
      if (prev.includes(key)) return prev.filter((d) => d !== key)
      return prev.length >= MAX_DAYS ? prev : [...prev, key]
    })
  }

  const chartData: ChartData<'line'> = useMemo(() => {
    const datasets: ChartData<'line'>['datasets'] = ordered
      .map((key, index) => ({ key, index, profile: profiles.get(key) }))
      .filter((d) => d.profile != null)
      .map(({ key, index, profile }) => ({
        label: key === window.todayKey ? `${formatDayChip(key)} (hoy)` : formatDayChip(key),
        data: profile!.hours,
        borderColor: DAY_COLORS[index % DAY_COLORS.length],
        backgroundColor: 'transparent',
        borderWidth: key === window.todayKey ? 3 : 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.3,
        spanGaps: true,
      }))
    if (average) {
      datasets.push({
        label: 'Promedio de los días elegidos',
        data: average,
        borderColor: '#1C1C1E',
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        borderDash: [8, 4],
        pointRadius: 0,
        pointHoverRadius: 3,
        tension: 0.3,
        spanGaps: true,
      })
    }
    return { labels: HOUR_LABELS, datasets }
  }, [ordered, profiles, average, window.todayKey])

  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        datalabels: { display: false },
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => (items[0] ? `Hora: ${items[0].label}` : ''),
            label: (context) => {
              const value = context.raw as number | null
              return value == null ? '' : `${context.dataset.label}: ${value.toLocaleString('es-PE', { maximumFractionDigits: 2 })} kWh`
            },
          },
        },
      },
      scales: {
        x: { grid: { color: 'rgba(136,147,155,0.08)' }, ticks: { color: '#88939b', maxTicksLimit: 12, maxRotation: 0 } },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(136,147,155,0.1)' },
          ticks: { color: '#88939b' },
          title: { display: true, text: 'Consumo por hora (kWh)', color: '#88939b', font: { size: 12, weight: 'bold' } },
        },
      },
    }),
    []
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="space-y-5">
        <section>
          <h3 className="label-executive">Comparaciones rápidas</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {presets.map((preset) => {
              const active = sameSet(preset.days, selected)
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelected(preset.days)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                    active ? 'border-primary bg-primary text-white' : 'border-border bg-card text-text-secondary hover:border-primary/40 hover:text-primary'
                  )}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="label-executive">Últimas 5 semanas</h3>
            <span className="text-[11px] text-text-muted">
              {selected.length}/{MAX_DAYS} días
            </span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">Toca un día para agregarlo o quitarlo. Más oscuro, más consumo.</p>
          <div className="mt-3 grid grid-cols-7 gap-1.5" role="grid" aria-label="Calendario de consumo por día">
            {WEEKDAY_HEADERS.map((d) => (
              <span key={d} className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {d}
              </span>
            ))}
            {window.weeks.flat().map((key) => {
              const profile = profiles.get(key)
              const isFuture = key > window.todayKey
              const isToday = key === window.todayKey
              const isSelected = selected.includes(key)
              const level = profile && !isToday ? heatLevel(profile.total, thresholds) : -1
              const date = parseDateKey(key)
              const disabled = isFuture || !profile || (!isSelected && selected.length >= MAX_DAYS)
              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  aria-pressed={isSelected}
                  onClick={() => toggleDay(key)}
                  title={
                    profile
                      ? `${formatDayChip(key)}: ${formatKwh(profile.total)} kWh${isToday ? ' (en curso)' : ''}`
                      : isFuture
                        ? formatDayChip(key)
                        : `${formatDayChip(key)}: sin datos`
                  }
                  className={cn(
                    'relative flex aspect-square items-center justify-center rounded-lg font-mono text-xs font-semibold tabular-nums transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    level >= 3 ? 'text-white' : 'text-foreground',
                    profile && 'enabled:hover:scale-105',
                    isToday && 'border-2 border-primary bg-card text-primary',
                    disabled && profile && !isFuture && 'cursor-not-allowed opacity-50',
                    // Al final para que ganen sobre el color del texto.
                    !profile && !isFuture && 'border border-dashed border-border text-text-muted/50',
                    isFuture && 'font-normal text-text-muted/40'
                  )}
                  style={{
                    backgroundColor: level >= 0 ? HEAT[level] : undefined,
                    boxShadow: isSelected ? `0 0 0 2px #FFFFFF, 0 0 0 4px ${colorOf(key)}` : undefined,
                  }}
                >
                  {date?.getDate()}
                  {isSelected && (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white" style={{ backgroundColor: colorOf(key) }} />
                  )}
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-text-muted">
            Menos
            {HEAT.map((color) => (
              <span key={color} className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: color }} />
            ))}
            Más
          </div>
        </section>
      </div>

      <section className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-soft">
        <h3 className="text-base font-semibold text-foreground">Consumo por hora de los días elegidos</h3>
        {isLoading ? (
          <div className="mt-4 h-[340px] animate-pulse rounded-lg bg-muted" />
        ) : isError ? (
          <p className="mt-4 text-sm text-warning">No se pudo cargar el consumo por hora de este punto.</p>
        ) : selectedProfiles.length === 0 ? (
          <div className="flex h-[340px] items-center justify-center gap-2 text-sm text-text-muted">
            <Activity className="h-5 w-5" /> Elige uno o más días en el calendario
          </div>
        ) : (
          <>
            <div className="mt-4 h-[340px]">
              <Line data={chartData} options={options} />
            </div>
            <ul className="mt-4 flex flex-wrap gap-2">
              {selectedProfiles.map((profile) => (
                <li key={profile.date}>
                  <button
                    type="button"
                    onClick={() => toggleDay(profile.date)}
                    title="Quitar de la comparación"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-text-secondary transition-colors hover:border-danger/40 hover:text-danger"
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorOf(profile.date) }} />
                    <span className="font-medium text-foreground">{formatDayChip(profile.date)}</span>
                    <span className="font-mono tabular-nums">
                      {formatKwh(profile.total)} kWh{profile.date === window.todayKey ? ' · en curso' : ''}
                    </span>
                  </button>
                </li>
              ))}
              {average && (
                <li className="inline-flex items-center gap-2 rounded-full border border-dashed border-foreground/30 px-3 py-1 text-xs text-text-secondary">
                  <span className="h-0 w-4 border-t-2 border-dashed border-foreground" />
                  Promedio de {complete.length} días completos
                </li>
              )}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
