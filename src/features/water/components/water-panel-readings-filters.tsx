import { Building2, Droplets, Activity, Tag } from 'lucide-react'
import { ZeiaSelect } from '@/components/ui/select'
import { WATER_INDICATOR_OPTIONS } from '../lib/indicators'
import {
  useWaterPanelReadingsFilters,
  WEEKDAY_OPTIONS,
  WEEKDAY_LABELS,
  MONTHS_ES,
  buildAnioOptions,
  type Weekday,
} from '../hooks/use-water-panel-readings-filters'
import { cn } from '@/lib/utils'

export function WaterPanelReadingsFilters() {
  const {
    headquarters,
    pipes,
    measurementPoints,
    sedeId,
    tuberiaId,
    puntoId,
    indicador,
    weekday,
    anio,
    mes,
    isLoadingHeadquarters,
    isLoadingMeasurementPoints,
    setSedeId,
    setTuberiaId,
    setPuntoId,
    setIndicador,
    setWeekday,
    setAnio,
    setMes,
  } = useWaterPanelReadingsFilters()

  const sedeOptions = headquarters.map((h) => ({ value: String(h.id), label: h.name }))
  const pipeOptions = pipes.map((p) => ({ value: String(p.id), label: p.name }))
  const puntoOptions = measurementPoints.map((mp) => ({ value: String(mp.id), label: mp.name }))

  const anioOptions = buildAnioOptions(new Date().getFullYear()).map((y) => ({
    value: String(y),
    label: String(y),
  }))

  const mesOptions = MONTHS_ES.map((label, index) => ({
    value: String(index),
    label,
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

      {/* Indicador */}
      <div className="flex flex-col gap-1.5 min-w-[220px]">
        <label className="label-executive" style={{ color: '#88939b' }}>Indicador</label>
        <ZeiaSelect
          options={WATER_INDICATOR_OPTIONS}
          value={indicador}
          onChange={(val) => setIndicador(val)}
          placeholder="Seleccionar indicador"
          icon={Tag}
        />
      </div>

      {/* Weekday toggle */}
      <div className="flex flex-col gap-1.5">
        <label className="label-executive" style={{ color: '#88939b' }}>Días</label>
        <div
          role="group"
          aria-label="Filtro de días de la semana"
          className="flex h-[43px] rounded-lg border border-border overflow-hidden bg-card"
        >
          {WEEKDAY_OPTIONS.map((opt: Weekday) => {
            const isActive = opt === weekday
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setWeekday(opt)}
                aria-pressed={isActive}
                className={cn(
                  'px-4 text-sm font-semibold transition-colors duration-150',
                  'border-r border-border last:border-r-0',
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-card text-text-secondary hover:bg-primary/10 hover:text-text-primary'
                )}
                title={WEEKDAY_LABELS[opt]}
              >
                {WEEKDAY_LABELS[opt]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Year + Month pickers */}
      <div className="flex flex-col gap-1.5">
        <label className="label-executive" style={{ color: '#88939b' }}>Periodo</label>
        <div className="flex gap-2">
          <div className="min-w-[110px]">
            <ZeiaSelect
              options={anioOptions}
              value={String(anio)}
              onChange={(val) => setAnio(Number(val))}
              placeholder="Año"
            />
          </div>
          <div className="min-w-[160px]">
            <ZeiaSelect
              options={mesOptions}
              value={String(mes)}
              onChange={(val) => setMes(Number(val))}
              placeholder="Mes"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
