export interface Company {
  id: number
  name: string
  role: string
}

export interface EnergyModuleChild {
  name: string
  url: string | null
  icon: string
}

export interface EnergyModule {
  name: string
  url: string | null
  icon: string
  is_active: boolean
  children: EnergyModuleChild[]
}

export interface WaterModule {
  name: string
  url: string | null
  icon: string
  monitoring_type: 'water' | string
  is_active: boolean
  children: EnergyModuleChild[]
}

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  companies: Company[]
  is_user_energy_monitoring: boolean
  is_user_water_monitoring: boolean
  energy_modules: EnergyModule[]
  water_modules: WaterModule[]
  is_user_quality_air_auto: boolean
  is_user_thermal_comfort: boolean
}

export interface AuthResponse {
  token: string
  user: User
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface OcupacionalAuthResponse {
  token: string
  first_name: string
  last_name: string
  email: string
  created_at: string
  registered_days: number
  user_id: number
}
