import * as React from 'react'
import { createRoute } from '@tanstack/react-router'
import {
  HiOutlineCalendar,
  HiOutlineChartBar,
  HiOutlineCheck,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineExternalLink,
  HiOutlineEye,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineScale,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineUpload,
  HiOutlineUser,
  HiOutlineX,
} from 'react-icons/hi'
import { authenticatedRoute } from './_authenticated'
import { useAuthStore } from '@/stores/auth'
import Dialog from '@/components/ui/Dialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { getBaseUrl, resolveLogoUrl } from '@/components/shared/LogoUploader'
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
  Select,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/base'
import { KPI_PATH } from '@/constants/route.constant'
import type {
  DepartmentKpiItem,
  DepartmentSummary,
  EmployeeKpiAssessment,
  EmployeeKpiAssessmentItem,
  EmployeeKpiTask,
  KpiPeriod,
  KpiSummaryData,
  MyKpiData,
} from '@/@types/kpi'

export const kpiRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: KPI_PATH,
  component: KpiPage,
})

const CATEGORY_MAP: Record<string, { label: string; tone: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' }> = {
  operational: { label: 'Operasional', tone: 'neutral' },
  quality: { label: 'Kualitas', tone: 'accent' },
  efficiency: { label: 'Efisiensi', tone: 'success' },
  compliance: { label: 'Kepatuhan', tone: 'warning' },
  service: { label: 'Layanan', tone: 'accent' },
}

function getGradeBadge(grade?: string | null) {
  switch (grade) {
    case 'A':
      return <Badge tone="success">Predikat A • Istimewa</Badge>
    case 'B':
      return <Badge tone="accent">Predikat B • Baik</Badge>
    case 'C':
      return <Badge tone="warning">Predikat C • Cukup</Badge>
    case 'D':
      return <Badge tone="danger">Predikat D • Perlu Pembinaan</Badge>
    default:
      return <Badge tone="neutral">Belum Dinilai</Badge>
  }
}

