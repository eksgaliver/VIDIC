import * as React from 'react'
import { createRoute } from '@tanstack/react-router'
import { authenticatedRoute } from './_authenticated'
import { api } from '@/lib/api'
import Alert from '@/components/ui/Alert'
import Dialog from '@/components/ui/Dialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import {
  HiOutlineOfficeBuilding,
  HiOutlineLocationMarker,
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineGlobeAlt,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineShieldCheck
} from 'react-icons/hi'
import { COMPANIES_PATH } from '@/constants/route.constant'

export const companiesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: COMPANIES_PATH,
  component: CompaniesPage
})

interface LocationItem {
  id: string
  companyId: string
  name: string
  address: string
  city: string
  province?: string | null
  postalCode?: string | null
  latitude: number | string
  longitude: number | string
  radiusMeters: number
  timezone: string
  isPrimary: boolean
  status: string
  createdAt?: string | Date
  updatedAt?: string | Date
}

interface DepartmentItem {
  id: string
  companyId: string
  code: string
  name: string
  isMandatory: boolean
}

interface CompanyItem {
  id: string
  code: string
  name: string
  brandName?: string | null
  email: string
  phone?: string | null
  industry?: string | null
  website?: string | null
  status: string
  locations?: LocationItem[]
  departments?: DepartmentItem[]
  createdAt?: string | Date
  updatedAt?: string | Date
}

