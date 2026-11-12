import * as React from 'react'
import { Link, createRoute } from '@tanstack/react-router'
import { HiOutlineArrowRight, HiOutlineRefresh } from 'react-icons/hi'
import { authenticatedRoute } from './_authenticated'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import {
  Button,
  EmptyState,
  Notice,
  PageHeader,
  Panel,
  PanelHeader,
  SelectField
} from '@/components/base'
import { ClockInCard } from '@/components/attendance/ClockInCard'
import { AttendanceRecapTable } from '@/components/attendance/AttendanceRecapTable'
import { AttendanceStatusMaster, type AttendanceStatusDraft } from '@/components/attendance/AttendanceStatusMaster'
import { HrOverrideDialog } from '@/components/attendance/HrOverrideDialog'
import { errorText } from '@/utils/apiError'
import { currentLocalMonth, monthLabel } from '@/utils/attendance'
import { ATTENDANCE_PATH, COMPANIES_PATH, EMPLOYEES_PATH } from '@/constants/route.constant'
import { cn } from '@/lib/utils'
import type { Company } from '@/@types/organization'
import type { AttendanceRow, AttendanceStatusItem } from '@/@types/attendance'

export const attendanceRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: ATTENDANCE_PATH,
  component: AttendancePage
})

type AttendanceTab = 'recap' | 'statuses'

interface AttendanceListPayload {
  success: boolean
  month: string
  data: AttendanceRow[]
}

interface StatusListPayload {
  success: boolean
  data: AttendanceStatusItem[]
}

interface GeneratePayload {
  success: boolean
  created?: number
  skipped?: number
  employees?: number
  message?: string
}

