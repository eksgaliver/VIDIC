import * as React from 'react'
import { Link, createRoute } from '@tanstack/react-router'
import { HiOutlineArrowRight, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi'
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
  TextAreaField,
  TextField,
} from '@/components/base'
import { errorText } from '@/utils/apiError'
import type { Company, Department } from '@/@types/organization'
import { COMPANIES_PATH, DEPARTMENTS_PATH } from '@/constants/route.constant'

export const departmentsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: DEPARTMENTS_PATH,
  component: DepartmentsPage,
})

const DEPARTMENT_STATUSES = [
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
]

const INITIAL_CREATE_FORM = { code: '', name: '', description: '' }
const INITIAL_EDIT_FORM = { name: '', description: '', status: 'active' }

export function DepartmentsPage() {
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = React.useState('')
  const [departments, setDepartments] = React.useState<Department[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [createForm, setCreateForm] = React.useState(INITIAL_CREATE_FORM)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [editItem, setEditItem] = React.useState<Department | null>(null)
  const [editForm, setEditForm] = React.useState(INITIAL_EDIT_FORM)

  const [deleteItem, setDeleteItem] = React.useState<Department | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const selectedCompany = companies.find((item) => item.id === selectedCompanyId)

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

  const fetchDepartments = React.useCallback(async (companyId: string) => {
    if (!companyId) return
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const res = await api.departments.get({ query: { companyId } })
      if (res.error) {
        setDepartments([])
        setErrorMsg(errorText(res, 'Gagal memuat data departemen.'))
        return
      }
      setDepartments(Array.isArray(res.data) ? (res.data as unknown as Department[]) : [])
    } catch {
      setDepartments([])
      setErrorMsg('Gagal memuat data departemen.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  React.useEffect(() => {
    if (selectedCompanyId) {
      fetchDepartments(selectedCompanyId)
    }
  }, [selectedCompanyId, fetchDepartments])

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompanyId) {
      setErrorMsg('Pilih perusahaan terlebih dahulu.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await api.departments.post({
        companyId: selectedCompanyId,
        code: createForm.code.trim().toUpperCase(),
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
      })

      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal menambahkan departemen.'))
        return
      }

      setSuccessMsg(`Departemen '${createForm.code.toUpperCase()}' berhasil ditambahkan.`)
      setIsCreateOpen(false)
      setCreateForm(INITIAL_CREATE_FORM)
      fetchDepartments(selectedCompanyId)
    } catch {
      setErrorMsg('Terjadi kesalahan saat menghubungi gateway.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEdit = (dept: Department) => {
    setErrorMsg(null)
    setEditItem(dept)
    setEditForm({
      name: dept.name,
      description: dept.description || '',
      status: dept.status,
    })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editItem) return

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await api.departments({ id: editItem.id }).put({
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        status: editForm.status,
      })

      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal memperbarui departemen.'))
        return
      }

      setSuccessMsg(`Departemen '${editItem.code}' berhasil diperbarui.`)
      setEditItem(null)
      fetchDepartments(selectedCompanyId)
    } catch {
      setErrorMsg('Terjadi kesalahan saat memperbarui data.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteItem) return
    if (deleteItem.isMandatory) {
      setErrorMsg(
        `Departemen ${deleteItem.code} merupakan departemen wajib dan tidak dapat dihapus.`
      )
      setDeleteItem(null)
      return
    }

    setIsDeleting(true)
    setErrorMsg(null)

    try {
      const res = await api.departments({ id: deleteItem.id }).delete()
      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal menghapus departemen.'))
        return
      }

      setSuccessMsg(`Departemen '${deleteItem.code}' telah dihapus.`)
      setDeleteItem(null)
      fetchDepartments(selectedCompanyId)
    } catch {
      setErrorMsg('Gagal menghapus data departemen.')
    } finally {
      setIsDeleting(false)
    }
  }

  const mandatoryCount = departments.filter((dept) => dept.isMandatory).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Struktur Departemen"
        description="Unit kerja tempat karyawan ditugaskan dan absensinya dicatat."
        actions={
          <Button
            tone="primary"
            disabled={!selectedCompanyId}
            onClick={() => {
              setErrorMsg(null)
              setSuccessMsg(null)
              setIsCreateOpen(true)
            }}
            icon={<HiOutlinePlus className="h-4 w-4" />}
          >
            Tambah Departemen
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
            description="Departemen selalu melekat pada satu perusahaan. Daftarkan perusahaan terlebih dahulu; departemen HR dibuat otomatis saat pendaftaran."
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
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full sm:max-w-sm"
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name} ({company.code})
                </option>
              ))}
            </SelectField>

            {selectedCompany ? (
              <p className="pb-2 text-[13px] text-ink-2">
                <span className="font-mono text-xs font-bold text-ink">{selectedCompany.code}</span>{' '}
                Â· {isLoading ? 'memuat' : `${departments.length} departemen`}
                {mandatoryCount > 0 ? ` Â· ${mandatoryCount} wajib` : null}
              </p>
            ) : null}
          </div>

          <Panel>
            <PanelHeader
              title="Daftar departemen"
              description="Departemen HR dilindungi dari penghapusan karena menjadi acuan data kepegawaian."
              meta={isLoading ? undefined : `${departments.length} unit kerja`}
            />

            {isLoading ? (
              <TableSkeleton rows={5} columns={4} />
            ) : departments.length === 0 ? (
              <EmptyState
                title="Belum ada departemen"
                description={`Tambahkan unit kerja pertama untuk ${selectedCompany?.name ?? 'perusahaan ini'}.`}
                action={
                  <Button
                    tone="primary"
                    onClick={() => {
                      setErrorMsg(null)
                      setIsCreateOpen(true)
                    }}
                    icon={<HiOutlinePlus className="h-4 w-4" />}
                  >
                    Tambah Departemen
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-3">
                      <th className="px-4 py-2.5 font-semibold sm:px-5">Departemen</th>
                      <th className="px-4 py-2.5 font-semibold">Deskripsi</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                      <th className="px-4 py-2.5 text-right font-semibold sm:px-5">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {departments.map((dept) => (
                      <tr key={dept.id} className="transition-colors hover:bg-surface-2">
                        <td className="px-4 py-3.5 align-top sm:px-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wide text-ink">
                              {dept.code}
                            </span>
                            <span className="font-semibold text-ink">{dept.name}</span>
                            {dept.isMandatory ? <Badge tone="accent">Wajib</Badge> : null}
                          </div>
                        </td>
                        <td className="max-w-[320px] px-4 py-3.5 align-top text-ink-2">
                          {dept.description || <span className="text-ink-3">â€”</span>}
                        </td>
                        <td className="px-4 py-3.5 align-top">
                          <StatusFromValue value={dept.status} />
                        </td>
                        <td className="px-4 py-3.5 text-right align-top sm:px-5">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              size="iconSm"
                              tone="quiet"
                              onClick={() => openEdit(dept)}
                              aria-label={`Ubah departemen ${dept.name}`}
                              title="Ubah departemen"
                            >
                              <HiOutlinePencil className="h-4 w-4" />
                            </Button>
                            {dept.isMandatory ? (
                              <span
                                className="inline-flex h-9 w-9 items-center justify-center rounded-control text-ink-3"
                                title="Departemen wajib tidak dapat dihapus"
                              >
                                <HiOutlineTrash className="h-4 w-4" />
                              </span>
                            ) : (
                              <Button
                                size="iconSm"
                                tone="quiet"
                                className="text-error hover:bg-error-subtle hover:text-error"
                                onClick={() => {
                                  setErrorMsg(null)
                                  setSuccessMsg(null)
                                  setDeleteItem(dept)
                                }}
                                aria-label={`Hapus departemen ${dept.name}`}
                                title="Hapus departemen"
                              >
                                <HiOutlineTrash className="h-4 w-4" />
                              </Button>
                            )}
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
        width={520}
      >
        <DialogHeading
          title="Tambah Departemen"
          description={
            selectedCompany
              ? `Unit kerja baru akan terdaftar di ${selectedCompany.name}.`
              : 'Pilih perusahaan sebelum menambahkan unit kerja.'
          }
        />
        <form onSubmit={handleCreateSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="px-4 py-5 sm:px-5">
            {errorMsg ? (
              <Notice tone="danger" title="Permintaan gagal" className="mb-5">
                {errorMsg}
              </Notice>
            ) : null}

            <div className="space-y-3">
              <TextField
                label="Kode departemen"
                value={createForm.code}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, code: e.target.value.toUpperCase() }))
                }
                placeholder="MKT"
                required
                maxLength={20}
                mono
                hint="Singkatan huruf kapital, 2â€“5 karakter."
              />
              <TextField
                label="Nama departemen"
                value={createForm.name}
                onChange={(e) => setCreateForm((c) => ({ ...c, name: e.target.value }))}
                placeholder="Pemasaran & Komunikasi"
                required
              />
              <TextAreaField
                label="Deskripsi"
                value={createForm.description}
                onChange={(e) => setCreateForm((c) => ({ ...c, description: e.target.value }))}
                placeholder="Ruang lingkup kerja departemen ini"
                rows={3}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" onClick={() => setIsCreateOpen(false)}>
              Batal
            </Button>
            <Button type="submit" tone="primary" loading={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan Departemen'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      <Dialog
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        onRequestClose={() => setEditItem(null)}
        width={520}
      >
        <DialogHeading
          title={`Ubah Departemen ${editItem?.code ?? ''}`}
          description={
            editItem?.isMandatory
              ? 'Departemen wajib: kode dan status penghapusan dikunci sistem.'
              : 'Kode departemen tidak dapat diubah setelah dibuat.'
          }
        />
        <form onSubmit={handleEditSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="px-4 py-5 sm:px-5">
            {errorMsg ? (
              <Notice tone="danger" title="Permintaan gagal" className="mb-5">
                {errorMsg}
              </Notice>
            ) : null}

            <div className="space-y-3">
              <TextField
                label="Nama departemen"
                value={editForm.name}
                onChange={(e) => setEditForm((c) => ({ ...c, name: e.target.value }))}
                required
              />
              <TextAreaField
                label="Deskripsi"
                value={editForm.description}
                onChange={(e) => setEditForm((c) => ({ ...c, description: e.target.value }))}
                rows={3}
              />
              <SelectField
                label="Status"
                value={editForm.status}
                onChange={(e) => setEditForm((c) => ({ ...c, status: e.target.value }))}
                hint="Nonaktif menutup unit kerja dari penempatan karyawan baru."
              >
                {DEPARTMENT_STATUSES.map((option) => (
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
        title="Hapus Departemen"
        confirmText={isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
        cancelText="Batal"
        onClose={() => setDeleteItem(null)}
        onCancel={() => setDeleteItem(null)}
        onConfirm={handleConfirmDelete}
      >
        <p>
          Hapus <strong className="font-semibold text-ink">{deleteItem?.name}</strong> (
          {deleteItem?.code})? Karyawan yang tertaut pada departemen ini perlu dipindahkan lebih
          dahulu.
        </p>
      </ConfirmDialog>
    </div>
  )
}
