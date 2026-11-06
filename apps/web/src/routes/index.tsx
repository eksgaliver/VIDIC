import { createRoute, redirect } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { useAuthStore } from '@/stores/auth'

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState()
    if (isAuthenticated) {
      throw redirect({ to: '/dashboard' })
    } else {
      throw redirect({ to: '/login' })
    }
  }
})
