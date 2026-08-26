# Auth API Endpoints

Base URL: `https://api.energy.zeia.com.pe/api/v1`

---

## 1. Request Authentication Token

```
POST /accounts/request-token/
```

Authenticates a user with email and password. Returns a token and full user profile.

**Request body:**

```json
{
  "email": "string",
  "password": "string"
}
```

**Response:** `AuthResponse` (see `src/features/auth/types.ts`)

```typescript
interface AuthResponse {
  token: string
  user: {
    id: number
    email: string
    first_name: string
    last_name: string
    companies: Array<{ id: number; name: string; role: string }>
    is_user_energy_monitoring: boolean
    is_user_water_monitoring: boolean
    energy_modules: Array<{
      name: string
      url: string | null
      icon: string          // base64 SVG
      is_active: boolean
      children: Array<{
        name: string
        url: string | null
        icon: string        // base64 SVG
      }>
    }>
    water_modules: Array<{
      name: string
      url: string | null
      icon: string          // base64 SVG
      monitoring_type: string  // e.g. "water"
      is_active: boolean
      children: Array<{
        name: string
        url: string | null
        icon: string        // base64 SVG
      }>
    }>
    is_user_quality_air_auto: boolean
    is_user_thermal_comfort: boolean
  }
}
```

**Storage:** On success, the app saves `{ token, user }` to `localStorage` under the key `zeia-auth`.

---

## 2. Token Usage

All subsequent authenticated requests must include the header:

```
Authorization: Token {token}
```

This is handled automatically by `apiFetch()` in `src/lib/api-client.ts`.
