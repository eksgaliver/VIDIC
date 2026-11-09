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
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineCheck,
  HiOutlineMap,
} from 'react-icons/hi'
import { authenticatedRoute } from './_authenticated'
import { api } from '@/lib/api'
import Dialog from '@/components/ui/Dialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { LeafletMapPicker } from '@/components/shared/LeafletMapPicker'
import {
  OperationalAreaSelector,
  type SelectedOperationalArea,
} from '@/components/shared/OperationalAreaSelector'
import { LogoUploader, resolveLogoUrl } from '@/components/shared/LogoUploader'
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
  operationalAreaCount,
  operationalProvinceCount,
  groupOperationalAreas,
  primaryLocation,
  timezoneLabel,
} from '@/utils/organization'
import { getTimezoneByProvince, type IndonesiaCity, type IndonesiaProvince } from 'shared-types'
import type { Company, CompanyLocation, CompanyOperationalArea } from '@/@types/organization'
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
  logoUrl: '',
  operationalAreas: [
    { province: 'DKI Jakarta', city: 'Jakarta Selatan' },
    { province: 'DKI Jakarta', city: 'Jakarta Pusat' },
  ] as SelectedOperationalArea[],
  locationName: 'Kantor Pusat Jakarta',
  locationAddress: 'Jl. Jenderal Sudirman Kav. 52-53, Senayan',
  locationCity: 'Jakarta Selatan',
  locationProvince: 'DKI Jakarta',
  locationPostalCode: '12190',
  locationLatitude: -6.225014,
  locationLongitude: 106.809756,
  locationRadius: 100,
  locationCoordinatesType: 'point' as 'point' | 'polygon',
  locationPolygon: [] as [number, number][],
  locationTimezone: 'Asia/Jakarta',
}

const INITIAL_BRANCH_FORM = {
  name: '',
  address: '',
  city: 'Kota Bandung',
  province: 'Jawa Barat',
  postalCode: '40115',
  latitude: -6.917464,
  longitude: 107.619123,
  radius: 100,
  coordinatesType: 'point' as 'point' | 'polygon',
  polygon: [] as [number, number][],
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
  logoUrl: '',
  status: 'active',
}

