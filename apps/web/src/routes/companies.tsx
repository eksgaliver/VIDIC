import * as React from 'react'
import { createRoute } from '@tanstack/react-router'
import {
  HiOutlineGlobeAlt,
  HiOutlineLocationMarker,
  HiOutlineMail,
  HiOutlinePencil,
  HiOutlinePhone,
  HiOutlinePlus,
  HiOutlineRefresh,
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
  FormSection,
  ListSkeleton,
  Notice,
  PageHeader,
  Panel,
  PanelHeader,
  SelectField,
  StatusFromValue,
  TextAreaField,
  TextField,
} from '@/components/base'
import { errorText } from '@/utils/apiError'
import {
  coordinateText,
  departmentCount,
  locationCount,
  primaryLocation,
  timezoneLabel,
} from '@/utils/organization'
import type { Company, CompanyLocation } from '@/@types/organization'
import { COMPANIES_PATH } from '@/constants/route.constant'

export const companiesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: COMPANIES_PATH,
  component: CompaniesPage,
})

const TIMEZONES = [
  { value: 'Asia/Jakarta', label: 'WIB (Jakarta)' },
  { value: 'Asia/Makassar', label: 'WITA (Makassar)' },
  { value: 'Asia/Jayapura', label: 'WIT (Jayapura)' },
]

const COMPANY_STATUSES = [
  { value: 'active', label: 'Aktif' },
  { value: 'suspended', label: 'Ditangguhkan' },
  { value: 'inactive', label: 'Nonaktif' },
]

const INITIAL_COMPANY_FORM = {
  code: '',
  name: '',
  brandName: '',
  email: '',
  phone: '',
  industry: 'Teknologi Informasi',
  website: '',
  locationName: 'Kantor Pusat',
  locationAddress: '',
  locationCity: 'Jakarta Selatan',
  locationProvince: 'DKI Jakarta',
  locationPostalCode: '12190',
  locationLatitude: '-6.2250140',
  locationLongitude: '106.8097560',
  locationRadius: 100,
  locationTimezone: 'Asia/Jakarta',
}

const INITIAL_BRANCH_FORM = {
  name: '',
  address: '',
  city: '',
  province: '',
  postalCode: '',
  latitude: '-6.9174640',
  longitude: '107.6191230',
  radius: 100,
  timezone: 'Asia/Jakarta',
  isPrimary: false,
}

const INITIAL_EDIT_FORM = {
  name: '',
  brandName: '',
  email: '',
  phone: '',
  industry: '',
  website: '',
  status: 'active',
}

