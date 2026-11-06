import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

export interface RouterContext {
  queryClient: QueryClient
}

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout
})

function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 font-sans text-neutral-900 antialiased">
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
