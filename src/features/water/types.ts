export interface WaterPipe {
  id: number
  name: string
  is_active: boolean
  is_main: boolean
}

export interface WaterHeadquarter {
  id: number
  name: string
  is_active: boolean
  water_pipes: WaterPipe[]
}

export interface WaterHeadquartersResponse {
  count: number
  results: WaterHeadquarter[]
}

export interface WaterMeasurementPoint {
  id: number
  name: string
  is_active: boolean
  is_main: boolean
  water_pipe: string
}

export interface WaterMeasurementPointsResponse {
  count: number
  next: string | null
  previous: string | null
  results: WaterMeasurementPoint[]
}

export interface WaterConsumptionSummary {
  water_pipe_id: number
  water_pipe_name: string
  today_consumption_litros: number
  month_consumption_litros: number
  month_average_daily_litros: number
  date_range: {
    today: string
    month_start: string
    month_end: string
  }
}

export interface WaterDistributionResult {
  measurement_point_water_id: number | null
  measurement_point_water_name: string
  dev_eui: string | null
  is_main: boolean
  is_active: boolean
  consumption_litros: number
  consumption_percentage: number
  first_reading_value: number | null
  last_reading_value: number | null
  first_reading_time: string | null
  last_reading_time: string | null
  is_highest: boolean
}

export interface WaterDistributionResponse {
  water_pipe_id: number
  water_pipe_name: string
  main_consumption_litros: number
  total_measurement_points: number
  date_range: {
    type: string
    start_date: string
    end_date: string
  }
  results: WaterDistributionResult[]
}

export interface WaterReadingGraphPoint {
  period: string
  first_reading: string
  last_reading: string
  indicator: string
  unit: string
  first_value: number
  last_value: number
  difference: number | null
  measurement_point: string
}

export type WaterReadingsGraphResponse = WaterReadingGraphPoint[]

export interface WaterReadingIndicators {
  id: number
  measurement_point_name: string
  values: Record<string, number>
}

export interface WaterReading {
  created_at: string
  indicators: WaterReadingIndicators
}

export interface WaterReadingsResponse {
  count: number
  next: string | null
  previous: string | null
  results: WaterReading[]
}