export function CompaniesPage() {
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  // Formulir pendaftaran perusahaan beserta lokasi primer wajib
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [form, setForm] = React.useState(INITIAL_COMPANY_FORM)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Formulir ubah profil
  const [editCompany, setEditCompany] = React.useState<Company | null>(null)
  const [editForm, setEditForm] = React.useState(INITIAL_EDIT_FORM)

  // Konfirmasi hapus perusahaan
  const [deleteCompany, setDeleteCompany] = React.useState<Company | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Manajemen titik lokasi cabang
  const [locationModalCompany, setLocationModalCompany] = React.useState<Company | null>(null)
  const [isAddBranchOpen, setIsAddBranchOpen] = React.useState(false)
  const [branch, setBranch] = React.useState(INITIAL_BRANCH_FORM)
  const [isSavingBranch, setIsSavingBranch] = React.useState(false)

  // Konfirmasi hapus titik lokasi
  const [deleteLocationItem, setDeleteLocationItem] = React.useState<CompanyLocation | null>(null)
  const [isDeletingLocation, setIsDeletingLocation] = React.useState(false)

  const patchForm = (key: keyof typeof INITIAL_COMPANY_FORM, value: string | number) =>
    setForm((current) => ({ ...current, [key]: value }))

  const patchBranch = (key: keyof typeof INITIAL_BRANCH_FORM, value: string | number | boolean) =>
    setBranch((current) => ({ ...current, [key]: value }))

  const fetchCompanies = React.useCallback(async () => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const res = await api.companies.get()
      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal memuat data perusahaan dari gateway.'))
        return
      }
      if (Array.isArray(res.data)) {
        setCompanies(res.data as unknown as Company[])
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

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await api.companies.post({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        brandName: form.brandName.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        industry: form.industry.trim() || undefined,
        website: form.website.trim() || undefined,
        locationName: form.locationName.trim(),
        locationAddress: form.locationAddress.trim(),
        locationCity: form.locationCity.trim(),
        locationProvince: form.locationProvince.trim() || undefined,
        locationPostalCode: form.locationPostalCode.trim() || undefined,
        locationLatitude: form.locationLatitude.trim(),
        locationLongitude: form.locationLongitude.trim(),
        locationRadiusMeters: Number(form.locationRadius),
        locationTimezone: form.locationTimezone,
      })

      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal mendaftarkan perusahaan.'))
        return
      }

      setSuccessMsg(
        `Perusahaan '${form.name}' berhasil didaftarkan beserta lokasi operasional primer dan departemen HR.`
      )
      setIsCreateOpen(false)
      // Identitas badan usaha dikosongkan, konfigurasi lokasi terakhir dipertahankan.
      setForm((current) => ({
        ...INITIAL_COMPANY_FORM,
        industry: current.industry,
        locationName: current.locationName,
        locationCity: current.locationCity,
        locationProvince: current.locationProvince,
        locationPostalCode: current.locationPostalCode,
        locationLatitude: current.locationLatitude,
        locationLongitude: current.locationLongitude,
        locationRadius: current.locationRadius,
        locationTimezone: current.locationTimezone,
      }))
      fetchCompanies()
    } catch {
      setErrorMsg('Terjadi kesalahan koneksi saat menyimpan perusahaan.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEdit = (company: Company) => {
    setErrorMsg(null)
    setEditCompany(company)
    setEditForm({
      name: company.name,
      brandName: company.brandName || '',
      email: company.email,
      phone: company.phone || '',
      industry: company.industry || '',
      website: company.website || '',
      status: company.status,
    })
  }

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editCompany) return

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await api.companies({ id: editCompany.id }).put({
        name: editForm.name.trim(),
        brandName: editForm.brandName.trim() || undefined,
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || undefined,
        industry: editForm.industry.trim() || undefined,
        website: editForm.website.trim() || undefined,
        status: editForm.status,
      })

      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal memperbarui data perusahaan.'))
        return
      }

      setSuccessMsg(`Data perusahaan '${editForm.name}' berhasil diperbarui.`)
      setEditCompany(null)
      fetchCompanies()
    } catch {
      setErrorMsg('Terjadi kesalahan saat menghubungi server.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDeleteCompany = async () => {
    if (!deleteCompany) return
    setIsDeleting(true)
    setErrorMsg(null)

    try {
      const res = await api.companies({ id: deleteCompany.id }).delete()
      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal menghapus perusahaan.'))
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

  const closeLocationModal = () => {
    setLocationModalCompany(null)
    setIsAddBranchOpen(false)
  }

  const handleAddBranchLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!locationModalCompany) return

    setIsSavingBranch(true)
    setErrorMsg(null)

    try {
      const res = await api.companies({ id: locationModalCompany.id }).locations.post({
        name: branch.name.trim(),
        address: branch.address.trim(),
        city: branch.city.trim(),
        province: branch.province.trim() || undefined,
        postalCode: branch.postalCode.trim() || undefined,
        latitude: branch.latitude.trim(),
        longitude: branch.longitude.trim(),
        radiusMeters: Number(branch.radius),
        timezone: branch.timezone,
        isPrimary: branch.isPrimary,
      })

      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal menambahkan titik lokasi operasional.'))
        return
      }

      setSuccessMsg(
        `Titik lokasi '${branch.name}' berhasil ditambahkan ke ${locationModalCompany.name}.`
      )
      setIsAddBranchOpen(false)
      setBranch((current) => ({
        ...INITIAL_BRANCH_FORM,
        latitude: current.latitude,
        longitude: current.longitude,
        radius: current.radius,
        timezone: current.timezone,
        province: current.province,
        postalCode: current.postalCode,
      }))
      await fetchCompanies()
      const refreshed = await api.companies({ id: locationModalCompany.id }).get()
      if (refreshed.data && 'data' in refreshed.data) {
        setLocationModalCompany(refreshed.data.data as unknown as Company)
      }
    } catch {
      setErrorMsg('Gagal menyimpan titik lokasi cabang.')
    } finally {
      setIsSavingBranch(false)
    }
  }

  const handleConfirmDeleteLocation = async () => {
    if (!deleteLocationItem || !locationModalCompany) return

    const locs = locationModalCompany.locations || []
    if (locs.length <= 1) {
      setErrorMsg(
        'Perusahaan wajib memiliki minimal 1 lokasi operasional primer. Lokasi ini tidak dapat dihapus.'
      )
      setDeleteLocationItem(null)
      return
    }

    setIsDeletingLocation(true)
    setErrorMsg(null)

    try {
      const res = await api.companies.locations({ locationId: deleteLocationItem.id }).delete()
      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal menghapus lokasi operasional.'))
        return
      }

      setSuccessMsg(`Titik lokasi '${deleteLocationItem.name}' berhasil dihapus.`)
      setDeleteLocationItem(null)
      await fetchCompanies()
      const refreshed = await api.companies({ id: locationModalCompany.id }).get()
      if (refreshed.data && 'data' in refreshed.data) {
        setLocationModalCompany(refreshed.data.data as unknown as Company)
      }
    } catch {
      setErrorMsg('Gagal menghapus data lokasi.')
    } finally {
      setIsDeletingLocation(false)
    }
  }

  const locationTotal = companies.reduce((sum, item) => sum + locationCount(item), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perusahaan & Lokasi Operasional"
        description="Kelola profil badan usaha dan titik geofence tempat karyawan melakukan absensi."
        actions={
          <>
            <Button
              tone="neutral"
              onClick={fetchCompanies}
              disabled={isLoading}
              icon={<HiOutlineRefresh className="h-4 w-4" />}
            >
              Muat ulang
            </Button>
            <Button
              tone="primary"
              onClick={() => {
                setErrorMsg(null)
                setSuccessMsg(null)
                setIsCreateOpen(true)
              }}
              icon={<HiOutlinePlus className="h-4 w-4" />}
            >
              Tambah Perusahaan
            </Button>
          </>
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

      <Panel>
        <PanelHeader
          title="Daftar badan usaha"
          description="Induk maupun afiliasi beserta titik lokasi dan departemennya."
          meta={
            isLoading
              ? undefined
              : `${companies.length} perusahaan · ${locationTotal} titik lokasi`
          }
        />

        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : companies.length === 0 ? (
          <EmptyState
            title="Belum ada perusahaan terdaftar"
            description="Daftarkan badan usaha pertama. Setiap pendaftaran otomatis membuka satu titik lokasi primer dan departemen HR."
            action={
              <Button
                tone="primary"
                onClick={() => setIsCreateOpen(true)}
                icon={<HiOutlinePlus className="h-4 w-4" />}
              >
                Tambah Perusahaan
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {companies.map((company) => {
              const locations = company.locations || []
              const home = primaryLocation(company)

              return (
                <li
                  key={company.id}
                  className="px-4 py-4 transition-colors hover:bg-surface-2 sm:px-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wide text-ink">
                          {company.code}
                        </span>
                        <h2 className="min-w-0 truncate text-[15px] font-bold tracking-tight text-ink">
                          {company.name}
                        </h2>
                        {company.brandName ? <Badge>{company.brandName}</Badge> : null}
                        <StatusFromValue value={company.status} />
                      </div>

                      <p className="text-[13px] text-ink-2">
                        {company.industry || 'Layanan umum'} · {locationCount(company)} titik lokasi ·{' '}
                        {departmentCount(company)} departemen
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-2">
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <HiOutlineMail className="h-4 w-4 shrink-0 text-ink-3" />
                          <span className="truncate font-mono text-[12px]">{company.email}</span>
                        </span>
                        {company.phone ? (
                          <span className="inline-flex items-center gap-1.5">
                            <HiOutlinePhone className="h-4 w-4 shrink-0 text-ink-3" />
                            <span className="tabular">{company.phone}</span>
                          </span>
                        ) : null}
                        {company.website ? (
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <HiOutlineGlobeAlt className="h-4 w-4 shrink-0 text-ink-3" />
                            <a
                              href={company.website}
                              target="_blank"
                              rel="noreferrer"
                              className="max-w-[220px] truncate text-primary hover:underline"
                            >
                              {company.website.replace(/^https?:\/\//, '')}
                            </a>
                          </span>
                        ) : null}
                      </div>

                      {home ? (
                        <p className="flex items-start gap-1.5 text-[13px] text-ink-2">
                          <HiOutlineLocationMarker className="mt-px h-4 w-4 shrink-0 text-primary" />
                          <span className="min-w-0">
                            <span className="font-semibold text-ink">{home.name}</span>
                            <span className="text-ink-3">
                              {' '}
                              — {home.city} · radius {home.radiusMeters} m ·{' '}
                              {timezoneLabel(home.timezone)}
                            </span>
                          </span>
                        </p>
                      ) : (
                        <p className="flex items-center gap-1.5 text-[13px] text-warning">
                          <HiOutlineLocationMarker className="h-4 w-4 shrink-0" />
                          Lokasi primer belum dikonfigurasi.
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setErrorMsg(null)
                          setLocationModalCompany(company)
                          setIsAddBranchOpen(false)
                        }}
                        icon={<HiOutlineLocationMarker className="h-4 w-4" />}
                      >
                        Kelola Lokasi
                        <span className="tabular rounded-md border border-line bg-surface px-1.5 text-[11px] font-bold">
                          {locations.length}
                        </span>
                      </Button>
                      <Button
                        size="iconSm"
                        tone="quiet"
                        onClick={() => openEdit(company)}
                        aria-label={`Ubah profil ${company.name}`}
                        title="Ubah profil perusahaan"
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
                          setDeleteCompany(company)
                        }}
                        aria-label={`Hapus ${company.name}`}
                        title="Hapus perusahaan"
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      {/* Pendaftaran perusahaan baru + lokasi primer wajib */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onRequestClose={() => setIsCreateOpen(false)}
        width={720}
      >
        <DialogHeading
          title="Tambah Perusahaan & Lokasi Primer"
          description="Isi profil badan usaha dan satu titik geofence kantor pusat. Departemen HR dibuat otomatis."
        />
        <form onSubmit={handleCreateCompany} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="px-4 py-5 sm:px-5">
            {errorMsg ? (
              <Notice
                tone="danger"
                title="Permintaan gagal"
                onDismiss={() => setErrorMsg(null)}
                className="mb-5"
              >
                {errorMsg}
              </Notice>
            ) : null}

            <div className="space-y-6">
              <FormSection title="Profil badan usaha">
                <div className="grid gap-3 sm:grid-cols-3">
                  <TextField
                    label="Kode perusahaan"
                    value={form.code}
                    onChange={(e) => patchForm('code', e.target.value.toUpperCase())}
                    placeholder="SRK"
                    required
                    maxLength={20}
                    mono
                    inputClassName="uppercase"
                  />
                  <TextField
                    label="Nama resmi"
                    value={form.name}
                    onChange={(e) => patchForm('name', e.target.value)}
                    placeholder="PT Srikaya Digital Solusindo"
                    required
                    className="sm:col-span-2"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    label="Nama merek"
                    value={form.brandName}
                    onChange={(e) => patchForm('brandName', e.target.value)}
                    placeholder="Srikaya Tech"
                  />
                  <TextField
                    label="Sektor industri"
                    value={form.industry}
                    onChange={(e) => patchForm('industry', e.target.value)}
                    placeholder="Teknologi Informasi"
                  />
                  <TextField
                    label="Surel korespondensi"
                    type="email"
                    value={form.email}
                    onChange={(e) => patchForm('email', e.target.value)}
                    placeholder="kontak@perusahaan.co.id"
                    required
                  />
                  <TextField
                    label="Telepon kantor"
                    value={form.phone}
                    onChange={(e) => patchForm('phone', e.target.value)}
                    placeholder="021-5000123"
                  />
                </div>

                <TextField
                  label="Situs web"
                  type="url"
                  value={form.website}
                  onChange={(e) => patchForm('website', e.target.value)}
                  placeholder="https://perusahaan.co.id"
                />
              </FormSection>

              <FormSection
                title="Titik lokasi operasional primer"
                description="Koordinat dan radius menentukan di mana karyawan sah melakukan absensi."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    label="Nama titik"
                    value={form.locationName}
                    onChange={(e) => patchForm('locationName', e.target.value)}
                    placeholder="Kantor Pusat Jakarta"
                    required
                  />
                  <TextField
                    label="Kota / kabupaten"
                    value={form.locationCity}
                    onChange={(e) => patchForm('locationCity', e.target.value)}
                    placeholder="Jakarta Selatan"
                    required
                  />
                  <TextField
                    label="Provinsi"
                    value={form.locationProvince}
                    onChange={(e) => patchForm('locationProvince', e.target.value)}
                    placeholder="DKI Jakarta"
                  />
                  <TextField
                    label="Kode pos"
                    value={form.locationPostalCode}
                    onChange={(e) => patchForm('locationPostalCode', e.target.value)}
                    placeholder="12190"
                    mono
                  />
                </div>

                <TextAreaField
                  label="Alamat fisik lengkap"
                  value={form.locationAddress}
                  onChange={(e) => patchForm('locationAddress', e.target.value)}
                  placeholder="Jalan, gedung, lantai"
                  rows={2}
                  required
                />

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <TextField
                    label="Lintang"
                    value={form.locationLatitude}
                    onChange={(e) => patchForm('locationLatitude', e.target.value)}
                    placeholder="-6.2088000"
                    required
                    mono
                  />
                  <TextField
                    label="Bujur"
                    value={form.locationLongitude}
                    onChange={(e) => patchForm('locationLongitude', e.target.value)}
                    placeholder="106.8456000"
                    required
                    mono
                  />
                  <TextField
                    label="Radius (meter)"
                    type="number"
                    value={form.locationRadius}
                    onChange={(e) => patchForm('locationRadius', Number(e.target.value))}
                    min={10}
                    max={5000}
                    hint="10–5000 meter"
                  />
                  <SelectField
                    label="Zona waktu"
                    value={form.locationTimezone}
                    onChange={(e) => patchForm('locationTimezone', e.target.value)}
                  >
                    {TIMEZONES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </FormSection>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" onClick={() => setIsCreateOpen(false)}>
              Batal
            </Button>
            <Button type="submit" tone="primary" loading={isSubmitting}>
              {isSubmitting ? 'Mendaftarkan...' : 'Daftarkan Perusahaan'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Ubah profil perusahaan */}
      <Dialog
        isOpen={!!editCompany}
        onClose={() => setEditCompany(null)}
        onRequestClose={() => setEditCompany(null)}
        width={560}
      >
        <DialogHeading
          title={`Ubah Profil ${editCompany?.code ?? ''}`}
          description="Perubahan berlaku pada profil badan usaha, bukan pada titik lokasinya."
        />
        <form onSubmit={handleUpdateCompany} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="px-4 py-5 sm:px-5">
            {errorMsg ? (
              <Notice
                tone="danger"
                title="Permintaan gagal"
                onDismiss={() => setErrorMsg(null)}
                className="mb-5"
              >
                {errorMsg}
              </Notice>
            ) : null}

            <div className="space-y-3">
              <TextField
                label="Nama resmi"
                value={editForm.name}
                onChange={(e) => setEditForm((c) => ({ ...c, name: e.target.value }))}
                required
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Nama merek"
                  value={editForm.brandName}
                  onChange={(e) => setEditForm((c) => ({ ...c, brandName: e.target.value }))}
                />
                <TextField
                  label="Sektor industri"
                  value={editForm.industry}
                  onChange={(e) => setEditForm((c) => ({ ...c, industry: e.target.value }))}
                />
                <TextField
                  label="Surel resmi"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((c) => ({ ...c, email: e.target.value }))}
                  required
                />
                <TextField
                  label="Telepon"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((c) => ({ ...c, phone: e.target.value }))}
                />
                <TextField
                  label="Situs web"
                  type="url"
                  value={editForm.website}
                  onChange={(e) => setEditForm((c) => ({ ...c, website: e.target.value }))}
                />
                <SelectField
                  label="Status badan usaha"
                  value={editForm.status}
                  onChange={(e) => setEditForm((c) => ({ ...c, status: e.target.value }))}
                  hint="Perusahaan nonaktif atau ditangguhkan tetap tersimpan beserta lokasinya."
                >
                  {COMPANY_STATUSES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" onClick={() => setEditCompany(null)}>
              Batal
            </Button>
            <Button type="submit" tone="primary" loading={isSubmitting}>
              {isSubmitting ? 'Memperbarui...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Manajemen titik lokasi */}
      <Dialog
        isOpen={!!locationModalCompany}
        onClose={closeLocationModal}
        onRequestClose={closeLocationModal}
        width={820}
      >
        <DialogHeading
          title={`Titik Lokasi — ${locationModalCompany?.name ?? ''}`}
          description="Batas geofence dan zona waktu tiap titik. Satu titik harus selalu bertahan sebagai lokasi primer."
          actions={
            <Button
              size="sm"
              tone={isAddBranchOpen ? 'neutral' : 'primary'}
              onClick={() => {
                setErrorMsg(null)
                setIsAddBranchOpen((open) => !open)
              }}
              icon={<HiOutlinePlus className="h-4 w-4" />}
            >
              {isAddBranchOpen ? 'Tutup Formulir' : 'Tambah Titik Cabang'}
            </Button>
          }
        />

        <DialogBody>
          {isAddBranchOpen ? (
            <form
              onSubmit={handleAddBranchLocation}
              className="border-b border-line px-4 py-5 sm:px-5"
            >
              <FormSection title="Titik lokasi cabang baru">
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    label="Nama cabang / unit kerja"
                    value={branch.name}
                    onChange={(e) => patchBranch('name', e.target.value)}
                    placeholder="Kantor Cabang Bandung"
                    required
                  />
                  <TextField
                    label="Kota / wilayah"
                    value={branch.city}
                    onChange={(e) => patchBranch('city', e.target.value)}
                    placeholder="Kota Bandung"
                    required
                  />
                </div>

                <TextField
                  label="Alamat fisik"
                  value={branch.address}
                  onChange={(e) => patchBranch('address', e.target.value)}
                  placeholder="Jl. Asia Afrika, Sumur Bandung"
                  required
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    label="Provinsi"
                    value={branch.province}
                    onChange={(e) => patchBranch('province', e.target.value)}
                    placeholder="Jawa Barat"
                  />
                  <TextField
                    label="Kode pos"
                    value={branch.postalCode}
                    onChange={(e) => patchBranch('postalCode', e.target.value)}
                    placeholder="40113"
                    mono
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <TextField
                    label="Lintang"
                    value={branch.latitude}
                    onChange={(e) => patchBranch('latitude', e.target.value)}
                    required
                    mono
                  />
                  <TextField
                    label="Bujur"
                    value={branch.longitude}
                    onChange={(e) => patchBranch('longitude', e.target.value)}
                    required
                    mono
                  />
                  <TextField
                    label="Radius (meter)"
                    type="number"
                    value={branch.radius}
                    onChange={(e) => patchBranch('radius', Number(e.target.value))}
                    min={10}
                    max={5000}
                  />
                  <SelectField
                    label="Zona waktu"
                    value={branch.timezone}
                    onChange={(e) => patchBranch('timezone', e.target.value)}
                  >
                    {TIMEZONES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </div>

                <CheckboxField
                  label="Jadikan lokasi primer"
                  hint="Absensi default karyawan menunjuk ke titik primer perusahaan."
                  checked={branch.isPrimary}
                  onChange={(e) => patchBranch('isPrimary', e.target.checked)}
                />

                {errorMsg ? (
                  <Notice tone="danger" title="Permintaan gagal">
                    {errorMsg}
                  </Notice>
                ) : null}

                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" onClick={() => setIsAddBranchOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit" size="sm" tone="primary" loading={isSavingBranch}>
                    {isSavingBranch ? 'Menyimpan titik...' : 'Simpan Titik Cabang'}
                  </Button>
                </div>
              </FormSection>
            </form>
          ) : null}

          <div className="overflow-x-auto px-4 py-2 sm:px-5">
            <table className="w-full min-w-[680px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-3">
                  <th className="py-2.5 pr-4 font-semibold">Nama titik</th>
                  <th className="py-2.5 pr-4 font-semibold">Alamat</th>
                  <th className="py-2.5 pr-4 font-semibold">Koordinat</th>
                  <th className="py-2.5 pr-4 font-semibold">Radius</th>
                  <th className="py-2.5 pr-4 font-semibold">Status</th>
                  <th className="py-2.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(locationModalCompany?.locations || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-ink-3">
                      Belum ada titik lokasi terdaftar.
                    </td>
                  </tr>
                ) : (
                  (locationModalCompany?.locations || []).map((loc) => {
                    const isLastLocation = (locationModalCompany?.locations || []).length <= 1
                    return (
                      <tr key={loc.id} className="transition-colors hover:bg-surface-2">
                        <td className="py-3 pr-4 align-top">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-ink">{loc.name}</span>
                            {loc.isPrimary ? <Badge tone="accent">Primer</Badge> : null}
                          </div>
                          <div className="mt-1 text-xs text-ink-3">{timezoneLabel(loc.timezone)}</div>
                        </td>
                        <td className="py-3 pr-4 align-top text-ink-2">
                          <div className="max-w-[220px]">{loc.address}</div>
                          <div className="text-xs text-ink-3">{loc.city}</div>
                        </td>
                        <td className="py-3 pr-4 align-top font-mono text-xs tabular text-ink-2">
                          {coordinateText(loc)}
                        </td>
                        <td className="py-3 pr-4 align-top tabular text-ink-2">
                          {loc.radiusMeters} m
                        </td>
                        <td className="py-3 pr-4 align-top">
                          <StatusFromValue value={loc.status} />
                        </td>
                        <td className="py-3 text-right align-top">
                          {isLastLocation ? (
                            <span
                              className="text-xs text-ink-3"
                              title="Minimal 1 lokasi wajib dipertahankan"
                            >
                              Lokasi wajib
                            </span>
                          ) : (
                            <Button
                              size="iconSm"
                              tone="quiet"
                              className="text-error hover:bg-error-subtle hover:text-error"
                              onClick={() => setDeleteLocationItem(loc)}
                              aria-label={`Hapus titik lokasi ${loc.name}`}
                              title="Hapus titik lokasi"
                            >
                              <HiOutlineTrash className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button onClick={closeLocationModal}>Tutup</Button>
        </DialogFooter>
      </Dialog>

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
        <p>
          Hapus <strong className="font-semibold text-ink">{deleteCompany?.name}</strong> (
          {deleteCompany?.code})? Seluruh departemen dan titik lokasi geofence ikut terhapus permanen,
          termasuk riwayat absensi yang tertaut.
        </p>
      </ConfirmDialog>

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
        <p>
          Hapus <strong className="font-semibold text-ink">{deleteLocationItem?.name}</strong>?
          Karyawan yang bertugas di titik ini tidak dapat lagi melakukan absensi pada koordinat
          tersebut.
        </p>
      </ConfirmDialog>
    </div>
  )
}
