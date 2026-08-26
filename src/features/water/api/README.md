# Water API Endpoints

Base URL: `https://api.energy.zeia.com.pe/api/v1`

Authentication: `Authorization: Token {token}` header required for all endpoints.
Endpoints con datos de agua requieren `is_user_water_monitoring: true`.

---

## 1. Water Headquarters (Sedes y Tuberías)

```
GET /user/water-headquarters/
```

Returns all water headquarters (sedes) accessible to the user, including their water pipes.

**Response:** `WaterHeadquartersResponse` (see `src/features/water/types.ts`)

```typescript
interface WaterHeadquartersResponse {
  count: number
  results: Array<{
    id: number
    name: string
    is_active: boolean
    water_pipes: Array<{
      id: number
      name: string
      is_active: boolean
      is_main: boolean
    }>
  }>
}
```

---

## 2. Water Measurement Points by Water Pipe

```
GET /headquarter/{headquarter_id}/water_pipe/{water_pipe_id}/measurement_points_water/list/?page=1&page_size=100
```

Returns the paginated list of water measurement points for a specific water pipe.

**Path params:**
- `headquarter_id` (number, required)
- `water_pipe_id` (number, required)

**Query params:**
- `page` (integer, default `1`)
- `page_size` (integer, default `10`; the frontend requests `100` to load all points for selectors)

**Response:** `WaterMeasurementPointsResponse` (see `src/features/water/types.ts`)

```typescript
interface WaterMeasurementPointsResponse {
  count: number
  next: string | null
  previous: string | null
  results: Array<{
    id: number
    name: string
    is_active: boolean
    is_main: boolean
    water_pipe: string
  }>
}
```

---

## 3. Water Consumption Summary (KPIs)

```
GET /water_pipe/{water_pipe_id}/consumption-summary/
```

Calculates today's consumption, current month consumption, and monthly daily average (liters), using only active measurement points and baseline logic (`last_value - baseline`, min 0).

**Path params:**
- `water_pipe_id` (number, required)

**Response:** `WaterConsumptionSummary` (see `src/features/water/types.ts`)

```typescript
interface WaterConsumptionSummary {
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
```

---

## 4. Water Consumption Distribution (Donut / Desglose)

```
GET /water_pipe/{water_pipe_id}/consumption-distribution/?date_after={YYYY-MM-DD}&date_before={YYYY-MM-DD}
```

Returns total consumption in liters and the percentage participation of each measurement point against the main point (`is_main=True`).

**Path params:**
- `water_pipe_id` (number, required)

**Query params:**
- `date_after` (string) — format `YYYY-MM-DD`
- `date_before` (string) — format `YYYY-MM-DD`

**Error cases (400):** no main measurement point, or main point has no consumption data for the period.
**Empty:** `200 OK` with empty `results` when no active points exist.

**Response:** `WaterDistributionResponse` (see `src/features/water/types.ts`)

```typescript
interface WaterDistributionResponse {
  water_pipe_id: number
  water_pipe_name: string
  main_consumption_litros: number
  total_measurement_points: number
  date_range: {
    type: string
    start_date: string
    end_date: string
  }
  results: Array<{
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
  }>
}
```

---

## 5. Water Readings Graph

```
GET /headquarter/{headquarter_id}/water_pipe/{water_pipe_id}/measurement_point_water/{measurement_point_id}/readings/graph?last_by=day&weekday={1,2,3,4,5}&date_after={YYYY-MM-DD}&date_before={YYYY-MM-DD}&indicador={indicador}
```

Returns aggregated time-series readings for a plot.

**Usado por:**
- Panel Dashboard (`last_by=day` + `weekday` fijo, según el toggle de días).
- Análisis por Indicador (`last_by=day` u `hour`, sin `weekday`).

**Path params:**
- `headquarter_id` (number, required)
- `water_pipe_id` (number, required)
- `measurement_point_id` (number, required)

