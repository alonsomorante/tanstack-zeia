import { useState } from 'react'
import { Building2, Droplets, Activity, Tag, FileSpreadsheet, FileText } from 'lucide-react'
import { ZeiaSelect } from '@/components/ui/select'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { WATER_INDICATOR_OPTIONS } from '../lib/indicators'
import {
  useWaterHomeFilters,
  AGRUPACION_OPTIONS,
  AGRUPACION_LABELS,
  type Agrupacion,
} from '../hooks/use-water-home-filters'
import type { WaterReportFileFormat } from '../api/water-download-report'
import { cn } from '@/lib/utils'

const WATER_FILE_FORMATS: Array<{ value: WaterReportFileFormat; label: string; icon: typeof FileSpreadsheet }> = [
  { value: 'xlsx', label: 'XLSX', icon: FileSpreadsheet },
  { value: 'csv', label: 'CSV', icon: FileText },
]

interface WaterHomeFiltersProps {
  onDownloadReport?: (format: WaterReportFileFormat) => void
  isDownloadingReport?: boolean
  canDownload?: boolean
}

export function WaterHomeFilters({
  onDownloadReport,
  isDownloadingReport,
  canDownload,
}: WaterHomeFiltersProps) {
  const [fileFormat, setFileFormat] = useState<WaterReportFileFormat>('xlsx')
  const {
    headquarters,
    pipes,
    measurementPoints,
    sedeId,
    tuberiaId,
    puntoId,
    indicador,
    agrupacion,
    dateAfter,
    dateBefore,
    setSedeId,
    setTuberiaId,
    setPuntoId,
    setIndicador,
    setAgrupacion,
    setDateRange,
    isLoadingHeadquarters,
    isLoadingMeasurementPoints,
  } = useWaterHomeFilters()

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

      {/* Download: Format segmented control + button */}
      {onDownloadReport && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="label-executive" style={{ color: '#88939b' }}>Formato de Descarga</label>
            <div
              role="radiogroup"
              aria-label="Formato de descarga"
              className="inline-flex items-center gap-1 p-1 rounded-lg border border-border bg-card h-[43px]"
            >
              {WATER_FILE_FORMATS.map(({ value, label, icon: Icon }) => {
                const isActive = fileFormat === value
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => setFileFormat(value)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 rounded-md text-sm font-semibold transition-all duration-200 h-[33px]',
                      isActive
                        ? 'bg-green-600 text-white shadow-soft'
                        : 'text-text-muted hover:text-text-primary hover:bg-muted'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label-executive text-text-muted opacity-0 select-none">Descargar</label>
            <button
              onClick={() => onDownloadReport(fileFormat)}
              disabled={isDownloadingReport || !canDownload}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors h-[43px]',
                'bg-green-600 text-white hover:bg-green-700',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {fileFormat === 'xlsx' ? (
                <img src="/excel.png" alt="Excel" className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              {isDownloadingReport ? 'Descargando...' : `Descargar ${fileFormat.toUpperCase()}`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
