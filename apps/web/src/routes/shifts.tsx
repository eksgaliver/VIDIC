import * as React from 'react'
import { Link, createRoute } from '@tanstack/react-router'
import {
  HiOutlineArrowRight,
  HiOutlineClock,
  HiOutlineLocationMarker,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineUserGroup,
} from 'react-icons/hi'
import { authenticatedRoute } from './_authenticated'
import { api } from '@/lib/api'
import Dialog from '@/components/ui/Dialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import {
  Badge,
  Button,
  CheckboxField,
  DialogBody,
  DialogFooter,
  DialogHeading,
  EmptyState,
  Notice,
  PageHeader,
  Panel,
  PanelHeader,
  SelectField,
  StatusFromValue,
  TableSkeleton,
  TextField,
} from '@/components/base'
import { errorText } from '@/utils/apiError'
import type { Company, Employee, Shift, ShiftLocation } from '@/@types/organization'
import {
  COMPANIES_PATH,
  EMPLOYEES_PATH,
  SHIFTS_PATH,
} from '@/constants/route.constant'

export const shiftsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: SHIFTS_PATH,
  component: ShiftsPage,
})

const SHIFT_STATUSES = [
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
]

const INITIAL_FORM = {
  name: '',
  code: '',
  description: '',
  startTime: '08:00',
  endTime: '17:00',
  workLocationId: '',
  attendanceLocationIds: [] as string[],
  status: 'active',
  assignedEmployeeIds: [] as string[],
}

function displayTime(value: string) {
  return value?.slice(0, 5) || '—'
}

function isOvernight(startTime: string, endTime: string) {
  return endTime <= startTime
}

function locationLine(location: ShiftLocation) {
  return `${location.name} · ${location.city} · radius ${location.radiusMeters} m`
}

