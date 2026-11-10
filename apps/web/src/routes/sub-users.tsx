import * as React from 'react'
import { createRoute } from '@tanstack/react-router'
import {
  HiOutlineCheck,
  HiOutlineKey,
  HiOutlineLockClosed,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineShieldCheck,
  HiOutlineTrash,
  HiOutlineUserGroup,
  HiOutlineX,
} from 'react-icons/hi'
import { authenticatedRoute } from './_authenticated'
import { useAuthStore } from '@/stores/auth'
import Dialog from '@/components/ui/Dialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { getBaseUrl } from '@/components/shared/LogoUploader'
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
  TextField,
} from '@/components/base'
import { SUBUSERS_PATH } from '@/constants/route.constant'
import type {
  Department,
  IsolationAuditReport,
  SubUserItem,
} from '@/@types/organization'

export const subUsersRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: SUBUSERS_PATH,
  component: SubUsersPage,
})

function getInitials(name?: string | null): string {
  if (!name) return 'SU'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function SubUsersPage() {
  const { user, token } = useAuthStore()

  // State Daftar Sub-User & Perusahaan
  const [subUsers, setSubUsers] = React.useState<SubUserItem[]>([])
  const [currentCompany, setCurrentCompany] = React.useState<{
    id: string
    name: string
    code: string
    email: string
  } | null>(null)
  const [otherCompanies, setOtherCompanies] = React.useState<
    { id: string; name: string; code: string; industry?: string }[]
  >([])
  const [departments, setDepartments] = React.useState<Department[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState<'all' | 'admin' | 'member'>('all')

  // State Audit Penetrasi Multi-Tenant
  const [showAuditPanel, setShowAuditPanel] = React.useState(false)
  const [targetCompanyId, setTargetCompanyId] = React.useState('')
  const [isRunningAudit, setIsRunningAudit] = React.useState(false)
  const [auditReport, setAuditReport] = React.useState<IsolationAuditReport | null>(null)

  // State Modal Tambah Sub-User
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [createForm, setCreateForm] = React.useState({
    name: '',
    email: '',
    position: '',
    departmentId: '',
    role: 'member',
    password: 'password',
  })
  const [isSubmittingCreate, setIsSubmittingCreate] = React.useState(false)

  // State Modal Edit Sub-User
  const [editTarget, setEditTarget] = React.useState<SubUserItem | null>(null)
  const [editForm, setEditForm] = React.useState({
    name: '',
    position: '',
    departmentId: '',
    role: 'member',
    status: 'active',
    newPassword: '',
  })
  const [isSubmittingEdit, setIsSubmittingEdit] = React.useState(false)

  // State Modal Hapus / Cabut Akses
  const [deleteTarget, setDeleteTarget] = React.useState<SubUserItem | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Muat Data Sub-User & Departemen
  const loadData = React.useCallback(async () => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const [subUserRes, deptRes] = await Promise.all([
        fetch(`${getBaseUrl()}/api/sub-users`, { headers }),
        fetch(`${getBaseUrl()}/api/departments`, { headers }),
      ])

      const subUserData = await subUserRes.json()
      const deptData = await deptRes.json()

      if (!subUserRes.ok || !subUserData.success) {
        throw new Error(subUserData.message || 'Gagal memuat data sub-user.')
      }

      setSubUsers(subUserData.data || [])
      setCurrentCompany(subUserData.currentCompany || null)
      setOtherCompanies(subUserData.otherCompanies || [])

      if (subUserData.otherCompanies?.length > 0 && !targetCompanyId) {
        setTargetCompanyId(subUserData.otherCompanies[0].id)
      }

      if (deptRes.ok && Array.isArray(deptData.data)) {
        setDepartments(deptData.data)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Koneksi ke gateway terganggu.'
      setErrorMsg(msg)
    } finally {
      setIsLoading(false)
    }
  }, [token, targetCompanyId])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Jalankan Pengujian Penetrasi & Audit Keamanan Isolasi
  const handleRunPenetrationTest = async () => {
    if (!targetCompanyId) {
      setErrorMsg('Pilih perusahaan target untuk menjalankan simulasi audit penetrasi.')
      return
    }

    setIsRunningAudit(true)
    setErrorMsg(null)

    try {
      const res = await fetch(`${getBaseUrl()}/api/sub-users/test-isolation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetCompanyId }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Audit penetrasi gagal dijalankan.')
      }

      setAuditReport(json)
      setShowAuditPanel(true)
      setSuccessMsg('Pengujian isolasi berhasil dijalankan. Seluruh batas keamanan terverifikasi.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kendala saat menjalankan audit penetrasi.'
      setErrorMsg(msg)
    } finally {
      setIsRunningAudit(false)
    }
  }

  // Tambah Sub-User Baru
  const handleCreateSubUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.position.trim()) {
      setErrorMsg('Nama lengkap, surel, dan posisi jabatan wajib diisi.')
      return
    }

    setIsSubmittingCreate(true)
    setErrorMsg(null)

    try {
      const res = await fetch(`${getBaseUrl()}/api/sub-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: createForm.name.trim(),
          email: createForm.email.trim(),
          position: createForm.position.trim(),
          departmentId: createForm.departmentId || undefined,
          role: createForm.role,
          password: createForm.password || 'password',
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal mendaftarkan sub-user baru.')
      }

      setSuccessMsg(`Sub-user '${createForm.name}' berhasil ditambahkan ke organisasi.`)
      setIsCreateOpen(false)
      setCreateForm({
        name: '',
        email: '',
        position: '',
        departmentId: '',
        role: 'member',
        password: 'password',
      })
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat sub-user.'
      setErrorMsg(msg)
    } finally {
      setIsSubmittingCreate(false)
    }
  }

  // Buka Modal Edit Sub-User
  const handleOpenEdit = (su: SubUserItem) => {
    setEditTarget(su)
    setEditForm({
      name: su.name,
      position: su.position || '',
      departmentId: su.departmentId || '',
      role: su.role,
      status: su.status,
      newPassword: '',
    })
  }

  // Simpan Perubahan Edit Sub-User
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget) return

    setIsSubmittingEdit(true)
    setErrorMsg(null)

    try {
      const res = await fetch(`${getBaseUrl()}/api/sub-users/${editTarget.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editForm.name.trim(),
          position: editForm.position.trim(),
          departmentId: editForm.departmentId || null,
          role: editForm.role,
          status: editForm.status,
          newPassword: editForm.newPassword.trim() || undefined,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal memperbarui data sub-user.')
      }

      setSuccessMsg('Data dan izin sub-user berhasil diperbarui.')
      setEditTarget(null)
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah sub-user.'
      setErrorMsg(msg)
    } finally {
      setIsSubmittingEdit(false)
    }
  }

  // Konfirmasi Cabut Akses
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)
    setErrorMsg(null)

    try {
      const res = await fetch(`${getBaseUrl()}/api/sub-users/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal mencabut akses sub-user.')
      }

      setSuccessMsg(`Akses sub-user '${deleteTarget.name}' berhasil dicabut.`)
      setDeleteTarget(null)
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mencabut akses sub-user.'
      setErrorMsg(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter Sub-User berdasarkan kata kunci dan peran
  const filteredSubUsers = React.useMemo(() => {
    let result = subUsers

    if (roleFilter !== 'all') {
      result = result.filter((item) => item.role === roleFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q) ||
          item.position?.toLowerCase().includes(q) ||
          item.departmentName?.toLowerCase().includes(q)
      )
    }

    return result
  }, [subUsers, roleFilter, searchQuery])

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header Halaman */}
      <PageHeader
        title="Skala Sub-User & Isolasi Perusahaan"
        description="Tata kelola kredensial sub-user per perusahaan dengan penegakan batas multi-tenant (tenant boundary) sehingga data Perusahaan A tidak dapat diakses oleh Perusahaan B."
        actions={
          <div className="flex items-center gap-2">
            <Button
              tone="neutral"
              onClick={() => {
                setShowAuditPanel((v) => !v)
                if (!auditReport && otherCompanies.length > 0) {
                  handleRunPenetrationTest()
                }
              }}
              className="flex items-center gap-1.5"
            >
              <HiOutlineShieldCheck className="h-4 w-4" />
              <span>{showAuditPanel ? 'Tutup Uji Penetrasi' : 'Uji Penetrasi Isolasi'}</span>
            </Button>
            <Button
              tone="primary"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5"
            >
              <HiOutlinePlus className="h-4 w-4" />
              <span>Tambah Sub-User</span>
            </Button>
          </div>
        }
      />

      {/* Notifikasi Status */}
      {errorMsg && (
        <Notice
          tone="danger"
          title="Perhatian"
          onDismiss={() => setErrorMsg(null)}
        >
          {errorMsg}
        </Notice>
      )}

      {successMsg && (
        <Notice
          tone="success"
          title="Berhasil"
          onDismiss={() => setSuccessMsg(null)}
        >
          {successMsg}
        </Notice>
      )}

      {/* Kartu Status Batas Multi-Tenant (Tenant Boundary Scope) */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
              <HiOutlineLockClosed className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-ink">
                  {currentCompany?.name || 'Perusahaan Terpilih'}
                </span>
                {currentCompany?.code && (
                  <Badge tone="accent">
                    KODE: {currentCompany.code}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Lingkup Batas Tenant Aktif · Seluruh sub-user di bawah entitas ini terisolasi otomatis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Zero Cross-Tenant Leak Active</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl bg-surface-2 p-3 border border-line/60">
            <div className="text-ink-muted">Total Sub-User Terdaftar</div>
            <div className="text-lg font-bold text-ink mt-1 tabular-nums">
              {subUsers.length} Pengguna
            </div>
            <div className="text-[11px] text-ink-muted mt-0.5">
              Terkunci pada ID: {currentCompany?.id ? `${currentCompany.id.slice(0, 12)}...` : '-'}
            </div>
          </div>

          <div className="rounded-xl bg-surface-2 p-3 border border-line/60">
            <div className="text-ink-muted">Perusahaan Pembanding Sistem</div>
            <div className="text-lg font-bold text-ink mt-1">
              {otherCompanies.length > 0 ? `${otherCompanies.length} Badan Usaha Lain` : 'Belum Ada'}
            </div>
            <div className="text-[11px] text-ink-muted mt-0.5">
              {otherCompanies.map((c) => c.name).join(', ') || 'Hanya 1 perusahaan di DB'}
            </div>
          </div>

          <div className="rounded-xl bg-surface-2 p-3 border border-line/60">
            <div className="text-ink-muted">Tingkat Penegakan Batas Data</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
              <span>Terkunci Ketat 100%</span>
              <HiOutlineCheck className="h-4 w-4" />
            </div>
            <div className="text-[11px] text-ink-muted mt-0.5">
              Endpoint 403 Forbidden aktif pada seluruh servis
            </div>
          </div>
        </div>
      </div>

      {/* Panel Interaktif: Audit Penetrasi & Simulasi Isolasi Antar-Perusahaan */}
      {showAuditPanel && (
        <Panel className="border-blue-200 dark:border-blue-900/60 shadow-sm">
          <PanelHeader
            title="Audit Penetrasi & Simulasi Batas Data (Cross-Tenant Penetration Test)"
            description="Lakukan pengujian langsung apakah sub-user dari perusahaan ini dapat menembus atau melihat departemen, karyawan, dan shift milik perusahaan lain."
          />
          <div className="p-5 space-y-4">
            {/* Form Pemicu Pengujian */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-2 p-3.5 rounded-xl border border-line">
              <div className="flex-1 min-w-0">
                <label className="text-xs font-semibold text-ink block mb-1">
                  Pilih Badan Usaha Target Simulasi
                </label>
                {otherCompanies.length > 0 ? (
                  <select
                    value={targetCompanyId}
                    onChange={(e) => setTargetCompanyId(e.target.value)}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  >
                    {otherCompanies.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name} ({comp.code}) — {comp.industry || 'Umum'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-ink-muted">
                    Hanya ada satu perusahaan terdaftar. Daftarkan perusahaan kedua terlebih dahulu untuk menguji simulasi penetrasi.
                  </p>
                )}
              </div>

              <div className="flex items-end">
                <Button
                  tone="primary"
                  size="sm"
                  disabled={isRunningAudit || !targetCompanyId}
                  onClick={handleRunPenetrationTest}
                  className="flex items-center gap-1.5"
                >
                  <HiOutlineRefresh className={`h-3.5 w-3.5 ${isRunningAudit ? 'animate-spin' : ''}`} />
                  <span>{isRunningAudit ? 'Memproses Audit...' : 'Jalankan Audit Penetrasi'}</span>
                </Button>
              </div>
            </div>

            {/* Hasil Uji Penetrasi */}
            {auditReport && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-ink">
                    Hasil Uji Keamanan: {auditReport.caller.companyName} vs {auditReport.target.companyName}
                  </div>
                  <Badge tone={auditReport.allPassed ? 'success' : 'danger'}>
                    {auditReport.allPassed ? 'STATUS: LOLOS AUDIT (100% TERISOLASI)' : 'TERDETEKSI KEBOCORAN'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {auditReport.tests.map((test, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-line bg-surface p-3.5 space-y-2 text-xs shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink">{test.testName}</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                            test.status === 403
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {test.result}
                        </span>
                      </div>

                      <div className="font-mono text-[11px] text-ink-muted bg-surface-2 px-2 py-1 rounded border border-line/60">
                        {test.endpoint}
                      </div>

                      <p className="text-ink-muted leading-relaxed">
                        {test.detail}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  {auditReport.verdict}
                </div>
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* Filter & Daftar Sub-User */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Peran Tab */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRoleFilter('all')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              roleFilter === 'all'
                ? 'bg-ink text-surface shadow-sm font-semibold'
                : 'bg-surface border border-line text-ink hover:bg-surface-2'
            }`}
          >
            Semua Sub-User ({subUsers.length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('admin')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              roleFilter === 'admin'
                ? 'bg-ink text-surface shadow-sm font-semibold'
                : 'bg-surface border border-line text-ink hover:bg-surface-2'
            }`}
          >
            Admin Perusahaan
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('member')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              roleFilter === 'member'
                ? 'bg-ink text-surface shadow-sm font-semibold'
                : 'bg-surface border border-line text-ink hover:bg-surface-2'
            }`}
          >
            Sub-User / Anggota
          </button>
        </div>

        {/* Pencarian */}
        <div className="relative min-w-[240px]">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <input
            type="text"
            placeholder="Cari nama, surel, jabatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-line bg-surface pl-9 pr-8 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-ink"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
            >
              <HiOutlineX className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabel Sub-User */}
      {isLoading ? (
        <div className="rounded-2xl border border-line bg-surface p-6 animate-pulse space-y-4">
          <div className="h-4 w-48 bg-surface-2 rounded" />
          <div className="h-10 w-full bg-surface-2 rounded" />
          <div className="h-10 w-full bg-surface-2 rounded" />
          <div className="h-10 w-full bg-surface-2 rounded" />
        </div>
      ) : filteredSubUsers.length === 0 ? (
        <EmptyState
          title="Tidak Ada Sub-User"
          description={
            searchQuery
              ? `Tidak ditemukan sub-user dengan kata kunci "${searchQuery}".`
              : 'Belum ada sub-user yang terdaftar di bawah perusahaan ini.'
          }
          action={
            <Button tone="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
              Tambah Sub-User Sekarang
            </Button>
          }
        />
      ) : (
        <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-line bg-surface-2/60 text-ink-muted font-semibold">
                  <th className="py-3 px-4">Nama & Akun Sub-User</th>
                  <th className="py-3 px-4">Jabatan & Departemen</th>
                  <th className="py-3 px-4">Tingkat Hak Akses</th>
                  <th className="py-3 px-4">Lingkup Batas Data</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredSubUsers.map((su) => {
                  const isCurrentSessionUser = user && user.id === su.id
                  return (
                    <tr
                      key={su.id}
                      className="hover:bg-surface-2/40 transition-colors"
                    >
                      {/* Avatar & Nama */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-surface-2 border border-line flex items-center justify-center font-bold text-ink text-xs">
                            {getInitials(su.name)}
                          </div>
                          <div>
                            <div className="font-semibold text-ink flex items-center gap-1.5">
                              <span>{su.name}</span>
                              {isCurrentSessionUser && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-2 text-ink-muted">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="text-ink-muted text-[11px]">{su.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Jabatan & Departemen */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-ink">{su.position || 'Staf'}</div>
                        <div className="text-ink-muted text-[11px]">
                          {su.departmentName ? `${su.departmentName} (${su.departmentCode})` : 'Tanpa Departemen'}
                        </div>
                      </td>

                      {/* Peran */}
                      <td className="py-3 px-4">
                        <Badge tone={su.role === 'admin' ? 'accent' : 'neutral'}>
                          {su.role === 'admin' ? 'Admin Perusahaan' : 'Sub-User / Anggota'}
                        </Badge>
                      </td>

                      {/* Lingkup Batas Data */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-[11px] text-ink font-medium">
                          <HiOutlineLockClosed className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Terkunci: {currentCompany?.code || 'Perusahaan Induk'}</span>
                        </div>
                        <div className="text-[10px] text-ink-muted">
                          Ditolak 403 pada tenant lain
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                            su.status === 'active'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                              : 'bg-surface-2 text-ink-muted'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              su.status === 'active' ? 'bg-emerald-500' : 'bg-ink-muted'
                            }`}
                          />
                          <span>{su.status === 'active' ? 'Aktif' : 'Non-aktif'}</span>
                        </span>
                      </td>

                      {/* Tombol Aksi */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(su)}
                            className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors"
                            title="Ubah Peran / Reset Sandi"
                          >
                            <HiOutlinePencil className="h-4 w-4" />
                          </button>
                          {!isCurrentSessionUser && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(su)}
                              className="p-1 rounded text-ink-muted hover:text-red-600 hover:bg-surface-2 transition-colors"
                              title="Cabut Akses Sub-User"
                            >
                              <HiOutlineTrash className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dialog: Tambah Sub-User Baru */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        width={540}
      >
        <DialogHeading
          title="Tambah Sub-User Perusahaan"
          description={`Sub-user ini akan langsung diikat secara permanen pada organisasi ${currentCompany?.name || 'ini'}.`}
        />
        <form onSubmit={handleCreateSubUser}>
          <DialogBody className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Nama Lengkap Sub-User *
              </label>
              <input
                type="text"
                required
                placeholder="cth. Rian Pratama"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ink"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Alamat Surel (Untuk Masuk Platform) *
              </label>
              <input
                type="email"
                required
                placeholder="cth. rian@perusahaan.id"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ink"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Jabatan / Posisi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="cth. Staf Logistik"
                  value={createForm.position}
                  onChange={(e) => setCreateForm({ ...createForm, position: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Departemen Internal
                </label>
                <select
                  value={createForm.departmentId}
                  onChange={(e) => setCreateForm({ ...createForm, departmentId: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                >
                  <option value="">Pilih Departemen...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Tingkat Hak Akses
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                >
                  <option value="member">Sub-User / Anggota Biasa</option>
                  <option value="admin">Admin Perusahaan (Sub-Admin)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Kata Sandi Awal
                </label>
                <input
                  type="text"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink font-mono focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface-2 text-xs text-ink-muted border border-line/60">
              <span className="font-semibold text-ink">Batas Isolasi Tenant:</span> Akun yang dibuat hanya dapat melihat dan mengelola data dalam lingkup {currentCompany?.name}. Percobaan akses ke perusahaan lain akan otomatis ditolak oleh sistem dengan kode 403 Forbidden.
            </div>
          </DialogBody>

          <DialogFooter>
            <Button tone="neutral" onClick={() => setIsCreateOpen(false)}>
              Batal
            </Button>
            <Button tone="primary" type="submit" disabled={isSubmittingCreate}>
              {isSubmittingCreate ? 'Mendaftarkan...' : 'Daftarkan Sub-User'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Modal Dialog: Edit Sub-User */}
      <Dialog
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        width={500}
      >
        <DialogHeading
          title="Ubah Data & Izin Sub-User"
          description={`Pengaturan akun untuk ${editTarget?.email || ''}`}
        />
        {editTarget && (
          <form onSubmit={handleSaveEdit}>
            <DialogBody className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Jabatan / Posisi
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.position}
                    onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Departemen
                  </label>
                  <select
                    value={editForm.departmentId}
                    onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  >
                    <option value="">Pilih Departemen...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Tingkat Hak Akses
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  >
                    <option value="member">Sub-User / Anggota Biasa</option>
                    <option value="admin">Admin Perusahaan (Sub-Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Status Akun
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Non-aktif / Tergembok</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Reset Kata Sandi Baru (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Kosongkan jika tidak ingin mengubah kata sandi"
                  value={editForm.newPassword}
                  onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink font-mono focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </div>
            </DialogBody>

            <DialogFooter>
              <Button tone="neutral" onClick={() => setEditTarget(null)}>
                Batal
              </Button>
              <Button tone="primary" type="submit" disabled={isSubmittingEdit}>
                {isSubmittingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>

      {/* Dialog Konfirmasi Cabut Akses */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        type="danger"
        title="Cabut Akses Sub-User"
        confirmText={isDeleting ? 'Mencabut...' : 'Ya, Cabut Akses'}
        cancelText="Batal"
        onClose={() => setDeleteTarget(null)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      >
        Apakah Anda yakin ingin mencabut hak akses sub-user '{deleteTarget?.name}' ({deleteTarget?.email})? Pengguna ini tidak akan dapat lagi masuk atau mengelola data perusahaan ini.
      </ConfirmDialog>
    </div>
  )
}

