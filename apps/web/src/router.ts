import { createRouter } from '@tanstack/react-router'
import { rootRoute } from './routes/__root'
import { indexRoute } from './routes/index'
import { loginRoute } from './routes/login'
import { authenticatedRoute } from './routes/_authenticated'
import { dashboardRoute } from './routes/dashboard'
import { companiesRoute } from './routes/companies'
import { departmentsRoute } from './routes/departments'
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1
    }
  }
})

// Perakitan pohon rute TanStack Router hierarkis & mudah dirawat
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  authenticatedRoute.addChildren([
    dashboardRoute,
    companiesRoute,
    departmentsRoute
  ])
])

export const router = createRouter({
  routeTree,
  context: {
    queryClient
  }
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
