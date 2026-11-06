import * as React from 'react'
import { createRoute } from '@tanstack/react-router'
import { authenticatedRoute } from './_authenticated'
import { api } from '@/lib/api'
import Alert from '@/components/ui/Alert'
import Dialog from '@/components/ui/Dialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineOfficeBuilding,
  HiOutlineShieldCheck
} from 'react-icons/hi'
import { DEPARTMENTS_PATH } from '@/constants/route.constant'

export const departmentsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: DEPARTMENTS_PATH,
  component: DepartmentsPage
})

interface DepartmentItem {
  id: string
  companyId: string
  code: string
  name: string
  description: string | null
  isMandatory: boolean
  status: string
  createdAt: Date | string
  updatedAt: Date | string
}

interface CompanyItem {
  id: string
  code: string
  name: string
  brandName?: string | null
}

export function DepartmentsPage() {
  const [companies, setCompanies] = React.useState<CompanyItem[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string>('')
  const [departments, setDepartments] = React.useState<DepartmentItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  // State Modal Tambah
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [createCode, setCreateCode] = React.useState('')
  const [createName, setCreateName] = React.useState('')
  const [createDesc, setCreateDesc] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // State Modal Ubah
  const [editItem, setEditItem] = React.useState<DepartmentItem | null>(null)
  const [editName, setEditName] = React.useState('')
  const [editDesc, setEditDesc] = React.useState('')
  const [editStatus, setEditStatus] = React.useState('active')

  // State Dialog Hapus
  const [deleteItem, setDeleteItem] = React.useState<DepartmentItem | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // 1. Muat daftar perusahaan
  const fetchCompanies = React.useCallback(async () => {
    try {
      const res = await api.companies.get()
      if (res.data && Array.isArray(res.data)) {
        const list = res.data as unknown as CompanyItem[]
        setCompanies(list)
        if (list.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(list[0].id)
        }
      }
    } catch {
      setErrorMsg('Gagal memuat daftar perusahaan.')
    }
  }, [selectedCompanyId])

  // 2. Muat daftar departemen per perusahaan
  const fetchDepartments = React.useCallback(async (companyId: string) => {
    if (!companyId) return
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const res = await api.departments.get({
        query: { companyId }
      })
      if (res.data && Array.isArray(res.data)) {
        setDepartments(res.data as unknown as DepartmentItem[])
      }
    } catch {
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

  // 3. Tambah Departemen
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
        code: createCode.trim().toUpperCase(),
        name: createName.trim(),
        description: createDesc.trim() || undefined
      })

      if (res.error) {
        const msg =
          typeof res.error.value === 'object' && res.error.value && 'message' in res.error.value
            ? String((res.error.value as { message?: string }).message)
            : 'Gagal menambahkan departemen.'
        setErrorMsg(msg)
        return
      }

      setSuccessMsg(`Departemen '${createCode.toUpperCase()}' berhasil ditambahkan.`)
      setIsCreateOpen(false)
      setCreateCode('')
      setCreateName('')
      setCreateDesc('')
      fetchDepartments(selectedCompanyId)
    } catch {
      setErrorMsg('Terjadi kesalahan saat menghubungi gateway.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 4. Ubah Departemen
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editItem) return

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await api.departments({ id: editItem.id }).put({
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        status: editStatus
      })

      if (res.error) {
        const msg =
          typeof res.error.value === 'object' && res.error.value && 'message' in res.error.value
            ? String((res.error.value as { message?: string }).message)
            : 'Gagal memperbarui departemen.'
        setErrorMsg(msg)
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

  // 5. Hapus Departemen
  const handleConfirmDelete = async () => {
    if (!deleteItem) return
    if (deleteItem.isMandatory) {
      setErrorMsg(`Departemen ${deleteItem.code} merupakan departemen wajib dan tidak dapat dihapus.`)
      setDeleteItem(null)
      return
    }

    setIsDeleting(true)
    setErrorMsg(null)

    try {
      const res = await api.departments({ id: deleteItem.id }).delete()
      if (res.error) {
        const msg =
          typeof res.error.value === 'object' && res.error.value && 'message' in res.error.value
            ? String((res.error.value as { message?: string }).message)
            : 'Gagal menghapus departemen.'
        setErrorMsg(msg)
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

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId)

  return (
    <div className="space-y-6">
      {/* 1. Header Halaman */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
            Struktur Departemen
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Manajemen unit kerja dan divisi operasional. Setiap perusahaan wajib memiliki departemen HR.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null)
            setIsCreateOpen(true)
          }}
          disabled={!selectedCompanyId}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-primary-deep transition-colors cursor-pointer disabled:opacity-50"
        >
          <HiOutlinePlus className="h-4 w-4" />
          <span>Tambah Departemen</span>
        </button>
      </div>

      {/* 2. Banner Notifikasi & Umpan Balik */}
      {errorMsg && (
        <Alert
          type="danger"
          showIcon
          title="Permintaan Gagal"
          closable
          onClose={() => setErrorMsg(null)}
        >
          {errorMsg}
        </Alert>
      )}

      {successMsg && (
        <Alert
          type="success"
          showIcon
          title="Berhasil"
          closable
          onClose={() => setSuccessMsg(null)}
        >
          {successMsg}
        </Alert>
      )}

      {/* 3. Pemilih Perusahaan & Info Departemen Wajib */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 shadow-xs md:col-span-2">
          <label
            htmlFor="company-select"
            className="block text-xs font-semibold uppercase tracking-wider text-neutral-500"
          >
            Pilih Perusahaan Aktif
          </label>
          <div className="relative mt-2">
            <select
              id="company-select"
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pl-3.5 pr-8 text-xs font-medium text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
          {selectedCompany && (
            <div className="mt-3 flex items-center gap-3 text-xs text-neutral-500">
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <HiOutlineOfficeBuilding className="h-4 w-4 text-primary" />
                <span>Kode: {selectedCompany.code}</span>
              </span>
              <span>&middot;</span>
              <span>Total Departemen Terdaftar: {departments.length}</span>
            </div>
          )}
        </div>

        {/* Kartu Informasi Aturan Bisnis Departemen Wajib */}
        <div className="rounded-2xl border border-primary/20 bg-primary-subtle/30 p-5 dark:border-primary/30 dark:bg-primary-subtle/10 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <HiOutlineShieldCheck className="h-4 w-4" />
            <span>Kaidah Wajib Sistem</span>
          </div>
          <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Departemen <strong>HR (Human Resources)</strong> wajib tersedia di setiap perusahaan untuk mengelola kehadiran dan data personalia. Departemen ini dilindungi dari tindakan penghapusan.
          </p>
          <div className="mt-3 text-[11px] font-mono text-neutral-400">
            Status Validasi: Aktif
          </div>
        </div>
      </div>

      {/* 4. Tabel Daftar Departemen */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
        <div className="border-b border-neutral-200 p-5 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              Daftar Departemen Operasional
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Unit organisasi kerja untuk penempatan staf dan pelaporan absensi.
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            {departments.length} Data
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50/75 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50">
              <tr>
                <th className="py-3 px-5 font-semibold">Kode</th>
                <th className="py-3 px-5 font-semibold">Nama Departemen</th>
                <th className="py-3 px-5 font-semibold">Deskripsi Operasional</th>
                <th className="py-3 px-5 font-semibold">Klasifikasi</th>
                <th className="py-3 px-5 font-semibold">Kondisi</th>
                <th className="py-3 px-5 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    Memuat data departemen...
                  </td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    Belum ada departemen terdaftar untuk perusahaan ini.
                  </td>
                </tr>
              ) : (
                departments.map((dept) => (
                  <tr
                    key={dept.id}
                    className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 transition-colors"
                  >
                    <td className="py-3.5 px-5 font-mono font-bold text-neutral-900 dark:text-white">
                      {dept.code}
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-neutral-900 dark:text-white">
                      {dept.name}
                    </td>
                    <td className="py-3.5 px-5 text-neutral-500 max-w-xs truncate">
                      {dept.description || '—'}
                    </td>
                    <td className="py-3.5 px-5">
                      {dept.isMandatory ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                          <span>&#x2713;</span> Departemen Wajib
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                          Opsional
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                        <span>&#x25CF;</span> Aktif
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditItem(dept)
                            setEditName(dept.name)
                            setEditDesc(dept.description || '')
                            setEditStatus(dept.status)
                          }}
                          className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                          title="Ubah Data"
                        >
                          <HiOutlinePencil className="h-4 w-4" />
                        </button>

                        {dept.isMandatory ? (
                          <span
                            className="p-1.5 text-neutral-300 dark:text-neutral-600 cursor-not-allowed"
                            title="Departemen wajib tidak dapat dihapus"
                          >
                            <HiOutlineTrash className="h-4 w-4" />
                          </span>
                        ) : (
                          <button
                            onClick={() => setDeleteItem(dept)}
                            className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
                            title="Hapus Departemen"
                          >
                            <HiOutlineTrash className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Modal Tambah Departemen */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onRequestClose={() => setIsCreateOpen(false)}
      >
        <div className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Tambah Departemen Baru
            </h3>
          </div>

          <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                Kode Departemen
              </label>
              <input
                type="text"
                value={createCode}
                onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                placeholder="Contoh: MKT, FIN, PROD"
                required
                maxLength={20}
                className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-xs font-mono uppercase text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
              <span className="text-[11px] text-neutral-400 mt-1 block">
                Gunakan singkatan huruf kapital 2-5 karakter.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                Nama Departemen
              </label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Contoh: Pemasaran &amp; Komunikasi"
                required
                className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-xs text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                Deskripsi
              </label>
              <textarea
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                placeholder="Jelaskan ruang lingkup departemen ini..."
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-xs text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-deep cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Departemen'}
              </button>
            </div>
          </form>
        </div>
      </Dialog>

      {/* 6. Modal Ubah Departemen */}
      <Dialog
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        onRequestClose={() => setEditItem(null)}
      >
        <div className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Ubah Departemen: {editItem?.code}
            </h3>
          </div>

          <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                Nama Departemen
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-xs text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                Deskripsi
              </label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-xs text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-deep cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Memperbarui...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      </Dialog>

      {/* 7. Dialog Konfirmasi Hapus */}
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
        <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
          Apakah Anda yakin ingin menghapus departemen <strong>{deleteItem?.name} ({deleteItem?.code})</strong>? Data yang sudah dihapus tidak dapat dipulihkan kembali.
        </p>
      </ConfirmDialog>
    </div>
  )
}
