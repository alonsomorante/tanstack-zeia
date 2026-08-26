import { Building2, Droplets, Activity } from 'lucide-react'
import { ZeiaSelect } from '@/components/ui/select'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import {
  useWaterComparadorFilters,
  AGRUPACION_OPTIONS,
  AGRUPACION_LABELS,
  type Agrupacion,
} from '../hooks/use-water-comparador-filters'
import { cn } from '@/lib/utils'

export function WaterComparadorFilters() {
  const {
    headquarters,
    pipes,
    measurementPoints,
    sedeId,
    tuberiaId,
    puntoId,
    agrupacion,
    dateAfter,
    dateBefore,
    setSedeId,
    setTuberiaId,
    setPuntoId,
    setAgrupacion,
    setDateRange,
    isLoadingHeadquarters,
    isLoadingMeasurementPoints,
  } = useWaterComparadorFilters()

  const sedeOptions = headquarters.map((h) => ({
    value: String(h.id),
    label: h.name,
  }))

  const pipeOptions = pipes.map((p) => ({
    value: String(p.id),
    label: p.name,
  }))

  const puntoOptions = measurementPoints.map((mp) => ({
    value: String(mp.id),
    label: mp.name,
  }))

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Sede */}
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

      {/* Tubería */}
      <div className="flex flex-col gap-1.5 min-w-[240px]">
        <label className="label-executive" style={{ color: '#88939b' }}>Tubería</label>
        {pipes.length === 0 ? (
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

      {/* Punto de medición */}
      <div className="flex flex-col gap-1.5 min-w-[240px]">
        <label className="label-executive" style={{ color: '#88939b' }}>Punto de Medición</label>
        {isLoadingMeasurementPoints || pipes.length === 0 ? (
          <div className="w-full h-[43px] rounded-lg border border-border bg-card flex items-center px-4 text-sm text-text-muted">
            {pipes.length === 0 ? 'Seleccione una tubería primero' : 'Cargando puntos...'}
          </div>
        ) : (
          <ZeiaSelect
            options={puntoOptions}
            value={puntoId ? String(puntoId) : ''}
            onChange={(val) => setPuntoId(Number(val))}
            placeholder="Seleccionar punto"
            icon={Activity}
          />
        )}
      </div>

      {/* Agrupación temporal */}
      <div className="flex flex-col gap-1.5">
        <label className="label-executive" style={{ color: '#88939b' }}>Agrupación</label>
        <div
          role="group"
          aria-label="Agrupación temporal"
          className="flex h-[43px] rounded-lg border border-border overflow-hidden bg-card"
        >
          {AGRUPACION_OPTIONS.map((opt: Agrupacion) => {
            const isActive = opt === agrupacion
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setAgrupacion(opt)}
                aria-pressed={isActive}
                className={cn(
                  'px-4 text-sm font-semibold transition-colors duration-150',
                  'border-r border-border last:border-r-0',
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-card text-text-secondary hover:bg-primary/10 hover:text-text-primary'
                )}
                title={AGRUPACION_LABELS[opt]}
              >
                {AGRUPACION_LABELS[opt]}
              </button>
            )
          })}
        </div>
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
