import * as React from 'react'
import { Link, createRoute } from '@tanstack/react-router'
import { HiOutlineArrowRight } from 'react-icons/hi'
import { authenticatedRoute } from './_authenticated'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import type { Company } from '@/@types/organization'
import {
  Badge,
  Button,
  EmptyState,
  ListSkeleton,
  Notice,
  PageHeader,
  Panel,
  PanelHeader,
  StatusFromValue
} from '@/components/base'
import { HolidayCalendar2026 } from '@/components/dashboard/HolidayCalendar2026'
import { errorText } from '@/utils/apiError'
import {
  departmentCount,
  locationCount,
  operationalAreaCount,
  primaryLocation,
  timezoneLabel,
  totalDepartments,
  totalLocations,
  totalOperationalAreas,
} from '@/utils/organization'
import { COMPANIES_PATH, DASHBOARD_PATH, DEPARTMENTS_PATH } from '@/constants/route.constant'

export const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: DASHBOARD_PATH,
  component: DashboardPage
})

function DashboardPage() {
  const { user } = useAuthStore()
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const res = await api.companies.get()
      if (res.error) {
        setErrorMsg(errorText(res, 'Data badan usaha tidak dapat dimuat dari gateway.'))
        return
      }
      setCompanies(Array.isArray(res.data) ? (res.data as unknown as Company[]) : [])
    } catch {
      setErrorMsg('Gateway API tidak terjangkau. Pastikan layanan backend berjalan.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dasbor"
        description={`${user?.name ?? 'Operator'} · peran ${user?.role ?? 'anggota'}. Ringkasan di bawah dihitung langsung dari data organisasi yang tersimpan.`}
      />

      {errorMsg && (
        <Notice tone="danger" title="Gagal memuat data" onDismiss={() => setErrorMsg(null)}>
          {errorMsg}
        </Notice>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_330px] 2xl:grid-cols-[minmax(0,1fr)_380px] fhd:grid-cols-[minmax(0,1fr)_420px] 2xl:gap-7 fhd:gap-8">
        <Panel>
          <PanelHeader
            title="Badan usaha"
            description="Setiap entitas membawa titik geofence dan departemennya sendiri."
            meta={isLoading ? undefined : `${companies.length} entitas`}
          />
          {isLoading ? (
            <ListSkeleton rows={3} />
          ) : companies.length === 0 ? (
            <EmptyState
              title="Belum ada badan usaha"
              description="Daftarkan perusahaan pertama untuk membuka konfigurasi titik lokasi absensi dan departemen."
              action={
                <Link to={COMPANIES_PATH} className="inline-flex">
                  <Button tone="primary" icon={<HiOutlineArrowRight className="h-4 w-4" />}>
                    Ke halaman perusahaan
                  </Button>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {companies.map((company) => {
                const location = primaryLocation(company)
                return (
                  <li key={company.id} className="px-3.5 py-4 transition-colors hover:bg-surface-2 sm:px-5 2xl:px-6 2xl:py-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-x-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] font-bold text-ink 2xl:text-xs">
                            {company.code}
                          </span>
                          <h3 className="truncate text-[15px] font-bold tracking-tight text-ink 2xl:text-base">
                            {company.name}
                          </h3>
                        </div>
                        <p className="mt-1.5 text-[13px] text-ink-2 2xl:text-sm">
                          {location
                            ? `${location.name} · ${location.city} · ${timezoneLabel(location.timezone)}`
                            : 'Titik lokasi belum dikonfigurasi'}
                        </p>
                        {/* Ringkasan pada layar SD / mobile */}
                        <div className="mt-2 flex items-center gap-2.5 text-xs text-ink-3 sm:hidden">
                          <span>{locationCount(company)} lokasi</span>
                          <span>•</span>
                          <span className="text-primary font-semibold">{operationalAreaCount(company)} kota op.</span>
                          <span>•</span>
                          <span>{departmentCount(company)} dept.</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <StatusFromValue value={company.status} />
                        <dl className="hidden items-center gap-4 text-[13px] sm:flex 2xl:gap-6 2xl:text-sm">
                          <div className="text-right">
                            <dt className="text-[11px] uppercase tracking-wide text-ink-3 2xl:text-xs">Lokasi</dt>
                            <dd className="tabular font-semibold text-ink">{locationCount(company)}</dd>
                          </div>
                          <div className="text-right">
                            <dt className="text-[11px] uppercase tracking-wide text-ink-3 2xl:text-xs">Kota Op.</dt>
                            <dd className="tabular font-semibold text-primary">{operationalAreaCount(company)}</dd>
                          </div>
                          <div className="text-right">
                            <dt className="text-[11px] uppercase tracking-wide text-ink-3 2xl:text-xs">Dept.</dt>
                            <dd className="tabular font-semibold text-ink">{departmentCount(company)}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <div className="space-y-5">
          <HolidayCalendar2026 />

          <Panel>
            <PanelHeader title="Cakupan" />
            <dl className="divide-y divide-line">
              <SummaryRow label="Perusahaan" value={String(companies.length)} loading={isLoading} />
              <SummaryRow
                label="Kota operasional"
                value={String(totalOperationalAreas(companies))}
                loading={isLoading}
              />
              <SummaryRow
                label="Titik geofence"
                value={String(totalLocations(companies))}
                loading={isLoading}
              />
              <SummaryRow
                label="Departemen"
                value={String(totalDepartments(companies))}
                loading={isLoading}
              />
            </dl>
            <div className="border-t border-line px-4 py-3.5 sm:px-5">
              <Link
                to={DEPARTMENTS_PATH}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
              >
                Atur departemen
                <HiOutlineArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Sesi aktif" />
            <div className="space-y-3 px-4 py-4 sm:px-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-on">
                  {(user?.name ?? 'OP').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-ink">{user?.name}</div>
                  <div className="truncate font-mono text-[11px] text-ink-3">{user?.email}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="accent">{user?.role === 'admin' ? 'Administrator' : 'Anggota'}</Badge>
                <Badge>Token 7 hari</Badge>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  loading
}: {
  label: string
  value: string
  loading: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-3 sm:px-5 2xl:px-6 2xl:py-4">
      <dt className="text-[13px] text-ink-2 2xl:text-sm">{label}</dt>
      <dd className="tabular text-[15px] font-bold text-ink 2xl:text-base">
        {loading ? '—' : value}
      </dd>
    </div>
  )
}
