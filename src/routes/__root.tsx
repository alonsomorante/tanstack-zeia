import * as React from 'react'
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { useTheme } from '@/hooks/use-theme'
import { queryClient } from '@/lib/query-client'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const { theme } = useTheme()

  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  )
}