function AttendancePage() {
  const { user } = useAuthStore()
  const canManage = user?.role === 'admin' || user?.role === 'superadmin'

  const [tab, setTab] = React.useState<AttendanceTab>('recap')
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = React.useState('')
  const [month, setMonth] = React.useState(() => currentLocalMonth())
  const [statusFilter, setStatusFilter] = React.useState('')

  const [statuses, setStatuses] = React.useState<AttendanceStatusItem[]>([])
  const [rows, setRows] = React.useState<AttendanceRow[]>([])

  const [isLoadingStatuses, setIsLoadingStatuses] = React.useState(true)
  const [isLoadingRows, setIsLoadingRows] = React.useState(true)
  const [isGenerating, setIsGenerating] = React.useState(false)

  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)
  const [overrideTarget, setOverrideTarget] = React.useState<AttendanceRow | null>(null)

  const selectedCompany = companies.find((item) => item.id === selectedCompanyId)

  const loadCompanies = React.useCallback(async () => {
    try {
      const res = await api.companies.get()
      if (res.error) {
        setErrorMsg(errorText(res, 'Daftar perusahaan tidak dapat dimuat.'))
        return
      }
      const list = Array.isArray(res.data) ? (res.data as unknown as Company[]) : []
      setCompanies(list)
      setSelectedCompanyId((current) => current || list[0]?.id || '')
    } catch {
      setErrorMsg('Gateway API tidak terjangkau. Pastikan layanan backend berjalan.')
    }
  }, [])

  const loadStatuses = React.useCallback(async (companyId: string) => {
    if (!companyId) return
    setIsLoadingStatuses(true)
    try {
      const res = await api.shifting.attendance.statuses.get({ query: { companyId } })
      if (res.error) {
        setErrorMsg(errorText(res, 'Master status absensi tidak dapat dimuat.'))
        setStatuses([])
        return
      }
      const payload = res.data as unknown as StatusListPayload
      setStatuses(payload.data ?? [])
    } catch {
      setStatuses([])
      setErrorMsg('Master status absensi tidak dapat dimuat dari layanan shifting.')
    } finally {
      setIsLoadingStatuses(false)
    }
  }, [])

  const loadRows = React.useCallback(
    async (companyId: string, monthValue: string, statusId: string) => {
      if (!companyId || !monthValue) return
      setIsLoadingRows(true)
      try {
        const res = await api.shifting.attendance.get({
          query: { companyId, month: monthValue, statusId: statusId || undefined }
        })
        if (res.error) {
          setErrorMsg(errorText(res, 'Rekap presensi tidak dapat dimuat.'))
          setRows([])
          return
        }
        const payload = res.data as unknown as AttendanceListPayload
        setRows(payload.data ?? [])
      } catch {
        setRows([])
        setErrorMsg('Rekap presensi tidak dapat dimuat dari layanan shifting.')
      } finally {
        setIsLoadingRows(false)
      }
    },
    []
  )

  React.useEffect(() => {
    loadCompanies()
  }, [loadCompanies])

  React.useEffect(() => {
    if (!selectedCompanyId) return
    loadStatuses(selectedCompanyId)
    loadRows(selectedCompanyId, month, statusFilter)
  }, [selectedCompanyId, month, statusFilter, loadStatuses, loadRows])

  const refreshRows = React.useCallback(() => {
    if (selectedCompanyId) loadRows(selectedCompanyId, month, statusFilter)
  }, [selectedCompanyId, month, statusFilter, loadRows])

  const handleGenerate = async () => {
    if (!selectedCompanyId) return
    setIsGenerating(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const res = await api.shifting.attendance.generate.post({
        companyId: selectedCompanyId,
        month
      })

      if (res.error) {
        setErrorMsg(errorText(res, 'Generate baris presensi ditolak.'))
        return
      }

      const payload = res.data as unknown as GeneratePayload
      setSuccessMsg(
        payload.message ??
          `${payload.created ?? 0} baris presensi dibuat untuk ${payload.employees ?? 0} karyawan.`
      )
      await loadRows(selectedCompanyId, month, statusFilter)
    } catch {
      setErrorMsg('Generate baris presensi gagal dihubungi.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleStatusSubmit = async (
    draft: AttendanceStatusDraft,
    target: AttendanceStatusItem | null
  ): Promise<string | null> => {
    const body = {
      name: draft.name,
      code: draft.code || undefined,
      color: draft.color,
      isPresent: draft.isPresent,
      isPaid: draft.isPaid,
      isAbsent: draft.isAbsent,
      sortOrder: draft.sortOrder,
      status: draft.status
    }

    try {
      const res = target
        ? await api.shifting.attendance.statuses({ id: target.id }).put({
            ...body,
            description: draft.description || null
          })
        : await api.shifting.attendance.statuses.post({
            ...body,
            description: draft.description || undefined,
            companyId: selectedCompanyId
          })

      if (res.error) return errorText(res, 'Master status absensi menolak perubahan ini.')

      await loadStatuses(selectedCompanyId)
      await loadRows(selectedCompanyId, month, statusFilter)
      setSuccessMsg(target ? `Status '${draft.name}' diperbarui.` : `Status '${draft.name}' ditambahkan.`)
      return null
    } catch {
      return 'Layanan shifting tidak terjangkau. Coba lagi setelah backend siap.'
    }
  }

  const handleStatusDelete = async (target: AttendanceStatusItem): Promise<string | null> => {
    try {
      const res = await api.shifting.attendance.statuses({ id: target.id }).delete()
      if (res.error) return errorText(res, 'Status absensi tidak dapat dihapus.')

      await loadStatuses(selectedCompanyId)
      setSuccessMsg(`Status '${target.name}' dihapus.`)
      return null
    } catch {
      return 'Layanan shifting tidak terjangkau. Coba lagi setelah backend siap.'
    }
  }

  const handleOverrideSubmit = async (
    row: AttendanceRow,
    payload: { statusId: string; note: string }
  ): Promise<string | null> => {
    try {
      const res = await api.shifting.attendance({ id: row.id }).put(payload)
      if (res.error) return errorText(res, 'Status presensi tidak dapat ditimpa.')

      await loadRows(selectedCompanyId, month, statusFilter)
      setSuccessMsg(`Status presensi ${row.employee.name} diperbarui.`)
      return null
    } catch {
      return 'Layanan shifting tidak terjangkau. Coba lagi setelah backend siap.'
    }
  }

  const counts = React.useMemo(() => {
    let present = 0
    let absent = 0
    let unfilled = 0
    let lateMinutes = 0

    for (const row of rows) {
      if (row.status.isPresent) present += 1
      if (row.status.isAbsent) absent += 1
      if (row.status.code === 'unfilled') unfilled += 1
      lateMinutes += row.lateMinutes
    }

    const employees = new Set(rows.map((row) => row.employee.id)).size
    return { present, absent, unfilled, lateMinutes, employees }
  }, [rows])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Presensi karyawan"
        description="Satu tabel presensi dengan status yang ditentukan sendiri oleh HRD. Baris harian dibuat lewat generate, karyawan mencatat masuk/pulang dari geofence shift, dan HRD menimpa status bila perlu."
        actions={
          tab === 'recap' ? (
            <Button
              tone="primary"
              disabled={!canManage || !selectedCompanyId}
              loading={isGenerating}
              onClick={handleGenerate}
              icon={<HiOutlineRefresh className="h-4 w-4" />}
            >
              Generate {monthLabel(month)}
            </Button>
          ) : null
        }
      />

      {errorMsg ? (
        <Notice tone="danger" title="Permintaan gagal" onDismiss={() => setErrorMsg(null)}>
          {errorMsg}
        </Notice>
      ) : null}

      {successMsg ? (
        <Notice tone="success" title="Perubahan tersimpan" onDismiss={() => setSuccessMsg(null)}>
          {successMsg}
        </Notice>
      ) : null}

      {companies.length === 0 ? (
        <Panel>
          <EmptyState
            title="Belum ada badan usaha"
            description="Presensi bergantung pada perusahaan, departemen, karyawan, dan shift. Daftarkan perusahaan terlebih dahulu."
            action={
              <Link to={COMPANIES_PATH} className="inline-flex">
                <Button tone="primary" icon={<HiOutlineArrowRight className="h-4 w-4" />}>
                  Ke halaman perusahaan
                </Button>
              </Link>
            }
          />
        </Panel>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <SelectField
              label="Perusahaan"
              value={selectedCompanyId}
              onChange={(event) => setSelectedCompanyId(event.target.value)}
              className="w-full sm:max-w-sm 2xl:max-w-md"
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name} ({company.code})
                </option>
              ))}
            </SelectField>

            <div className="flex items-center gap-2">
              <div
                role="tablist"
                aria-label="Bagian presensi"
                className="inline-flex rounded-control border border-line bg-surface-2 p-0.5 text-xs"
              >
                {[
                  { key: 'recap' as AttendanceTab, label: 'Rekap presensi' },
                  { key: 'statuses' as AttendanceTab, label: 'Status absensi' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={tab === item.key}
                    onClick={() => setTab(item.key)}
                    className={cn(
                      'rounded px-3 py-1.5 font-medium transition-colors button-press-feedback',
                      tab === item.key
                        ? 'bg-surface font-bold text-primary shadow-1'
                        : 'text-ink-2 hover:text-ink'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!canManage ? (
            <Notice tone="info" title="Akses terbatas">
              Anda masuk sebagai {user?.role ?? 'anggota'}. Melihat rekap tetap diizinkan, tetapi
              generate baris dan menimpa status hanya untuk administrator perusahaan.
            </Notice>
          ) : null}

          {tab === 'recap' ? (
            <>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_380px] 2xl:gap-7">
                <div className="space-y-5">
                  <Panel>
                    <PanelHeader
                      title={`Ringkasan ${monthLabel(month)}`}
                      description="Dihitung dari baris presensi yang sedang tampil, bukan dari tebakan."
                      meta={`${counts.employees} karyawan`}
                    />
                    <dl className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
                      <SummaryTile label="Baris presensi" value={rows.length} />
                      <SummaryTile label="Hadir" value={counts.present} tone="success" />
                      <SummaryTile label="Alpa" value={counts.absent} tone="danger" />
                      <SummaryTile label="Belum diisi" value={counts.unfilled} />
                    </dl>
                    <div className="border-t border-line px-4 py-3 text-xs text-ink-2 sm:px-5">
                      Akumulasi keterlambatan bulan ini:{' '}
                      <span className="font-semibold text-ink">{counts.lateMinutes} menit</span>
                      {selectedCompany ? ` · ${selectedCompany.name}` : ''}
                    </div>
                  </Panel>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <SelectField
                      label="Bulan"
                      value={month}
                      onChange={(event) => setMonth(event.target.value || currentLocalMonth())}
                    >
                      {monthOptions(month).map((option) => (
                        <option key={option} value={option}>
                          {monthLabel(option)}
                        </option>
                      ))}
                    </SelectField>

                    <SelectField
                      label="Filter status"
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                    >
                      <option value="">Semua status</option>
                      {statuses.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                          {item.status === 'inactive' ? ' (nonaktif)' : ''}
                        </option>
                      ))}
                    </SelectField>
                  </div>

                  <AttendanceRecapTable
                    rows={rows}
                    isLoading={isLoadingRows}
                    canManage={canManage}
                    onOverride={(row) => {
                      setErrorMsg(null)
                      setSuccessMsg(null)
                      setOverrideTarget(row)
                    }}
                    meta={`${rows.length} baris · ${counts.employees} karyawan`}
                    emptyDescription={
                      canManage
                        ? 'Tekan Generate untuk membuat baris harian karyawan aktif pada bulan ini, atau karyawan yang belum di-generate tetap bisa mencatat presensi mandiri.'
                        : 'Belum ada baris presensi pada bulan ini. Hubungi HRD untuk generate rekap.'
                    }
                  />

                  <p className="text-xs text-ink-3">
                    Karyawan tidak punya shift?{' '}
                    <Link to={EMPLOYEES_PATH} className="font-semibold text-primary hover:underline">
                      Tetapkan shift pada menu karyawan
                    </Link>{' '}
                    agar baris presensi bisa dibuat.
                  </p>
                </div>

                <div className="space-y-5">
                  <ClockInCard onChanged={refreshRows} />
                </div>
              </div>
            </>
          ) : (
            <AttendanceStatusMaster
              statuses={statuses}
              canManage={canManage}
              isLoading={isLoadingStatuses}
              onSubmit={handleStatusSubmit}
              onDelete={handleStatusDelete}
            />
          )}
        </>
      )}

      <HrOverrideDialog
        row={overrideTarget}
        statuses={statuses}
        onClose={() => setOverrideTarget(null)}
        onSubmit={handleOverrideSubmit}
      />
    </div>
  )
}

function SummaryTile({
  label,
  value,
  tone
}: {
  label: string
  value: number
  tone?: 'success' | 'danger'
}) {
  const toneClass =
    tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-error' : 'text-ink'

  return (
    <div className="px-4 py-3.5 sm:px-5 2xl:px-6 2xl:py-4">
      <dt className="text-2xs text-ink-3">{label}</dt>
      <dd className={cn('tabular mt-1 text-xl font-bold 2xl:text-2xl', toneClass)}>{value}</dd>
    </div>
  )
}

/** Opsi bulan: dua belas bulan terakhir di sekitar bulan yang sedang dipilih. */
function monthOptions(selected?: string | Date | null): string[] {
  if (!selected) return []
  const selStr = selected instanceof Date ? selected.toISOString().slice(0, 7) : String(selected)
  const base = new Date(`${selStr}-01T12:00:00Z`)
  if (Number.isNaN(base.getTime())) return [selStr]

  const options: string[] = []
  for (let offset = 6; offset >= -6; offset -= 1) {
    const date = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - offset, 1, 12))
    options.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`)
  }
  return [...new Set(options)]
}
