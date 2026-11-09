import * as React from 'react'
import { Link, createRoute } from '@tanstack/react-router'
import {
  HiOutlineArrowRight,
  HiOutlineClock,
  HiOutlineLocationMarker,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineTrash,
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
import type { Company, CompanyLocation, Employee, Shift, ShiftLocation } from '@/@types/organization'
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

const INITIAL_CREATE_FORM = {
  employeeId: '',
  position: '',
  supervisorId: '',
  startTime: '08:00',
  endTime: '17:00',
  workLocationId: '',
  attendanceLocationIds: [] as string[],
  status: 'active',
}

const INITIAL_EDIT_FORM = { ...INITIAL_CREATE_FORM }

function displayTime(value: string) {
  return value?.slice(0, 5) || '—'
}

function isOvernight(startTime: string, endTime: string) {
  return endTime <= startTime
}

function initials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'KR'
  )
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
  const [createForm, setCreateForm] = React.useState(INITIAL_CREATE_FORM)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [editItem, setEditItem] = React.useState<Shift | null>(null)
  const [editForm, setEditForm] = React.useState(INITIAL_EDIT_FORM)

  const [deleteItem, setDeleteItem] = React.useState<Shift | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const selectedCompany = companies.find((item) => item.id === selectedCompanyId)
  const locations = (selectedCompany?.locations ?? []).filter(
    (location) => location.status === 'active'
  )
  const primaryLocation = locations.find((location) => location.isPrimary) ?? locations[0]
  const activeEmployees = employees.filter((employee) => employee.status === 'active')

  const supervisorOptions = employees.filter(
    (employee) => employee.status === 'active' && employee.id !== createForm.employeeId
  )

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
        setErrorMsg(errorText(employeesRes, 'Gagal memuat data karyawan.'))
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

  const applyEmployeeDefaults = (
    employeeId: string,
    form: typeof INITIAL_CREATE_FORM
  ) => {
    const employee = employees.find((item) => item.id === employeeId)
    return {
      ...form,
      employeeId,
      position: employee?.position ?? form.position,
      supervisorId: employee?.supervisorId ?? '',
    }
  }

  const openCreate = () => {
    setErrorMsg(null)
    setSuccessMsg(null)

    const firstEmployee = activeEmployees[0]
    const base = {
      ...INITIAL_CREATE_FORM,
      employeeId: firstEmployee?.id ?? '',
      position: firstEmployee?.position ?? '',
      supervisorId: firstEmployee?.supervisorId ?? '',
      workLocationId: primaryLocation?.id ?? '',
      attendanceLocationIds: primaryLocation ? [primaryLocation.id] : [],
    }

    setCreateForm(base)
    setIsCreateOpen(true)
  }

  const handleCreateEmployeeChange = (employeeId: string) => {
    setCreateForm((current) => applyEmployeeDefaults(employeeId, current))
  }

  const toggleCreateAttendance = (locationId: string, checked: boolean) => {
    setCreateForm((current) => ({
      ...current,
      attendanceLocationIds: checked
        ? [...new Set([...current.attendanceLocationIds, locationId])]
        : current.attendanceLocationIds.filter((id) => id !== locationId),
    }))
  }

  const handleCreateSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (createForm.attendanceLocationIds.length === 0) {
      setErrorMsg('Pilih minimal satu lokasi absensi.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await api.shifting.shifts.post({
        employeeId: createForm.employeeId,
        position: createForm.position.trim(),
        supervisorId: createForm.supervisorId || undefined,
        startTime: createForm.startTime,
        endTime: createForm.endTime,
        workLocationId: createForm.workLocationId,
        attendanceLocationIds: createForm.attendanceLocationIds,
        status: createForm.status,
      })

      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal membuat shift.'))
        return
      }

      setSuccessMsg('Shift karyawan berhasil dibuat.')
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
      employeeId: shift.employeeId,
      position: shift.position,
      supervisorId: shift.supervisorId ?? '',
      startTime: displayTime(shift.startTime),
      endTime: displayTime(shift.endTime),
      workLocationId: shift.workLocationId,
      attendanceLocationIds: shift.attendanceLocations.map((location) => location.id),
      status: shift.status,
    })
  }

  const handleEditEmployeeChange = (employeeId: string) => {
    setEditForm((current) => applyEmployeeDefaults(employeeId, current))
  }

  const toggleEditAttendance = (locationId: string, checked: boolean) => {
    setEditForm((current) => ({
      ...current,
      attendanceLocationIds: checked
        ? [...new Set([...current.attendanceLocationIds, locationId])]
        : current.attendanceLocationIds.filter((id) => id !== locationId),
    }))
  }

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editItem) return

    if (editForm.attendanceLocationIds.length === 0) {
      setErrorMsg('Pilih minimal satu lokasi absensi.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await api.shifting.shifts({ id: editItem.id }).put({
        employeeId: editForm.employeeId,
        position: editForm.position.trim(),
        supervisorId: editForm.supervisorId || undefined,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        workLocationId: editForm.workLocationId,
        attendanceLocationIds: editForm.attendanceLocationIds,
        status: editForm.status,
      })

      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal memperbarui shift.'))
        return
      }

      setSuccessMsg('Shift karyawan berhasil diperbarui.')
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

      setSuccessMsg('Shift karyawan berhasil dihapus.')
      setDeleteItem(null)
      fetchShiftData(selectedCompanyId)
    } catch {
      setErrorMsg('Gagal menghapus shift.')
    } finally {
      setIsDeleting(false)
    }
  }

  const canCreate =
    Boolean(selectedCompanyId) && activeEmployees.length > 0 && locations.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shift Karyawan"
        description="Satu shift melekat pada satu karyawan. Tentukan jam kerja, lokasi kerja, posisi, atasan, dan titik geofence absensi."
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
            description="Shift membutuhkan karyawan dan lokasi geofence. Daftarkan perusahaan terlebih dahulu."
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
                {isLoading ? 'memuat' : `${shifts.length} shift`}
                {' · '}
                {activeEmployees.length} karyawan aktif
                {' · '}
                {locations.length} lokasi absensi
              </p>
            ) : null}
          </div>

          {activeEmployees.length === 0 && !isLoading ? (
            <Notice tone="info" title="Karyawan aktif belum tersedia">
              Tambahkan karyawan aktif terlebih dahulu sebelum menyusun shift.{' '}
              <Link
                to={EMPLOYEES_PATH}
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Buka halaman karyawan
              </Link>
              .
            </Notice>
          ) : null}

          {locations.length === 0 && !isLoading ? (
            <Notice tone="info" title="Lokasi geofence belum tersedia">
              Shift membutuhkan minimal satu lokasi kerja dan lokasi absensi.{' '}
              <Link
                to={COMPANIES_PATH}
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Atur lokasi perusahaan
              </Link>
              .
            </Notice>
          ) : null}

          <Panel>
            <PanelHeader
              title="Penugasan shift"
              description="Titik absensi memakai koordinat dan radius geofence dari lokasi perusahaan."
              meta={isLoading ? undefined : `${shifts.length} penugasan`}
            />

            {isLoading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : shifts.length === 0 ? (
              <EmptyState
                title="Belum ada shift"
                description={
                  canCreate
                    ? `Buat penugasan shift pertama untuk ${selectedCompany?.name ?? 'perusahaan ini'}.`
                    : 'Lengkapi karyawan aktif dan lokasi perusahaan untuk mulai membuat shift.'
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
                      <th className="px-4 py-2.5 font-semibold sm:px-5 2xl:px-7 2xl:py-3.5">Karyawan</th>
                      <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Jam kerja</th>
                      <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Lokasi kerja</th>
                      <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Titik absensi</th>
                      <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Atasan</th>
                      <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Status</th>
                      <th className="px-4 py-2.5 text-right font-semibold sm:px-5 2xl:px-7 2xl:py-3.5">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {shifts.map((shift) => (
                      <tr key={shift.id} className="transition-colors hover:bg-surface-2">
                        <td className="px-4 py-3.5 align-top sm:px-5 2xl:px-7 2xl:py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-[11px] font-bold text-primary">
                              {initials(shift.employee.name)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-ink">{shift.employee.name}</p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-ink-2">{shift.position}</span>
                                {shift.department ? (
                                  <Badge tone="accent">{shift.department.code}</Badge>
                                ) : null}
                              </div>
                            </div>
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
                            <p className="mt-1 text-[11px] text-ink-3">Melewati tengah malam</p>
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
                                {location.name}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-4 py-3.5 align-top text-ink-2 2xl:py-4">
                          {shift.supervisor ? (
                            <div>
                              <p className="font-medium text-ink">{shift.supervisor.name}</p>
                              <p className="text-xs text-ink-3">Atasan langsung</p>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-ink-3">Independen</span>
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
                              aria-label={`Ubah shift ${shift.employee.name}`}
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
                              aria-label={`Hapus shift ${shift.employee.name}`}
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

      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onRequestClose={() => setIsCreateOpen(false)}
        width={720}
      >
        <DialogHeading
          title="Buat Shift Karyawan"
          description="Posisi dan atasan mengikuti data karyawan saat dipilih, lalu dapat disesuaikan untuk shift ini."
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
                <SelectField
                  label="Karyawan"
                  value={createForm.employeeId}
                  onChange={(event) => handleCreateEmployeeChange(event.target.value)}
                  required
                >
                  <option value="" disabled>
                    Pilih karyawan
                  </option>
                  {employees.map((employee) => (
                    <option
                      key={employee.id}
                      value={employee.id}
                      disabled={employee.status !== 'active'}
                    >
                      {employee.name}
                      {employee.department ? ` — ${employee.department.name}` : ''}
                      {employee.status !== 'active' ? ' (nonaktif)' : ''}
                    </option>
                  ))}
                </SelectField>

                <TextField
                  label="Posisi kerja pada shift"
                  value={createForm.position}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, position: event.target.value }))
                  }
                  placeholder="Posisi saat menjalankan shift"
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
                  hint="Jika jam selesai lebih awal, shift dianggap melewati tengah malam."
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Atasan pada shift"
                  value={createForm.supervisorId}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, supervisorId: event.target.value }))
                  }
                  hint="Kosongkan jika karyawan independen."
                >
                  <option value="">Tidak ada atasan (independen)</option>
                  {supervisorOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                      {employee.position ? ` — ${employee.position}` : ''}
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

              <SelectField
                label="Lokasi kerja"
                value={createForm.workLocationId}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, workLocationId: event.target.value }))
                }
                required
                hint="Lokasi tempat karyawan menjalankan pekerjaan pada shift ini."
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

              <div className="space-y-2.5">
                <div>
                  <p className="text-xs font-semibold text-ink-2">
                    Lokasi absensi (geofence)
                    <span className="ml-1 text-error" aria-hidden="true">
                      *
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-ink-3">
                    Pilih minimal satu titik. Karyawan dapat absen di lebih dari satu lokasi.
                  </p>
                </div>

                {locations.length === 0 ? (
                  <p className="rounded-control border border-dashed border-line px-3 py-3 text-xs text-ink-3">
                    Belum ada lokasi aktif. Atur lokasi perusahaan terlebih dahulu.
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
                        hint={`${location.city} · radius ${location.radiusMeters} m · ${location.address}`}
                      />
                    ))}
                  </div>
                )}
              </div>
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

      <Dialog
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        onRequestClose={() => setEditItem(null)}
        width={720}
      >
        <DialogHeading
          title={`Ubah Shift ${editItem?.employee.name ?? ''}`}
          description="Perubahan berlaku pada penugasan shift ini saja, bukan pada seluruh karyawan."
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
                <SelectField
                  label="Karyawan"
                  value={editForm.employeeId}
                  onChange={(event) => handleEditEmployeeChange(event.target.value)}
                  required
                >
                  <option value="" disabled>
                    Pilih karyawan
                  </option>
                  {employees.map((employee) => (
                    <option
                      key={employee.id}
                      value={employee.id}
                      disabled={employee.status !== 'active' && employee.id !== editForm.employeeId}
                    >
                      {employee.name}
                      {employee.department ? ` — ${employee.department.name}` : ''}
                      {employee.status !== 'active' ? ' (nonaktif)' : ''}
                    </option>
                  ))}
                </SelectField>

                <TextField
                  label="Posisi kerja pada shift"
                  value={editForm.position}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, position: event.target.value }))
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
                  hint="Jika jam selesai lebih awal, shift dianggap melewati tengah malam."
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Atasan pada shift"
                  value={editForm.supervisorId}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, supervisorId: event.target.value }))
                  }
                  hint="Kosongkan jika karyawan independen."
                >
                  <option value="">Tidak ada atasan (independen)</option>
                  {employees
                    .filter(
                      (employee) =>
                        employee.status === 'active' && employee.id !== editForm.employeeId
                    )
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                        {employee.position ? ` — ${employee.position}` : ''}
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

              <SelectField
                label="Lokasi kerja"
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

              <div className="space-y-2.5">
                <div>
                  <p className="text-xs font-semibold text-ink-2">
                    Lokasi absensi (geofence)
                    <span className="ml-1 text-error" aria-hidden="true">
                      *
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-ink-3">
                    Pilih minimal satu titik. Perubahan langsung mengganti daftar titik untuk shift ini.
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
                      hint={`${location.city} · radius ${location.radiusMeters} m · ${location.address}`}
                    />
                  ))}
                </div>
              </div>
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

      <ConfirmDialog
        isOpen={!!deleteItem}
        type="danger"
        title="Hapus Shift"
        confirmText={isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
        cancelText="Batal"
        onClose={() => setDeleteItem(null)}
        onCancel={() => setDeleteItem(null)}
        onConfirm={handleConfirmDelete}
      >
        <p>
          Hapus shift <strong className="font-semibold text-ink">{deleteItem?.employee.name}</strong>{' '}
          pada {displayTime(deleteItem?.startTime ?? '')} — {displayTime(deleteItem?.endTime ?? '')}?
          Titik absensi pada shift ini ikut dihapus.
        </p>
      </ConfirmDialog>
    </div>
  )
}
