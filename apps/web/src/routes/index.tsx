import { createRoute, redirect } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { useAuthStore } from '@/stores/auth'
import { DASHBOARD_PATH, LOGIN_PATH, ROOT_PATH } from '@/constants/route.constant'

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROOT_PATH,
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState()
    if (isAuthenticated) {
      throw redirect({ to: DASHBOARD_PATH })
    } else {
      throw redirect({ to: LOGIN_PATH })
    }
  }
})
