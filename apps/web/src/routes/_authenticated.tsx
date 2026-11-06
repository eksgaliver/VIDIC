import { createRoute, redirect } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { useAuthStore } from '@/stores/auth'
import { AppLayout } from '@/layouts/AppLayout'

// Rute pembungkus terotentikasi (Protected Layout Route)
export const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_authenticated',
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState()
    if (!isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: AppLayout
})
