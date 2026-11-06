import { createRoute } from '@tanstack/react-router'
import { authenticatedRoute } from './_authenticated'
import { useAuthStore } from '@/stores/auth'
import { DASHBOARD_PATH } from '@/constants/route.constant'

export const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: DASHBOARD_PATH,
  component: DashboardPage
})

export function DashboardPage() {
  const { user } = useAuthStore()
  const appName = import.meta.env.VITE_APP_NAME || 'Srikaya Enterprise'

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900 shadow-sm">
        <div className="max-w-2xl space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Portal Informasi
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
            Selamat Datang, {user?.name || 'Operator'}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Sistem informasi kehadiran karyawan dan manajemen operasional {appName} siap digunakan.
          </p>
        </div>
      </div>
    </div>
  )
}