export function ShiftsPage() {
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = React.useState('')
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [shifts, setShifts] = React.useState<Shift[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [createForm, setCreateForm] = React.useState(INITIAL_FORM)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [editItem, setEditItem] = React.useState<Shift | null>(null)
  const [editForm, setEditForm] = React.useState(INITIAL_FORM)

  const [deleteItem, setDeleteItem] = React.useState<Shift | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const selectedCompany = companies.find((item) => item.id === selectedCompanyId)
  const locations = (selectedCompany?.locations ?? []).filter(
    (location) => location.status === 'active'
  )
  const primaryLocation = locations.find((location) => location.isPrimary) ?? locations[0]
  const activeEmployees = employees.filter((employee) => employee.status === 'active')

  const fetchCompanies = React.useCallback(async () => {
    try {
      const res = await api.companies.get()
      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal memuat daftar perusahaan.'))
        return
      }
      if (Array.isArray(res.data)) {
        const list = res.data as unknown as Company[]
        setCompanies(list)
        setSelectedCompanyId((current) => current || list[0]?.id || '')
      }
    } catch {
      setErrorMsg('Gagal memuat daftar perusahaan.')
    }
  }, [])

  const fetchShiftData = React.useCallback(async (companyId: string) => {
    if (!companyId) return
    setIsLoading(true)
    setErrorMsg(null)

    try {
      const [employeesRes, shiftsRes] = await Promise.all([
        api.employees.get({ query: { companyId } }),
        api.shifting.shifts.get({ query: { companyId } }),
      ])

      if (employeesRes.error) {
        setEmployees([])
      } else {
        setEmployees(
          Array.isArray(employeesRes.data)
            ? (employeesRes.data as unknown as Employee[])
            : []
        )
      }

      if (shiftsRes.error) {
        setErrorMsg(errorText(shiftsRes, 'Gagal memuat data shift.'))
        setShifts([])
        return
      }

      setShifts(
        Array.isArray(shiftsRes.data) ? (shiftsRes.data as unknown as Shift[]) : []
      )
    } catch {
      setShifts([])
      setErrorMsg('Gagal memuat data shift dari layanan shifting.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  React.useEffect(() => {
    if (selectedCompanyId) {
      fetchShiftData(selectedCompanyId)
    }
  }, [selectedCompanyId, fetchShiftData])

  const openCreate = () => {
    setErrorMsg(null)
    setSuccessMsg(null)

    setCreateForm({
      ...INITIAL_FORM,
      workLocationId: primaryLocation?.id ?? '',
      attendanceLocationIds: primaryLocation ? [primaryLocation.id] : [],
    })
    setIsCreateOpen(true)
  }

  const toggleCreateAttendance = (locationId: string, checked: boolean) => {
    setCreateForm((current) => ({
      ...current,
      attendanceLocationIds: checked
        ? [...new Set([...current.attendanceLocationIds, locationId])]
        : current.attendanceLocationIds.filter((id) => id !== locationId),
    }))
  }

  const toggleCreateEmployee = (employeeId: string, checked: boolean) => {
    setCreateForm((current) => ({
      ...current,
      assignedEmployeeIds: checked
        ? [...new Set([...current.assignedEmployeeIds, employeeId])]
        : current.assignedEmployeeIds.filter((id) => id !== employeeId),
    }))
  }

  const handleCreateSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!createForm.name.trim()) {
      setErrorMsg('Nama shift wajib diisi.')
      return
    }
    if (!createForm.code.trim()) {
      setErrorMsg('Kode shift wajib diisi.')
      return
    }
    if (!createForm.workLocationId) {
      setErrorMsg('Pilih lokasi kerja utama.')
      return
    }
    if (createForm.attendanceLocationIds.length === 0) {
      setErrorMsg('Pilih minimal satu lokasi absensi.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await api.shifting.shifts.post({
        companyId: selectedCompanyId,
        name: createForm.name.trim(),
        code: createForm.code.trim().toUpperCase(),
        description: createForm.description.trim() || undefined,
        startTime: createForm.startTime,
        endTime: createForm.endTime,
        workLocationId: createForm.workLocationId,
        attendanceLocationIds: createForm.attendanceLocationIds,
        status: createForm.status,
        assignedEmployeeIds:
          createForm.assignedEmployeeIds.length > 0
            ? createForm.assignedEmployeeIds
            : undefined,
      })

      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal membuat shift.'))
        return
      }

      setSuccessMsg('Master shift berhasil dibuat.')
      setIsCreateOpen(false)
      fetchShiftData(selectedCompanyId)
    } catch {
      setErrorMsg('Terjadi kesalahan saat menghubungi layanan shifting.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEdit = (shift: Shift) => {
    setErrorMsg(null)
    setSuccessMsg(null)
    setEditItem(shift)
    setEditForm({
      name: shift.name,
      code: shift.code,
      description: shift.description ?? '',
      startTime: displayTime(shift.startTime),
      endTime: displayTime(shift.endTime),
      workLocationId: shift.workLocationId,
      attendanceLocationIds: shift.attendanceLocations.map((location) => location.id),
      status: shift.status,
      assignedEmployeeIds: shift.assignedEmployees?.map((emp) => emp.id) ?? [],
    })
  }

  const toggleEditAttendance = (locationId: string, checked: boolean) => {
    setEditForm((current) => ({
      ...current,
      attendanceLocationIds: checked
        ? [...new Set([...current.attendanceLocationIds, locationId])]
        : current.attendanceLocationIds.filter((id) => id !== locationId),
    }))
  }

  const toggleEditEmployee = (employeeId: string, checked: boolean) => {
    setEditForm((current) => ({
      ...current,
      assignedEmployeeIds: checked
        ? [...new Set([...current.assignedEmployeeIds, employeeId])]
        : current.assignedEmployeeIds.filter((id) => id !== employeeId),
    }))
  }

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editItem) return

    if (!editForm.name.trim()) {
      setErrorMsg('Nama shift wajib diisi.')
      return
    }
    if (!editForm.code.trim()) {
      setErrorMsg('Kode shift wajib diisi.')
      return
    }
    if (!editForm.workLocationId) {
      setErrorMsg('Pilih lokasi kerja utama.')
      return
    }
    if (editForm.attendanceLocationIds.length === 0) {
      setErrorMsg('Pilih minimal satu lokasi absensi.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await api.shifting.shifts({ id: editItem.id }).put({
        companyId: selectedCompanyId,
        name: editForm.name.trim(),
        code: editForm.code.trim().toUpperCase(),
        description: editForm.description.trim() || undefined,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        workLocationId: editForm.workLocationId,
        attendanceLocationIds: editForm.attendanceLocationIds,
        status: editForm.status,
        assignedEmployeeIds: editForm.assignedEmployeeIds,
      })

      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal memperbarui shift.'))
        return
      }

      setSuccessMsg('Master shift berhasil diperbarui.')
      setEditItem(null)
      fetchShiftData(selectedCompanyId)
    } catch {
      setErrorMsg('Terjadi kesalahan saat memperbarui shift.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteItem) return

    setIsDeleting(true)
    setErrorMsg(null)

    try {
      const res = await api.shifting.shifts({ id: deleteItem.id }).delete()
      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal menghapus shift.'))
        return
      }

      setSuccessMsg('Shift berhasil dihapus.')
      setDeleteItem(null)
      fetchShiftData(selectedCompanyId)
    } catch {
      setErrorMsg('Gagal menghapus shift.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Shift dapat dibuat secara mandiri tanpa harus ada karyawan terlebih dahulu
  const canCreate = Boolean(selectedCompanyId) && locations.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Shift Operasional"
        description="Kelola shift kerja perusahaan (jam mulai, jam selesai, lokasi kerja, dan geofence absensi). Shift dapat dibuat sebelum karyawan didaftarkan."
        actions={
          <Button
            tone="primary"
            disabled={!canCreate}
            onClick={openCreate}
            icon={<HiOutlinePlus className="h-4 w-4" />}
          >
            Buat Shift
          </Button>
        }
      />

      {errorMsg && (
        <Notice tone="danger" title="Permintaan gagal" onDismiss={() => setErrorMsg(null)}>
          {errorMsg}
        </Notice>
      )}

      {successMsg && (
        <Notice tone="success" title="Perubahan tersimpan" onDismiss={() => setSuccessMsg(null)}>
          {successMsg}
        </Notice>
      )}

      {companies.length === 0 && !isLoading ? (
        <Panel>
          <EmptyState
            title="Belum ada badan usaha"
            description="Shift membutuhkan entitas perusahaan dan lokasi kerja. Daftarkan perusahaan terlebih dahulu."
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

            {selectedCompany ? (
              <p className="pb-1 text-xs text-ink-2 sm:pb-2 sm:text-[13px] 2xl:text-sm">
                <span className="font-mono font-bold text-ink">{selectedCompany.code}</span>
                {' · '}
                {isLoading ? 'memuat' : `${shifts.length} shift terdaftar`}
                {' · '}
                {activeEmployees.length} karyawan aktif
                {' · '}
                {locations.length} titik geofence
              </p>
            ) : null}
          </div>

          {locations.length === 0 && !isLoading ? (
            <Notice tone="info" title="Lokasi kantor belum tersedia">
              Shift membutuhkan minimal satu lokasi kantor dan titik geofence absensi.{' '}
              <Link
                to={COMPANIES_PATH}
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Atur lokasi kantor perusahaan
              </Link>
              .
            </Notice>
          ) : null}

          {activeEmployees.length === 0 && !isLoading && locations.length > 0 ? (
            <Notice tone="info" title="Master Shift Mandiri">
              Perusahaan ini belum memiliki karyawan. Anda dapat membuat master shift terlebih dahulu agar langsung siap dipilih saat pendaftaran karyawan.{' '}
              <Link
                to={EMPLOYEES_PATH}
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Buka menu karyawan
              </Link>
              .
            </Notice>
          ) : null}

          <Panel>
            <PanelHeader
              title="Daftar Master Shift"
              description="Shift mengikat jadwal jam kerja operasional dan titik geofence presensi yang diizinkan."
              meta={isLoading ? undefined : `${shifts.length} shift`}
            />

            {isLoading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : shifts.length === 0 ? (
              <EmptyState
                title="Belum ada shift"
                description={
                  canCreate
                    ? `Buat master shift pertama untuk ${selectedCompany?.name ?? 'perusahaan ini'}.`
                    : 'Lengkapi lokasi kantor perusahaan untuk mulai membuat shift.'
                }
                action={
                  canCreate ? (
                    <Button
                      tone="primary"
                      onClick={openCreate}
                      icon={<HiOutlinePlus className="h-4 w-4" />}
                    >
                      Buat Shift
                    </Button>
                  ) : null
                }
              />
            ) : (
              <div className="overflow-x-auto rounded-b-panel">
                <table className="w-full min-w-[1040px] border-collapse text-left text-[13px] 2xl:text-sm">
                  <thead>
                    <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-3 2xl:text-xs">
                      <th className="px-4 py-2.5 font-semibold sm:px-5 2xl:px-7 2xl:py-3.5">Nama & Kode Shift</th>
                      <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Jam kerja</th>
                      <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Lokasi kerja utama</th>
                      <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Titik absensi (Geofence)</th>
                      <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Karyawan bertugas</th>
                      <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Status</th>
                      <th className="px-4 py-2.5 text-right font-semibold sm:px-5 2xl:px-7 2xl:py-3.5">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {shifts.map((shift) => (
                      <tr key={shift.id} className="transition-colors hover:bg-surface-2">
                        <td className="px-4 py-3.5 align-top sm:px-5 2xl:px-7 2xl:py-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-ink">{shift.name}</p>
                              <Badge tone="accent">{shift.code}</Badge>
                            </div>
                            {shift.description ? (
                              <p className="mt-0.5 text-xs text-ink-3 truncate max-w-xs">{shift.description}</p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-top 2xl:py-4">
                          <div className="flex items-center gap-2 text-ink">
                            <HiOutlineClock className="h-4 w-4 shrink-0 text-ink-3" />
                            <span className="font-medium tabular">
                              {displayTime(shift.startTime)} — {displayTime(shift.endTime)}
                            </span>
                          </div>
                          {isOvernight(shift.startTime, shift.endTime) ? (
                            <p className="mt-1 text-[11px] font-medium text-amber-600">Melewati tengah malam</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3.5 align-top 2xl:py-4">
                          <div className="flex items-start gap-2">
                            <HiOutlineLocationMarker className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
                            <div>
                              <p className="font-medium text-ink">{shift.workLocation.name}</p>
                              <p className="text-xs text-ink-3">
                                {shift.workLocation.city} · radius {shift.workLocation.radiusMeters} m
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="max-w-[280px] px-4 py-3.5 align-top 2xl:py-4">
                          <p className="text-xs font-semibold text-ink">
                            {shift.attendanceLocations.length} titik geofence
                          </p>
                          <ul className="mt-1 space-y-0.5">
                            {shift.attendanceLocations.map((location) => (
                              <li key={location.id} className="truncate text-xs text-ink-2">
                                • {location.name} ({location.city})
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-4 py-3.5 align-top text-ink-2 2xl:py-4">
                          <div className="flex items-center gap-1.5">
                            <HiOutlineUserGroup className="h-4 w-4 text-ink-3 shrink-0" />
                            <span className="text-xs font-medium text-ink">
                              {shift.assignedCount ?? shift.assignedEmployees?.length ?? 0} karyawan
                            </span>
                          </div>
                          {shift.assignedEmployees && shift.assignedEmployees.length > 0 ? (
                            <p className="mt-1 text-xs text-ink-3 truncate max-w-[200px]">
                              {shift.assignedEmployees.map((e) => e.name).join(', ')}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-ink-3 italic">Belum ada penugasan</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 align-top 2xl:py-4">
                          <StatusFromValue value={shift.status} />
                        </td>
                        <td className="px-4 py-3.5 text-right align-top sm:px-5 2xl:px-7 2xl:py-4">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              size="iconSm"
                              tone="quiet"
                              onClick={() => openEdit(shift)}
                              aria-label={`Ubah shift ${shift.name}`}
                              title="Ubah shift"
                            >
                              <HiOutlinePencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="iconSm"
                              tone="quiet"
                              className="text-error hover:bg-error-subtle hover:text-error"
                              onClick={() => {
                                setErrorMsg(null)
                                setSuccessMsg(null)
                                setDeleteItem(shift)
                              }}
                              aria-label={`Hapus shift ${shift.name}`}
                              title="Hapus shift"
                            >
                              <HiOutlineTrash className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}

      {/* Dialog Buat Shift */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onRequestClose={() => setIsCreateOpen(false)}
        width={720}
      >
        <DialogHeading
          title="Buat Master Shift"
          description="Tentukan nama shift, kode identifikasi, jam kerja operasional, dan titik absensi geofence yang diizinkan."
        />
        <form onSubmit={handleCreateSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="px-4 py-5 sm:px-5">
            {errorMsg ? (
              <Notice tone="danger" title="Permintaan gagal" className="mb-5">
                {errorMsg}
              </Notice>
            ) : null}

            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Nama shift"
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Misal: Shift Reguler Pagi, Shift Malam"
                  required
                />
                <TextField
                  label="Kode shift"
                  value={createForm.code}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))
                  }
                  placeholder="Misal: SH-PAGI, REG-01, MALAM"
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Jam mulai"
                  type="time"
                  value={createForm.startTime}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, startTime: event.target.value }))
                  }
                  required
                />
                <TextField
                  label="Jam selesai"
                  type="time"
                  value={createForm.endTime}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, endTime: event.target.value }))
                  }
                  required
                  hint="Jika jam selesai lebih awal, shift otomatis dihitung melewati tengah malam."
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Lokasi kerja utama"
                  value={createForm.workLocationId}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, workLocationId: event.target.value }))
                  }
                  required
                  hint="Titik kantor tempat shift ini berpusat."
                >
                  <option value="" disabled>
                    Pilih lokasi kerja
                  </option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {locationLine(location)}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  label="Status shift"
                  value={createForm.status}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, status: event.target.value }))
                  }
                >
                  {SHIFT_STATUSES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </div>

              <TextField
                label="Keterangan / Deskripsi (opsional)"
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Catatan operasional shift, toleransi presensi, atau penugasan khusus"
              />

              <div className="space-y-2.5">
                <div>
                  <p className="text-xs font-semibold text-ink-2">
                    Lokasi absensi berizin (Geofence)
                    <span className="ml-1 text-error" aria-hidden="true">
                      *
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-ink-3">
                    Pilih minimal satu titik lokasi kantor. Karyawan yang menggunakan shift ini dapat melakukan presensi di lokasi yang dicentang.
                  </p>
                </div>

                {locations.length === 0 ? (
                  <p className="rounded-control border border-dashed border-line px-3 py-3 text-xs text-ink-3">
                    Belum ada lokasi kantor aktif. Atur lokasi perusahaan terlebih dahulu.
                  </p>
                ) : (
                  <div className="grid gap-2.5 rounded-panel border border-line p-3 sm:grid-cols-2">
                    {locations.map((location) => (
                      <CheckboxField
                        key={location.id}
                        label={location.name}
                        checked={createForm.attendanceLocationIds.includes(location.id)}
                        onChange={(event) =>
                          toggleCreateAttendance(location.id, event.target.checked)
                        }
                        hint={`${location.city} · radius ${location.radiusMeters} m`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {activeEmployees.length > 0 ? (
                <div className="space-y-2.5 border-t border-line pt-4">
                  <div>
                    <p className="text-xs font-semibold text-ink-2">
                      Tetapkan ke karyawan aktif saat ini (opsional)
                    </p>
                    <p className="mt-1 text-[11px] leading-snug text-ink-3">
                      Anda dapat langsung menugaskan karyawan ke shift ini sekarang, atau melakukannya nanti di halaman pendaftaran karyawan.
                    </p>
                  </div>

                  <div className="grid max-h-48 gap-2 overflow-y-auto rounded-panel border border-line p-3 sm:grid-cols-2">
                    {activeEmployees.map((employee) => (
                      <CheckboxField
                        key={employee.id}
                        label={employee.name}
                        checked={createForm.assignedEmployeeIds.includes(employee.id)}
                        onChange={(event) =>
                          toggleCreateEmployee(employee.id, event.target.checked)
                        }
                        hint={`${employee.position || 'Staf'} ${employee.department ? `· ${employee.department.name}` : ''}`}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" onClick={() => setIsCreateOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              tone="primary"
              loading={isSubmitting}
              disabled={createForm.attendanceLocationIds.length === 0}
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Shift'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Dialog Ubah Shift */}
      <Dialog
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        onRequestClose={() => setEditItem(null)}
        width={720}
      >
        <DialogHeading
          title={`Ubah Shift ${editItem?.name ?? ''}`}
          description="Sesuaikan jam operasional, lokasi kantor, dan titik absensi geofence."
        />
        <form onSubmit={handleEditSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="px-4 py-5 sm:px-5">
            {errorMsg ? (
              <Notice tone="danger" title="Permintaan gagal" className="mb-5">
                {errorMsg}
              </Notice>
            ) : null}

            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Nama shift"
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
                <TextField
                  label="Kode shift"
                  value={editForm.code}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))
                  }
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Jam mulai"
                  type="time"
                  value={editForm.startTime}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, startTime: event.target.value }))
                  }
                  required
                />
                <TextField
                  label="Jam selesai"
                  type="time"
                  value={editForm.endTime}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, endTime: event.target.value }))
                  }
                  required
                  hint="Jika jam selesai lebih awal, shift otomatis dihitung melewati tengah malam."
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Lokasi kerja utama"
                  value={editForm.workLocationId}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, workLocationId: event.target.value }))
                  }
                  required
                >
                  <option value="" disabled>
                    Pilih lokasi kerja
                  </option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {locationLine(location)}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  label="Status shift"
                  value={editForm.status}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, status: event.target.value }))
                  }
                >
                  {SHIFT_STATUSES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </div>

              <TextField
                label="Keterangan / Deskripsi (opsional)"
                value={editForm.description}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, description: event.target.value }))
                }
              />

              <div className="space-y-2.5">
                <div>
                  <p className="text-xs font-semibold text-ink-2">
                    Lokasi absensi berizin (Geofence)
                    <span className="ml-1 text-error" aria-hidden="true">
                      *
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-ink-3">
                    Pilih minimal satu titik lokasi kantor untuk presensi shift ini.
                  </p>
                </div>

                <div className="grid gap-2.5 rounded-panel border border-line p-3 sm:grid-cols-2">
                  {locations.map((location) => (
                    <CheckboxField
                      key={location.id}
                      label={location.name}
                      checked={editForm.attendanceLocationIds.includes(location.id)}
                      onChange={(event) =>
                        toggleEditAttendance(location.id, event.target.checked)
                      }
                      hint={`${location.city} · radius ${location.radiusMeters} m`}
                    />
                  ))}
                </div>
              </div>

              {activeEmployees.length > 0 ? (
                <div className="space-y-2.5 border-t border-line pt-4">
                  <div>
                    <p className="text-xs font-semibold text-ink-2">
                      Karyawan yang ditugaskan pada shift ini
                    </p>
                    <p className="mt-1 text-[11px] leading-snug text-ink-3">
                      Centang karyawan yang mengikuti shift operasional ini.
                    </p>
                  </div>

                  <div className="grid max-h-48 gap-2 overflow-y-auto rounded-panel border border-line p-3 sm:grid-cols-2">
                    {activeEmployees.map((employee) => (
                      <CheckboxField
                        key={employee.id}
                        label={employee.name}
                        checked={editForm.assignedEmployeeIds.includes(employee.id)}
                        onChange={(event) =>
                          toggleEditEmployee(employee.id, event.target.checked)
                        }
                        hint={`${employee.position || 'Staf'} ${employee.department ? `· ${employee.department.name}` : ''}`}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" onClick={() => setEditItem(null)}>
              Batal
            </Button>
            <Button
              type="submit"
              tone="primary"
              loading={isSubmitting}
              disabled={editForm.attendanceLocationIds.length === 0}
            >
              {isSubmitting ? 'Memperbarui...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Konfirmasi Hapus */}
      <ConfirmDialog
        isOpen={!!deleteItem}
        type="danger"
        title="Hapus Master Shift"
        confirmText={isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
        cancelText="Batal"
        onClose={() => setDeleteItem(null)}
        onCancel={() => setDeleteItem(null)}
        onConfirm={handleConfirmDelete}
      >
        <p>
          Hapus master shift <strong className="font-semibold text-ink">{deleteItem?.name}</strong>{' '}
          ({displayTime(deleteItem?.startTime ?? '')} — {displayTime(deleteItem?.endTime ?? '')})?
          Penugasan shift pada karyawan terkait akan diatur ulang.
        </p>
      </ConfirmDialog>
    </div>
  )
}
