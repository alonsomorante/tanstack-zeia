// Mocks de datos para desarrollo local (pnpm dev).
// Los mocks se activan SOLO en modo development:
// - pnpm dev → datos de ejemplo en pantalla
// - vitest   → MODE='test', los tests usan la API real
// - pnpm build/preview → MODE='production', API real
//
// Cuando el backend tenga datos reales, borra la carpeta src/mocks/
// y quita los short-circuits en src/features/water/api/*.ts
export const USE_WATER_MOCKS = import.meta.env.MODE === 'development'
