import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff, Loader2, Activity, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { identifyEnergyUser } from '@/lib/analytics'
import { requestToken, AuthError } from '@/features/auth/api/request-token'
import { getFirstResourceModuleUrl } from '@/features/auth/lib/modules'
import { useAuth } from '@/features/auth/hooks/use-auth'

export const Route = createFileRoute('/energia/login')({
  component: LoginPage,
})

export function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: requestToken,
    onSuccess: (data) => {
      setAuth(data)
      identifyEnergyUser(data.user)

      const firstUrl =
        getFirstResourceModuleUrl(data.user, 'energy') ??
        getFirstResourceModuleUrl(data.user, 'water') ??
        '/energia/dashboard/panel'
      router.navigate({ to: firstUrl })
    },
    onError: (err: Error) => {
      if (err instanceof AuthError) {
        setError(err.message)
      } else {
        setError('Ocurrió un error inesperado. Intente nuevamente más tarde.')
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    mutation.mutate({ email, password })
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Image (original) */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden">
        <img
          src="/images/LOGIN-ENERGY.webp"
          alt="Monitoreo Energético"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        <div className="relative z-10 flex flex-col justify-end p-12">
          <h2 className="text-4xl font-bold text-white mb-3 leading-tight tracking-tight">
            Monitoreo<br />
            <span className="text-primary">Energético</span>
          </h2>
          <p className="text-white/80 text-sm leading-relaxed max-w-sm">
            Sistema de control y gestión de energía en tiempo real para instalaciones industriales
          </p>
        </div>
      </div>

      {/* Right Panel - Form (improved) */}
      <div className="relative flex-1 flex items-center justify-center p-8 lg:p-12">
        <button
          type="button"
          onClick={() => router.navigate({ to: '/' })}
          className={cn(
            "absolute top-8 left-8 z-20 inline-flex items-center gap-2",
            "px-5 py-3 rounded-xl",
            "bg-card border border-border shadow-soft",
            "text-sm font-medium text-text-primary",
            "hover:shadow-medium hover:border-primary/40 hover:-translate-x-0.5",
            "transition-all duration-200"
          )}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>

        <div className="w-full max-w-lg">
          {/* Mobile Branding */}
          <div className="lg:hidden text-center mb-10">
            <img src="/images/zeia-logo-first.png" alt="Zeia" className="h-10 mx-auto object-contain mb-3" />
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Monitoreo Energético</h1>
          </div>

          <div className="card-executive p-10 lg:p-12">
            <div className="mb-8">
              <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-primary mb-2">Acceso al sistema</p>
              <h2 className="text-2xl font-bold text-text-primary mb-2 tracking-tight">
                Bienvenido de nuevo
              </h2>
              <p className="text-base text-text-secondary leading-relaxed">
                Ingrese sus credenciales para acceder al panel de monitoreo energético.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-danger/10 border-l-4 border-danger p-4 rounded-r-lg">
                  <p className="text-sm text-danger font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-2.5">
                <label className="label-executive">Correo Electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-executive w-full font-sans py-3.5"
                  placeholder="usuario@zeia.com.pe"
                />
              </div>

              <div className="space-y-2.5">
                <label className="label-executive">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input-executive w-full pr-12 font-sans py-3.5"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={mutation.isPending}
                className={cn(
                  "btn-executive-primary w-full py-4 text-base",
                  mutation.isPending && "opacity-70 cursor-not-allowed"
                )}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Iniciar Sesión</span>
                    <Activity className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>


          </div>
        </div>
      </div>
    </div>
  )
}
