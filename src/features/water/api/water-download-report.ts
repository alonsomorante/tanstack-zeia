import { downloadExcelFile } from '@/features/dashboard/api/alerts/shared/download'

const API_BASE_URL = 'https://api.energy.zeia.com.pe'

export type WaterReportFileFormat = 'csv' | 'xlsx'

export interface DownloadWaterReadingsReportParams {
  headquarterId: number
  waterPipeId: number
  measurementPointId: number
  measurementPointName: string
  dateAfter: string
  dateBefore: string
  fileFormat: WaterReportFileFormat
}

function formatFilenameDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}-${month}-${year.slice(2)}`
}

export async function downloadWaterReadingsReport(
  params: DownloadWaterReadingsReportParams
): Promise<void> {
  const searchParams = new URLSearchParams({
    date_after: params.dateAfter,
    date_before: params.dateBefore,
    file_format: params.fileFormat,
  })

  const url = `${API_BASE_URL}/api/v1/headquarter/${params.headquarterId}/water_pipe/${params.waterPipeId}/measurement_point_water/${params.measurementPointId}/readings/report?${searchParams.toString()}`
  const safePointName = params.measurementPointName.replace(/\s+/g, '_')
  const dateAfterStr = formatFilenameDate(params.dateAfter)
  const dateBeforeStr = formatFilenameDate(params.dateBefore)
  const filename = `${safePointName}_${dateAfterStr}_${dateBeforeStr}.${params.fileFormat}`

  return downloadExcelFile(url, filename)
}
