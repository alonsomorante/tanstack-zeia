# Water Indicator Analysis API

Documentación técnica de los endpoints de la API de Agua del módulo **Análisis por Indicador** para el sistema **Zeia-Energy**.

---

## Índice

- [Autenticación y Seguridad](#autenticación-y-seguridad)
- [Resumen de Endpoints](#resumen-de-endpoints)
- [1. Gráfica de Lecturas — `GET /api/v1/headquarter/<hq_id>/water_pipe/<wp_id>/measurement_point_water/<mpw_id>/readings/graph`](#1-gráfica-de-lecturas--get-apiv1headquarterhq_idwater_pipewp_idmeasurement_point_watermpw_idreadingsgraph)
- [2. Tabla de Lecturas — `GET /api/v1/headquarter/<hq_id>/water_pipe/<wp_id>/measurement_point_water/<mpw_id>/readings`](#2-tabla-de-lecturas--get-apiv1headquarterhq_idwater_pipewp_idmeasurement_point_watermpw_idreadings)

---

## Autenticación y Seguridad

Los endpoints de este módulo requieren autenticación por **DRF Token Authentication**. Todas las peticiones deben incluir el header:

```http
Authorization: Token <token_key>
```

> ⚠️ El esquema es `Token`, no `Bearer` ni `JWT`. El token se obtiene mediante `POST /api/v1/accounts/request-token/`.

Ambos endpoints exigen además el permiso personalizado **`IsUserWaterMonitoring`**: el usuario debe tener la bandera `is_user_water_monitoring: true` activa en su perfil, de lo contrario se retorna **`403 Forbidden`**.

El scoping multi-tenant se aplica automáticamente: si el punto de medición, tubería o sede no pertenece a una empresa asignada al usuario (`UserEnterpriseRole`), la API responde **`404 Not Found`**.

Para más detalle de autenticación y login, ver [WATER_PANEL_DASHBOARD_API.md](WATER_PANEL_DASHBOARD_API.md).

---

## Resumen de Endpoints

| Método | URL | Descripción | Permisos |
|---|---|---|---|
| `GET` | `/api/v1/headquarter/<hq_id>/water_pipe/<wp_id>/measurement_point_water/<mpw_id>/readings/graph` | Datos agregados para la gráfica del indicador seleccionado según rango de fechas y punto de medición | `IsAuthenticated`, `IsUserWaterMonitoring` |
| `GET` | `/api/v1/headquarter/<hq_id>/water_pipe/<wp_id>/measurement_point_water/<mpw_id>/readings` | Tabla paginada de lecturas crudas del punto de medición, filtrable por indicador, fecha y hora | `IsAuthenticated`, `IsUserWaterMonitoring` |

---

## 1. Gráfica de Lecturas — `GET /api/v1/headquarter/<hq_id>/water_pipe/<wp_id>/measurement_point_water/<mpw_id>/readings/graph`

Genera los datos temporales agregados del indicador seleccionado para un punto de medición de agua, dentro de un rango de fechas. Alimenta la gráfica principal del módulo Análisis por Indicador.

**Propósito en Frontend**: Renderizar la gráfica de barras/líneas del indicador según el rango de día elegido, el punto de monitoreo de agua y el indicador seleccionado.

### Parámetros de Ruta (URL Path)

| Parámetro | Tipo | Descripción |
|---|---|---|
| `hq_id` | integer | ID de la sede (`EnergyHeadquarter`) |
| `wp_id` | integer | ID de la tubería (`WaterPipe`) |
| `mpw_id` | integer | ID del punto de medición de agua (`MeasurementPointWater`) |

### Query Parameters

| Parámetro | Tipo | Obligatorio | Valores Válidos / Formato | Default | Descripción |
|---|---|---|---|---|---|
| `indicador` | string | No | `consumo_litros`<br>`consumo_m3`<br>`litros_por_pulso` | `consumo_litros` | Métrica numérica a graficar. ⚠️ **Nota:** El nombre del parámetro es `indicador` (en español), no `indicator`. |
| `last_by` | string | No | `minute`<br>`15min`<br>`30min`<br>`hour`<br>`day`<br>`week`<br>`month` | *Ninguno (datos crudos)* | Nivel de agrupación temporal de los períodos (por hora, día, semana, mes, etc.). |
| `weekday` | string (comas) | No | `1,2,3,4,5,6,7` (ISO 8601: `1`=Lunes, `7`=Domingo) | *Todos los días* | Filtra qué días de la semana incluir. **Nota para este módulo:** no es requerido; se puede omitir. Solo incluir si se desea limitar a días específicos (p. ej. días hábiles `1,2,3,4,5`). |
| `date_after` | string | No | `YYYY-MM-DD` | Fecha de la 1ª lectura disponible | Fecha inicial (00:00:00 hora Perú). |
| `date_before` | string | No | `YYYY-MM-DD` | Fecha de la última lectura disponible | Fecha final (23:59:59 hora Perú). |

### Lógica de Cálculo y Condiciones

1. **Cálculo Diferencial por Serie Temporal**: Cuando `last_by` es `15min`, `30min`, `hour`, `day`, `week` o `month`, el servidor genera los intervalos con `generate_series` y toma la **primera** y la **última** lectura de cada intervalo (`CROSS JOIN LATERAL`). El campo `difference` es: `last_value - first_value`.
2. **Solo períodos con consumo**: Se devuelven únicamente los intervalos donde `difference > 0`.
3. **Rangos automáticos**: Si no se envía `date_after`, se usa la fecha de la primera lectura registrada (con el indicador no nulo); si no se envía `date_before`, se usa la de la última lectura. Si no hay lecturas o el rango queda vacío, se retorna `[]`.
4. **Zona horaria**: Los límites `date_after`/`date_before` se interpretan en hora local de Perú (`America/Lima`). Las fechas de respuesta (`period`, `first_reading`, `last_reading`) se devuelven en esa misma zona.
5. **Unidad**: `unit` siempre es `"L"`.

### Condiciones de Error

- **`400 Bad Request`** — Indicador inválido:
  `{"detail": "The indicador parameter must be one of: consumo_litros, consumo_m3, litros_por_pulso."}`
- **`400 Bad Request`** — `last_by` inválido:
  `{"detail": "The last_by parameter must be 'minute', '15min', '30min', 'hour', 'day', 'week' or 'month'."}`
- **`400 Bad Request`** — Formato de fecha inválido:
  `{"detail": "Date parameters must use the YYYY-MM-DD format."}`
- **`404 Not Found`** — El punto de medición no pertenece a la tubería/sede indicada o no corresponde a una empresa del usuario.

### Respuesta JSON (200 OK)

Retorna un array plano de objetos:

```json
[
  {
    "period": "2026-08-03T00:00:00-05:00",
    "first_reading": "2026-08-03T00:05:00-05:00",
    "last_reading": "2026-08-03T23:55:00-05:00",
    "indicator": "consumo_litros",
    "unit": "L",
    "first_value": 125100.0,
    "last_value": 126620.41,
    "difference": 1520.41,
    "measurement_point": "Ingreso General de Red"
  },
  {
    "period": "2026-08-03T01:00:00-05:00",
    "first_reading": "2026-08-03T01:05:00-05:00",
    "last_reading": "2026-08-03T01:55:00-05:00",
    "indicator": "consumo_litros",
    "unit": "L",
    "first_value": 126620.41,
    "last_value": 126690.12,
    "difference": 69.71,
    "measurement_point": "Ingreso General de Red"
  },
  {
    "period": "2026-08-03T02:00:00-05:00",
    "first_reading": "2026-08-03T02:00:00-05:00",
    "last_reading": "2026-08-03T02:58:00-05:00",
    "indicator": "consumo_litros",
    "unit": "L",
    "first_value": 126690.12,
    "last_value": 126745.8,
    "difference": 55.68,
    "measurement_point": "Ingreso General de Red"
  }
]
```

### Ejemplos con `curl` y `JavaScript (Fetch)`

##### Ejemplo `curl` (gráfica por horas de un día, indicador litros)

```bash
curl -X GET "http://localhost:8000/api/v1/headquarter/199/water_pipe/1/measurement_point_water/1/readings/graph?last_by=hour&date_after=2026-08-03&date_before=2026-08-03&indicador=consumo_litros" \
  -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
```

##### Ejemplo `curl` (gráfica por días de un mes)

```bash
curl -X GET "http://localhost:8000/api/v1/headquarter/199/water_pipe/1/measurement_point_water/1/readings/graph?last_by=day&date_after=2026-08-01&date_before=2026-08-30&indicador=consumo_litros" \
  -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
```

##### Ejemplo `JavaScript (fetch)` para Frontend

```javascript
async function getWaterIndicatorGraph({ headquarterId, waterPipeId, measurementPointId, token, indicador, lastBy, dateAfter, dateBefore }) {
  const params = new URLSearchParams({
    indicador: indicador || 'consumo_litros',
    last_by: lastBy || 'day',
    date_after: dateAfter,
    date_before: dateBefore
  });

  const url = `http://localhost:8000/api/v1/headquarter/${headquarterId}/water_pipe/${waterPipeId}/measurement_point_water/${measurementPointId}/readings/graph?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Error al obtener datos de la gráfica');
  }

  const readings = await response.json();

  const chartCategories = readings.map(r => r.period.split('T')[0]);
  const chartSeries = readings.map(r => r.difference);

  return { chartCategories, chartSeries, raw: readings };
}
```

---

## 2. Tabla de Lecturas — `GET /api/v1/headquarter/<hq_id>/water_pipe/<wp_id>/measurement_point_water/<mpw_id>/readings`

Retorna la lista **paginada** de lecturas crudas registradas por el punto de medición de agua, ordenadas de la más reciente a la más antigua. Cada fila contiene el indicador (o los tres indicadores) solicitados.

**Propósito en Frontend**: Alimentar la tabla de datos del módulo Análisis por Indicador, permitiendo filtrar por indicador, rango de fecha/hora, días de la semana o últimos N días.

### Parámetros de Ruta (URL Path)

| Parámetro | Tipo | Descripción |
|---|---|---|
| `hq_id` | integer | ID de la sede (`EnergyHeadquarter`) |
| `wp_id` | integer | ID de la tubería (`WaterPipe`) |
| `mpw_id` | integer | ID del punto de medición de agua (`MeasurementPointWater`) |

### Query Parameters

| Parámetro | Tipo | Valores Válidos / Formato | Default | Descripción |
|---|---|---|---|---|
| `indicador` | string | `consumo_litros`<br>`consumo_m3`<br>`litros_por_pulso` | *Los 3 indicadores* | Si se envía un valor válido, la fila incluye solo ese indicador en `values`. Si se omite, incluye los tres. |
| `date_after` | string | `YYYY-MM-DD` | — | Incluye lecturas desde esa fecha (00:00:00 hora Perú, inclusive). |
| `date_before` | string | `YYYY-MM-DD` | — | Incluye lecturas hasta esa fecha (23:59:59 hora Perú). **Semántica exclusiva**: solo lecturas anteriores al día siguiente. |
| `hour_after` | string | `8` u `08:00` (hora Lima) | — | Incluye lecturas desde esa hora del día (`>=`). Valores inválidos se ignoran silenciosamente. |
| `hour_before` | string | `18` u `18:00` (hora Lima) | — | Incluye lecturas hasta esa hora del día (`<=`). Valores inválidos se ignoran silenciosamente. |
| `weekday` | string (comas) | `1,2,3,4,5,6,7` (ISO 8601: `1`=Lunes, `7`=Domingo) | *Todos los días* | Filtra por días de la semana. Valores no numéricos o fuera de rango se ignoran. |
| `last_days` | integer | **Solo** `7`, `15` o `30` | — | Devuelve las lecturas de los últimos N días **a partir de la última lectura registrada** del punto. Cualquier otro valor genera error (ver abajo). |
| `page` | integer | — | `1` | Número de página. |
| `page_size` | integer | — | `10` | Cantidad de elementos por página (`Pagination10`). |

> ⚠️ A diferencia del módulo de energía, las lecturas de agua **no tienen filtro `device`**.

### Lógica y Condiciones

1. **Paginación**: 10 elementos por página por defecto. `page_size` permite cambiarlo; el resto de lecturas se obtienen navegando con `next`/`previous`.
2. **Ordenamiento**: `created_at` descendente (lectura más reciente primero).
3. **Estructura por fila**: `indicators.id` = ID de la lectura, `indicators.measurement_point_name` = nombre del punto, `indicators.values` = objeto con el/los indicador(es) solicitados.
4. **Zona horaria**: `created_at` se almacena en **UTC** y así se devuelve (ISO 8601 con `+00:00`). Los filtros (`date_after`, `date_before`, `hour_after`, `hour_before`, `weekday`) se evalúan en hora local de Perú: los límites de fecha se convierten de `America/Lima` a UTC y las horas/días de semana se extraen con `AT TIME ZONE 'America/Lima'`.
5. **`date_before` exclusivo**: la fecha enviada incluye todo el día; la consulta es `created_at < (fecha + 1 día) 00:00 Lima`.

### Condiciones de Error

- **`400 Bad Request`** — Indicador inválido:
  `{"detail": "The indicador parameter must be one of: consumo_litros, consumo_m3, litros_por_pulso."}`
- **`400 Bad Request`** — `last_days` distinto de 7, 15 o 30:
  `"The value must be 7, 15, or 30."`
- **`400 Bad Request`** — Formato de fecha inválido (si el valor no es `YYYY-MM-DD`): mensaje de validación de `django_filters`.
- **`404 Not Found`** — El punto de medición no pertenece a la tubería/sede indicada o no corresponde a una empresa del usuario.

### Respuesta JSON (200 OK)

```json
{
  "count": 25,
  "next": "http://localhost:8000/api/v1/headquarter/199/water_pipe/1/measurement_point_water/1/readings/?page=2",
  "previous": null,
  "results": [
    {
      "created_at": "2026-08-25T16:32:00+00:00",
      "indicators": {
        "id": 1234,
        "measurement_point_name": "Ingreso General de Red",
        "values": {
          "consumo_litros": 163420.55
        }
      }
    },
    {
      "created_at": "2026-08-25T16:27:00+00:00",
      "indicators": {
        "id": 1233,
        "measurement_point_name": "Ingreso General de Red",
        "values": {
          "consumo_litros": 163418.91
        }
      }
    },
    {
      "created_at": "2026-08-25T16:22:00+00:00",
      "indicators": {
        "id": 1232,
        "measurement_point_name": "Ingreso General de Red",
        "values": {
          "consumo_litros": 163417.23
        }
      }
    }
  ]
}
```

> Si se omite `indicador`, `values` incluye los tres campos:
> ```json
> "values": {
>   "consumo_litros": 163420.55,
>   "consumo_m3": 163.42,
>   "litros_por_pulso": 10.0
> }
> ```

### Ejemplos con `curl` y `JavaScript (Fetch)`

##### Ejemplo `curl` (solo un indicador, rango de fecha y hora)

```bash
curl -X GET "http://localhost:8000/api/v1/headquarter/199/water_pipe/1/measurement_point_water/1/readings?indicador=consumo_litros&date_after=2026-08-01&date_before=2026-08-30&hour_after=08:00&hour_before=18:00" \
  -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
```

##### Ejemplo `curl` (últimos 7 días, página 2)

```bash
curl -X GET "http://localhost:8000/api/v1/headquarter/199/water_pipe/1/measurement_point_water/1/readings?last_days=7&page=2" \
  -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
```

##### Ejemplo `JavaScript (fetch)` para Frontend

```javascript
async function getWaterReadingsTable({ headquarterId, waterPipeId, measurementPointId, token, indicador, filters = {} }) {
  const params = new URLSearchParams({
    page: filters.page || 1,
    page_size: filters.pageSize || 10
  });

  if (indicador) params.set('indicador', indicador);
  if (filters.dateAfter) params.set('date_after', filters.dateAfter);
  if (filters.dateBefore) params.set('date_before', filters.dateBefore);
  if (filters.hourAfter) params.set('hour_after', filters.hourAfter);
  if (filters.hourBefore) params.set('hour_before', filters.hourBefore);
  if (filters.weekday) params.set('weekday', filters.weekday);
  if (filters.lastDays) params.set('last_days', filters.lastDays);

  const url = `http://localhost:8000/api/v1/headquarter/${headquarterId}/water_pipe/${waterPipeId}/measurement_point_water/${measurementPointId}/readings?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Error al obtener la tabla de lecturas');
  }

  const data = await response.json();

  // Transformar para renderizar la tabla HTML
  const rows = data.results.map(item => ({
    id: item.indicators.id,
    created_at: item.created_at,
    measurement_point: item.indicators.measurement_point_name,
    ...item.indicators.values
  }));

  return { rows, count: data.count, next: data.next, previous: data.previous };
}
```