export function CompaniesPage() {
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  // Multi-step Wizard Pendaftaran Perusahaan (Step 1 -> 4)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [createStep, setCreateStep] = React.useState(1)
  const [form, setForm] = React.useState(INITIAL_COMPANY_FORM)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Formulir ubah profil
  const [editCompany, setEditCompany] = React.useState<Company | null>(null)
  const [editForm, setEditForm] = React.useState(INITIAL_EDIT_FORM)

  // Konfirmasi hapus perusahaan
  const [deleteCompany, setDeleteCompany] = React.useState<Company | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Manajemen wilayah & kota operasional perusahaan (modal mandiri)
  const [areaModalCompany, setAreaModalCompany] = React.useState<Company | null>(null)
  const [editingAreas, setEditingAreas] = React.useState<SelectedOperationalArea[]>([])
  const [isSavingAreas, setIsSavingAreas] = React.useState(false)

  // Manajemen titik lokasi cabang
  const [locationModalCompany, setLocationModalCompany] = React.useState<Company | null>(null)
  const [isAddBranchOpen, setIsAddBranchOpen] = React.useState(false)
  const [branch, setBranch] = React.useState(INITIAL_BRANCH_FORM)
  const [isSavingBranch, setIsSavingBranch] = React.useState(false)

  // Konfirmasi hapus titik lokasi
  const [deleteLocationItem, setDeleteLocationItem] = React.useState<CompanyLocation | null>(null)
  const [isDeletingLocation, setIsDeletingLocation] = React.useState(false)

  const patchForm = (key: keyof typeof INITIAL_COMPANY_FORM, value: any) =>
    setForm((current) => ({ ...current, [key]: value }))

  const patchBranch = (key: keyof typeof INITIAL_BRANCH_FORM, value: any) =>
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

  const handleNextStep = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setErrorMsg(null)

    if (createStep === 1) {
      if (!form.code.trim() || !form.name.trim() || !form.email.trim()) {
        setErrorMsg('Kode perusahaan, nama resmi, dan email wajib diisi sebelum melanjutkan.')
        return
      }
      setCreateStep(2)
      return
    }

    if (createStep === 2) {
      if (!form.operationalAreas || form.operationalAreas.length === 0) {
        setErrorMsg('Pilih minimal 1 provinsi dan 1 kota operasional di Indonesia.')
        return
      }
      setCreateStep(3)
      return
    }

    if (createStep === 3) {
      if (!form.locationName.trim() || !form.locationAddress.trim()) {
        setErrorMsg('Nama titik dan alamat fisik kantor primer wajib diisi.')
        return
      }
      setCreateStep(4)
      return
    }

    // Step 4: Submit final
    handleCreateCompanySubmit()
  }

  const handlePrevStep = () => {
    setErrorMsg(null)
    setCreateStep((prev) => Math.max(prev - 1, 1))
  }

  const handleCreateCompanySubmit = async () => {
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
        logoUrl: form.logoUrl.trim() || undefined,
        operationalAreas: form.operationalAreas,
        locationName: form.locationName.trim(),
        locationAddress: form.locationAddress.trim(),
        locationCity: form.locationCity.trim(),
        locationProvince: form.locationProvince.trim() || undefined,
        locationPostalCode: form.locationPostalCode.trim() || undefined,
        locationLatitude: String(form.locationLatitude),
        locationLongitude: String(form.locationLongitude),
        locationRadiusMeters: Number(form.locationRadius),
        locationCoordinatesType: form.locationCoordinatesType,
        locationPolygonCoordinates:
          form.locationCoordinatesType === 'polygon' && form.locationPolygon.length > 0
            ? form.locationPolygon
            : undefined,
        locationTimezone: form.locationTimezone,
      })

      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal mendaftarkan perusahaan.'))
        return
      }

      setSuccessMsg(
        `Perusahaan '${form.name}' berhasil didaftarkan beserta ${form.operationalAreas.length} kota operasional, lokasi primer, dan departemen HR.`
      )
      setIsCreateOpen(false)
      setCreateStep(1)
      setForm(INITIAL_COMPANY_FORM)
      fetchCompanies()
    } catch {
      setErrorMsg('Terjadi kesalahan koneksi saat menyimpan perusahaan.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handler simpan wilayah operasional modal mandiri
  const handleSaveOperationalAreas = async () => {
    if (!areaModalCompany) return
    setIsSavingAreas(true)
    setErrorMsg(null)
    try {
      const res = await api.companies({ id: areaModalCompany.id })['operational-areas'].put({
        areas: editingAreas
      })
      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal memperbarui wilayah operasional.'))
        return
      }
      setSuccessMsg(`Cakupan wilayah operasional '${areaModalCompany.name}' berhasil diperbarui (${editingAreas.length} kota).`)
      setAreaModalCompany(null)
      fetchCompanies()
    } catch {
      setErrorMsg('Gagal memperbarui wilayah operasional.')
    } finally {
      setIsSavingAreas(false)
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
      logoUrl: company.logoUrl || '',
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
        logoUrl: editForm.logoUrl || undefined,
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
        latitude: String(branch.latitude),
        longitude: String(branch.longitude),
        radiusMeters: Number(branch.radius),
        coordinatesType: branch.coordinatesType,
        polygonCoordinates:
          branch.coordinatesType === 'polygon' && branch.polygon.length > 0
            ? branch.polygon
            : undefined,
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
                  className="px-3.5 py-4 transition-colors hover:bg-surface-2 sm:px-5 2xl:px-7 2xl:py-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-3.5">
                      {/* Logo Badan Usaha WebP HD */}
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-control border border-line bg-surface p-1 shadow-xs">
                        {company.logoUrl ? (
                          <img
                            src={resolveLogoUrl(company.logoUrl)}
                            alt={company.name}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="font-mono text-xs font-bold text-ink-3">
                            {company.code.slice(0, 3)}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wide text-ink 2xl:text-xs">
                            {company.code}
                          </span>
                          <h2 className="min-w-0 truncate text-[15px] font-bold tracking-tight text-ink 2xl:text-base">
                            {company.name}
                          </h2>
                          {company.brandName ? <Badge>{company.brandName}</Badge> : null}
                          <StatusFromValue value={company.status} />
                        </div>

                      <p className="text-[13px] text-ink-2 2xl:text-sm">
                        {company.industry || 'Layanan umum'} · {locationCount(company)} titik lokasi ·{' '}
                        {departmentCount(company)} departemen
                        {operationalAreaCount(company) > 0 ? ` · ${operationalAreaCount(company)} kota operasional` : ''}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-2 2xl:text-sm">
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <HiOutlineMail className="h-4 w-4 shrink-0 text-ink-3" />
                          <span className="truncate font-mono text-[12px] 2xl:text-[13px]">{company.email}</span>
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
                              className="max-w-[220px] truncate text-primary hover:underline 2xl:max-w-[320px]"
                            >
                              {company.website.replace(/^https?:\/\//, '')}
                            </a>
                          </span>
                        ) : null}
                      </div>

                      {/* Cakupan Wilayah & Kota Operasional Perusahaan */}
                      {company.operationalAreas && company.operationalAreas.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-ink-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-3">
                            <HiOutlineMap className="h-3.5 w-3.5 text-primary" />
                            Cakupan Operasional:
                          </span>
                          {groupOperationalAreas(company.operationalAreas).map(([prov, cities]) => (
                            <span
                              key={prov}
                              className="inline-flex items-center gap-1 rounded bg-surface-2 px-2 py-0.5 text-[11px] text-ink border border-line"
                              title={`${prov}: ${cities.join(', ')}`}
                            >
                              <span className="font-semibold text-primary">{prov}</span>
                              <span className="text-ink-3">({cities.length} kota)</span>
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {home ? (
                        <p className="flex items-start gap-1.5 text-[13px] text-ink-2 2xl:text-sm">
                          <HiOutlineLocationMarker className="mt-px h-4 w-4 shrink-0 text-primary" />
                          <span className="min-w-0">
                            <span className="font-semibold text-ink">{home.name}</span>
                            <span className="text-ink-3">
                              {' '}
                              — {home.city} ·{' '}
                              {home.coordinatesType === 'polygon'
                                ? 'geofence poligon'
                                : `radius ${home.radiusMeters} m`}{' '}
                              · {timezoneLabel(home.timezone)}
                            </span>
                          </span>
                        </p>
                      ) : (
                        <p className="flex items-center gap-1.5 text-[13px] text-warning 2xl:text-sm">
                          <HiOutlineLocationMarker className="h-4 w-4 shrink-0" />
                          Lokasi primer belum dikonfigurasi.
                        </p>
                      )}
                    </div>
                  </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line/60 sm:border-0 sm:pt-0 sm:shrink-0 sm:justify-end">
                      <Button
                        size="sm"
                        tone="neutral"
                        onClick={() => {
                          setErrorMsg(null)
                          setAreaModalCompany(company)
                          setEditingAreas(
                            (company.operationalAreas || []).map((a) => ({
                              province: a.province,
                              city: a.city,
                            }))
                          )
                        }}
                        icon={<HiOutlineMap className="h-4 w-4 text-primary" />}
                        className="flex-1 sm:flex-initial"
                      >
                        Wilayah
                        <span className="tabular rounded-md border border-line bg-surface px-1.5 text-[11px] font-bold">
                          {operationalAreaCount(company)}
                        </span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setErrorMsg(null)
                          setLocationModalCompany(company)
                          setIsAddBranchOpen(false)
                        }}
                        icon={<HiOutlineLocationMarker className="h-4 w-4" />}
                        className="flex-1 sm:flex-initial"
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

      {/* Pendaftaran Perusahaan Baru — Multi-Step Wizard (4 Langkah) */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false)
          setCreateStep(1)
        }}
        onRequestClose={() => {
          setIsCreateOpen(false)
          setCreateStep(1)
        }}
        width={840}
      >
        <DialogHeading
          title="Pendaftaran Badan Usaha & Wilayah Operasional"
          description={`Langkah ${createStep} dari 4 · ${
            createStep === 1
              ? 'Profil & Identitas Badan Usaha'
              : createStep === 2
              ? 'Cakupan Wilayah & Kota Operasional Indonesia'
              : createStep === 3
              ? 'Titik Geofence & Peta Kantor Primer'
              : 'Rekapitulasi & Konfirmasi Pendaftaran'
          }`}
        />

        {/* Stepper Header Navigation */}
        <div className="border-b border-line bg-surface-2/60 px-4 py-2.5 sm:px-6">
          <div className="grid grid-cols-4 gap-2">
            {[
              { num: 1, label: 'Profil' },
              { num: 2, label: 'Wilayah' },
              { num: 3, label: 'Peta Geofence' },
              { num: 4, label: 'Konfirmasi' },
            ].map((s) => {
              const isPassed = createStep > s.num
              const isCurrent = createStep === s.num
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < createStep) setCreateStep(s.num)
                  }}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors ${
                    isCurrent
                      ? 'bg-surface font-bold text-primary shadow-sm border border-line'
                      : isPassed
                      ? 'text-ink-2 hover:bg-surface-2/80 cursor-pointer font-medium'
                      : 'text-ink-3/60 cursor-default'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-primary text-primary-on'
                        : isPassed
                        ? 'bg-success text-white'
                        : 'bg-line-strong/60 text-ink-3'
                    }`}
                  >
                    {isPassed ? '✓' : s.num}
                  </span>
                  <span className="truncate">{s.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <form onSubmit={handleNextStep} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="px-4 py-5 sm:px-6">
            {errorMsg ? (
              <Notice
                tone="danger"
                title="Perhatian"
                onDismiss={() => setErrorMsg(null)}
                className="mb-4"
              >
                {errorMsg}
              </Notice>
            ) : null}

            {/* LANGKAH 1: PROFIL & IDENTITAS BADAN USAHA */}
            {createStep === 1 && (
              <div className="space-y-4">
                <div className="rounded-control border border-line/80 bg-surface-2/40 p-3 text-xs text-ink-2">
                  Masukkan identitas resmi badan usaha atau perusahaan induk. Pastikan kode unik belum pernah didaftarkan sebelumnya.
                </div>

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
                    hint="Singkatan unik (2–20 karakter)"
                  />
                  <TextField
                    label="Nama resmi badan usaha"
                    value={form.name}
                    onChange={(e) => patchForm('name', e.target.value)}
                    placeholder="PT Srikaya Digital Solusindo"
                    required
                    className="sm:col-span-2"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    label="Nama merek / brand"
                    value={form.brandName}
                    onChange={(e) => patchForm('brandName', e.target.value)}
                    placeholder="Srikaya Tech"
                  />
                  <TextField
                    label="Sektor industri"
                    value={form.industry}
                    onChange={(e) => patchForm('industry', e.target.value)}
                    placeholder="Teknologi Informasi / Manufaktur / Logistik"
                  />
                  <TextField
                    label="Surel korespondensi resmi"
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
                    placeholder="021-5550123"
                  />
                </div>

                <TextField
                  label="Situs web resmi"
                  type="url"
                  value={form.website}
                  onChange={(e) => patchForm('website', e.target.value)}
                  placeholder="https://srikaya.id"
                />

                {/* Unggah Logo Resmi Badan Usaha */}
                <LogoUploader
                  value={form.logoUrl}
                  onChange={(url) => patchForm('logoUrl', url || '')}
                />
              </div>
            )}

            {/* LANGKAH 2: WILAYAH & KOTA OPERASIONAL DI INDONESIA */}
            {createStep === 2 && (
              <div className="space-y-4">
                <OperationalAreaSelector
                  value={form.operationalAreas}
                  onChange={(areas) => patchForm('operationalAreas', areas)}
                  onSelectPrimaryCity={(city, prov) => {
                    // Sinkronisasi otomatis ke konfigurasi kantor primer jika belum diubah
                    patchForm('locationCity', city.name)
                    patchForm('locationProvince', prov.name)
                    patchForm('locationLatitude', city.latitude)
                    patchForm('locationLongitude', city.longitude)
                    patchForm('locationTimezone', prov.timezone)
                  }}
                />
              </div>
            )}

            {/* LANGKAH 3: PETA GEOFENCE & TITIK KANTOR PRIMER */}
            {createStep === 3 && (
              <div className="space-y-4">
                <div className="rounded-control border border-line/80 bg-surface-2/40 p-3 text-xs text-ink-2">
                  Tentukan titik lokasi kantor pusat/primer. Lingkaran biru menandai batas radius toleransi absensi karyawan (geofence).
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    label="Nama titik kantor"
                    value={form.locationName}
                    onChange={(e) => patchForm('locationName', e.target.value)}
                    placeholder="Kantor Pusat Jakarta"
                    required
                  />
                  <TextField
                    label="Kota operasional primer"
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
                  label="Alamat fisik lengkap (otomatis terisi dari peta)"
                  value={form.locationAddress}
                  onChange={(e) => patchForm('locationAddress', e.target.value)}
                  placeholder="Gedung, jalan, lantai, nomor (otomatis terisi saat peta diklik)"
                  rows={2}
                  required
                />

                {/* Komponen Peta Interaktif Bergaya Google Maps (Point & Polygon Geofence) */}
                <div>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1 text-xs">
                    <span className="font-semibold text-ink">
                      Peta Interaktif Presisi Geofence (Gaya Google Maps)
                    </span>
                    <span className="text-[11px] text-ink-3">
                      Klik pada peta untuk mengisi alamat dan memosisikan titik secara otomatis
                    </span>
                  </div>
                  <LeafletMapPicker
                    latitude={Number(form.locationLatitude)}
                    longitude={Number(form.locationLongitude)}
                    radiusMeters={Number(form.locationRadius)}
                    polygon={form.locationPolygon}
                    mode={form.locationCoordinatesType}
                    cityName={form.locationCity}
                    provinceName={form.locationProvince}
                    onChange={({ latitude, longitude, radiusMeters, coordinatesType, polygonCoordinates }) => {
                      patchForm('locationLatitude', latitude)
                      patchForm('locationLongitude', longitude)
                      patchForm('locationRadius', radiusMeters)
                      patchForm('locationCoordinatesType', coordinatesType)
                      patchForm('locationPolygon', polygonCoordinates)
                    }}
                    onAddressSelect={(resolved) => {
                      if (resolved.fullAddress) {
                        patchForm('locationAddress', resolved.fullAddress)
                      }
                      if (resolved.city && (!form.locationCity || form.locationCity === 'Jakarta Selatan')) {
                        patchForm('locationCity', resolved.city)
                      }
                      if (resolved.province && (!form.locationProvince || form.locationProvince === 'DKI Jakarta')) {
                        patchForm('locationProvince', resolved.province)
                      }
                      if (resolved.postalCode) {
                        patchForm('locationPostalCode', resolved.postalCode)
                      }
                    }}
                    height={360}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField
                    label="Zona waktu operasional"
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
              </div>
            )}

            {/* LANGKAH 4: KONFIRMASI & REKAPITULASI DATA */}
            {createStep === 4 && (
              <div className="space-y-4">
                <div className="rounded-control border border-primary-line bg-primary-subtle p-3 text-xs text-primary">
                  Periksa ringkasan konfigurasi di bawah sebelum mendaftarkan entitas perusahaan ke dalam sistem klaster.
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Profil Entitas */}
                  <div className="rounded-control border border-line bg-surface p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold uppercase tracking-wide text-ink-3">
                        Profil Badan Usaha
                      </h5>
                      {form.logoUrl && (
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded border border-line bg-white p-0.5 shadow-xs">
                          <img
                            src={resolveLogoUrl(form.logoUrl)}
                            alt="Logo"
                            className="h-full w-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-ink rounded bg-surface-2 px-1 border border-line">
                          {form.code}
                        </span>
                        <span className="font-bold text-sm text-ink">{form.name}</span>
                      </div>
                      {form.brandName && (
                        <p className="text-xs text-ink-2 mt-0.5">Merek: {form.brandName}</p>
                      )}
                    </div>
                    <div className="text-xs text-ink-2 space-y-1 pt-1 border-t border-line/60">
                      <p>Surel: {form.email}</p>
                      {form.phone && <p>Telepon: {form.phone}</p>}
                      {form.industry && <p>Industri: {form.industry}</p>}
                      {form.website && <p>Situs: {form.website}</p>}
                    </div>
                  </div>

                  {/* Kantor Primer & Geofence */}
                  <div className="rounded-control border border-line bg-surface p-3.5 space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wide text-ink-3">
                      Titik Kantor Primer
                    </h5>
                    <div>
                      <p className="font-bold text-sm text-ink">{form.locationName}</p>
                      <p className="text-xs text-ink-2 mt-0.5">{form.locationAddress}</p>
                      <p className="text-xs text-ink-3">
                        {form.locationCity}, {form.locationProvince} {form.locationPostalCode}
                      </p>
                    </div>
                    <div className="text-xs text-ink-2 pt-1 border-t border-line/60 space-y-0.5">
                      <p>
                        Tipe Geofence:{' '}
                        <span className="font-bold text-primary">
                          {form.locationCoordinatesType === 'polygon'
                            ? `Perimeter Poligon (${form.locationPolygon.length} titik sudut)`
                            : `Titik Radius (${form.locationRadius} meter)`}
                        </span>
                      </p>
                      <p>
                        Koordinat Pusat: <span className="font-mono text-ink">{Number(form.locationLatitude).toFixed(6)}, {Number(form.locationLongitude).toFixed(6)}</span>
                      </p>
                      <p>
                        Zona Waktu: <span className="font-semibold text-ink">{timezoneLabel(form.locationTimezone)}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cakupan Wilayah Operasional */}
                <div className="rounded-control border border-line bg-surface p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wide text-ink-3">
                      Cakupan Wilayah Operasional ({form.operationalAreas.length} Kota Terdaftar)
                    </h5>
                    <button
                      type="button"
                      onClick={() => setCreateStep(2)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Ubah Wilayah
                    </button>
                  </div>
                  {form.operationalAreas.length === 0 ? (
                    <p className="text-xs text-warning">Belum ada wilayah operasional yang dipilih.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {form.operationalAreas.map((area, idx) => (
                        <span
                          key={`${area.province}-${area.city}-${idx}`}
                          className="rounded bg-surface-2 px-2 py-0.5 text-xs text-ink border border-line"
                        >
                          <span className="font-semibold text-primary">{area.province}</span>
                          <span className="text-ink-3"> — {area.city}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notifikasi Kepatuhan HR Wajib */}
                <div className="rounded-control border border-success-line bg-success-subtle/50 p-3 text-xs text-success flex items-start gap-2">
                  <HiOutlineCheck className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Kepatuhan Sistem:</strong> Departemen Human Resources (HR) akan otomatis dibuat dan dilindungi dari penghapusan sebagai standar pengelolaan kepegawaian.
                  </span>
                </div>
              </div>
            )}
          </DialogBody>

          <DialogFooter className="justify-between">
            {createStep > 1 ? (
              <Button type="button" onClick={handlePrevStep} icon={<HiOutlineArrowLeft className="h-4 w-4" />}>
                Sebelumnya
              </Button>
            ) : (
              <Button type="button" onClick={() => setIsCreateOpen(false)}>
                Batal
              </Button>
            )}

            {createStep < 4 ? (
              <Button type="button" tone="primary" onClick={handleNextStep}>
                Lanjutkan Langkah {createStep + 1}
                <HiOutlineArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button type="button" tone="primary" loading={isSubmitting} onClick={handleCreateCompanySubmit}>
                {isSubmitting ? 'Mendaftarkan...' : 'Daftarkan Perusahaan'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </Dialog>

      {/* Modal Manajemen Wilayah & Kota Operasional untuk Perusahaan yang Ada */}
      <Dialog
        isOpen={Boolean(areaModalCompany)}
        onClose={() => setAreaModalCompany(null)}
        onRequestClose={() => setAreaModalCompany(null)}
        width={760}
      >
        <DialogHeading
          title={`Wilayah & Kota Operasional — ${areaModalCompany?.name ?? ''}`}
          description="Sesuaikan provinsi dan kota operasional aktif untuk entitas perusahaan ini."
        />
        <DialogBody className="px-4 py-5 sm:px-6">
          <OperationalAreaSelector
            value={editingAreas}
            onChange={setEditingAreas}
          />
        </DialogBody>
        <DialogFooter>
          <Button type="button" onClick={() => setAreaModalCompany(null)}>
            Tutup
          </Button>
          <Button
            type="button"
            tone="primary"
            loading={isSavingAreas}
            onClick={handleSaveOperationalAreas}
          >
            {isSavingAreas ? 'Menyimpan Wilayah...' : 'Simpan Wilayah Operasional'}
          </Button>
        </DialogFooter>
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

              {/* Unggah / Ubah Logo Perusahaan */}
              <LogoUploader
                value={editForm.logoUrl}
                onChange={(url) => setEditForm((c) => ({ ...c, logoUrl: url || '' }))}
              />
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

                <div>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1 text-xs">
                    <span className="font-semibold text-ink">
                      Peta Interaktif Presisi Geofence (Gaya Google Maps)
                    </span>
                    <span className="text-[11px] text-ink-3">
                      Klik peta untuk otomatis mengisi alamat cabang
                    </span>
                  </div>
                  <LeafletMapPicker
                    latitude={Number(branch.latitude)}
                    longitude={Number(branch.longitude)}
                    radiusMeters={Number(branch.radius)}
                    polygon={branch.polygon}
                    mode={branch.coordinatesType}
                    cityName={branch.city}
                    provinceName={branch.province}
                    onChange={({ latitude, longitude, radiusMeters, coordinatesType, polygonCoordinates }) => {
                      patchBranch('latitude', latitude)
                      patchBranch('longitude', longitude)
                      patchBranch('radius', radiusMeters)
                      patchBranch('coordinatesType', coordinatesType)
                      patchBranch('polygon', polygonCoordinates)
                    }}
                    onAddressSelect={(resolved) => {
                      if (resolved.fullAddress) {
                        patchBranch('address', resolved.fullAddress)
                      }
                      if (resolved.city) {
                        patchBranch('city', resolved.city)
                      }
                      if (resolved.province) {
                        patchBranch('province', resolved.province)
                      }
                      if (resolved.postalCode) {
                        patchBranch('postalCode', resolved.postalCode)
                      }
                    }}
                    height={280}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <TextField
                    label="Lintang"
                    value={String(branch.latitude)}
                    onChange={(e) => patchBranch('latitude', e.target.value)}
                    required
                    mono
                  />
                  <TextField
                    label="Bujur"
                    value={String(branch.longitude)}
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
