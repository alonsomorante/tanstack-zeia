# Water Panel Dashboard API

Documentación técnica de los endpoints de la API de Agua (módulo Panel Dashboard y endpoints de soporte/filtros) para el sistema **Zeia-Energy**.

---

## Índice

- [Autenticación y Seguridad](#autenticación-y-seguridad)
  - [Header de Autorización](#header-de-autorización)
  - [Permisos del Módulo de Agua](#permisos-del-módulo-de-agua)
  - [Scoping Multi-Tenant](#scoping-multi-tenant)
- [Resumen de Endpoints](#resumen-de-endpoints)
- [Endpoints Generales y de Filtros](#endpoints-generales-y-de-filtros)
  - [1. Login / Solicitud de Token — `POST /api/v1/accounts/request-token/`](#1-login--solicitud-de-token--post-apiv1accountsrequest-token)
  - [2. Sedes y Tuberías del Usuario — `GET /api/v1/user/water-headquarters/`](#2-sedes-y-tuberías-del-usuario--get-apiv1userwater-headquarters)
  - [3. Listado de Puntos de Medición por Tubería — `GET /api/v1/headquarter/<hq_id>/water_pipe/<wp_id>/measurement_points_water/list/`](#3-listado-de-puntos-de-medición-por-tubería--get-apiv1headquarterhq_idwater_pipewp_idmeasurement_points_waterlist)
- [Endpoints del Módulo Panel Dashboard](#endpoints-del-módulo-panel-dashboard)
  - [4. Resumen de Consumo — `GET /api/v1/water_pipe/<wp_id>/consumption-summary/`](#4-resumen-de-consumo--get-apiv1water_pipewp_idconsumption-summary)
  - [5. Distribución de Consumo (Gráfica de Paleta) — `GET /api/v1/water_pipe/<wp_id>/consumption-distribution/`](#5-distribución-de-consumo-gráfica-de-paleta--get-apiv1water_pipewp_idconsumption-distribution)
  - [6. Gráfica de Lecturas — `GET /api/v1/headquarter/<hq_id>/water_pipe/<wp_id>/measurement_point_water/<mpw_id>/readings/graph`](#6-gráfica-de-lecturas--get-apiv1headquarterhq_idwater_pipewp_idmeasurement_point_watermpw_idreadingsgraph)

---

## Autenticación y Seguridad

### Header de Autorización

El backend utiliza **DRF Token Authentication** (`rest_framework.authtoken`). Todas las peticiones autenticadas deben incluir el siguiente header HTTP:

```http
Authorization: Token <token_key>
```

> ⚠️ **Importante**: El esquema es `Token`, no `Bearer` ni `JWT`. El token se obtiene al hacer login en el endpoint `POST /api/v1/accounts/request-token/`.

### Permisos del Módulo de Agua

El acceso a los recursos de agua se restringe a nivel de vista mediante el permiso personalizado `IsUserWaterMonitoring`:

```python
class IsUserWaterMonitoring(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(
            request.user, 'is_user_water_monitoring', False
        )
```

Si el usuario no tiene la bandera `is_user_water_monitoring: true` activa en su perfil, el servidor responderá con **`403 Forbidden`**.

### Scoping Multi-Tenant

Todos los endpoints filtran automáticamente los datos basándose en las empresas asignadas al usuario (`UserEnterpriseRole`). Si se intenta acceder a una sede, tubería o punto de medición que no pertenece a una empresa autorizada, la API retornará **`404 Not Found`**.

---

## Resumen de Endpoints

| Método | URL | Descripción | Permisos |
|---|---|---|---|
| `POST` | `/api/v1/accounts/request-token/` | Login y obtención de token de autenticación (agua y energía) | Público |
| `GET` | `/api/v1/user/water-headquarters/` | Sedes y tuberías activas para filtros del frontend | `IsAuthenticated`, `IsUserWaterMonitoring` |
| `GET` | `/api/v1/headquarter/<hq_id>/water_pipe/<wp_id>/measurement_points_water/list/` | Listado paginado de puntos de medición de una tubería | `IsAuthenticated`, `IsUserWaterMonitoring` |
| `GET` | `/api/v1/water_pipe/<wp_id>/consumption-summary/` | Consumo de hoy, consumo del mes y promedio diario en litros | `IsAuthenticated` |
| `GET` | `/api/v1/water_pipe/<wp_id>/consumption-distribution/` | Distribución porcentual de consumo (gráfica de paleta) | `IsAuthenticated` |
| `GET` | `/api/v1/headquarter/<hq_id>/water_pipe/<wp_id>/measurement_point_water/<mpw_id>/readings/graph` | Gráfica temporal de lecturas/consumo con filtros por día de semana y rango | `IsAuthenticated`, `IsUserWaterMonitoring` |

---

## Endpoints Generales y de Filtros

### 1. Login / Solicitud de Token — `POST /api/v1/accounts/request-token/`

Autentica al usuario mediante correo electrónico y contraseña, devolviendo su token de sesión, sus empresas asociadas, módulos asignados y banderas de monitoreo de agua/energía.

#### Headers

```http
Content-Type: application/json
```

#### Body (JSON)

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `email` | string (email) | Sí | Correo electrónico registrado del usuario |
| `password` | string | Sí | Contraseña en texto plano |

```json
{
  "email": "usuario@empresa.com",
  "password": "miPasswordSeguro123"
}
```

#### Condiciones y Códigos de Respuesta

- **`200 OK`**: Autenticación exitosa. Devuelve el token y los datos del usuario.
- **`400 Bad Request`**:
  - Credenciales inválidas: `{"non_field_errors": ["Invalid credentials."]}`
  - Cuenta deshabilitada: `{"non_field_errors": ["User account is disabled."]}`
  - Campos faltantes: `{"email": ["Este campo es requerido."], "password": ["Este campo es requerido."]}`

#### Respuesta JSON (200 OK)

```json
{
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
  "user": {
    "id": 7,
    "email": "usuario@empresa.com",
    "first_name": "Alvaro",
    "last_name": "Perez",
    "companies": [
      {
        "id": 1,
        "name": "ACME Corporation SAC",
        "role": "Admin"
      }
    ],
    "is_user_energy_monitoring": true,
    "is_user_water_monitoring": true,
    "energy_modules": [
      {
        "name": "Panel dashboard",
        "url": "/panel-dashboard",
        "icon": "/icons/panel.svg",
        "monitoring_type": "energy",
        "is_active": true,
        "children": []
      }
    ],
    "water_modules": [
      {
        "name": "Panel dashboard",
        "url": "/water/panel-dashboard",
        "icon": "/icons/water/panel.svg",
        "monitoring_type": "water",
        "is_active": true,
        "children": [
          {
            "name": "Análisis por indicador",
            "url": "/water/indicator-analysis",
            "icon": "/icons/water/chart.svg"
          }
        ]
      }
    ],
    "is_user_quality_air_auto": false,
    "is_user_thermal_comfort": false
  }
}
```

> **Nota sobre `water_modules`**: El campo está **siempre presente** en la respuesta. Los módulos de agua solo se listan cuando el usuario tiene `is_user_water_monitoring: true` y módulos Water asignados; en caso contrario devuelve `[]`. El `energy_modules` no se ve afectado por los módulos de agua.

#### Configuración requerida en el Admin para poblar `water_modules`

1. **Modules Energy Monitoring**: crear el/los módulos con `monitoring_type = Agua` (+ `display_name`, `frontend_url`, `icon_url`, `order`, `is_active ✓`). Para sub-módulos, asignar `parent`.
2. **User Modules**: registrar la relación usuario ↔ módulo de agua con `is_active ✓`.
3. **Users**: marcar la bandera `is_user_water_monitoring ✓` (los módulos de agua **no requieren** `is_user_energy_monitoring`).

#### Ejemplo con `curl`

```bash
curl -X POST "http://localhost:8000/api/v1/accounts/request-token/" \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario@empresa.com", "password": "miPasswordSeguro123"}'
```

---

### 2. Sedes y Tuberías del Usuario — `GET /api/v1/user/water-headquarters/`

Retorna la lista jerárquica de todas las sedes (`EnergyHeadquarter`) a las que el usuario tiene acceso según sus empresas autorizadas, anidando sus tuberías de agua (`WaterPipe`).

**Propósito en Frontend**: Alimentar los selectores/dropdowns de sede y tubería en el Panel Dashboard.

#### Parámetros de Ruta / Query

Ninguno.

#### Condiciones y Ordenamiento

- Requiere autenticación por Token y `is_user_water_monitoring: true`.
- Las tuberías (`water_pipes`) dentro de cada sede se ordenan con la tubería principal primero (`-is_main, id`).
- Si el usuario no pertenece a ninguna empresa, retorna `{"count": 0, "results": []}`.

#### Respuesta JSON (200 OK)

```json
{
  "count": 2,
  "results": [
    {
      "id": 199,
      "name": "Sede Principal San Isidro",
      "is_active": true,
      "water_pipes": [
        {
          "id": 1,
          "name": "Tubería Matriz Edificio A",
          "is_active": true,
          "is_main": true
        },
        {
          "id": 2,
          "name": "Tubería Baños y Comedor Piso 1",
          "is_active": true,
          "is_main": false
        }
      ]
    },
    {
      "id": 200,
      "name": "Planta Industrial Lurín",
      "is_active": true,
      "water_pipes": [
        {
          "id": 3,
          "name": "Tubería de Producción",
          "is_active": true,
          "is_main": true
        }
      ]
    }
  ]
}
```

#### Ejemplo con `curl`

```bash
curl -X GET "http://localhost:8000/api/v1/user/water-headquarters/" \
  -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
```

---

### 3. Listado de Puntos de Medición por Tubería — `GET /api/v1/headquarter/<hq_id>/water_pipe/<wp_id>/measurement_points_water/list/`

Retorna la lista paginada de todos los puntos de medición de agua (`MeasurementPointWater`) asociados a una tubería específica dentro de una sede.

**Propósito en Frontend**: Llenar el selector de puntos de medición para alternar entre medidores secundarios y el medidor principal en las gráficas.

#### Parámetros de Ruta (URL Path)

| Parámetro | Tipo | Descripción |
|---|---|---|
| `hq_id` | integer | ID de la sede (`EnergyHeadquarter`) |
| `wp_id` | integer | ID de la tubería (`WaterPipe`) |

#### Query Parameters

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `page` | integer | `1` | Número de página solicitado |
| `page_size` | integer | `10` | Cantidad de elementos por página (definido por `Pagination10`) |

#### Condiciones y Ordenamiento

- Requiere `IsUserWaterMonitoring`.
- La sede debe pertenecer a una de las empresas del usuario; de lo contrario retorna **`404 Not Found`**.
- Los puntos de medición se ordenan mostrando primero los activos (`-is_active, id`).
- Por seguridad, este serializer **no expone** el `dev_eui`, contraseña ni datos de configuración IoT.

#### Respuesta JSON (200 OK)

```json
{
  "count": 3,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Ingreso General de Red",
      "is_active": true,
      "is_main": true,
      "water_pipe": "Tubería Matriz Edificio A"
    },
    {
      "id": 2,
      "name": "Medidor Comedor",
      "is_active": true,
      "is_main": false,
      "water_pipe": "Tubería Matriz Edificio A"
    },
    {
      "id": 3,
      "name": "Medidor Servicios Higiénicos",
      "is_active": true,
      "is_main": false,
      "water_pipe": "Tubería Matriz Edificio A"
    }
  ]
}
```

#### Ejemplo con `curl`

```bash
curl -X GET "http://localhost:8000/api/v1/headquarter/199/water_pipe/1/measurement_points_water/list/?page=1&page_size=10" \
  -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
```

---

## Endpoints del Módulo Panel Dashboard

### 4. Resumen de Consumo — `GET /api/v1/water_pipe/<wp_id>/consumption-summary/`

Calcula y retorna los indicadores clave de consumo de agua para una tubería en base a todos sus puntos de medición activos:
1. **Consumo de hoy** (en litros).
2. **Consumo acumulado del mes en curso** (en litros).
3. **Consumo promedio diario del mes** (en litros/día).

**Propósito en Frontend**: Mostrar las tarjetas métricas (KPIs / summary cards) en la parte superior del Dashboard.

#### Parámetros de Ruta (URL Path)

| Parámetro | Tipo | Descripción |
|---|---|---|
| `wp_id` | integer | ID de la tubería de agua (`WaterPipe`) |

#### Query Parameters

Ninguno.

#### Lógica y Condiciones de Cálculo

- **Zona horaria**: Todos los cálculos se realizan en hora local de Perú (`America/Lima`).
- **Puntos activos**: Solo suma los puntos de medición con `is_active=True`.
- **Cálculo con Línea Base (Baseline)**: Para cada punto de medición:
  - Se busca la última lectura registrada **antes** del inicio del período (`created_at < period_start`) como `baseline_value`. Si no existe lectura anterior, usa la primera lectura dentro del período.
  - El consumo del período es: $\max(\text{última\_lectura} - \text{baseline\_value}, 0)$.
  - Esto garantiza un cálculo exacto del diferencial acumulado por el medidor de pulsos.
- **Promedio diario**: $\text{month\_consumption\_litros} / \text{día\_actual\_del\_mes}$.
- **Redondeo**: Todos los valores numéricos de litros se redondean a 3 decimales (`round(x, 3)`).

#### Condiciones de Error

- **`404 Not Found`**: Si la tubería no existe o no pertenece a las empresas del usuario (`{"detail": "No WaterPipe matches the given query."}`).
- **`404 Not Found`**: Si el usuario no tiene ninguna empresa asignada (`{"detail": "No enterprises found for this user"}`).

#### Respuesta JSON (200 OK)

```json
{
  "water_pipe_id": 1,
  "water_pipe_name": "Tubería Matriz Edificio A",
  "today_consumption_litros": 1520.417,
  "month_consumption_litros": 38420.55,
  "month_average_daily_litros": 1536.822,
  "date_range": {
    "today": "2026-08-25",
    "month_start": "2026-08-01",
    "month_end": "2026-08-25"
  }
}
```

#### Ejemplo con `curl`

```bash
curl -X GET "http://localhost:8000/api/v1/water_pipe/1/consumption-summary/" \
  -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
```

---

### 5. Distribución de Consumo (Gráfica de Paleta) — `GET /api/v1/water_pipe/<wp_id>/consumption-distribution/`

Calcula el consumo en litros y la participación porcentual (%) de cada punto de medición de una tubería respecto al punto de medición principal (`is_main=True`) durante el período seleccionado.

**Propósito en Frontend**: Alimentar la gráfica de paleta / distribución porcentual (donut o barras de desglose de consumo por áreas/sectores).

#### Parámetros de Ruta (URL Path)

| Parámetro | Tipo | Descripción |
|---|---|---|
| `wp_id` | integer | ID de la tubería de agua (`WaterPipe`) |

#### Query Parameters

Los parámetros tienen una jerarquía de evaluación: `date_after`/`date_before` > `this_month` > `this_week` > por defecto hoy.

| Parámetro | Tipo | Ejemplo | Descripción |
|---|---|---|---|
| `this_week` | string (boolean) | `true` | Filtra desde el lunes de la semana actual hasta hoy (`type: "week"`). |
| `this_month` | string (boolean) | `true` | Filtra desde el día 1 del mes actual hasta hoy (`type: "month"`). |
| `date_after` | string (`YYYY-MM-DD`) | `2026-08-01` | Fecha inicial del rango. Si se omite pero se envía `date_before`, toma 30 días atrás. |
| `date_before` | string (`YYYY-MM-DD`) | `2026-08-25` | Fecha final del rango. Si se omite pero se envía `date_after`, toma la fecha de hoy. |

> Si no se envía ningún parámetro, el rango por defecto es **el día de hoy** (`type: "day"`).

#### Condiciones y Validaciones

1. **Punto Principal Requerido**: La tubería **debe** tener obligatoriamente un punto de medición configurado como principal (`is_main=True`). Si no existe:
   - **`400 Bad Request`**: `{"detail": "Main measurement point not found", "results": []}`
2. **Consumo del Principal > 0**: Si el punto principal no tiene lecturas de consumo en el rango solicitado (consumo = 0):
   - **`400 Bad Request`**: `{"detail": "Main measurement point has no consumption data for the selected period (YYYY-MM-DD to YYYY-MM-DD)", "results": []}`
3. **Formato de Fecha**: Si `date_after` o `date_before` no tienen el formato `YYYY-MM-DD`:
   - **`400 Bad Request`**: `["Invalid date format. Use YYYY-MM-DD."]`
4. **Sin Puntos Activos**: Si la tubería no tiene puntos de medición con `is_active=True`:
   - **`200 OK`**: `{"detail": "No active measurement points found for this water pipe", "results": []}`
5. **Cálculo de Porcentajes**:
   - `consumption_percentage = (consumption_punto / consumption_principal) * 100` (redondeado a 2 decimales).
   - El punto principal siempre tendrá `consumption_percentage: 100.0` y `is_highest: false`.
   - Se marca automáticamente con `is_highest: true` al punto secundario que tenga el **mayor consumo** del período.
6. **Ordenamiento de Resultados**: El punto principal (`is_main: true`) se coloca siempre primero en la lista `results`, seguido por los puntos secundarios ordenados por `consumption_percentage` de mayor a menor.

#### Respuesta JSON (200 OK)

```json
{
  "water_pipe_id": 1,
  "water_pipe_name": "Tubería Matriz Edificio A",
  "main_consumption_litros": 38420.55,
  "total_measurement_points": 3,
  "date_range": {
    "type": "custom",
    "start_date": "2026-08-01",
    "end_date": "2026-08-25"
  },
  "results": [
    {
      "measurement_point_water_id": 1,
      "measurement_point_water_name": "Ingreso General de Red",
      "dev_eui": "24E124136C123456",
      "is_main": true,
      "is_active": true,
      "consumption_litros": 38420.55,
      "consumption_percentage": 100.0,
      "first_reading_value": 125000.0,
      "last_reading_value": 163420.55,
      "first_reading_time": "2026-08-01T00:05:00-05:00",
      "last_reading_time": "2026-08-25T11:32:00-05:00",
      "is_highest": false
    },
    {
      "measurement_point_water_id": 2,
      "measurement_point_water_name": "Medidor Comedor",
      "dev_eui": "24E124136C123457",
      "is_main": false,
      "is_active": true,
      "consumption_litros": 23052.33,
      "consumption_percentage": 60.0,
      "first_reading_value": 45000.0,
      "last_reading_value": 68052.33,
      "first_reading_time": "2026-08-01T00:05:00-05:00",
      "last_reading_time": "2026-08-25T11:32:00-05:00",
      "is_highest": true
    },
    {
      "measurement_point_water_id": 3,
      "measurement_point_water_name": "Medidor Servicios Higiénicos",
      "dev_eui": "24E124136C123458",
      "is_main": false,
      "is_active": true,
      "consumption_litros": 15368.22,
      "consumption_percentage": 40.0,
      "first_reading_value": 31000.0,
      "last_reading_value": 46368.22,
      "first_reading_time": "2026-08-01T00:05:00-05:00",
      "last_reading_time": "2026-08-25T11:32:00-05:00",
      "is_highest": false
    }
  ]
}
```

#### Ejemplos con `curl`

```bash
# Distribución del mes actual
curl -X GET "http://localhost:8000/api/v1/water_pipe/1/consumption-distribution/?this_month=true" \
  -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"

# Distribución de la semana actual
curl -X GET "http://localhost:8000/api/v1/water_pipe/1/consumption-distribution/?this_week=true" \
  -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"

# Distribución con rango personalizado
curl -X GET "http://localhost:8000/api/v1/water_pipe/1/consumption-distribution/?date_after=2026-08-01&date_before=2026-08-25" \
  -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
```

---

### 6. Gráfica de Lecturas — `GET /api/v1/headquarter/<hq_id>/water_pipe/<wp_id>/measurement_point_water/<mpw_id>/readings/graph`

Genera los datos temporales agregados para construir la gráfica inferior del dashboard (consumo por horas, días, semanas o meses), permitiendo filtrar por días específicos de la semana (`weekday`).

**Propósito en Frontend**: Renderizar la gráfica de barras o líneas de consumo histórico temporal en la parte inferior del Dashboard.

#### Parámetros de Ruta (URL Path)

| Parámetro | Tipo | Descripción |
|---|---|---|
| `hq_id` | integer | ID de la sede (`EnergyHeadquarter`) |
| `wp_id` | integer | ID de la tubería (`WaterPipe`) |
| `mpw_id` | integer | ID del punto de medición (`MeasurementPointWater`) |

#### Query Parameters

| Parámetro | Tipo | Obligatorio | Valores Válidos / Formato | Default | Descripción |
|---|---|---|---|---|---|
| `indicador` | string | No | `consumo_litros`<br>`consumo_m3`<br>`litros_por_pulso` | `consumo_litros` | Métrica numérica a graficar. ⚠️ **Nota:** El nombre del parámetro es `indicador` (en español), no `indicator`. |
| `last_by` | string | No | `minute`<br>`15min`<br>`30min`<br>`hour`<br>`day`<br>`week`<br>`month` | *Ninguno (datos crudos)* | Nivel de agrupación temporal del período. Para el caso del Panel Dashboard habitual, usar `day`. |
| `weekday` | string (comas) | No | `1,2,3,4,5,6,7` (ISO 8601: `1`=Lunes, `7`=Domingo) | *Todos los días* | Filtra qué días de la semana incluir. Ejemplo: `1,2,3,4,5` para solo días hábiles de lunes a viernes. |
| `date_after` | string | No | `YYYY-MM-DD` | Fecha de la 1ª lectura disponible | Fecha inicial (00:00:00 hora Perú). |
| `date_before` | string | No | `YYYY-MM-DD` | Fecha de la última lectura disponible | Fecha final (23:59:59 hora Perú). |

#### Lógica de Cálculo y Condiciones

1. **Permiso Requerido**: `[IsAuthenticated, IsUserWaterMonitoring]`.
2. **Cálculo Diferencial por Serie Temporal**:
   - Cuando `last_by` es `15min`, `30min`, `hour`, `day`, `week` o `month`, el servidor ejecuta una consulta SQL con `generate_series` y `CROSS JOIN LATERAL` que toma la primera y la última lectura dentro de cada intervalo generado.
   - El valor `difference` representa: $\text{last\_value} - \text{first\_value}$.
   - Solo se devuelven los períodos donde `difference > 0`.
3. **Filtro `weekday`**: Se aplica directamente a la serie temporal SQL (`EXTRACT(ISODOW FROM period) IN (...)`). Los valores no numéricos o fuera de rango (1-7) se descartan silenciosamente.
4. **Mapeo de unidades (`unit`)**: La unidad devuelta es `"L"` para `consumo_litros`.

#### Condiciones de Error

- **`400 Bad Request`** (indicador inválido):
  `{"detail": "The indicador parameter must be one of: consumo_litros, consumo_m3, litros_por_pulso."}`
- **`400 Bad Request`** (`last_by` inválido):
  `{"detail": "The last_by parameter must be 'minute', '15min', '30min', 'hour', 'day', 'week' or 'month'."}`
- **`400 Bad Request`** (formato de fecha inválido):
  `{"detail": "Date parameters must use the YYYY-MM-DD format."}`
- **`404 Not Found`**: Si el punto de medición o tubería no pertenecen a la sede o a una empresa del usuario.

#### Respuesta JSON (200 OK)

Retorna un array plano de objetos con la estructura del serializer `WaterGraphReadingSerializer`:

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
    "period": "2026-08-04T00:00:00-05:00",
    "first_reading": "2026-08-04T00:02:00-05:00",
    "last_reading": "2026-08-04T23:58:00-05:00",
    "indicator": "consumo_litros",
    "unit": "L",
    "first_value": 126620.41,
    "last_value": 128210.0,
    "difference": 1589.59,
    "measurement_point": "Ingreso General de Red"
  },
  {
    "period": "2026-08-05T00:00:00-05:00",
    "first_reading": "2026-08-05T00:01:00-05:00",
    "last_reading": "2026-08-05T23:50:00-05:00",
    "indicator": "consumo_litros",
    "unit": "L",
    "first_value": 128210.0,
    "last_value": 129750.8,
    "difference": 1540.8,
    "measurement_point": "Ingreso General de Red"
  }
]
```

#### Ejemplos con `curl` y `JavaScript (Fetch)`

##### Ejemplo `curl` (Caso del Panel Dashboard: días de semana 1 al 5 en agosto 2026)

```bash
curl -X GET "http://localhost:8000/api/v1/headquarter/199/water_pipe/1/measurement_point_water/1/readings/graph?last_by=day&weekday=1,2,3,4,5&date_after=2026-08-01&date_before=2026-08-30&indicador=consumo_litros" \
  -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
```

##### Ejemplo `JavaScript (fetch)` para Frontend

```javascript
async function getWaterGraphData({ headquarterId, waterPipeId, measurementPointId, token }) {
  const params = new URLSearchParams({
    last_by: 'day',
    weekday: '1,2,3,4,5',
    date_after: '2026-08-01',
    date_before: '2026-08-30',
    indicador: 'consumo_litros'
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
  
  // Transformar para librería de gráficas (Chart.js / Highcharts / ApexCharts)
  const chartCategories = readings.map(r => r.period.split('T')[0]);
  const chartSeries = readings.map(r => r.difference);

  return { chartCategories, chartSeries, raw: readings };
}
```
