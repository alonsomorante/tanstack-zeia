import { LogOut } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useRouter } from '@tanstack/react-router'
import { resetEnergyAnalytics } from '@/lib/analytics'
import { PeakPowerNotice } from './peak-power-notice'
import { ResourceSwitcher } from './resource-switcher'


export function DashboardHeader() {
  const { logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    resetEnergyAnalytics()
    logout()
    router.navigate({ to: '/energia/login' })
  }

  return (
    <header className="h-16 bg-[#F2F2F2] border-b border-border flex items-center justify-between px-6 shrink-0">
      {/* Left Section */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <img
            src="/images/zeia-logo-first.png"
            alt="ZEIA"
            className="h-8 w-auto object-contain"
          />
        </div>
        <div className="h-6 w-px bg-border" />
        <ResourceSwitcher />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1">
        {/* Theme Toggle */}
        {/* <button
          onClick={toggleTheme}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-secondary transition-all"
          title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button> */}

        {/* Peak power notice */}
        <PeakPowerNotice />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="h-9 px-3 flex items-center gap-2 rounded-lg bg-black text-white hover:bg-gray-800 transition-all"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </header>
  )
}
