import { QueryClient } from '@tanstack/react-query'

/**
 * Singleton de TanStack Query para toda la app.
 *
 * Vive en su propio módulo (y NO dentro de `__root.tsx`) para que cualquier
 * parte del código —login, logout, hooks de auth— pueda limpiar el caché
 * sin prop-drilling ni contextos.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

/**
 * Borra TODO el caché de React Query.
 *
 * Debe llamarse en cada `setAuth` y `logout`: las queryKeys (p.ej.
 * `['headquarters']`, `['water-headquarters']`) no incluyen al usuario, así
 * que sin este `clear()` el siguiente usuario vería las sedes, paneles,
 * tuberías y puntos de la sesión anterior hasta que expire el `staleTime`.
 */
export function clearSessionCache(): void {
  queryClient.clear()
}
