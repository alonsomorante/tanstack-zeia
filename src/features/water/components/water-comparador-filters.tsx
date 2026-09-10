import { Building2, Droplets, Activity } from 'lucide-react'
import { ZeiaSelect } from '@/components/ui/select'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { useWaterComparadorFilters } from '../hooks/use-water-comparador-filters'

export function WaterComparadorFilters() {
  const {
    headquarters,
    pipes,
    measurementPoints,
    sedeId,
    tuberiaId,
    puntoId,
    dateAfter,
    dateBefore,
    setSedeId,
    setTuberiaId,
    setPuntoId,
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
