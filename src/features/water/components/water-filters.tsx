import { Building2, Droplets } from 'lucide-react'
import { ZeiaSelect } from '@/components/ui/select'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { useWaterFilters } from '../hooks/use-water-filters'

export function WaterFilters() {
  const {
    headquarters,
    pipes,
    sedeId,
    tuberiaId,
    dateAfter,
    dateBefore,
    setSedeId,
    setTuberiaId,
    setDateRange,
    isLoadingHeadquarters,
  } = useWaterFilters()

  const sedeOptions = headquarters.map((h) => ({
    value: String(h.id),
    label: h.name,
  }))

  const pipeOptions = pipes.map((p) => ({
    value: String(p.id),
    label: p.name,
  }))

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Sede Selector */}
      <div className="flex flex-col gap-1.5 min-w-[200px]">
        <label className="label-executive" style={{ color: '#88939b' }}>Sede</label>
        {isLoadingHeadquarters ? (
          <div className="w-full h-[43px] rounded-lg border border-border bg-card animate-pulse" />
        ) : (
          <ZeiaSelect
            options={sedeOptions}
            value={sedeId ? String(sedeId) : ''}
            onChange={(val) => setSedeId(Number(val))}
            placeholder="Seleccionar sede"
            icon={Building2}
          />
        )}
      </div>

      {/* Tubería Selector */}
      <div className="flex flex-col gap-1.5 min-w-[240px]">
        <label className="label-executive" style={{ color: '#88939b' }}>Tubería</label>
        {isLoadingHeadquarters ? (
          <div className="w-full h-[43px] rounded-lg border border-border bg-card animate-pulse" />
        ) : pipes.length === 0 ? (
          <div className="w-full h-[43px] rounded-lg border border-border bg-card flex items-center px-4 text-sm text-text-muted">
            Seleccione una sede primero
          </div>
        ) : (
          <ZeiaSelect
            options={pipeOptions}
            value={tuberiaId ? String(tuberiaId) : ''}
            onChange={(val) => setTuberiaId(Number(val))}
            placeholder="Seleccionar tubería"
            icon={Droplets}
          />
        )}
      </div>

      {/* Date Range Picker */}
      <div className="flex flex-col gap-1.5">
        <label className="label-executive" style={{ color: '#88939b' }}>Rango de Fechas</label>
        <DateRangePicker
          value={{
            startDate: dateAfter,
            endDate: dateBefore,
          }}
          onChange={(range) => setDateRange(range)}
          placeholder="Seleccionar fechas"
        />
      </div>
    </div>
  )
}
