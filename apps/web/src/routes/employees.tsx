import * as React from 'react'
import { Link, createRoute } from '@tanstack/react-router'
import {
  HiOutlineArrowRight,
  HiOutlineClock,
  HiOutlineIdentification,
  HiOutlineMail,
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
import type { Company, Department, Employee, Shift, Biodata } from '@/@types/organization'
import { COMPANIES_PATH, EMPLOYEES_PATH, SHIFTS_PATH } from '@/constants/route.constant'

export const employeesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: EMPLOYEES_PATH,
  component: EmployeesPage,
})

const EMPLOYEE_STATUSES = [
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
]

const INITIAL_CREATE_FORM = {
  name: '',
  email: '',
  position: '',
  departmentId: '',
  supervisorId: '',
  shiftId: '',
}

const INITIAL_EDIT_FORM = {
  name: '',
  email: '',
  position: '',
  departmentId: '',
  supervisorId: '',
  shiftId: '',
  status: 'active',
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

function formatDate(value?: string | Date | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatGender(gender?: string | null) {
  if (gender === 'male') return 'Laki-laki'
  if (gender === 'female') return 'Perempuan'
  return gender || '—'
}

function formatMaritalStatus(status?: string | null) {
  if (status === 'married') return 'Menikah'
  if (status === 'single') return 'Belum Menikah'
  if (status === 'widow') return 'Janda'
  if (status === 'widower') return 'Duda'
  return status || '—'
}

function displayTime(value?: string | null) {
  return value?.slice(0, 5) || '—'
}

export function EmployeesPage() {
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = React.useState('')
  const [departments, setDepartments] = React.useState<Department[]>([])
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [shifts, setShifts] = React.useState<Shift[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [createForm, setCreateForm] = React.useState(INITIAL_CREATE_FORM)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [editItem, setEditItem] = React.useState<Employee | null>(null)
  const [editForm, setEditForm] = React.useState(INITIAL_EDIT_FORM)

  const [deleteItem, setDeleteItem] = React.useState<Employee | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // State Dialog Biodata Karyawan
  const [viewBiodataEmployee, setViewBiodataEmployee] = React.useState<Employee | null>(null)
  const [employeeBiodata, setEmployeeBiodata] = React.useState<Biodata | null>(null)
  const [isLoadingBiodata, setIsLoadingBiodata] = React.useState(false)
  const [biodataModalError, setBiodataModalError] = React.useState<string | null>(null)

  const selectedCompany = companies.find((item) => item.id === selectedCompanyId)
  const activeDepartments = departments.filter((department) => department.status === 'active')
  const activeShifts = shifts.filter((shift) => shift.status === 'active')
  const supervisorOptions = employees.filter(
    (employee) => employee.status === 'active' && employee.id !== editItem?.id
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

  const fetchOrganization = React.useCallback(async (companyId: string) => {
    if (!companyId) return
    setIsLoading(true)
    setErrorMsg(null)

    try {
      const [departmentsRes, employeesRes, shiftsRes] = await Promise.all([
        api.departments.get({ query: { companyId } }),
        api.employees.get({ query: { companyId } }),
        api.shifting.shifts.get({ query: { companyId } }),
      ])

      if (departmentsRes.error) {
        setErrorMsg(errorText(departmentsRes, 'Gagal memuat data departemen.'))
      }
      if (employeesRes.error) {
        setErrorMsg(errorText(employeesRes, 'Gagal memuat data karyawan.'))
        setEmployees([])
      } else {
        const empList = Array.isArray(employeesRes.data)
          ? employeesRes.data
          : Array.isArray((employeesRes.data as any)?.data)
            ? (employeesRes.data as any).data
            : []
        setEmployees(empList as Employee[])
      }

      if (!shiftsRes.error) {
        const shiftList = Array.isArray(shiftsRes.data)
          ? shiftsRes.data
          : Array.isArray((shiftsRes.data as any)?.data)
            ? (shiftsRes.data as any).data
            : []
        setShifts(shiftList as Shift[])
      } else {
        setShifts([])
      }

      const depList = Array.isArray(departmentsRes.data)
        ? departmentsRes.data
        : Array.isArray((departmentsRes.data as any)?.data)
          ? (departmentsRes.data as any).data
          : []
      setDepartments(depList as Department[])
    } catch {
      setEmployees([])
      setShifts([])
      setErrorMsg('Gagal memuat data organisasi dari gateway.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  React.useEffect(() => {
    if (selectedCompanyId) {
      fetchOrganization(selectedCompanyId)
    }
  }, [selectedCompanyId, fetchOrganization])

  const openCreate = () => {
    setErrorMsg(null)
    setSuccessMsg(null)
    setCreateForm({
      ...INITIAL_CREATE_FORM,
      departmentId: activeDepartments[0]?.id ?? '',
      shiftId: activeShifts[0]?.id ?? '',
    })
    setIsCreateOpen(true)
  }

  const handleCreateSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedCompanyId) {
      setErrorMsg('Pilih perusahaan terlebih dahulu.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await api.employees.post({
        companyId: selectedCompanyId,
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        position: createForm.position.trim(),
        departmentId: createForm.departmentId,
        supervisorId: createForm.supervisorId || undefined,
        shiftId: createForm.shiftId || undefined,
      })

      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal menambahkan karyawan.'))
        return
      }

      const created = (res.data as unknown as { data: Employee; initialPassword: string })
      setSuccessMsg(
        `Karyawan ${created.data.name} berhasil ditambahkan. Kata sandi awal: ${created.initialPassword}.`
      )
      setIsCreateOpen(false)
      fetchOrganization(selectedCompanyId)
    } catch {
      setErrorMsg('Terjadi kesalahan saat menghubungi gateway.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEdit = (employee: Employee) => {
    setErrorMsg(null)
    setSuccessMsg(null)
    setEditItem(employee)
    setEditForm({
      name: employee.name,
      email: employee.email,
      position: employee.position ?? '',
      departmentId: employee.departmentId ?? '',
      supervisorId: employee.supervisorId ?? '',
      shiftId: employee.shiftId ?? employee.shift?.id ?? '',
      status: employee.status,
    })
  }

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editItem) return

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await api.employees({ id: editItem.id }).put({
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        position: editForm.position.trim(),
        departmentId: editForm.departmentId,
        supervisorId: editForm.supervisorId || undefined,
        shiftId: editForm.shiftId || undefined,
        status: editForm.status,
      })

      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal memperbarui data karyawan.'))
        return
      }

      setSuccessMsg(`Data ${editItem.name} berhasil diperbarui.`)
      setEditItem(null)
      fetchOrganization(selectedCompanyId)
    } catch {
      setErrorMsg('Terjadi kesalahan saat memperbarui data karyawan.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteItem) return

    setIsDeleting(true)
    setErrorMsg(null)

    try {
      const res = await api.employees({ id: deleteItem.id }).delete()
      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal menghapus karyawan.'))
        return
      }

      setSuccessMsg(`Karyawan ${deleteItem.name} berhasil dihapus.`)
      setDeleteItem(null)
      fetchOrganization(selectedCompanyId)
    } catch {
      setErrorMsg('Gagal menghapus karyawan.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenBiodata = async (employee: Employee) => {
    setViewBiodataEmployee(employee)
    setIsLoadingBiodata(true)
    setBiodataModalError(null)
    setEmployeeBiodata(null)

    try {
      const res = await api.employees({ id: employee.id }).biodata.get()
      if (res.error) {
        setBiodataModalError(errorText(res, 'Gagal mengambil rincian biodata karyawan.'))
      } else {
        const raw = (res.data as any)?.data || res.data
        setEmployeeBiodata(raw as Biodata)
      }
    } catch {
      setBiodataModalError('Terjadi kesalahan jaringan saat mengambil biodata.')
    } finally {
      setIsLoadingBiodata(false)
    }
  }

  const canCreate = Boolean(selectedCompanyId) && activeDepartments.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Karyawan & Staf"
        description="Kelola akun karyawan, jabatan, departemen kerja, dan penugasan shift operasional."
        actions={
          <Button
            tone="primary"
            disabled={!canCreate}
            onClick={openCreate}
            icon={<HiOutlinePlus className="h-4 w-4" />}
          >
            Tambah Karyawan
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
            description="Karyawan selalu terdaftar di bawah satu badan usaha. Daftarkan perusahaan terlebih dahulu."
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
                {isLoading ? 'memuat' : `${employees.length} karyawan`}
                {' · '}
                {activeDepartments.length} departemen aktif
                {' · '}
                {activeShifts.length} shift aktif
              </p>
            ) : null}
          </div>

          {activeDepartments.length === 0 && !isLoading ? (
            <Notice tone="info" title="Departemen aktif belum tersedia">
              Tambahkan departemen aktif terlebih dahulu sebelum mendaftarkan karyawan.
            </Notice>
          ) : null}

          {activeShifts.length === 0 && !isLoading ? (
            <Notice tone="info" title="Shift operasional belum dibuat">
              Perusahaan ini belum memiliki master shift. Anda dapat membuat shift terlebih dahulu agar langsung dapat dipilih saat pendaftaran karyawan.{' '}
              <Link
                to={SHIFTS_PATH}
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Buat master shift
              </Link>
              .
            </Notice>
          ) : null}

          <Panel>
            <PanelHeader
              title="Daftar karyawan"
              description="Atasan dipilih dari karyawan yang sudah terdaftar. Shift menentukan jam kerja dan geofence absensi."
              meta={isLoading ? undefined : `${employees.length} orang`}
              actions={
                <Link to={SHIFTS_PATH} className="inline-flex">
                  <Button size="sm" tone="neutral">
                    Kelola shift
                  </Button>
                </Link>
              }
            />

            {isLoading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : employees.length === 0 ? (
              <EmptyState
                title="Belum ada karyawan"
                description={`Tambahkan karyawan pertama untuk ${selectedCompany?.name ?? 'perusahaan ini'}. Kata sandi awal akun adalah "password".`}
                action={
                  <Button
                    tone="primary"
                    disabled={!canCreate}
                    onClick={openCreate}
                    icon={<HiOutlinePlus className="h-4 w-4" />}
                  >
                    Tambah Karyawan
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto rounded-b-panel">
                <table className="w-full min-w-[920px] border-collapse text-left text-[13px] 2xl:text-sm">
                  <thead>
                    <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-3 2xl:text-xs">
                      <th className="px-4 py-2.5 font-semibold sm:px-5 2xl:px-7 2xl:py-3.5">Karyawan</th>
                      <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Posisi & departemen</th>
                      <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Shift kerja</th>
                      <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Biodata & Mail</th>
                      <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Atasan</th>
                      <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Status</th>
                      <th className="px-4 py-2.5 text-right font-semibold sm:px-5 2xl:px-7 2xl:py-3.5">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {employees.map((employee) => (
                      <tr key={employee.id} className="transition-colors hover:bg-surface-2">
                        <td className="px-4 py-3.5 align-top sm:px-5 2xl:px-7 2xl:py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-[11px] font-bold text-primary">
                              {initials(employee.name)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-ink">{employee.name}</p>
                              <p className="truncate text-xs text-ink-3">{employee.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-top 2xl:py-4">
                          <p className="font-medium text-ink">{employee.position || 'Belum diisi'}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {employee.department ? (
                              <>
                                <Badge tone="accent">{employee.department.code}</Badge>
                                <span className="text-xs text-ink-2">{employee.department.name}</span>
                              </>
                            ) : (
                              <span className="text-xs text-ink-3">Tanpa departemen</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-top 2xl:py-4">
                          {employee.shift ? (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <HiOutlineClock className="h-4 w-4 shrink-0 text-ink-3" />
                                <span className="font-medium text-ink">{employee.shift.name}</span>
                                <Badge tone="neutral">{employee.shift.code}</Badge>
                              </div>
                              <p className="mt-0.5 text-xs text-ink-3 tabular">
                                {displayTime(employee.shift.startTime)} — {displayTime(employee.shift.endTime)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-ink-3 italic">Belum diatur</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 align-top 2xl:py-4">
                          <div className="space-y-1">
                            {employee.biodataCompleted ? (
                              <button
                                type="button"
                                onClick={() => handleOpenBiodata(employee)}
                                className="inline-flex items-center gap-1 rounded bg-success/15 px-2 py-0.5 text-xs font-semibold text-success hover:bg-success/25 transition-colors cursor-pointer text-left"
                                title="Klik untuk melihat rincian biodata lengkap"
                              >
                                Lengkap ✓
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenBiodata(employee)}
                                className="inline-flex items-center gap-1 rounded bg-surface-3 px-2 py-0.5 text-xs font-medium text-ink-3 hover:bg-surface-2 transition-colors cursor-pointer text-left"
                                title="Klik untuk melihat status biodata"
                              >
                                Belum Diisi ○
                              </button>
                            )}
                            <p className="flex items-center gap-1 text-[11px] text-ink-3">
                              <HiOutlineMail className="h-3.5 w-3.5 text-primary" />
                              <span>Relasi Mail Aktif</span>
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-top text-ink-2 2xl:py-4">
                          {employee.supervisor ? (
                            <div>
                              <p className="font-medium text-ink">{employee.supervisor.name}</p>
                              <p className="text-xs text-ink-3">Atasan langsung</p>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-ink-3">Independen</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 align-top 2xl:py-4">
                          <StatusFromValue value={employee.status} />
                        </td>
                        <td className="px-4 py-3.5 text-right align-top sm:px-5 2xl:px-7 2xl:py-4">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              size="iconSm"
                              tone="quiet"
                              onClick={() => handleOpenBiodata(employee)}
                              aria-label={`Lihat biodata ${employee.name}`}
                              title="Lihat biodata karyawan"
                            >
                              <HiOutlineIdentification className="h-4 w-4 text-primary" />
                            </Button>
                            <Button
                              size="iconSm"
                              tone="quiet"
                              onClick={() => openEdit(employee)}
                              aria-label={`Ubah karyawan ${employee.name}`}
                              title="Ubah karyawan"
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
                                setDeleteItem(employee)
                              }}
                              aria-label={`Hapus karyawan ${employee.name}`}
                              title="Hapus karyawan"
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

      {/* Dialog Tambah Karyawan */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onRequestClose={() => setIsCreateOpen(false)}
        width={640}
      >
        <DialogHeading
          title="Tambah Karyawan"
          description={
            selectedCompany
              ? `Akun karyawan akan terdaftar di ${selectedCompany.name}.`
              : 'Pilih perusahaan sebelum menambahkan karyawan.'
          }
        />
        <form onSubmit={handleCreateSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="px-4 py-5 sm:px-5">
            {errorMsg ? (
              <Notice tone="danger" title="Permintaan gagal" className="mb-5">
                {errorMsg}
              </Notice>
            ) : null}

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Nama lengkap"
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Nama karyawan"
                  required
                />
                <TextField
                  label="Surel"
                  type="email"
                  value={createForm.email}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="nama@perusahaan.id"
                  required
                />
              </div>

              <TextField
                label="Posisi kerja"
                value={createForm.position}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, position: event.target.value }))
                }
                placeholder="Contoh: Staf Operasional, Software Engineer"
                required
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Departemen"
                  value={createForm.departmentId}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, departmentId: event.target.value }))
                  }
                  required
                >
                  <option value="" disabled>
                    Pilih departemen
                  </option>
                  {activeDepartments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name} ({department.code})
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  label="Shift kerja"
                  value={createForm.shiftId}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, shiftId: event.target.value }))
                  }
                  hint="Jadwal kerja & lokasi absensi geofence."
                >
                  <option value="">Pilih shift (opsional)</option>
                  {activeShifts.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name} ({shift.code}) · {displayTime(shift.startTime)}—{displayTime(shift.endTime)}
                    </option>
                  ))}
                </SelectField>
              </div>

              <SelectField
                label="Atasan langsung"
                value={createForm.supervisorId}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, supervisorId: event.target.value }))
                }
                hint="Kosongkan jika karyawan independen atau tidak memiliki atasan langsung."
              >
                <option value="">Tidak ada atasan (independen)</option>
                {supervisorOptions.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                    {employee.position ? ` — ${employee.position}` : ''}
                  </option>
                ))}
              </SelectField>

              <TextField
                label="Kata sandi awal"
                value="password"
                readOnly
                mono
                hint="Akun dibuat dengan kata sandi ini. Sampaikan kepada karyawan saat serah terima akun."
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" onClick={() => setIsCreateOpen(false)}>
              Batal
            </Button>
            <Button type="submit" tone="primary" loading={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan Karyawan'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Dialog Ubah Karyawan */}
      <Dialog
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        onRequestClose={() => setEditItem(null)}
        width={640}
      >
        <DialogHeading
          title={`Ubah Karyawan ${editItem?.name ?? ''}`}
          description="Perubahan posisi, departemen, atasan, dan shift kerja karyawan."
        />
        <form onSubmit={handleEditSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="px-4 py-5 sm:px-5">
            {errorMsg ? (
              <Notice tone="danger" title="Permintaan gagal" className="mb-5">
                {errorMsg}
              </Notice>
            ) : null}

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Nama lengkap"
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
                <TextField
                  label="Surel"
                  type="email"
                  value={editForm.email}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
              </div>

              <TextField
                label="Posisi kerja"
                value={editForm.position}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, position: event.target.value }))
                }
                required
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Departemen"
                  value={editForm.departmentId}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, departmentId: event.target.value }))
                  }
                  required
                >
                  <option value="" disabled>
                    Pilih departemen
                  </option>
                  {departments.map((department) => (
                    <option
                      key={department.id}
                      value={department.id}
                      disabled={department.status !== 'active' && department.id !== editForm.departmentId}
                    >
                      {department.name} ({department.code})
                      {department.status !== 'active' ? ' — nonaktif' : ''}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  label="Shift kerja"
                  value={editForm.shiftId}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, shiftId: event.target.value }))
                  }
                  hint="Jadwal kerja & lokasi absensi geofence."
                >
                  <option value="">Tidak ada shift (kosongkan)</option>
                  {shifts.map((shift) => (
                    <option
                      key={shift.id}
                      value={shift.id}
                      disabled={shift.status !== 'active' && shift.id !== editForm.shiftId}
                    >
                      {shift.name} ({shift.code}) · {displayTime(shift.startTime)}—{displayTime(shift.endTime)}
                      {shift.status !== 'active' ? ' — nonaktif' : ''}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Atasan langsung"
                  value={editForm.supervisorId}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, supervisorId: event.target.value }))
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
                  label="Status kepegawaian"
                  value={editForm.status}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, status: event.target.value }))
                  }
                >
                  {EMPLOYEE_STATUSES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" onClick={() => setEditItem(null)}>
              Batal
            </Button>
            <Button type="submit" tone="primary" loading={isSubmitting}>
              {isSubmitting ? 'Memperbarui...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Dialog Konfirmasi Hapus */}
      <ConfirmDialog
        isOpen={!!deleteItem}
        type="danger"
        title="Hapus Karyawan"
        confirmText={isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
        cancelText="Batal"
        onClose={() => setDeleteItem(null)}
        onCancel={() => setDeleteItem(null)}
        onConfirm={handleConfirmDelete}
      >
        <p>
          Hapus <strong className="font-semibold text-ink">{deleteItem?.name}</strong>? Penugasan shift
          pada karyawan ini akan dicabut dan akun dinonaktifkan.
        </p>
      </ConfirmDialog>

      {/* Dialog Rincian Biodata Karyawan */}
      <Dialog
        isOpen={!!viewBiodataEmployee}
        onClose={() => setViewBiodataEmployee(null)}
        width={760}
      >
        <DialogHeading
          title="Rincian Biodata Karyawan"
          description={`Data kepegawaian, kependudukan, dan perpajakan untuk ${viewBiodataEmployee?.name || 'karyawan'}.`}
        />

        <DialogBody>
          {isLoadingBiodata ? (
            <div className="space-y-4 py-6">
              <TableSkeleton rows={4} columns={3} />
            </div>
          ) : biodataModalError ? (
            <Notice tone="danger" title="Gagal Memuat Biodata">
              {biodataModalError}
            </Notice>
          ) : employeeBiodata ? (
            <div className="space-y-5">
              {/* Header Ringkasan Profil Karyawan */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface-2 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-sm font-bold text-primary">
                    {initials(viewBiodataEmployee?.name || '')}
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-ink">
                      {viewBiodataEmployee?.name}
                    </h4>
                    <p className="text-xs text-ink-3">
                      {viewBiodataEmployee?.email} · {viewBiodataEmployee?.position || 'Staff'}
                    </p>
                    {viewBiodataEmployee?.department ? (
                      <p className="mt-0.5 text-xs text-ink-2">
                        Departemen: <span className="font-medium text-ink">{viewBiodataEmployee.department.name} ({viewBiodataEmployee.department.code})</span>
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="text-right">
                  {employeeBiodata.isCompleted ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
                      Biodata Terisi Lengkap ✓
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning">
                      Biodata Belum Lengkap ○
                    </span>
                  )}
                  {employeeBiodata.completedAt ? (
                    <p className="mt-1 text-[11px] text-ink-3">
                      Diverifikasi: {formatDate(employeeBiodata.completedAt)}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Grid 4 Seksi Data Biodata */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* 1. Kependudukan & Pajak */}
                <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-line pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">§ 1</span>
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-ink">Kependudukan & Pajak</h5>
                  </div>
                  <dl className="space-y-2 text-xs">
                    <div>
                      <dt className="text-ink-3 font-medium">Nomor Induk Kependudukan (NIK)</dt>
                      <dd className="font-mono text-sm font-semibold text-ink tracking-wide mt-0.5">
                        {employeeBiodata.nik || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-3 font-medium">Nomor Kartu Keluarga (KK)</dt>
                      <dd className="font-mono font-medium text-ink mt-0.5">
                        {employeeBiodata.kkNumber || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-3 font-medium">NPWP</dt>
                      <dd className="font-mono font-medium text-ink mt-0.5">
                        {employeeBiodata.npwp || '—'}
                      </dd>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-line/50">
                      <div>
                        <dt className="text-ink-3 font-medium">BPJS Ketenagakerjaan</dt>
                        <dd className="font-mono font-medium text-ink mt-0.5">
                          {employeeBiodata.bpjsKetenagakerjaan || '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-ink-3 font-medium">BPJS Kesehatan</dt>
                        <dd className="font-mono font-medium text-ink mt-0.5">
                          {employeeBiodata.bpjsKesehatan || '—'}
                        </dd>
                      </div>
                    </div>
                  </dl>
                </div>

                {/* 2. Data Pribadi & Demografi */}
                <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-line pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">§ 2</span>
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-ink">Pribadi & Demografi</h5>
                  </div>
                  <dl className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <dt className="text-ink-3 font-medium">Jenis Kelamin</dt>
                        <dd className="font-medium text-ink mt-0.5">
                          {formatGender(employeeBiodata.gender)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-ink-3 font-medium">Golongan Darah</dt>
                        <dd className="font-semibold text-ink mt-0.5">
                          {employeeBiodata.bloodType || '—'}
                        </dd>
                      </div>
                    </div>
                    <div>
                      <dt className="text-ink-3 font-medium">Tempat, Tanggal Lahir</dt>
                      <dd className="font-medium text-ink mt-0.5">
                        {employeeBiodata.placeOfBirth || '—'}, {formatDate(employeeBiodata.dateOfBirth)}
                      </dd>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <dt className="text-ink-3 font-medium">Agama</dt>
                        <dd className="font-medium text-ink mt-0.5">
                          {employeeBiodata.religion || '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-ink-3 font-medium">Status Pernikahan</dt>
                        <dd className="font-medium text-ink mt-0.5">
                          {formatMaritalStatus(employeeBiodata.maritalStatus)}
                        </dd>
                      </div>
                    </div>
                  </dl>
                </div>

                {/* 3. Kontak & Domisili */}
                <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-line pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">§ 3</span>
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-ink">Kontak & Domisili</h5>
                  </div>
                  <dl className="space-y-2 text-xs">
                    <div>
                      <dt className="text-ink-3 font-medium">Nomor Telepon / Seluler</dt>
                      <dd className="font-mono font-semibold text-ink mt-0.5">
                        {employeeBiodata.phone || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-3 font-medium">Alamat Sesuai KTP</dt>
                      <dd className="font-medium text-ink mt-0.5 leading-relaxed">
                        {employeeBiodata.addressKtp || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-3 font-medium">Alamat Domisili Sekarang</dt>
                      <dd className="font-medium text-ink mt-0.5 leading-relaxed">
                        {employeeBiodata.addressCurrent || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-3 font-medium">Kota & Wilayah</dt>
                      <dd className="font-medium text-ink mt-0.5">
                        {employeeBiodata.city ? `${employeeBiodata.city}, ${employeeBiodata.province || ''} ${employeeBiodata.postalCode ? `(${employeeBiodata.postalCode})` : ''}` : '—'}
                      </dd>
                    </div>
                    <div className="pt-1 border-t border-line/50">
                      <dt className="text-ink-3 font-medium">Kontak Darurat</dt>
                      <dd className="font-medium text-ink mt-0.5">
                        {employeeBiodata.emergencyContactName ? `${employeeBiodata.emergencyContactName} (${employeeBiodata.emergencyContactRelation || 'Kerabat'}) · ${employeeBiodata.emergencyContactPhone || '—'}` : '—'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* 4. Pendidikan & Rekening Bank */}
                <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-line pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">§ 4</span>
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-ink">Pendidikan & Payroll</h5>
                  </div>
                  <dl className="space-y-2 text-xs">
                    <div>
                      <dt className="text-ink-3 font-medium">Pendidikan Terakhir</dt>
                      <dd className="font-medium text-ink mt-0.5">
                        {employeeBiodata.lastEducation || '—'} {employeeBiodata.major ? `· ${employeeBiodata.major}` : ''}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-3 font-medium">Institusi Pendidikan</dt>
                      <dd className="font-medium text-ink mt-0.5">
                        {employeeBiodata.institution || '—'}
                      </dd>
                    </div>
                    <div className="pt-1 border-t border-line/50">
                      <dt className="text-ink-3 font-medium">Rekening Bank Penggajian</dt>
                      <dd className="font-medium text-ink mt-0.5">
                        <span className="font-bold text-primary">{employeeBiodata.bankName || '—'}</span>
                        {employeeBiodata.bankAccountNumber ? (
                          <span className="font-mono ml-2 font-semibold text-ink">{employeeBiodata.bankAccountNumber}</span>
                        ) : null}
                      </dd>
                      {employeeBiodata.bankAccountHolder ? (
                        <p className="text-[11px] text-ink-3 mt-0.5">
                          a.n. {employeeBiodata.bankAccountHolder}
                        </p>
                      ) : null}
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          ) : (
            <Notice tone="info" title="Biodata Belum Lengkap">
              Karyawan ini belum melengkapi seluruh atribut biodata. Informasi ini dapat dilengkapi oleh karyawan melalui portal profil setelah berhasil masuk.
            </Notice>
          )}
        </DialogBody>

        <DialogFooter>
          <Button type="button" onClick={() => setViewBiodataEmployee(null)}>
            Tutup
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
