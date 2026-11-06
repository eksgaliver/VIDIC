import { createRoute } from '@tanstack/react-router'
import { authenticatedRoute } from './_authenticated'
import { COMPANIES_PATH } from '@/constants/route.constant'

export const companiesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: COMPANIES_PATH,
  component: CompaniesPage
})

export function CompaniesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
            Manajemen Perusahaan &amp; Lokasi
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Kelola profil badan usaha dan titik operasional geofence absensi karyawan.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900 shadow-sm text-center">
        <p className="text-sm text-neutral-500">
          Modul CRUD Perusahaan siap dihubungkan ke endpoint backend.
        </p>
      </div>
    </div>
  )
}
