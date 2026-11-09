import * as React from 'react'
import { Link, createRoute } from '@tanstack/react-router'
import {
  HiOutlineArrowRight,
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
import type { Company, Department, Employee } from '@/@types/organization'
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
}

const INITIAL_EDIT_FORM = {
  name: '',
  email: '',
  position: '',
  departmentId: '',
  supervisorId: '',
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

export function EmployeesPage() {
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = React.useState('')
  const [departments, setDepartments] = React.useState<Department[]>([])
  const [employees, setEmployees] = React.useState<Employee[]>([])
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

  const selectedCompany = companies.find((item) => item.id === selectedCompanyId)
  const activeDepartments = departments.filter((department) => department.status === 'active')
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
      const [departmentsRes, employeesRes] = await Promise.all([
        api.departments.get({ query: { companyId } }),
        api.employees.get({ query: { companyId } }),
      ])

      if (departmentsRes.error) {
        setErrorMsg(errorText(departmentsRes, 'Gagal memuat data departemen.'))
      }
      if (employeesRes.error) {
        setErrorMsg(errorText(employeesRes, 'Gagal memuat data karyawan.'))
        setEmployees([])
        return
      }

      setDepartments(
        Array.isArray(departmentsRes.data) ? (departmentsRes.data as unknown as Department[]) : []
      )
      setEmployees(
        Array.isArray(employeesRes.data) ? (employeesRes.data as unknown as Employee[]) : []
      )
    } catch {
      setEmployees([])
      setErrorMsg('Gagal memuat data karyawan dari gateway.')
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

      setSuccessMsg(`Karyawan ${deleteItem.name} telah dihapus.`)
      setDeleteItem(null)
      fetchOrganization(selectedCompanyId)
    } catch {
      setErrorMsg('Gagal menghapus data karyawan.')
    } finally {
      setIsDeleting(false)
    }
  }

  const canCreate = Boolean(selectedCompanyId) && activeDepartments.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Karyawan"
        description="Identitas kerja, posisi, departemen, dan garis atasan. Setiap karyawan dapat memiliki lebih dari satu shift."
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
            description="Karyawan harus terdaftar di bawah satu perusahaan dan departemen. Daftarkan perusahaan terlebih dahulu."
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
              </p>
            ) : null}
          </div>

          {activeDepartments.length === 0 && !isLoading ? (
            <Notice tone="info" title="Departemen belum tersedia">
              Tambahkan departemen aktif terlebih dahulu sebelum mendaftarkan karyawan.
            </Notice>
          ) : null}

          <Panel>
            <PanelHeader
              title="Daftar karyawan"
              description="Atasan dipilih dari karyawan yang sudah terdaftar. Tanpa atasan berarti karyawan independen."
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
              <TableSkeleton rows={5} columns={5} />
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
                <table className="w-full min-w-[780px] border-collapse text-left text-[13px] 2xl:text-sm">
                  <thead>
                    <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-3 2xl:text-xs">
                      <th className="px-4 py-2.5 font-semibold sm:px-5 2xl:px-7 2xl:py-3.5">Karyawan</th>
                      <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Posisi & departemen</th>
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

      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onRequestClose={() => setIsCreateOpen(false)}
        width={600}
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
                placeholder="Contoh: Staf Operasional"
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
                  label="Atasan"
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
              </div>

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

      <Dialog
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        onRequestClose={() => setEditItem(null)}
        width={600}
      >
        <DialogHeading
          title={`Ubah Karyawan ${editItem?.name ?? ''}`}
          description="Perubahan posisi, departemen, dan atasan berlaku untuk penugasan shift berikutnya."
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
                  label="Atasan"
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
              </div>

              <SelectField
                label="Status kepegawaian"
                value={editForm.status}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, status: event.target.value }))
                }
                hint="Karyawan nonaktif tidak dapat dipilih untuk shift baru."
              >
                {EMPLOYEE_STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
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
          Hapus <strong className="font-semibold text-ink">{deleteItem?.name}</strong>? Seluruh
          shift milik karyawan ini juga akan dihapus. Karyawan yang menjadikannya atasan akan
          menjadi independen.
        </p>
      </ConfirmDialog>
    </div>
  )
}
