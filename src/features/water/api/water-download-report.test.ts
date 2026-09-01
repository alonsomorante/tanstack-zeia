import { describe, it, expect, vi, beforeEach } from 'vitest'
import { downloadWaterReadingsReport } from './water-download-report'
import { downloadExcelFile } from '@/features/dashboard/api/alerts/shared/download'

vi.mock('@/features/dashboard/api/alerts/shared/download', () => ({
  downloadExcelFile: vi.fn(),
}))

const downloadExcelFileMock = vi.mocked(downloadExcelFile)

describe('downloadWaterReadingsReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    downloadExcelFileMock.mockResolvedValue(undefined)
  })

  it('llama al endpoint readings/report con file_format=xlsx y filename con nombre del punto', async () => {
    await downloadWaterReadingsReport({
      headquarterId: 199,
      waterPipeId: 1,
      measurementPointId: 1,
      measurementPointName: 'Medidor Principal',
      dateAfter: '2026-05-01',
      dateBefore: '2026-05-10',
      fileFormat: 'xlsx',
    })

    expect(downloadExcelFileMock).toHaveBeenCalledTimes(1)
    const [url, filename] = downloadExcelFileMock.mock.calls[0]
    expect(url).toContain(
      '/api/v1/headquarter/199/water_pipe/1/measurement_point_water/1/readings/report?'
    )
    expect(url).toContain('file_format=xlsx')
    expect(filename).toBe('Medidor_Principal_01-05-26_10-05-26.xlsx')
  })

  it('llama al endpoint readings/report con file_format=csv', async () => {
    await downloadWaterReadingsReport({
      headquarterId: 199,
      waterPipeId: 1,
      measurementPointId: 1,
      measurementPointName: 'Medidor Principal',
      dateAfter: '2026-05-01',
      dateBefore: '2026-05-10',
      fileFormat: 'csv',
    })

    expect(downloadExcelFileMock).toHaveBeenCalledTimes(1)
    const [url, filename] = downloadExcelFileMock.mock.calls[0]
    expect(url).toContain('file_format=csv')
    expect(filename).toBe('Medidor_Principal_01-05-26_10-05-26.csv')
  })

  it('incluye date_after y date_before en la URL', async () => {
    await downloadWaterReadingsReport({
      headquarterId: 199,
      waterPipeId: 1,
      measurementPointId: 1,
      measurementPointName: 'Medidor Principal',
      dateAfter: '2026-05-01',
      dateBefore: '2026-05-10',
      fileFormat: 'csv',
    })

    const [url] = downloadExcelFileMock.mock.calls[0]
    expect(url).toContain('date_after=2026-05-01')
    expect(url).toContain('date_before=2026-05-10')
  })
})