function formatNumber(val: string | number | undefined | null): string {
  if (val === undefined || val === null || val === '') return '0'
  const num = Number(val)
  return isNaN(num) ? '0' : num.toLocaleString('id-ID', { maximumFractionDigits: 2 })
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function KpiPage() {
  const { user, token } = useAuthStore()

  // State Utama
  const [activeTab, setActiveTab] = React.useState<'admin' | 'employee'>(
    user?.role === 'admin' ? 'admin' : 'employee'
  )
  const [adminSubTab, setAdminSubTab] = React.useState<'matrix' | 'queue'>('matrix')
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  // Data State
  const [periods, setPeriods] = React.useState<KpiPeriod[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = React.useState<string>('')
  const [summaryData, setSummaryData] = React.useState<KpiSummaryData | null>(null)
  const [myKpiData, setMyKpiData] = React.useState<MyKpiData | null>(null)
  const [taskQueue, setTaskQueue] = React.useState<EmployeeKpiTask[]>([])
  const [positions, setPositions] = React.useState<string[]>([])
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = React.useState<string>('all')

  // Expanded State untuk Accordion Karyawan di Dasbor Admin
  const [expandedAssessments, setExpandedAssessments] = React.useState<Record<string, boolean>>({})

  // Modal State
  const [isPeriodModalOpen, setIsPeriodModalOpen] = React.useState(false)
  const [periodForm, setPeriodForm] = React.useState<{
    id?: string
    name: string
    startDate: string
    endDate: string
    graceEndDate: string
    status: string
    description: string
  }>({
    name: '',
    startDate: '',
    endDate: '',
    graceEndDate: '',
    status: 'active',
    description: '',
  })

  // Modal Tambah / Edit Indikator KPI Divisi
  const [isItemModalOpen, setIsItemModalOpen] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<DepartmentKpiItem | null>(null)
  const [itemForm, setItemForm] = React.useState<{
    departmentId: string
    title: string
    category: string
    description: string
    measurementUnit: string
    targetValue: string
    weight: string
    targetPosition: string
    isActive: boolean
  }>({
    departmentId: '',
    title: '',
    category: 'operational',
    description: '',
    measurementUnit: '',
    targetValue: '100',
    weight: '25',
    targetPosition: '',
    isActive: true,
  })

  // Modal Submit Tugas Karyawan
  const [isSubmitTaskModalOpen, setIsSubmitTaskModalOpen] = React.useState(false)
  const [taskForm, setTaskForm] = React.useState<{
    assessmentItemId: string
    title: string
    progressValue: string
    completedDate: string
    evidenceUrl: string
    notes: string
  }>({
    assessmentItemId: '',
    title: '',
    progressValue: '1',
    completedDate: new Date().toISOString().split('T')[0],
    evidenceUrl: '',
    notes: '',
  })
  const [isUploadingEvidence, setIsUploadingEvidence] = React.useState(false)

  // Modal Review Tugas Admin (Approve / Reject)
  const [reviewingTask, setReviewingTask] = React.useState<EmployeeKpiTask | null>(null)
  const [reviewNotes, setReviewNotes] = React.useState('')
  const [approvedProgressValue, setApprovedProgressValue] = React.useState('')

  // Modal Penyesuaian Nilai Langsung (Admin Direct Adjustment)
  const [adjustingItem, setAdjustingItem] = React.useState<EmployeeKpiAssessmentItem | null>(null)
  const [manualActualValue, setManualActualValue] = React.useState('')

  // Modal Konfirmasi Hapus Indikator
  const [deletingItemId, setDeletingItemId] = React.useState<string | null>(null)

  // Modal Pratinjau Dokumen / Gambar Lampiran S3
  const [previewEvidenceUrl, setPreviewEvidenceUrl] = React.useState<string | null>(null)

  // Otomatis hapus notifikasi sukses setelah 4 detik
  React.useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [successMsg])

  // Muat Daftar Periode Evaluasi
  const loadPeriods = React.useCallback(async () => {
    try {
      const endpoint = `${getBaseUrl()}/api/kpi/periods`
      const res = await fetch(endpoint)
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setPeriods(json.data)
        if (!selectedPeriodId && json.data.length > 0) {
          const active = json.data.find((p: KpiPeriod) => p.status === 'active') || json.data[0]
          setSelectedPeriodId(active.id)
        }
      }
    } catch {
      // Abaikan jika offline
    }
  }, [selectedPeriodId])

  // Muat Ringkasan Dasbor Admin
  const loadAdminSummary = React.useCallback(async () => {
    try {
      let endpoint = `${getBaseUrl()}/api/kpi/summary`
      const params = new URLSearchParams()
      if (selectedPeriodId) params.append('periodId', selectedPeriodId)
      if (user?.companyId) params.append('companyId', user.companyId)
      if (params.toString()) endpoint += `?${params.toString()}`

      const res = await fetch(endpoint)
      const json = await res.json()
      if (json.success) {
        setSummaryData(json.data)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat ringkasan admin'
      setErrorMsg(msg)
    }
  }, [selectedPeriodId, user?.companyId])

  // Muat Antrean Review Tugas
  const loadTaskQueue = React.useCallback(async () => {
    try {
      let endpoint = `${getBaseUrl()}/api/kpi/tasks/queue`
      const params = new URLSearchParams()
      if (user?.companyId) params.append('companyId', user.companyId)
      if (params.toString()) endpoint += `?${params.toString()}`

      const res = await fetch(endpoint)
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setTaskQueue(json.data)
      }
    } catch {
      // Abaikan galat jaringan
    }
  }, [user?.companyId])

  // Muat Daftar Jabatan Pengguna Terdaftar
  const loadPositions = React.useCallback(async () => {
    try {
      let endpoint = `${getBaseUrl()}/api/kpi/positions`
      if (user?.companyId) endpoint += `?companyId=${user.companyId}`

      const res = await fetch(endpoint)
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setPositions(json.data)
      }
    } catch {
      // Abaikan galat jaringan
    }
  }, [user?.companyId])

  // Muat Lembar KPI Karyawan Pribadi
  const loadMyKpi = React.useCallback(async () => {
    if (!token) return
    try {
      let endpoint = `${getBaseUrl()}/api/kpi/my-score`
      if (selectedPeriodId) endpoint += `?periodId=${selectedPeriodId}`

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.success) {
        setMyKpiData(json.data)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat lembar KPI karyawan'
      setErrorMsg(msg)
    }
  }, [token, selectedPeriodId])

  // Muat seluruh data saat komponen dipasang atau periode berubah
  const refreshAll = React.useCallback(async () => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      await Promise.all([loadPeriods(), loadAdminSummary(), loadTaskQueue(), loadMyKpi(), loadPositions()])
    } finally {
      setIsLoading(false)
    }
  }, [loadPeriods, loadAdminSummary, loadTaskQueue, loadMyKpi, loadPositions])

  React.useEffect(() => {
    refreshAll()
  }, [refreshAll])

  // Handler: Buka Modal Edit Periode Dinamis
  const handleOpenEditPeriod = () => {
    const current = periods.find((p) => p.id === selectedPeriodId) || summaryData?.activePeriod
    if (current) {
      setPeriodForm({
        id: current.id,
        name: current.name,
        startDate: current.startDate,
        endDate: current.endDate,
        graceEndDate: current.graceEndDate || '',
        status: current.status,
        description: current.description || '',
      })
    } else {
      setPeriodForm({
        name: 'Kuartal I 2026',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        graceEndDate: '2026-04-07',
        status: 'active',
        description: '',
      })
    }
    setIsPeriodModalOpen(true)
  }

  // Handler: Simpan Perubahan Periode Evaluasi
  const handleSavePeriod = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    try {
      if (!periodForm.id) {
        const res = await fetch(`${getBaseUrl()}/api/kpi/periods`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...periodForm,
            companyId: user?.companyId,
          }),
        })
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.message || 'Gagal membuat periode.')
        setSuccessMsg('Periode evaluasi berhasil ditambahkan.')
      } else {
        const res = await fetch(`${getBaseUrl()}/api/kpi/periods/${periodForm.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(periodForm),
        })
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.message || 'Gagal memperbarui periode.')
        setSuccessMsg('Pengaturan rentang waktu & grace period berhasil diperbarui.')
      }
      setIsPeriodModalOpen(false)
      await refreshAll()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kendala saat menyimpan periode'
      setErrorMsg(msg)
    }
  }

  // Handler: Buka Modal Tambah Indikator Divisi
  const handleOpenCreateItem = (departmentId?: string) => {
    setEditingItem(null)
    const defaultDept =
      departmentId ||
      summaryData?.departments[0]?.id ||
      (user as unknown as { departmentId?: string })?.departmentId ||
      ''
    setItemForm({
      departmentId: defaultDept,
      title: '',
      category: 'operational',
      description: '',
      measurementUnit: 'Unit',
      targetValue: '100',
      weight: '25',
      targetPosition: '',
      isActive: true,
    })
    setIsItemModalOpen(true)
  }

  // Handler: Buka Modal Edit Indikator Divisi
  const handleOpenEditItem = (item: DepartmentKpiItem) => {
    setEditingItem(item)
    setItemForm({
      departmentId: item.departmentId,
      title: item.title,
      category: item.category,
      description: item.description || '',
      measurementUnit: item.measurementUnit,
      targetValue: String(item.targetValue),
      weight: String(item.weight),
      targetPosition: item.targetPosition || '',
      isActive: item.isActive,
    })
    setIsItemModalOpen(true)
  }

  // Handler: Simpan Indikator KPI Divisi
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    try {
      if (editingItem) {
        const res = await fetch(`${getBaseUrl()}/api/kpi/items/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemForm),
        })
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.message || 'Gagal mengubah indikator.')
        setSuccessMsg('Indikator sasaran divisi berhasil diperbarui secara dinamis.')
      } else {
        const res = await fetch(`${getBaseUrl()}/api/kpi/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...itemForm,
            companyId: user?.companyId,
            periodId: selectedPeriodId || summaryData?.activePeriod?.id,
          }),
        })
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.message || 'Gagal menambahkan indikator.')
        setSuccessMsg('Indikator sasaran baru berhasil ditambahkan dan disinkronkan ke karyawan.')
      }
      setIsItemModalOpen(false)
      await refreshAll()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kendala saat menyimpan indikator'
      setErrorMsg(msg)
    }
  }

  // Handler: Auto-Balance Bobot Divisi Menjadi 100%
  const handleAutoBalance = async (departmentId: string) => {
    setErrorMsg(null)
    try {
      const res = await fetch(`${getBaseUrl()}/api/kpi/items/auto-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId,
          periodId: selectedPeriodId || summaryData?.activePeriod?.id,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message || 'Gagal menyeimbangkan bobot.')
      setSuccessMsg(json.message || 'Bobot indikator divisi berhasil diseimbangkan menjadi 100%.')
      await refreshAll()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyeimbangkan bobot'
      setErrorMsg(msg)
    }
  }

  // Handler: Hapus Indikator
  const handleDeleteItem = async () => {
    if (!deletingItemId) return
    setErrorMsg(null)
    try {
      const res = await fetch(`${getBaseUrl()}/api/kpi/items/${deletingItemId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message || 'Gagal menghapus indikator.')
      setSuccessMsg('Indikator sasaran berhasil dihapus.')
      setDeletingItemId(null)
      await refreshAll()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus indikator'
      setErrorMsg(msg)
    }
  }

  // Handler: Unggah Bukti Dokumen ke S3
  const handleUploadEvidence = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg('Ukuran berkas lampiran maksimal 20 MB.')
      return
    }

    setIsUploadingEvidence(true)
    setErrorMsg(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'kpi-evidence')

      const endpoint = `${getBaseUrl()}/api/upload/kpi-evidence`
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal mengunggah berkas bukti.')
      }

      const uploadedUrl = data.url || data.data?.url
      if (uploadedUrl) {
        setTaskForm((prev) => ({ ...prev, evidenceUrl: uploadedUrl }))
        setSuccessMsg('Berkas bukti berhasil disimpan aman di cloud storage S3.')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses unggahan ke S3'
      setErrorMsg(msg)
    } finally {
      setIsUploadingEvidence(false)
    }
  }

  // Handler: Kirim Pengajuan Tugas Mandiri Karyawan
  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (!taskForm.assessmentItemId) {
      setErrorMsg('Pilih indikator sasaran KPI yang dituju.')
      return
    }

    setErrorMsg(null)
    try {
      const res = await fetch(`${getBaseUrl()}/api/kpi/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(taskForm),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message || 'Gagal mengajukan tugas.')
      setSuccessMsg('Tugas berhasil diajukan dan sedang menunggu verifikasi penilai.')
      setIsSubmitTaskModalOpen(false)
      setTaskForm({
        assessmentItemId: '',
        title: '',
        progressValue: '1',
        completedDate: new Date().toISOString().split('T')[0],
        evidenceUrl: '',
        notes: '',
      })
      await refreshAll()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengajukan tugas kerja'
      setErrorMsg(msg)
    }
  }

  // Handler: Review Tugas (Setujui / Tolak)
  const handleReviewTask = async (status: 'approved' | 'rejected') => {
    if (!reviewingTask) return
    setErrorMsg(null)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const bodyData: {
        status: 'approved' | 'rejected'
        reviewNotes?: string
        approvedProgressValue?: string
      } = {
        status,
        reviewNotes: reviewNotes.trim() || undefined,
      }
      if (status === 'approved' && approvedProgressValue) {
        bodyData.approvedProgressValue = approvedProgressValue
      }

      const res = await fetch(`${getBaseUrl()}/api/kpi/tasks/${reviewingTask.id}/review`, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyData),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message || 'Gagal memproses verifikasi tugas.')
      setSuccessMsg(json.message || 'Tugas berhasil diverifikasi.')
      setReviewingTask(null)
      setReviewNotes('')
      setApprovedProgressValue('')
      await refreshAll()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses review tugas'
      setErrorMsg(msg)
    }
  }

  // Handler: Penyesuaian Nilai Langsung oleh Admin
  const handleSaveManualActual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustingItem) return
    setErrorMsg(null)
    try {
      const res = await fetch(`${getBaseUrl()}/api/kpi/assessments/item/${adjustingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualValue: manualActualValue }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message || 'Gagal menyesuaikan nilai.')
      setSuccessMsg('Nilai capaian berhasil diperbarui dan skor akhir telah dihitung ulang.')
      setAdjustingItem(null)
      await refreshAll()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui nilai capaian'
      setErrorMsg(msg)
    }
  }

  // Filter Divisi pada Dasbor Admin
  const filteredDepartments = React.useMemo(() => {
    if (!summaryData) return []
    if (selectedDepartmentFilter === 'all') return summaryData.departments
    return summaryData.departments.filter((d) => d.id === selectedDepartmentFilter)
  }, [summaryData, selectedDepartmentFilter])

  // Pilihan Target Jabatan: jabatan pengguna terdaftar + nilai yang sedang diedit
  const positionOptions = React.useMemo(() => {
    const list = [...positions]
    const current = itemForm.targetPosition.trim()
    if (current && !list.includes(current)) list.push(current)
    return list.sort((a, b) => a.localeCompare(b, 'id'))
  }, [positions, itemForm.targetPosition])

  const activePeriodObj = summaryData?.activePeriod || periods.find((p) => p.id === selectedPeriodId)

  return (
    <div className="space-y-6 pb-12">
      {/* Header Utama & Kontrol Rute */}
      <PageHeader
        title="Manajemen KPI & Evaluasi Kinerja"
        description="Pantau sasaran kinerja terukur per divisi, evaluasi capaian target berbobot 100%, dan verifikasi bukti tugas mandiri karyawan."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Sakelar Tampilan Peran untuk Admin */}
            {user?.role === 'admin' && (
              <div className="inline-flex rounded-lg border border-line bg-surface p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setActiveTab('admin')}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeTab === 'admin'
                      ? 'bg-ink text-surface shadow-xs'
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  Dasbor Divisi & Evaluasi (Admin)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('employee')}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeTab === 'employee'
                      ? 'bg-ink text-surface shadow-xs'
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  Lembar KPI Saya (Karyawan)
                </button>
              </div>
            )}

            {/* Tombol Aksi Sesuai Peran Aktif */}
            {activeTab === 'admin' && user?.role === 'admin' ? (
              <>
                <Button tone="neutral" onClick={handleOpenEditPeriod}>
                  <HiOutlineClock className="mr-1.5 h-4 w-4" />
                  Atur Periode & Grace Period
                </Button>
                <Button tone="primary" onClick={() => handleOpenCreateItem()}>
                  <HiOutlinePlus className="mr-1.5 h-4 w-4" />
                  Tambah Indikator Sasaran
                </Button>
              </>
            ) : (
              <Button tone="primary" onClick={() => setIsSubmitTaskModalOpen(true)}>
                <HiOutlinePlus className="mr-1.5 h-4 w-4" />
                Ajukan Bukti Tugas (*Submit Task*)
              </Button>
            )}
          </div>
        }
      />

      {/* Banner Notifikasi Umpan Balik */}
      {errorMsg && (
        <Notice tone="danger" title="Perhatian Diperlukan" onDismiss={() => setErrorMsg(null)}>
          {errorMsg}
        </Notice>
      )}

      {successMsg && (
        <Notice tone="success" title="Operasi Berhasil" onDismiss={() => setSuccessMsg(null)}>
          {successMsg}
        </Notice>
      )}

      {/* Info Pita Periode Evaluasi Aktif */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface-2/60 px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-ink">Periode Aktif:</span>
          <span className="rounded-md bg-surface px-2.5 py-1 font-mono font-medium text-ink shadow-xs">
            {activePeriodObj?.name || 'Kuartal I 2026'}
          </span>
          <span className="text-ink-3">•</span>
          <span className="text-ink-2">
            Rentang Waktu: {formatDate(activePeriodObj?.startDate)} – {formatDate(activePeriodObj?.endDate)}
          </span>
          {activePeriodObj?.graceEndDate && (
            <span className="rounded-full bg-accent-subtle px-2.5 py-0.5 font-medium text-accent">
              Masa Toleransi (Grace Period) s/d {formatDate(activePeriodObj.graceEndDate)}
            </span>
          )}
        </div>

        {/* Pemilih Periode jika ada lebih dari 1 */}
        {periods.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-ink-3">Ganti Periode:</span>
            <Select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="w-56"
              isSearchable={false}
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status === 'active' ? 'Aktif' : 'Tutup'})
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {/* TAMPILAN 1: DASBOR ADMIN (DIVISI, INDIKATOR DINAMIS, VERIFIKASI) */}
      {activeTab === 'admin' && (
        <div className="space-y-6">
          {/* Kartu Ringkasan Metrik Tingkat Perusahaan */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
              <div className="text-xs font-semibold text-ink-3">Rata-rata Skor Perusahaan</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold tracking-tight text-ink">
                  {formatNumber(summaryData?.stats?.averageScore)}
                </span>
                <span className="text-xs font-medium text-ink-3">/ 100</span>
              </div>
              <div className="mt-1 text-xs text-ink-2">
                {getGradeBadge(
                  (summaryData?.stats?.averageScore || 0) >= 90
                    ? 'A'
                    : (summaryData?.stats?.averageScore || 0) >= 80
                    ? 'B'
                    : (summaryData?.stats?.averageScore || 0) >= 70
                    ? 'C'
                    : 'D'
                )}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
              <div className="text-xs font-semibold text-ink-3">Karyawan Terevaluasi</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold tracking-tight text-ink">
                  {summaryData?.stats?.totalEmployees || 0}
                </span>
                <span className="text-xs font-medium text-ink-3">Orang</span>
              </div>
              <div className="mt-1 text-xs text-ink-3">Tersebar di {summaryData?.departments?.length || 0} Divisi</div>
            </div>

            <div
              onClick={() => setAdminSubTab('queue')}
              className="cursor-pointer rounded-xl border border-line bg-surface p-4 shadow-xs transition hover:border-line-strong hover:bg-surface-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-3">Antrean Verifikasi Tugas</span>
                {taskQueue.length > 0 && (
                  <span className="rounded-full bg-warning-subtle px-2 py-0.5 text-2xs font-bold text-warning">
                    Perlu Tindakan
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold tracking-tight text-ink">
                  {taskQueue.length}
                </span>
                <span className="text-xs font-medium text-ink-3">Pengajuan Bukti</span>
              </div>
              <div className="mt-1 text-xs text-primary">Klik untuk membuka antrean review →</div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
              <div className="text-xs font-semibold text-ink-3">Keseimbangan Bobot Divisi</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold tracking-tight text-ink">
                  {summaryData?.departments?.every((d) => d.isBalanced) ? '100%' : 'Perlu Penyesuaian'}
                </span>
              </div>
              <div className="mt-1 text-xs text-ink-3">
                {summaryData?.departments?.every((d) => d.isBalanced)
                  ? '✓ Seluruh divisi berbobot genap 100%'
                  : 'Beberapa divisi memiliki total bobot ≠ 100%'}
              </div>
            </div>
          </div>

          {/* Sub-Navigasi Dasbor Admin: Matriks Sasaran vs Antrean Review */}
          <div className="flex border-b border-line">
            <button
              type="button"
              onClick={() => setAdminSubTab('matrix')}
              className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
                adminSubTab === 'matrix'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-ink-2 hover:text-ink'
              }`}
            >
              Matriks Sasaran & Karyawan Divisi
            </button>
            <button
              type="button"
              onClick={() => setAdminSubTab('queue')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
                adminSubTab === 'queue'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-ink-2 hover:text-ink'
              }`}
            >
              <span>Antrean Verifikasi Tugas Mandiri</span>
              {taskQueue.length > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-2xs font-bold text-primary">
                  {taskQueue.length}
                </span>
              )}
            </button>
          </div>

          {/* SUB-TAB 1: MATRIKS SASARAN & KARYAWAN DIVISI */}
          {adminSubTab === 'matrix' && (
            <div className="space-y-6">
              {/* Filter Divisi */}
              {summaryData && summaryData.departments.length > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-ink-3">Filter Divisi:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedDepartmentFilter('all')}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      selectedDepartmentFilter === 'all'
                        ? 'bg-ink text-surface'
                        : 'border border-line bg-surface text-ink-2 hover:bg-surface-2'
                    }`}
                  >
                    Semua Divisi ({summaryData.departments.length})
                  </button>
                  {summaryData.departments.map((dept) => (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => setSelectedDepartmentFilter(dept.id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        selectedDepartmentFilter === dept.id
                          ? 'bg-ink text-surface'
                          : 'border border-line bg-surface text-ink-2 hover:bg-surface-2'
                      }`}
                    >
                      {dept.name} ({dept.code})
                    </button>
                  ))}
                </div>
              )}

              {/* Daftar Panel per Divisi */}
              {filteredDepartments.map((dept) => (
                <Panel key={dept.id} className="overflow-hidden">
                  {/* Header Divisi */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-surface-2/40 px-6 py-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-ink-3">[{dept.code}]</span>
                        <h2 className="text-base font-bold text-ink">{dept.name}</h2>
                        {dept.isBalanced ? (
                          <span className="rounded-full bg-success-subtle px-2 py-0.5 text-2xs font-semibold text-success">
                            ✓ Total Bobot 100% Seimbang
                          </span>
                        ) : (
                          <span className="rounded-full bg-warning-subtle px-2 py-0.5 text-2xs font-semibold text-warning">
                            Total Bobot {dept.totalWeight}% (Perlu Diseimbangkan)
                          </span>
                        )}
                      </div>
                      {dept.description && (
                        <p className="mt-0.5 text-xs text-ink-3">{dept.description}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="mr-3 text-right text-xs">
                        <span className="text-ink-3">Rata-rata Divisi: </span>
                        <span className="font-mono font-bold text-ink">{dept.averageScore}</span>
                        <span className="text-ink-3"> / 100</span>
                      </div>
                      <Button tone="neutral" onClick={() => handleAutoBalance(dept.id)}>
                        <HiOutlineScale className="mr-1.5 h-3.5 w-3.5" />
                        Auto-Balance 100%
                      </Button>
                      <Button tone="primary" onClick={() => handleOpenCreateItem(dept.id)}>
                        <HiOutlinePlus className="mr-1.5 h-3.5 w-3.5" />
                        Tambah Indikator
                      </Button>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* BAGIAN A: DAFTAR INDIKATOR SASARAN DIVISI */}
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-ink">
                          Indikator Sasaran Divisi ({dept.kpiItems.length} Indikator)
                        </h3>
                        <span className="text-xs text-ink-3">
                          Total Bobot Aktif: <strong className="font-mono text-ink">{dept.totalWeight}%</strong>
                        </span>
                      </div>

                      {dept.kpiItems.length === 0 ? (
                        <EmptyState
                          title="Belum ada indikator sasaran"
                          description="Divisi ini belum memiliki butir sasaran KPI. Tambahkan sasaran pertama Anda."
                          action={
                            <Button tone="neutral" onClick={() => handleOpenCreateItem(dept.id)}>
                              + Tambah Indikator Sasaran
                            </Button>
                          }
                        />
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-line">
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-line bg-surface-2 text-ink-2">
                              <tr>
                                <th className="px-4 py-2.5 font-semibold">Kategori</th>
                                <th className="px-4 py-2.5 font-semibold">Judul Indikator & Panduan</th>
                                <th className="px-4 py-2.5 font-semibold">Target Nilai</th>
                                <th className="px-4 py-2.5 font-semibold">Satuan</th>
                                <th className="px-4 py-2.5 font-semibold">Bobot</th>
                                <th className="px-4 py-2.5 font-semibold">Posisi</th>
                                <th className="px-4 py-2.5 font-semibold">Status</th>
                                <th className="px-4 py-2.5 text-right font-semibold">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line bg-surface">
                              {dept.kpiItems.map((item) => {
                                const cat = CATEGORY_MAP[item.category] || { label: item.category, tone: 'neutral' }
                                return (
                                  <tr key={item.id} className="hover:bg-surface-2/40 transition-colors">
                                    <td className="px-4 py-3">
                                      <Badge tone={cat.tone}>{cat.label}</Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="font-semibold text-ink">{item.title}</div>
                                      {item.description && (
                                        <div className="text-2xs text-ink-3 line-clamp-1">
                                          {item.description}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 font-mono font-bold text-ink">
                                      {formatNumber(item.targetValue)}
                                    </td>
                                    <td className="px-4 py-3 text-ink-2">{item.measurementUnit}</td>
                                    <td className="px-4 py-3 font-mono font-bold text-ink">
                                      {item.weight}%
                                    </td>
                                    <td className="px-4 py-3 text-ink-3">
                                      {item.targetPosition || 'Semua Jabatan'}
                                    </td>
                                    <td className="px-4 py-3">
                                      {item.isActive ? (
                                        <span className="text-success font-semibold">Aktif</span>
                                      ) : (
                                        <span className="text-ink-3 font-medium">Nonaktif</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <div className="inline-flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditItem(item)}
                                          className="rounded-md border border-line bg-surface p-1.5 text-ink-2 hover:bg-surface-2 hover:text-ink"
                                          title="Ubah Indikator"
                                        >
                                          <HiOutlinePencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setDeletingItemId(item.id)}
                                          className="rounded-md border border-line bg-surface p-1.5 text-error hover:bg-error-subtle"
                                          title="Hapus Indikator"
                                        >
                                          <HiOutlineTrash className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* BAGIAN B: LEMBAR EVALUASI KARYAWAN DI DIVISI INI */}
                    <div className="pt-2">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-ink">
                          Karyawan & Lembar Evaluasi ({dept.assessments.length} Orang)
                        </h3>
                        <span className="text-xs text-ink-3">
                          Klik pada karyawan untuk membuka rincian capaian butir indikator
                        </span>
                      </div>

                      {dept.assessments.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-line p-4 text-center text-xs text-ink-3">
                          Belum ada data lembar evaluasi karyawan untuk periode aktif di divisi ini.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {dept.assessments.map((ass) => {
                            const isExpanded = !!expandedAssessments[ass.id]
                            const scoreNum = Number(ass.finalScore) || 0

                            return (
                              <div
                                key={ass.id}
                                className="rounded-lg border border-line bg-surface overflow-hidden shadow-2xs"
                              >
                                {/* Baris Ringkasan Karyawan */}
                                <div
                                  onClick={() =>
                                    setExpandedAssessments((prev) => ({
                                      ...prev,
                                      [ass.id]: !prev[ass.id],
                                    }))
                                  }
                                  className="flex flex-wrap items-center justify-between gap-4 p-4 cursor-pointer hover:bg-surface-2/40 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    {ass.employeeAvatarUrl ? (
                                      <img
                                        src={resolveLogoUrl(ass.employeeAvatarUrl)}
                                        alt={ass.employeeName}
                                        className="h-10 w-10 rounded-full object-cover border border-line"
                                      />
                                    ) : (
                                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 font-bold text-ink">
                                        {ass.employeeName?.slice(0, 2).toUpperCase() || 'EM'}
                                      </div>
                                    )}
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-ink">{ass.employeeName}</h4>
                                        {getGradeBadge(ass.grade)}
                                      </div>
                                      <div className="text-xs text-ink-3">
                                        {ass.employeePosition || 'Staf'} • {ass.employeeEmail}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-6">
                                    {/* Skor Terbobot Bar */}
                                    <div className="text-right">
                                      <div className="text-xs font-semibold text-ink-3">Skor Total</div>
                                      <div className="flex items-baseline gap-1.5 font-mono font-bold">
                                        <span className="text-lg text-ink">{formatNumber(ass.finalScore)}</span>
                                        <span className="text-xs text-ink-3">/ 100</span>
                                      </div>
                                    </div>

                                    {/* Visual Progress Bar */}
                                    <div className="w-24 sm:w-32">
                                      <div className="h-2 w-full rounded-full bg-surface-2 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all duration-300 ${
                                            scoreNum >= 90
                                              ? 'bg-success'
                                              : scoreNum >= 80
                                              ? 'bg-accent'
                                              : scoreNum >= 70
                                              ? 'bg-warning'
                                              : 'bg-error'
                                          }`}
                                          style={{ width: `${Math.min(100, scoreNum)}%` }}
                                        />
                                      </div>
                                      <div className="mt-1 text-right text-2xs font-mono text-ink-3">
                                        {scoreNum.toFixed(1)}% Capaian
                                      </div>
                                    </div>

                                    <div className="text-ink-3">
                                      {isExpanded ? (
                                        <HiOutlineChevronDown className="h-5 w-5" />
                                      ) : (
                                        <HiOutlineChevronRight className="h-5 w-5" />
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Rincian Butir Penilaian (Expandable) */}
                                {isExpanded && (
                                  <div className="border-t border-line bg-surface-2/20 p-4">
                                    <div className="mb-2 flex items-center justify-between text-xs text-ink-3">
                                      <span className="font-semibold text-ink">
                                        Rincian Capaian Indikator Sasaran:
                                      </span>
                                      <span>
                                        Dapat disesuaikan secara langsung oleh pimpinan penilai.
                                      </span>
                                    </div>

                                    <div className="overflow-x-auto rounded-md border border-line bg-surface">
                                      <table className="w-full text-left text-xs">
                                        <thead className="border-b border-line bg-surface-2/60 text-ink-2">
                                          <tr>
                                            <th className="px-3.5 py-2 font-semibold">Indikator</th>
                                            <th className="px-3.5 py-2 font-semibold">Bobot</th>
                                            <th className="px-3.5 py-2 font-semibold">Target</th>
                                            <th className="px-3.5 py-2 font-semibold">Realisasi</th>
                                            <th className="px-3.5 py-2 font-semibold">Capaian %</th>
                                            <th className="px-3.5 py-2 font-semibold">Skor Terbobot</th>
                                            <th className="px-3.5 py-2 text-right font-semibold">Aksi</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-line">
                                          {(ass.items || []).map((empItem) => (
                                            <tr key={empItem.id} className="hover:bg-surface-2/30">
                                              <td className="px-3.5 py-2.5">
                                                <div className="font-semibold text-ink">{empItem.title}</div>
                                                <div className="text-2xs text-ink-3">
                                                  Satuan: {empItem.measurementUnit}
                                                </div>
                                              </td>
                                              <td className="px-3.5 py-2.5 font-mono text-ink">
                                                {empItem.weight}%
                                              </td>
                                              <td className="px-3.5 py-2.5 font-mono text-ink">
                                                {formatNumber(empItem.targetValue)} {empItem.measurementUnit}
                                              </td>
                                              <td className="px-3.5 py-2.5 font-mono font-bold text-ink">
                                                {formatNumber(empItem.actualValue)} {empItem.measurementUnit}
                                              </td>
                                              <td className="px-3.5 py-2.5 font-mono font-semibold">
                                                <span
                                                  className={
                                                    Number(empItem.achievementPercentage) >= 100
                                                      ? 'text-success'
                                                      : Number(empItem.achievementPercentage) >= 80
                                                      ? 'text-accent'
                                                      : 'text-warning'
                                                  }
                                                >
                                                  {formatNumber(empItem.achievementPercentage)}%
                                                </span>
                                              </td>
                                              <td className="px-3.5 py-2.5 font-mono font-bold text-ink">
                                                {formatNumber(empItem.weightedScore)}
                                              </td>
                                              <td className="px-3.5 py-2.5 text-right">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setAdjustingItem(empItem)
                                                    setManualActualValue(String(empItem.actualValue))
                                                  }}
                                                  className="rounded-md border border-line bg-surface px-2.5 py-1 text-2xs font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink"
                                                >
                                                  Sesuaikan Nilai
                                                </button>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </Panel>
              ))}
            </div>
          )}

          {/* SUB-TAB 2: ANTREAN VERIFIKASI BUKTI TUGAS MANDIRI */}
          {adminSubTab === 'queue' && (
            <Panel className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-ink">Antrean Verifikasi Bukti Tugas Karyawan</h2>
                  <p className="text-xs text-ink-3">
                    Tinjau pengajuan capaian kerja mandiri dari karyawan. Menyetujui tugas akan otomatis menambah nilai realisasi dan skor akhir KPI karyawan.
                  </p>
                </div>
                <span className="rounded-full bg-surface-2 px-3 py-1 font-mono text-xs font-bold text-ink">
                  {taskQueue.length} Pengajuan Menunggu
                </span>
              </div>

              {taskQueue.length === 0 ? (
                <EmptyState
                  title="Tidak ada tugas menunggu review"
                  description="Semua pengajuan tugas mandiri dari karyawan telah selesai diverifikasi."
                />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-line bg-surface-2 text-ink-2">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Karyawan & Divisi</th>
                        <th className="px-4 py-3 font-semibold">Indikator Sasaran</th>
                        <th className="px-4 py-3 font-semibold">Judul Tugas & Catatan</th>
                        <th className="px-4 py-3 font-semibold">Capaian Progres</th>
                        <th className="px-4 py-3 font-semibold">Tanggal Selesai</th>
                        <th className="px-4 py-3 font-semibold">Bukti S3</th>
                        <th className="px-4 py-3 text-right font-semibold">Tindakan Evaluasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line bg-surface">
                      {taskQueue.map((task) => (
                        <tr key={task.id} className="hover:bg-surface-2/40 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-ink">{task.employeeName}</div>
                            <div className="text-2xs text-ink-3">
                              {task.departmentName} • {task.employeePosition || 'Staf'}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-ink">{task.itemTitle}</div>
                            <div className="text-2xs text-ink-3">
                              Target: {formatNumber(task.targetValue)} {task.measurementUnit}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 max-w-xs">
                            <div className="font-semibold text-ink">{task.title}</div>
                            {task.notes && (
                              <div className="text-2xs text-ink-2 line-clamp-2 mt-0.5">
                                {task.notes}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-mono font-bold text-primary">
                              +{formatNumber(task.progressValue)} {task.measurementUnit}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-ink-2">{formatDate(task.completedDate)}</td>
                          <td className="px-4 py-3.5">
                            {task.evidenceUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewEvidenceUrl(task.evidenceUrl!)}
                                className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1 text-2xs font-semibold text-primary hover:bg-primary-subtle"
                              >
                                <HiOutlineDocumentText className="h-3.5 w-3.5" />
                                Lihat Bukti
                              </button>
                            ) : (
                              <span className="text-ink-3">Tanpa Lampiran</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="inline-flex items-center gap-2">
                              <Button
                                tone="neutral"
                                onClick={() => {
                                  setReviewingTask(task)
                                  setReviewNotes('')
                                  setApprovedProgressValue(String(task.progressValue))
                                }}
                              >
                                Tinjau Tugas
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
          )}
        </div>
      )}

      {/* TAMPILAN 2: LEMBAR KPI SAYA (KARYAWAN) */}
      {activeTab === 'employee' && (
        <div className="space-y-6">
          {/* Kartu Profil & Skor Karyawan */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Profil Karyawan & Status Periode */}
            <Panel className="p-6 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {myKpiData?.employee?.avatarUrl ? (
                    <img
                      src={resolveLogoUrl(myKpiData.employee.avatarUrl)}
                      alt={myKpiData.employee.name}
                      className="h-12 w-12 rounded-full object-cover border border-line"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 font-bold text-ink">
                      {myKpiData?.employee?.name?.slice(0, 2).toUpperCase() || 'ST'}
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-ink">{myKpiData?.employee?.name || user?.name}</h2>
                    <p className="text-xs text-ink-3">
                      {myKpiData?.employee?.position || 'Staf'} • Divisi {myKpiData?.employee?.departmentName || 'Umum'}
                    </p>
                  </div>
                </div>

                <Button tone="primary" onClick={() => setIsSubmitTaskModalOpen(true)}>
                  <HiOutlinePlus className="mr-1.5 h-4 w-4" />
                  Ajukan Bukti Tugas (*Submit Task*)
                </Button>
              </div>

              {/* Grace Period Notification Banner */}
              <div className="mt-6 rounded-lg border border-accent-line bg-accent-subtle/50 p-3.5 text-xs text-ink-2">
                <div className="flex items-center gap-2 font-semibold text-accent">
                  <HiOutlineClock className="h-4 w-4" />
                  Masa Evaluasi Kinerja Aktif
                </div>
                <div className="mt-1 leading-relaxed">
                  Tenggat waktu capaian kerja periode ini: <strong>{formatDate(myKpiData?.period?.endDate)}</strong>.
                  {myKpiData?.period?.graceEndDate && (
                    <>
                      {' '}Tersedia masa toleransi pelaporan (Grace Period) hingga{' '}
                      <strong>{formatDate(myKpiData.period.graceEndDate)}</strong>.
                    </>
                  )}
                </div>
              </div>
            </Panel>

            {/* Kartu Skor Akhir Terbobot */}
            <Panel className="p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-ink-3">Skor Capaian Akhir</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-4xl font-extrabold tracking-tight text-ink">
                    {formatNumber(myKpiData?.assessment?.finalScore)}
                  </span>
                  <span className="text-sm font-medium text-ink-3">/ 100</span>
                </div>
                <div className="mt-3">
                  {getGradeBadge(myKpiData?.assessment?.grade)}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-line text-xs text-ink-3 flex justify-between">
                <span>Total Bobot Indikator:</span>
                <span className="font-mono font-bold text-ink">
                  {formatNumber(myKpiData?.assessment?.totalWeight || 100)}%
                </span>
              </div>
            </Panel>
          </div>

          {/* Daftar Butir Indikator KPI Karyawan */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">
                Daftar Indikator Kinerja & Capaian Mandiri
              </h3>
              <span className="text-xs text-ink-3">
                {myKpiData?.items?.length || 0} Indikator Terdaftar
              </span>
            </div>

            {(!myKpiData?.items || myKpiData.items.length === 0) ? (
              <EmptyState
                title="Belum ada indikator sasaran untuk Anda"
                description="Hubungi pimpinan divisi atau HR untuk mengaitkan indikator sasaran KPI ke jabatan Anda."
              />
            ) : (
              <div className="space-y-4">
                {myKpiData.items.map((item) => {
                  const cat = CATEGORY_MAP[item.category] || { label: item.category, tone: 'neutral' }
                  const achNum = Number(item.achievementPercentage) || 0

                  return (
                    <Panel key={item.id} className="p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge tone={cat.tone}>{cat.label}</Badge>
                            <h4 className="text-base font-bold text-ink">{item.title}</h4>
                          </div>
                          {item.description && (
                            <p className="text-xs text-ink-2 max-w-2xl">{item.description}</p>
                          )}
                        </div>

                        <div className="text-right">
                          <div className="text-xs text-ink-3">Bobot Indikator</div>
                          <div className="font-mono text-lg font-bold text-ink">{item.weight}%</div>
                        </div>
                      </div>

                      {/* Bar Capaian & Angka Realisasi */}
                      <div className="mt-5 rounded-lg border border-line bg-surface-2/40 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div>
                            <span className="text-ink-3">Target: </span>
                            <span className="font-mono font-bold text-ink">
                              {formatNumber(item.targetValue)} {item.measurementUnit}
                            </span>
                          </div>
                          <div>
                            <span className="text-ink-3">Realisasi Disetujui: </span>
                            <span className="font-mono font-bold text-primary">
                              {formatNumber(item.actualValue)} {item.measurementUnit}
                            </span>
                          </div>
                          <div>
                            <span className="text-ink-3">Persentase Capaian: </span>
                            <span className="font-mono font-bold text-ink">{formatNumber(item.achievementPercentage)}%</span>
                          </div>
                          <div>
                            <span className="text-ink-3">Skor Terbobot: </span>
                            <span className="font-mono font-bold text-ink">
                              {formatNumber(item.weightedScore)} / {item.weight}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar Visual */}
                        <div className="mt-3 h-2.5 w-full rounded-full bg-surface overflow-hidden border border-line">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              achNum >= 100
                                ? 'bg-success'
                                : achNum >= 80
                                ? 'bg-accent'
                                : achNum >= 60
                                ? 'bg-warning'
                                : 'bg-error'
                            }`}
                            style={{ width: `${Math.min(100, achNum)}%` }}
                          />
                        </div>
                      </div>

                      {/* Tombol Lapor Tugas untuk Butir Ini */}
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs font-semibold text-ink-3">
                          Riwayat Tugas Mandiri ({item.tasks?.length || 0} Pengajuan)
                        </span>
                        <Button
                          tone="neutral"
                          onClick={() => {
                            setTaskForm((prev) => ({
                              ...prev,
                              assessmentItemId: item.id,
                              title: `Tugas untuk ${item.title}`,
                            }))
                            setIsSubmitTaskModalOpen(true)
                          }}
                        >
                          <HiOutlinePlus className="mr-1 h-3.5 w-3.5" />
                          Lapor Tugas untuk Item Ini
                        </Button>
                      </div>

                      {/* Sub-list Riwayat Tugas Mandiri yang Diajukan */}
                      {item.tasks && item.tasks.length > 0 && (
                        <div className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface text-xs">
                          {item.tasks.map((t) => (
                            <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-ink">{t.title}</span>
                                  {t.status === 'approved' ? (
                                    <Badge tone="success">✓ Disetujui</Badge>
                                  ) : t.status === 'rejected' ? (
                                    <Badge tone="danger">✕ Ditolak</Badge>
                                  ) : (
                                    <Badge tone="warning">Menunggu Review</Badge>
                                  )}
                                </div>
                                <div className="mt-0.5 text-ink-3">
                                  Selesai: {formatDate(t.completedDate)} • Capaian: +{formatNumber(t.progressValue)} {item.measurementUnit}
                                </div>
                                {t.notes && <div className="mt-1 text-ink-2">{t.notes}</div>}
                                {t.reviewNotes && (
                                  <div className="mt-1 rounded bg-surface-2 p-1.5 text-ink-3">
                                    Catatan Penilai: {t.reviewNotes}
                                  </div>
                                )}
                              </div>

                              <div>
                                {t.evidenceUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewEvidenceUrl(t.evidenceUrl!)}
                                    className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-primary hover:bg-primary-subtle"
                                  >
                                    <HiOutlineEye className="h-3.5 w-3.5" />
                                    Lihat Lampiran
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Panel>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: FORM PENGAJUAN TUGAS MANDIRI KARYAWAN (SUBMIT TASK) */}
      <Dialog
        isOpen={isSubmitTaskModalOpen}
        onClose={() => setIsSubmitTaskModalOpen(false)}
        width={560}
      >
        <DialogHeading
          title="Ajukan Bukti Tugas Mandiri (*Task Submission*)"
          description="Laporkan tugas atau pekerjaan yang telah Anda selesaikan beserta lampiran dokumen bukti ke cloud storage S3 untuk diverifikasi penilai KPI."
        />
        <form onSubmit={handleSubmitTask} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-5 px-4 py-5 sm:px-5">
            {/* Pilihan Indikator Sasaran */}
            <SelectField
              label="Indikator Sasaran KPI"
              required
              value={taskForm.assessmentItemId}
              onChange={(e) => setTaskForm({ ...taskForm, assessmentItemId: e.target.value })}
            >
              <option value="">Pilih Sasaran Indikator...</option>
              {(myKpiData?.items || []).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title} (Target: {i.targetValue} {i.measurementUnit})
                </option>
              ))}
            </SelectField>

            <TextField
              label="Judul Tugas / Pekerjaan"
              required
              placeholder="Contoh: Pengiriman batch 100 paket wilayah timur"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Nilai Capaian / Progres"
                required
                type="number"
                step="any"
                placeholder="Misal: 25"
                value={taskForm.progressValue}
                onChange={(e) => setTaskForm({ ...taskForm, progressValue: e.target.value })}
              />

              <TextField
                label="Tanggal Selesai"
                required
                type="date"
                value={taskForm.completedDate}
                onChange={(e) => setTaskForm({ ...taskForm, completedDate: e.target.value })}
              />
            </div>

            <TextAreaField
              label="Catatan & Deskripsi Rinci Pekerjaan"
              rows={3}
              placeholder="Jelaskan detail pelaksanaan tugas, tautan berkas kerja, atau catatan penting lainnya..."
              value={taskForm.notes}
              onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
            />

            {/* Unggah Berkas Bukti ke S3 */}
            <div>
              <label className="block text-xs font-semibold text-ink-2 mb-1.5">
                Lampiran Bukti Dokumen (Cloud S3)
              </label>
              <div className="rounded-lg border border-dashed border-line p-4 text-center">
                {taskForm.evidenceUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-success">
                      <HiOutlineCheck className="h-4 w-4" />
                      <span>Berkas tersimpan di S3</span>
                    </div>
                    <div className="font-mono text-2xs text-ink-3 truncate max-w-sm mx-auto">
                      {taskForm.evidenceUrl}
                    </div>
                    <button
                      type="button"
                      onClick={() => setTaskForm((prev) => ({ ...prev, evidenceUrl: '' }))}
                      className="text-xs text-error hover:underline"
                    >
                      Hapus Lampiran
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      id="evidenceFileInput"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleUploadEvidence(file)
                      }}
                    />
                    <label
                      htmlFor="evidenceFileInput"
                      className={`inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-2 cursor-pointer ${
                        isUploadingEvidence ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      <HiOutlineUpload className="h-4 w-4" />
                      {isUploadingEvidence ? 'Mengunggah ke S3...' : 'Pilih Berkas Lampiran (S3)'}
                    </label>
                    <p className="mt-1 text-2xs text-ink-3">
                      Mendukung PDF, Foto JPG/PNG, Dokumen Word, atau ZIP (Maks 20 MB).
                    </p>
                  </div>
                )}
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button tone="neutral" onClick={() => setIsSubmitTaskModalOpen(false)}>
              Batal
            </Button>
            <Button tone="primary" type="submit" disabled={isUploadingEvidence}>
              Kirim Pengajuan Tugas
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* MODAL 2: ATUR PERIODE EVALUASI & GRACE PERIOD (ADMIN DYNAMIC CONTROL) */}
      <Dialog
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
        width={520}
      >
        <DialogHeading
          title="Pengaturan Periode Evaluasi & Grace Period"
          description="Atur rentang waktu evaluasi kinerja secara fleksibel, termasuk toleransi waktu perpanjangan (Grace Period) untuk karyawan."
        />
        <form onSubmit={handleSavePeriod} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-5 px-4 py-5 sm:px-5">
            <TextField
              label="Nama Periode Evaluasi"
              required
              placeholder="Contoh: Kuartal I 2026"
              value={periodForm.name}
              onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Tanggal Mulai"
                required
                type="date"
                value={periodForm.startDate}
                onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
              />

              <TextField
                label="Tanggal Berakhir"
                required
                type="date"
                value={periodForm.endDate}
                onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
              />
            </div>

            <TextField
              label="Masa Tenggang Toleransi (Grace Period)"
              type="date"
              hint="Karyawan masih dapat mengajukan bukti tugas mandiri sampai tanggal ini."
              value={periodForm.graceEndDate}
              onChange={(e) => setPeriodForm({ ...periodForm, graceEndDate: e.target.value })}
            />

            <SelectField
              label="Status Periode"
              value={periodForm.status}
              onChange={(e) => setPeriodForm({ ...periodForm, status: e.target.value })}
            >
              <option value="active">Aktif (Sedang Berjalan)</option>
              <option value="closed">Ditutup (Arsip)</option>
            </SelectField>

            <TextAreaField
              label="Deskripsi / Catatan Arahan Direksi"
              rows={2}
              value={periodForm.description}
              onChange={(e) => setPeriodForm({ ...periodForm, description: e.target.value })}
            />
          </DialogBody>

          <DialogFooter>
            <Button tone="neutral" onClick={() => setIsPeriodModalOpen(false)}>
              Batal
            </Button>
            <Button tone="primary" type="submit">
              Simpan Pengaturan Periode
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* MODAL 3: TAMBAH / EDIT INDIKATOR SASARAN DIVISI (ADMIN) */}
      <Dialog
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        width={560}
      >
        <DialogHeading
          title={editingItem ? 'Edit Indikator Sasaran Divisi' : 'Tambah Indikator Sasaran Divisi'}
          description="Tentukan butir capaian kinerja terukur, target kuantitatif, dan bobot persentase penilaian."
        />
        <form onSubmit={handleSaveItem} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-5 px-4 py-5 sm:px-5">
            {!editingItem && (
              <SelectField
                label="Divisi / Departemen"
                required
                value={itemForm.departmentId}
                onChange={(e) => setItemForm({ ...itemForm, departmentId: e.target.value })}
              >
                {(summaryData?.departments || []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </SelectField>
            )}

            <TextField
              label="Judul Indikator Sasaran"
              required
              placeholder="Contoh: Efisiensi Pengiriman Tepat Waktu"
              value={itemForm.title}
              onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="Kategori Sasaran"
                value={itemForm.category}
                onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
              >
                <option value="operational">Operasional</option>
                <option value="quality">Kualitas</option>
                <option value="efficiency">Efisiensi</option>
                <option value="compliance">Kepatuhan</option>
                <option value="service">Layanan</option>
              </SelectField>

              <TextField
                label="Satuan Pengukuran"
                required
                placeholder="Contoh: Paket, %, Jam, Hari"
                value={itemForm.measurementUnit}
                onChange={(e) => setItemForm({ ...itemForm, measurementUnit: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Target Nilai"
                required
                type="number"
                step="any"
                placeholder="100"
                value={itemForm.targetValue}
                onChange={(e) => setItemForm({ ...itemForm, targetValue: e.target.value })}
              />

              <TextField
                label="Bobot Penilaian (%)"
                required
                type="number"
                step="any"
                placeholder="25"
                hint="Total seluruh indikator divisi disarankan 100%"
                value={itemForm.weight}
                onChange={(e) => setItemForm({ ...itemForm, weight: e.target.value })}
              />
            </div>

            <SelectField
              label="Target Jabatan / Posisi Khusus (Opsional)"
              hint={
                positionOptions.length > 0
                  ? 'Pilihan diambil dari jabatan pengguna yang terdaftar di perusahaan ini.'
                  : 'Belum ada jabatan terdaftar. Isi posisi pada data karyawan terlebih dahulu.'
              }
              value={itemForm.targetPosition}
              onChange={(e) => setItemForm({ ...itemForm, targetPosition: e.target.value })}
            >
              <option value="">Semua jabatan divisi</option>
              {positionOptions.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </SelectField>

            <TextAreaField
              label="Panduan / Rumus Evaluasi"
              rows={2}
              placeholder="Panduan cara staf mencapai sasaran atau standar penilaian mutu..."
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
            />
          </DialogBody>

          <DialogFooter>
            <Button tone="neutral" onClick={() => setIsItemModalOpen(false)}>
              Batal
            </Button>
            <Button tone="primary" type="submit">
              {editingItem ? 'Simpan Perubahan' : 'Tambahkan Indikator'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* MODAL 4: REVIEW TUGAS ADMIN (APPROVE / REJECT) */}
      <Dialog
        isOpen={!!reviewingTask}
        onClose={() => setReviewingTask(null)}
        width={540}
      >
        <DialogHeading
          title="Verifikasi Tugas Mandiri Karyawan"
          description="Tinjau kesesuaian bukti kerja. Menyetujui tugas akan menambahkan nilai progres ke realisasi KPI karyawan."
        />
        <DialogBody className="space-y-4 px-4 py-5 sm:px-5">
          {reviewingTask && (
            <div className="rounded-lg border border-line bg-surface-2/40 p-3.5 space-y-1.5 text-xs">
              <div>
                <span className="text-ink-3">Karyawan: </span>
                <span className="font-bold text-ink">{reviewingTask.employeeName}</span> ({reviewingTask.departmentName})
              </div>
              <div>
                <span className="text-ink-3">Sasaran Indikator: </span>
                <span className="font-semibold text-ink">{reviewingTask.itemTitle}</span>
              </div>
              <div>
                <span className="text-ink-3">Judul Tugas: </span>
                <span className="font-semibold text-ink">{reviewingTask.title}</span>
              </div>
              {reviewingTask.notes && (
                <div>
                  <span className="text-ink-3">Catatan Karyawan: </span>
                  <span className="text-ink">{reviewingTask.notes}</span>
                </div>
              )}
              {reviewingTask.evidenceUrl && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setPreviewEvidenceUrl(reviewingTask.evidenceUrl!)}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    <HiOutlineDocumentText className="h-4 w-4" />
                    Lihat Berkas Lampiran (S3) →
                  </button>
                </div>
              )}
            </div>
          )}

          <TextField
            label="Nilai Capaian yang Disetujui"
            required
            type="number"
            step="any"
            value={approvedProgressValue}
            onChange={(e) => setApprovedProgressValue(e.target.value)}
            hint="Dapat disesuaikan jika evaluasi parsial."
          />

          <TextAreaField
            label="Catatan Evaluasi / Umpan Balik untuk Karyawan"
            rows={3}
            placeholder="Tuliskan apresiasi, feedback perbaikan, atau alasan penolakan jika tidak disetujui..."
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
          />
        </DialogBody>

        <DialogFooter>
          <Button tone="neutral" onClick={() => setReviewingTask(null)}>
            Tutup
          </Button>
          <Button tone="danger" onClick={() => handleReviewTask('rejected')}>
            ✕ Tolak Tugas
          </Button>
          <Button tone="primary" onClick={() => handleReviewTask('approved')}>
            ✓ Setujui Tugas (*Approve*)
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL 5: PENYESUAIAN NILAI REALISASI LANGSUNG (ADMIN MANUAL SCORING) */}
      <Dialog
        isOpen={!!adjustingItem}
        onClose={() => setAdjustingItem(null)}
        width={460}
      >
        <DialogHeading
          title="Sesuaikan Nilai Realisasi Capaian"
          description="Ubah nilai capaian riil secara langsung. Skor terbobot dan predikat akhir karyawan akan dihitung ulang secara otomatis."
        />
        <form onSubmit={handleSaveManualActual} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-5 px-4 py-5 sm:px-5">
            {adjustingItem && (
              <div className="rounded-lg border border-line bg-surface-2/40 p-3 text-xs space-y-1">
                <div className="font-bold text-ink">{adjustingItem.title}</div>
                <div className="text-ink-3">
                  Target: {adjustingItem.targetValue} {adjustingItem.measurementUnit} • Bobot: {adjustingItem.weight}%
                </div>
              </div>
            )}

            <TextField
              label="Nilai Realisasi Baru"
              required
              type="number"
              step="any"
              value={manualActualValue}
              onChange={(e) => setManualActualValue(e.target.value)}
            />
          </DialogBody>

          <DialogFooter>
            <Button tone="neutral" onClick={() => setAdjustingItem(null)}>
              Batal
            </Button>
            <Button tone="primary" type="submit">
              Simpan & Hitung Ulang Skor
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* MODAL 6: PRATINJAU DOKUMEN / GAMBAR BUKTI S3 */}
      <Dialog
        isOpen={!!previewEvidenceUrl}
        onClose={() => setPreviewEvidenceUrl(null)}
        width={720}
      >
        <DialogHeading
          title="Pratinjau Berkas Bukti Tugas (S3)"
          description="Lampiran dokumen kerja yang disimpan pada Cloud Object Storage."
        />
        <DialogBody className="px-4 py-5 sm:px-5">
          {previewEvidenceUrl && (
            <div className="space-y-3">
              <div className="max-h-[60vh] flex items-center justify-center overflow-auto rounded-lg bg-surface-2 p-2">
                {previewEvidenceUrl.match(/\.(jpeg|jpg|png|webp|gif)$/i) ? (
                  <img
                    src={resolveLogoUrl(previewEvidenceUrl)}
                    alt="Bukti Kerja"
                    className="max-h-[55vh] rounded object-contain"
                  />
                ) : (
                  <div className="py-12 text-center text-xs text-ink-3 space-y-2">
                    <HiOutlineDocumentText className="mx-auto h-12 w-12 text-primary" />
                    <p className="font-medium text-ink">Dokumen Lampiran (Format Dokumen / PDF)</p>
                    <p className="text-2xs font-mono">{previewEvidenceUrl}</p>
                  </div>
                )}
              </div>
              <div className="text-right">
                <a
                  href={resolveLogoUrl(previewEvidenceUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <HiOutlineExternalLink className="h-4 w-4" />
                  Buka Berkas di Tab Baru (Tautan S3 Langsung)
                </a>
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button tone="neutral" onClick={() => setPreviewEvidenceUrl(null)}>
            Tutup Pratinjau
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL KONFIRMASI HAPUS INDIKATOR */}
      <ConfirmDialog
        isOpen={!!deletingItemId}
        title="Hapus Indikator Sasaran Divisi"
        confirmText="Hapus Indikator"
        cancelText="Batal"
        type="danger"
        onConfirm={handleDeleteItem}
        onCancel={() => setDeletingItemId(null)}
      >
        <p className="text-xs text-ink-2">
          Apakah Anda yakin ingin menghapus indikator sasaran ini? Tindakan ini akan menghapus butir penilaian terkait dari lembar evaluasi seluruh karyawan di divisi ini.
        </p>
      </ConfirmDialog>
    </div>
  )
}