export function CompaniesPage() {
  const [companies, setCompanies] = React.useState<CompanyItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  // 1. State Modal Tambah Perusahaan (Termasuk Lokasi Primer Wajib)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [code, setCode] = React.useState('')
  const [name, setName] = React.useState('')
  const [brandName, setBrandName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [industry, setIndustry] = React.useState('Teknologi Informasi')
  const [website, setWebsite] = React.useState('')
  // Data Lokasi Primer Wajib
  const [locName, setLocName] = React.useState('Kantor Pusat')
  const [locAddress, setLocAddress] = React.useState('')
  const [locCity, setLocCity] = React.useState('Jakarta Selatan')
  const [locProvince, setLocProvince] = React.useState('DKI Jakarta')
  const [locPostalCode, setLocPostalCode] = React.useState('12190')
  const [locLatitude, setLocLatitude] = React.useState('-6.2250140')
  const [locLongitude, setLocLongitude] = React.useState('106.8097560')
  const [locRadius, setLocRadius] = React.useState(100)
  const [locTimezone, setLocTimezone] = React.useState('Asia/Jakarta')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // 2. State Modal Ubah Profil Perusahaan
  const [editCompany, setEditCompany] = React.useState<CompanyItem | null>(null)
  const [editName, setEditName] = React.useState('')
  const [editBrandName, setEditBrandName] = React.useState('')
  const [editEmail, setEditEmail] = React.useState('')
  const [editPhone, setEditPhone] = React.useState('')
  const [editIndustry, setEditIndustry] = React.useState('')
  const [editWebsite, setEditWebsite] = React.useState('')
  const [editStatus, setEditStatus] = React.useState('active')

  // 3. State Dialog Hapus Perusahaan
  const [deleteCompany, setDeleteCompany] = React.useState<CompanyItem | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // 4. State Modal Manajemen Titik Lokasi Cabang
  const [locationModalCompany, setLocationModalCompany] = React.useState<CompanyItem | null>(null)
  const [isAddBranchOpen, setIsAddBranchOpen] = React.useState(false)
  const [branchName, setBranchName] = React.useState('')
  const [branchAddress, setBranchAddress] = React.useState('')
  const [branchCity, setBranchCity] = React.useState('')
  const [branchProvince, setBranchProvince] = React.useState('')
  const [branchPostalCode, setBranchPostalCode] = React.useState('')
  const [branchLatitude, setBranchLatitude] = React.useState('-6.9174640')
  const [branchLongitude, setBranchLongitude] = React.useState('107.6191230')
  const [branchRadius, setBranchRadius] = React.useState(100)
  const [branchTimezone, setBranchTimezone] = React.useState('Asia/Jakarta')
  const [branchIsPrimary, setBranchIsPrimary] = React.useState(false)
  const [isSavingBranch, setIsSavingBranch] = React.useState(false)

  // State Dialog Hapus Lokasi
  const [deleteLocationItem, setDeleteLocationItem] = React.useState<LocationItem | null>(null)
  const [isDeletingLocation, setIsDeletingLocation] = React.useState(false)

  // Ambil data perusahaan
  const fetchCompanies = React.useCallback(async () => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const res = await api.companies.get()
      if (res.data && Array.isArray(res.data)) {
        setCompanies(res.data as unknown as CompanyItem[])
      }
    } catch {
      setErrorMsg('Gagal memuat data perusahaan dari gateway.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  // Simpan Perusahaan Baru
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await api.companies.post({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        brandName: brandName.trim() || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        industry: industry.trim() || undefined,
        website: website.trim() || undefined,
        locationName: locName.trim(),
        locationAddress: locAddress.trim(),
        locationCity: locCity.trim(),
        locationProvince: locProvince.trim() || undefined,
        locationPostalCode: locPostalCode.trim() || undefined,
        locationLatitude: locLatitude.trim(),
        locationLongitude: locLongitude.trim(),
        locationRadiusMeters: Number(locRadius),
        locationTimezone: locTimezone
      })

      if (res.error) {
        const msg =
          typeof res.error.value === 'object' && res.error.value && 'message' in res.error.value
            ? String((res.error.value as { message?: string }).message)
            : 'Gagal mendaftarkan perusahaan.'
        setErrorMsg(msg)
        return
      }

      setSuccessMsg(`Perusahaan '${name}' berhasil didaftarkan beserta lokasi operasional primer dan departemen HR.`)
      setIsCreateOpen(false)
      // Reset formulir
      setCode('')
      setName('')
      setBrandName('')
      setEmail('')
      setPhone('')
      setLocAddress('')
      fetchCompanies()
    } catch {
      setErrorMsg('Terjadi kesalahan koneksi saat menyimpan perusahaan.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Simpan Perubahan Profil Perusahaan
  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editCompany) return

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await api.companies({ id: editCompany.id }).put({
        name: editName.trim(),
        brandName: editBrandName.trim() || undefined,
        email: editEmail.trim(),
        phone: editPhone.trim() || undefined,
        industry: editIndustry.trim() || undefined,
        website: editWebsite.trim() || undefined,
        status: editStatus
      })

      if (res.error) {
        const msg =
          typeof res.error.value === 'object' && res.error.value && 'message' in res.error.value
            ? String((res.error.value as { message?: string }).message)
            : 'Gagal memperbarui data perusahaan.'
        setErrorMsg(msg)
        return
      }

      setSuccessMsg(`Data perusahaan '${editName}' berhasil diperbarui.`)
      setEditCompany(null)
      fetchCompanies()
    } catch {
      setErrorMsg('Terjadi kesalahan saat menghubungi server.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Hapus Perusahaan
  const handleConfirmDeleteCompany = async () => {
    if (!deleteCompany) return
    setIsDeleting(true)
    setErrorMsg(null)

    try {
      const res = await api.companies({ id: deleteCompany.id }).delete()
      if (res.error) {
        const msg =
          typeof res.error.value === 'object' && res.error.value && 'message' in res.error.value
            ? String((res.error.value as { message?: string }).message)
            : 'Gagal menghapus perusahaan.'
        setErrorMsg(msg)
        return
      }

      setSuccessMsg(`Perusahaan '${deleteCompany.name}' berhasil dihapus.`)
      setDeleteCompany(null)
      fetchCompanies()
    } catch {
      setErrorMsg('Gagal menghapus data perusahaan.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Tambah Titik Lokasi Cabang Baru
  const handleAddBranchLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!locationModalCompany) return

    setIsSavingBranch(true)
    setErrorMsg(null)

    try {
      const res = await api.companies({ id: locationModalCompany.id }).locations.post({
        name: branchName.trim(),
        address: branchAddress.trim(),
        city: branchCity.trim(),
        province: branchProvince.trim() || undefined,
        postalCode: branchPostalCode.trim() || undefined,
        latitude: branchLatitude.trim(),
        longitude: branchLongitude.trim(),
        radiusMeters: Number(branchRadius),
        timezone: branchTimezone,
        isPrimary: branchIsPrimary
      })

      if (res.error) {
        const msg =
          typeof res.error.value === 'object' && res.error.value && 'message' in res.error.value
            ? String((res.error.value as { message?: string }).message)
            : 'Gagal menambahkan titik lokasi operasional.'
        setErrorMsg(msg)
        return
      }

      setSuccessMsg(`Titik lokasi '${branchName}' berhasil ditambahkan ke ${locationModalCompany.name}.`)
      setIsAddBranchOpen(false)
      setBranchName('')
      setBranchAddress('')
      setBranchCity('')
      setBranchProvince('')
      setBranchPostalCode('')
      // Segarkan daftar perusahaan
      await fetchCompanies()
      // Perbarui referensi modal perusahaan
      const refreshed = await api.companies({ id: locationModalCompany.id }).get()
      if (refreshed.data && 'data' in refreshed.data) {
        setLocationModalCompany(refreshed.data.data as unknown as CompanyItem)
      }
    } catch {
      setErrorMsg('Gagal menyimpan titik lokasi cabang.')
    } finally {
      setIsSavingBranch(false)
    }
  }

  // Hapus Lokasi Cabang
  const handleConfirmDeleteLocation = async () => {
    if (!deleteLocationItem || !locationModalCompany) return

    // Cek proteksi minimal 1 lokasi
    const locs = locationModalCompany.locations || []
    if (locs.length <= 1) {
      setErrorMsg('Perusahaan wajib memiliki minimal 1 lokasi operasional primer. Lokasi ini tidak dapat dihapus.')
      setDeleteLocationItem(null)
      return
    }

    setIsDeletingLocation(true)
    setErrorMsg(null)

    try {
      const res = await api.companies.locations({ locationId: deleteLocationItem.id }).delete()
      if (res.error) {
        const msg =
          typeof res.error.value === 'object' && res.error.value && 'message' in res.error.value
            ? String((res.error.value as { message?: string }).message)
            : 'Gagal menghapus lokasi operasional.'
        setErrorMsg(msg)
        return
      }

      setSuccessMsg(`Titik lokasi '${deleteLocationItem.name}' berhasil dihapus.`)
      setDeleteLocationItem(null)
      await fetchCompanies()
      // Perbarui tampilan modal lokasi
      const refreshed = await api.companies({ id: locationModalCompany.id }).get()
      if (refreshed.data && 'data' in refreshed.data) {
        setLocationModalCompany(refreshed.data.data as unknown as CompanyItem)
      }
    } catch {
      setErrorMsg('Gagal menghapus data lokasi.')
    } finally {
      setIsDeletingLocation(false)
    }
  }

  const totalLocations = companies.reduce((acc, c) => acc + (c.locations?.length || 0), 0)

  return (
    <div className="space-y-6">
      {/* 1. Header Halaman */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
            Manajemen Perusahaan &amp; Lokasi
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Kelola profil badan usaha dan titik geofence absensi operasional karyawan.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null)
            setIsCreateOpen(true)
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-primary-deep transition-colors cursor-pointer"
        >
          <HiOutlinePlus className="h-4 w-4" />
          <span>Tambah Perusahaan</span>
        </button>
      </div>

      {/* 2. Banner Umpan Balik */}
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

      {/* 3. Kartu Metrik Ringkasan */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
            <span>Perusahaan Terdaftar</span>
            <span className="text-primary font-bold">&bull; Profil Bisnis</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">
            {companies.length} Entitas
          </div>
          <p className="mt-1 text-[11px] text-neutral-400">
            Badan usaha induk &amp; afiliasi
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
            <span>Titik Lokasi Geofence</span>
            <span className="text-emerald-600 font-bold">&#x2713; Koordinat Aktif</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">
            {totalLocations} Titik Kantor
          </div>
          <p className="mt-1 text-[11px] text-neutral-400">
            Terkalibrasi GPS &amp; radius toleransi absensi
          </p>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary-subtle/30 p-5 dark:border-primary/30 dark:bg-primary-subtle/10 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <HiOutlineShieldCheck className="h-4 w-4" />
            <span>Kaidah Absensi Terpadu</span>
          </div>
          <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Setiap perusahaan memiliki minimal 1 lokasi operasional primer dan otomatis disertai departemen HR.
          </p>
        </div>
      </div>

      {/* 4. Daftar Kartu Perusahaan */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900">
            Memuat data perusahaan dan lokasi operasional...
          </div>
        ) : companies.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900">
            Belum ada perusahaan terdaftar. Klik tombol &quot;Tambah Perusahaan&quot; di atas untuk mendaftarkan badan usaha pertama.
          </div>
        ) : (
          companies.map((company) => {
            const locs = company.locations || []
            const primaryLoc = locs.find((l) => l.isPrimary) || locs[0]

            return (
              <div
                key={company.id}
                className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900 shadow-xs hover:border-primary/40 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  {/* Identitas Perusahaan */}
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm shrink-0">
                        {company.code}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white truncate">
                            {company.name}
                          </h2>
                          {company.brandName && (
                            <span className="rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs text-neutral-600 dark:text-neutral-300 font-medium">
                              {company.brandName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500">
                          <span className="font-mono text-[11px] text-primary font-semibold">
                            ID: {company.code}
                          </span>
                          <span>&middot;</span>
                          <span>{company.industry || 'Layanan Umum'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Kontak & Tautan */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500 pt-1">
                      <div className="flex items-center gap-1.5">
                        <HiOutlineMail className="h-4 w-4 text-neutral-400" />
                        <span className="font-mono">{company.email}</span>
                      </div>
                      {company.phone && (
                        <div className="flex items-center gap-1.5">
                          <HiOutlinePhone className="h-4 w-4 text-neutral-400" />
                          <span>{company.phone}</span>
                        </div>
                      )}
                      {company.website && (
                        <div className="flex items-center gap-1.5">
                          <HiOutlineGlobeAlt className="h-4 w-4 text-neutral-400" />
                          <a
                            href={company.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline truncate max-w-xs"
                          >
                            {company.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ringkasan Titik Lokasi Primer & Aksi */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 shrink-0">
                    {/* Kotak Lokasi Primer */}
                    {primaryLoc ? (
                      <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-xs dark:border-neutral-800 dark:bg-neutral-800/60 max-w-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-white">
                            <HiOutlineLocationMarker className="h-4 w-4 text-primary" />
                            <span>{primaryLoc.name}</span>
                          </div>
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            Primer
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-neutral-500 line-clamp-1">
                          {primaryLoc.address}, {primaryLoc.city}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 font-mono text-[10px] text-neutral-400">
                          <span>Radius: {primaryLoc.radiusMeters}m</span>
                          <span>&middot;</span>
                          <span>{primaryLoc.timezone}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-neutral-400">
                        Lokasi primer belum dikonfigurasi.
                      </div>
                    )}

                    {/* Tombol Aksi */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          setLocationModalCompany(company)
                          setIsAddBranchOpen(false)
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
                      >
                        <HiOutlineLocationMarker className="h-4 w-4 text-primary" />
                        <span>Kelola Titik Lokasi ({locs.length})</span>
                      </button>

                      <button
                        onClick={() => {
                          setEditCompany(company)
                          setEditName(company.name)
                          setEditBrandName(company.brandName || '')
                          setEditEmail(company.email)
                          setEditPhone(company.phone || '')
                          setEditIndustry(company.industry || '')
                          setEditWebsite(company.website || '')
                          setEditStatus(company.status)
                        }}
                        className="rounded-xl border border-neutral-200 bg-white p-2 text-neutral-700 shadow-2xs hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
                        title="Ubah Profil Perusahaan"
                      >
                        <HiOutlinePencil className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => setDeleteCompany(company)}
                        className="rounded-xl border border-neutral-200 bg-white p-2 text-red-600 shadow-2xs hover:bg-red-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
                        title="Hapus Perusahaan"
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 5. Modal Tambah Perusahaan Baru (Termasuk 1 Lokasi Operasional Primer Wajib) */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onRequestClose={() => setIsCreateOpen(false)}
        width={720}
      >
        <div className="p-6">
          <div className="pb-4 border-b border-neutral-200 dark:border-neutral-800">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Tambah Perusahaan &amp; Lokasi Operasional Primer
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Definisikan identitas profil badan usaha dan minimal 1 titik geofence kantor pusat.
            </p>
          </div>

          <form onSubmit={handleCreateCompany} className="mt-5 space-y-6">
            {/* Bagian A: Profil Badan Usaha */}
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <HiOutlineOfficeBuilding className="h-4 w-4" />
                <span>1. Profil Badan Usaha</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Kode Unik Perusahaan *
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: SRK"
                    required
                    maxLength={20}
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-mono uppercase text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Nama Resmi Perusahaan *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: PT Srikaya Digital Solusindo"
                    required
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Nama Brand / Panggilan
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Contoh: Srikaya Tech"
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Sektor Industri
                  </label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="Contoh: Teknologi Informasi"
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Surel Korespondensi Perusahaan *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="kontak@perusahaan.co.id"
                    required
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Nomor Telepon Kantor
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="021-xxxxxxx"
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Tautan Situs Web Resmi
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://perusahaan.co.id"
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>
            </div>

            {/* Bagian B: Lokasi Operasional Primer Wajib */}
            <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                  <HiOutlineLocationMarker className="h-4 w-4" />
                  <span>2. Titik Lokasi Operasional Primer (Wajib Minimal 1)</span>
                </div>
                <span className="text-[11px] font-mono text-neutral-400">
                  Geofence Absensi Online
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Nama Kantor / Titik Primer *
                  </label>
                  <input
                    type="text"
                    value={locName}
                    onChange={(e) => setLocName(e.target.value)}
                    placeholder="Contoh: Kantor Pusat Jakarta"
                    required
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Kota / Kabupaten *
                  </label>
                  <input
                    type="text"
                    value={locCity}
                    onChange={(e) => setLocCity(e.target.value)}
                    placeholder="Contoh: Jakarta Selatan"
                    required
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Alamat Fisik Lengkap *
                </label>
                <textarea
                  value={locAddress}
                  onChange={(e) => setLocAddress(e.target.value)}
                  placeholder="Jalan, gedung, nomor kavling..."
                  required
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Latitude (Lintang) *
                  </label>
                  <input
                    type="text"
                    value={locLatitude}
                    onChange={(e) => setLocLatitude(e.target.value)}
                    placeholder="-6.2088000"
                    required
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-mono text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Longitude (Bujur) *
                  </label>
                  <input
                    type="text"
                    value={locLongitude}
                    onChange={(e) => setLocLongitude(e.target.value)}
                    placeholder="106.8456000"
                    required
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-mono text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Radius Absensi (Meter)
                  </label>
                  <input
                    type="number"
                    value={locRadius}
                    onChange={(e) => setLocRadius(Number(e.target.value))}
                    min={10}
                    max={5000}
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Zona Waktu
                  </label>
                  <select
                    value={locTimezone}
                    onChange={(e) => setLocTimezone(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-xs text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  >
                    <option value="Asia/Jakarta">WIB (Jakarta)</option>
                    <option value="Asia/Makassar">WITA (Makassar)</option>
                    <option value="Asia/Jayapura">WIT (Jayapura)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tombol Aksi Simpan */}
            <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl border border-neutral-200 px-4 py-2.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-primary-deep cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Mendaftarkan...' : 'Daftarkan Perusahaan'}
              </button>
            </div>
          </form>
        </div>
      </Dialog>

      {/* 6. Modal Ubah Profil Perusahaan */}
      <Dialog
        isOpen={!!editCompany}
        onClose={() => setEditCompany(null)}
        onRequestClose={() => setEditCompany(null)}
        width={560}
      >
        <div className="p-6">
          <div className="pb-4 border-b border-neutral-200 dark:border-neutral-800">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Ubah Profil Perusahaan: {editCompany?.code}
            </h3>
          </div>

          <form onSubmit={handleUpdateCompany} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Nama Resmi Perusahaan
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-xs text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Nama Merk / Panggilan
                </label>
                <input
                  type="text"
                  value={editBrandName}
                  onChange={(e) => setEditBrandName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-xs text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Sektor Industri
                </label>
                <input
                  type="text"
                  value={editIndustry}
                  onChange={(e) => setEditIndustry(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-xs text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Surel Resmi
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-xs text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Nomor Telepon
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-xs text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Situs Web
              </label>
              <input
                type="url"
                value={editWebsite}
                onChange={(e) => setEditWebsite(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-xs text-neutral-900 focus:border-primary focus:bg-white focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setEditCompany(null)}
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

      {/* 7. Modal Kelola Titik Lokasi Operasional Cabang */}
      <Dialog
        isOpen={!!locationModalCompany}
        onClose={() => {
          setLocationModalCompany(null)
          setIsAddBranchOpen(false)
        }}
        onRequestClose={() => {
          setLocationModalCompany(null)
          setIsAddBranchOpen(false)
        }}
        width={800}
      >
        <div className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Titik Lokasi Operasional: {locationModalCompany?.name}
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Konfigurasi batas geofence dan zona waktu absensi cabang. Minimal 1 titik wajib aktif.
              </p>
            </div>
            <button
              onClick={() => setIsAddBranchOpen(!isAddBranchOpen)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-primary-deep cursor-pointer transition-colors"
            >
              <HiOutlinePlus className="h-4 w-4" />
              <span>{isAddBranchOpen ? 'Tutup Formulir' : 'Tambah Titik Cabang'}</span>
            </button>
          </div>

          {/* Formulir Tambah Titik Cabang Baru */}
          {isAddBranchOpen && (
            <form onSubmit={handleAddBranchLocation} className="my-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/40 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-primary">
                Formulir Titik Lokasi Cabang Baru
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Nama Cabang / Unit Kerja *
                  </label>
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="Contoh: Kantor Cabang Bandung"
                    required
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 focus:border-primary focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Kota / Wilayah *
                  </label>
                  <input
                    type="text"
                    value={branchCity}
                    onChange={(e) => setBranchCity(e.target.value)}
                    placeholder="Contoh: Kota Bandung"
                    required
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 focus:border-primary focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Alamat Fisik Cabang *
                </label>
                <input
                  type="text"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  placeholder="Jl. Asia Afrika No. ..."
                  required
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 focus:border-primary focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Latitude *
                  </label>
                  <input
                    type="text"
                    value={branchLatitude}
                    onChange={(e) => setBranchLatitude(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-mono text-neutral-900 focus:border-primary focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Longitude *
                  </label>
                  <input
                    type="text"
                    value={branchLongitude}
                    onChange={(e) => setBranchLongitude(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-mono text-neutral-900 focus:border-primary focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Radius (Meter)
                  </label>
                  <input
                    type="number"
                    value={branchRadius}
                    onChange={(e) => setBranchRadius(Number(e.target.value))}
                    min={10}
                    max={5000}
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 focus:border-primary focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Zona Waktu
                  </label>
                  <select
                    value={branchTimezone}
                    onChange={(e) => setBranchTimezone(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-2.5 py-2 text-xs text-neutral-900 focus:border-primary focus:outline-hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  >
                    <option value="Asia/Jakarta">WIB (Jakarta)</option>
                    <option value="Asia/Makassar">WITA (Makassar)</option>
                    <option value="Asia/Jayapura">WIT (Jayapura)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSavingBranch}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-deep cursor-pointer disabled:opacity-50"
                >
                  {isSavingBranch ? 'Menyimpan Titik...' : 'Simpan Titik Cabang'}
                </button>
              </div>
            </form>
          )}

          {/* Tabel Titik Lokasi */}
          <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Nama Titik</th>
                  <th className="py-2.5 px-4 font-semibold">Alamat &amp; Kota</th>
                  <th className="py-2.5 px-4 font-semibold">Koordinat GPS</th>
                  <th className="py-2.5 px-4 font-semibold">Radius &amp; Zona</th>
                  <th className="py-2.5 px-4 font-semibold">Status Titik</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {(locationModalCompany?.locations || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-neutral-400">
                      Tidak ada titik lokasi terdaftar.
                    </td>
                  </tr>
                ) : (
                  (locationModalCompany?.locations || []).map((loc) => {
                    const locsCount = (locationModalCompany?.locations || []).length
                    return (
                      <tr key={loc.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                        <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{loc.name}</span>
                            {loc.isPrimary && (
                              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                Primer
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300">
                          <div>{loc.address}</div>
                          <div className="text-[11px] text-neutral-400">{loc.city}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-neutral-500">
                          {loc.latitude}, {loc.longitude}
                        </td>
                        <td className="py-3 px-4 text-neutral-500">
                          <div>{loc.radiusMeters} Meter</div>
                          <div className="text-[11px] font-mono text-neutral-400">{loc.timezone}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                            <span>&bull;</span> Aktif
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {locsCount <= 1 ? (
                            <span
                              className="text-[11px] text-neutral-400 font-mono"
                              title="Minimal 1 lokasi wajib dipertahankan"
                            >
                              Lokasi Wajib
                            </span>
                          ) : (
                            <button
                              onClick={() => setDeleteLocationItem(loc)}
                              className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
                              title="Hapus Titik Lokasi"
                            >
                              <HiOutlineTrash className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-4 border-t border-neutral-100 dark:border-neutral-800 mt-4">
            <button
              onClick={() => {
                setLocationModalCompany(null)
                setIsAddBranchOpen(false)
              }}
              className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </Dialog>

      {/* 8. Dialog Konfirmasi Hapus Perusahaan */}
      <ConfirmDialog
        isOpen={!!deleteCompany}
        type="danger"
        title="Hapus Perusahaan"
        confirmText={isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
        cancelText="Batal"
        onClose={() => setDeleteCompany(null)}
        onCancel={() => setDeleteCompany(null)}
        onConfirm={handleConfirmDeleteCompany}
      >
        <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
          Apakah Anda yakin ingin menghapus perusahaan <strong>{deleteCompany?.name} ({deleteCompany?.code})</strong>? Seluruh data departemen dan titik lokasi geofence terkait akan ikut terhapus secara permanen.
        </p>
      </ConfirmDialog>

      {/* 9. Dialog Konfirmasi Hapus Titik Lokasi */}
      <ConfirmDialog
        isOpen={!!deleteLocationItem}
        type="danger"
        title="Hapus Titik Lokasi Operasional"
        confirmText={isDeletingLocation ? 'Menghapus...' : 'Ya, Hapus'}
        cancelText="Batal"
        onClose={() => setDeleteLocationItem(null)}
        onCancel={() => setDeleteLocationItem(null)}
        onConfirm={handleConfirmDeleteLocation}
      >
        <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
          Apakah Anda yakin ingin menghapus titik lokasi <strong>{deleteLocationItem?.name}</strong>? Karyawan yang terdaftar pada titik ini tidak akan dapat melakukan absensi pada koordinat tersebut.
        </p>
      </ConfirmDialog>
    </div>
  )
}