**Query params:**
- `indicador` (string, default `consumo_total_litros`) — `consumo_total_litros` | `consumo_total_m3` | `litros_por_pulso`
- `last_by` (string, default `day`) — `minute` | `15min` | `30min` | `hour` | `day` | `week` | `month`
- `weekday` (string, optional, comma-separated) — ISO 8601 days (`1`=Monday … `7`=Sunday); omitted means all days
- `date_after` / `date_before` (string) — format `YYYY-MM-DD`

**Response:** `WaterReadingsGraphResponse` (see `src/features/water/types.ts`)

```typescript
type WaterReadingsGraphResponse = Array<{
  period: string
  first_reading: string
  last_reading: string
  indicator: string
  unit: string
  first_value: number
  last_value: number
  difference: number | null
  measurement_point: string
}>
```

---

## 6. Water Readings Table (Análisis por Indicador)

```
GET /headquarter/{headquarter_id}/water_pipe/{water_pipe_id}/measurement_point_water/{measurement_point_id}/readings?indicador={indicador}&date_after={YYYY-MM-DD}&date_before={YYYY-MM-DD}&page={page}&page_size={page_size}
```

Returns the paginated list of raw water readings for a measurement point (newest first).

**Path params:**
- `headquarter_id` (number, required)
- `water_pipe_id` (number, required)
- `measurement_point_id` (number, required)

**Query params (all optional):**
- `indicador` (string) — `consumo_total_litros` | `consumo_total_m3` | `litros_por_pulso`; when omitted, `values` includes all three
- `date_after` / `date_before` (string) — format `YYYY-MM-DD` (evaluated in Peru time; `date_before` is exclusive, includes the whole day)
- `hour_after` / `hour_before` (string) — e.g. `08:00`
- `weekday` (string, comma-separated) — ISO 8601 days
- `last_days` (integer) — only `7`, `15` or `30`
- `page` (integer, default `1`) / `page_size` (integer, default `10`)

**Response:** `WaterReadingsResponse` (see `src/features/water/types.ts`)

```typescript
interface WaterReadingsResponse {
  count: number
  next: string | null
  previous: string | null
  results: Array<{
    created_at: string
    indicators: {
      id: number
      measurement_point_name: string
      values: Record<string, number>
    }
  }>
}
```

---

## 7. Water Day Comparison (Comparación por Día)

```
GET /headquarter/{headquarter_id}/water_pipe/{water_pipe_id}/measurement_point_water/{measurement_point_id}/readings/graph-especific?last_by={hour|day}&date_after={YYYY-MM-DD}&date_before={YYYY-MM-DD}&weekday={1,2,3,4,5}
```

Devuelve el consumo de agua del punto de medición **agrupado por fecha** (`YYYY-MM-DD`) y, dentro de cada fecha, **por hora del día**. Cuando hay 2 o más fechas con datos en modo horario, agrega el perfil **`habitual`**: el promedio de consumo por hora a lo largo de las fechas consultadas.

**Usado por:** Comparación por Día (`/energia/water/dashboard/comparador`).

**Path params:**
- `headquarter_id` (number, required)
- `water_pipe_id` (number, required)
- `measurement_point_id` (number, required)

**Query params:**
- `last_by` (string, default `hour`) — se recomienda `hour` y `day`
- `weekday` (string, optional, comma-separated) — ISO 8601 days
- `date_after` / `date_before` (string) — format `YYYY-MM-DD`

> ⚠️ **El indicador es fijo**: siempre devuelve `consumo_total_litros` (litros). No existe el parámetro `indicador`.

**Response** (ver documentación completa externa en `WATER_DAY_COMPARISON_API.md`:

```typescript
type WaterDayComparisonResponse = Array<Record<string, WaterDayComparisonEntry[]>>
// Claves: fechas "YYYY-MM-DD" y, cuando aplica, "habitual"
// WaterDayComparisonEntry: { time, indicator, unit, value, is_average, device, measurement_point, sample_count? }
```
