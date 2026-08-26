# Water Day Comparison API

Documentación técnica del endpoint de la API de Agua del módulo **Comparación por Día** para el sistema **Zeia-Energy**.

---

## Índice

- [Autenticación y Seguridad](#autenticación-y-seguridad)
- [Resumen de Endpoints](#resumen-de-endpoints)
- [1. Gráfica Específica (Comparación por Día) — `GET /api/v1/headquarter/<hq_id>/water_pipe/<wp_id>/measurement_point_water/<mpw_id>/readings/graph-especific`](#1-gráfica-específica-comparación-por-día--get-apiv1headquarterhq_idwater_pipewp_idmeasurement_point_watermpw_idreadingsgraph-especific)

---

## Autenticación y Seguridad

El endpoint de este módulo requiere autenticación por **DRF Token Authentication**. Toda petición debe incluir el header:

```http
Authorization: Token <token_key>
```

> ⚠️ El esquema es `Token`, no `Bearer` ni `JWT`. El token se obtiene mediante `POST /api/v1/accounts/request-token/`.

El acceso exige además el permiso personalizado **`IsUserWaterMonitoring`**: el usuario debe tener la bandera `is_user_water_monitoring: true` activa en su perfil, de lo contrario se retorna **`403 Forbidden`**.

El scoping multi-tenant se aplica automáticamente: si el punto de medición, tubería o sede no pertenece a una empresa asignada al usuario (`UserEnterpriseRole`), la API responde **`404 Not Found`**.

Para más detalle de autenticación y login, ver [WATER_PANEL_DASHBOARD_API.md](WATER_PANEL_DASHBOARD_API.md).

---

## Resumen de Endpoints

| Método | URL | Descripción | Permisos |
|---|---|---|---|
| `GET` | `/api/v1/headquarter/<hq_id>/water_pipe/<wp_id>/measurement_point_water/<mpw_id>/readings/graph-especific` | Consumo de agua (litros) agrupado por fecha y hora para comparar días; incluye el perfil promedio "habitual" | `IsAuthenticated`, `IsUserWaterMonitoring` |

---

## 1. Gráfica Específica (Comparación por Día) — `GET /api/v1/headquarter/<hq_id>/water_pipe/<wp_id>/measurement_point_water/<mpw_id>/readings/graph-especific`

Devuelve el consumo de agua del punto de medición **agrupado por fecha** (`YYYY-MM-DD`) y, dentro de cada fecha, **por hora del día**. Además, cuando hay 2 o más fechas con datos en modo horario, agrega el perfil **`habitual`**: el promedio de consumo por hora del día a lo largo de las fechas consultadas.

**Propósito en Frontend**: Renderizar la gráfica de comparación por día del módulo — por ejemplo, una línea por cada fecha consultada (series superpuestas) y la curva promedio "habitual" para visualizar la tendencia típica del consumo horario.

### Parámetros de Ruta (URL Path)

| Parámetro | Tipo | Descripción |
|---|---|---|
| `hq_id` | integer | ID de la sede (`EnergyHeadquarter`) |
| `wp_id` | integer | ID de la tubería (`WaterPipe`) |
| `mpw_id` | integer | ID del punto de medición de agua (`MeasurementPointWater`) |

### Query Parameters

| Parámetro | Tipo | Obligatorio | Valores Válidos / Formato | Default | Descripción |
|---|---|---|---|---|---|
| `last_by` | string | No | `minute`<br>`15min`<br>`30min`<br>`hour`<br>`day`<br>`week`<br>`month` | **`hour`** | Nivel de agrupación temporal de los períodos. Para el módulo Comparación por Día se recomienda `hour` (y `day` para comparar a nivel de día). |
| `weekday` | string (comas) | No | `1,2,3,4,5,6,7` (ISO 8601: `1`=Lunes, `7`=Domingo) | *Todos los días* | Filtra qué días de la semana incluir (se aplica a los períodos generados). |
| `date_after` | string | No | `YYYY-MM-DD` | Fecha de la 1ª lectura disponible | Fecha inicial (00:00:00 hora Perú). |
| `date_before` | string | No | `YYYY-MM-DD` | Fecha de la última lectura disponible | Fecha final (23:59:59 hora Perú). |

> ⚠️ **El indicador es FIJO**: este endpoint siempre devuelve `consumo_total_litros` (litros). **No existe el parámetro `indicador`** aquí (a diferencia de `readings/graph`), y no es necesario enviarlo.

### Lógica de Cálculo y Condiciones

1. **Modo diferencial** (`last_by` distinto de `minute`): se generan los períodos con `generate_series` y se toma la primera y última lectura de cada intervalo. Cada entrada usa:
   - `value = difference` (última − primera lectura del período).
   - Solo se incluyen períodos con `difference > 0` (períodos sin consumo no aparecen).
2. **Modo `minute`**: no hay diferencial; cada entrada corresponde a una lectura cruda truncada al minuto, con `value = valor de la lectura` (consumo acumulado del contador).
3. **Agrupación por fecha**: los períodos se agrupan por `YYYY-MM-DD` (fecha del inicio del período, en hora Perú) y cada fecha contiene sus entradas **ordenadas por hora ascendente**. Las fechas se devuelven en orden ascendente.
4. **Campo `time`**: hora truncada a la hora (formato `HH:00:00`) de la primera lectura de cada período, convertida a hora local de Perú.
5. **Perfil `habitual`**: solo se agrega si **hay 2 o más fechas con datos** y **`last_by=hour`**. Por cada hora del día calcula el promedio de los valores de todas las fechas:
   - `value = round(promedio, 4)`
   - `is_average: true`
   - `sample_count`: cantidad de valores promediados (nº de fechas con datos en esa hora).
6. **Zona horaria**: `date_after`/`date_before` se interpretan en hora local de Perú (`America/Lima`).
7. **Unidad**: `unit` siempre es `"L"` e `indicator` siempre `"consumo_total_litros"`.

### Condiciones de Error

- **`400 Bad Request`** — `last_by` inválido:
  `{"detail": "The last_by parameter must be 'minute', '15min', '30min', 'hour', 'day', 'week' or 'month'."}`
- **`400 Bad Request`** — Formato de fecha inválido:
  `{"detail": "Date parameters must use the YYYY-MM-DD format."}`
- **`403 Forbidden`** — Usuario sin `is_user_water_monitoring: true`.
- **`404 Not Found`** — El punto de medición no pertenece a la tubería/sede indicada o no corresponde a una empresa del usuario.

### Respuesta JSON (200 OK)

Retorna una **lista** (array) de objetos. Cada objeto tiene una única clave:
- Una fecha `"YYYY-MM-DD"` con su lista de entradas por hora, **o**
- La clave `"habitual"` con el perfil promedio por hora (cuando aplica).

Cada entrada contiene: `time`, `indicator`, `unit`, `value`, `is_average`, `device`, `measurement_point` y, solo en `habitual`, `sample_count`.

```json
[
  {
    "2026-08-03": [
      {
        "time": "00:00:00",
        "indicator": "consumo_total_litros",
        "unit": "L",
        "value": 55.68,
        "is_average": false,
        "device": "24E124136C123456",
        "measurement_point": "Ingreso General de Red"
      },
      {
        "time": "01:00:00",
        "indicator": "consumo_total_litros",
        "unit": "L",
        "value": 48.12,
        "is_average": false,
        "device": "24E124136C123456",
        "measurement_point": "Ingreso General de Red"
      },
      {
        "time": "12:00:00",
        "indicator": "consumo_total_litros",
        "unit": "L",
        "value": 142.75,
        "is_average": false,
        "device": "24E124136C123456",
        "measurement_point": "Ingreso General de Red"
      }
    ]
  },
  {
    "2026-08-04": [
      {
        "time": "00:00:00",
        "indicator": "consumo_total_litros",
        "unit": "L",
        "value": 63.2,
        "is_average": false,
        "device": "24E124136C123456",
        "measurement_point": "Ingreso General de Red"
      },
      {
        "time": "01:00:00",
        "indicator": "consumo_total_litros",
        "unit": "L",
        "value": 51.9,
        "is_average": false,
        "device": "24E124136C123456",
        "measurement_point": "Ingreso General de Red"
      },
      {
        "time": "12:00:00",
        "indicator": "consumo_total_litros",
        "unit": "L",
        "value": 136.02,
        "is_average": false,
        "device": "24E124136C123456",
        "measurement_point": "Ingreso General de Red"
      }
    ]
  },
  {
    "habitual": [
      {
        "time": "00:00:00",
        "indicator": "consumo_total_litros",
        "unit": "L",
        "value": 59.44,
        "is_average": true,
        "sample_count": 2,
        "device": "24E124136C123456",
        "measurement_point": "Ingreso General de Red"
      },
      {
        "time": "01:00:00",
        "indicator": "consumo_total_litros",
        "unit": "L",
        "value": 50.01,
        "is_average": true,
        "sample_count": 2,
        "device": "24E124136C123456",
        "measurement_point": "Ingreso General de Red"
      },
      {
        "time": "12:00:00",
        "indicator": "consumo_total_litros",
        "unit": "L",
        "value": 139.385,
        "is_average": true,
        "sample_count": 2,
        "device": "24E124136C123456",
        "measurement_point": "Ingreso General de Red"
      }
    ]
  }
]
```

> **Nota**: Si solo hay 1 fecha con datos, o `last_by` no es `hour`, la respuesta no incluye la clave `habitual`. Ejemplo con `last_by=day` sin `habitual`:
> ```json
> [
>   { "2026-08-03": [ { "time": "00:00:00", "indicator": "consumo_total_litros", "unit": "L", "value": 1520.41, "is_average": false, "device": "24E124136C123456", "measurement_point": "Ingreso General de Red" } ] }
> ]
> ```

### Ejemplos con `curl` y `JavaScript (Fetch)`

##### Ejemplo `curl` (comparación por día en modo horario)

```bash
curl -X GET "http://localhost:8000/api/v1/headquarter/199/water_pipe/1/measurement_point_water/1/readings/graph-especific?last_by=hour&date_after=2026-08-03&date_before=2026-08-04" \
  -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
```

##### Ejemplo `curl` (solo días hábiles de una semana)

```bash
curl -X GET "http://localhost:8000/api/v1/headquarter/199/water_pipe/1/measurement_point_water/1/readings/graph-especific?last_by=hour&weekday=1,2,3,4,5&date_after=2026-08-03&date_before=2026-08-07" \
  -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
```

##### Ejemplo `JavaScript (fetch)` para Frontend

```javascript
async function getWaterDayComparison({ headquarterId, waterPipeId, measurementPointId, token, lastBy = 'hour', dateAfter, dateBefore, weekday }) {
  const params = new URLSearchParams({ last_by: lastBy });

  if (dateAfter) params.set('date_after', dateAfter);
  if (dateBefore) params.set('date_before', dateBefore);
  if (weekday) params.set('weekday', weekday);

  const url = `http://localhost:8000/api/v1/headquarter/${headquarterId}/water_pipe/${waterPipeId}/measurement_point_water/${measurementPointId}/readings/graph-especific?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Error al obtener la comparación por día');
  }

  const data = await response.json();

  // Transformar para gráfica: { "2026-08-03": [{hour, value}], "2026-08-04": [...], "habitual": [...] }
  const byDay = {};
  let habitual = null;

  for (const item of data) {
    const [key, entries] = Object.entries(item)[0];

    if (key === 'habitual') {
      habitual = entries.map(e => ({ hour: e.time, value: e.value, sampleCount: e.sample_count }));
      continue;
    }

    byDay[key] = entries
      .filter(e => !e.is_average)
      .map(e => ({ hour: e.time, value: e.value }));
  }

  return { byDay, habitual, raw: data };
}
```