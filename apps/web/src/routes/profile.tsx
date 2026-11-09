import * as React from 'react'
import { createRoute, useNavigate } from '@tanstack/react-router'
import {
  HiOutlineBadgeCheck,
  HiOutlineIdentification,
  HiOutlineLogout,
  HiOutlineShieldCheck,
  HiOutlineUserCircle,
  HiOutlineDocumentText,
  HiOutlineMail,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineInbox,
  HiOutlineClock
} from 'react-icons/hi'
import type { UserDTO } from 'shared-types'
import { authenticatedRoute } from './_authenticated'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import {
  Badge,
  Button,
  DialogBody,
  DialogFooter,
  DialogHeading,
  Notice,
  PageHeader,
  Panel,
  PanelHeader,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/base'
import Dialog from '@/components/ui/Dialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { AvatarUploader } from '@/components/shared/AvatarUploader'
import { resolveLogoUrl } from '@/components/shared/LogoUploader'
import { errorText } from '@/utils/apiError'
import { LOGIN_PATH, PROFILE_PATH } from '@/constants/route.constant'
import type { Biodata, Mail } from '@/@types/organization'

export const profileRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: PROFILE_PATH,
  component: ProfilePage,
})

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  member: 'Anggota',
  guest: 'Tamu',
}

function roleLabel(role?: string) {
  return ROLE_LABEL[role ?? ''] ?? 'Anggota'
}

function formatDate(value?: string | Date) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatDateTime(value?: string | Date) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function initials(name?: string) {
  return (
    (name ?? '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'OP'
  )
}

const GENDER_OPTIONS = [
  { value: 'male', label: 'Laki-laki' },
  { value: 'female', label: 'Perempuan' },
]

const RELIGION_OPTIONS = [
  { value: 'Islam', label: 'Islam' },
  { value: 'Kristen', label: 'Kristen Protestan' },
  { value: 'Katolik', label: 'Katolik' },
  { value: 'Hindu', label: 'Hindu' },
  { value: 'Buddha', label: 'Buddha' },
  { value: 'Khonghucu', label: 'Khonghucu' },
]

const BLOOD_TYPE_OPTIONS = [
  { value: 'A', label: 'Golongan Darah A' },
  { value: 'B', label: 'Golongan Darah B' },
  { value: 'AB', label: 'Golongan Darah AB' },
  { value: 'O', label: 'Golongan Darah O' },
]

const MARITAL_OPTIONS = [
  { value: 'single', label: 'Belum Menikah (Lajang)' },
  { value: 'married', label: 'Menikah' },
  { value: 'divorced', label: 'Cerai' },
]

const EDUCATION_OPTIONS = [
  { value: 'SMA/SMK', label: 'SMA / SMK Sederajat' },
  { value: 'D3', label: 'Diploma 3 (D3)' },
  { value: 'D4/S1', label: 'Sarjana / Diploma 4 (S1/D4)' },
  { value: 'S2', label: 'Magister (S2)' },
  { value: 'S3', label: 'Doktor (S3)' },
]

const BANK_OPTIONS = [
  { value: 'BCA', label: 'Bank Central Asia (BCA)' },
  { value: 'Mandiri', label: 'Bank Mandiri' },
  { value: 'BRI', label: 'Bank Rakyat Indonesia (BRI)' },
  { value: 'BNI', label: 'Bank Negara Indonesia (BNI)' },
  { value: 'BSI', label: 'Bank Syariah Indonesia (BSI)' },
  { value: 'CIMB', label: 'CIMB Niaga' },
]

const INITIAL_BIODATA_FORM: Partial<Biodata> = {
  nik: '',
  kkNumber: '',
  npwp: '',
  bpjsKetenagakerjaan: '',
  bpjsKesehatan: '',
  gender: 'male',
  placeOfBirth: '',
  dateOfBirth: '',
  religion: 'Islam',
  bloodType: 'O',
  maritalStatus: 'single',
  phone: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelation: '',
  addressKtp: '',
  addressCurrent: '',
  postalCode: '',
  city: '',
  province: '',
  lastEducation: 'D4/S1',
  major: '',
  institution: '',
  bankName: 'BCA',
  bankAccountNumber: '',
  bankAccountHolder: '',
}

export function ProfilePage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const logout = useAuthStore((state) => state.logout)

  const [activeTab, setActiveTab] = React.useState<'biodata' | 'account' | 'mail'>('biodata')

  // Identitas Akun
  const [name, setName] = React.useState(user?.name ?? '')
  const [email, setEmail] = React.useState(user?.email ?? '')
  const [isRefreshing, setIsRefreshing] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)
  const [isLogoutOpen, setIsLogoutOpen] = React.useState(false)

  // Biodata Karyawan
  const [biodata, setBiodata] = React.useState<Biodata | null>(null)
  const [biodataForm, setBiodataForm] = React.useState<Partial<Biodata>>(INITIAL_BIODATA_FORM)
  const [isLoadingBiodata, setIsLoadingBiodata] = React.useState(false)
  const [isSavingBiodata, setIsSavingBiodata] = React.useState(false)
  const [biodataSuccessMsg, setBiodataSuccessMsg] = React.useState<string | null>(null)
  const [biodataErrorMsg, setBiodataErrorMsg] = React.useState<string | null>(null)

  // Surat / Mail Internal
  const [mails, setMails] = React.useState<Mail[]>([])
  const [activeMail, setActiveMail] = React.useState<Mail | null>(null)
  const [isMailOpen, setIsMailOpen] = React.useState(false)

  const patchBiodata = (patch: Partial<Biodata>) => {
    setBiodataForm((prev) => ({ ...prev, ...patch }))
  }

  // Verifikasi Sesi
  React.useEffect(() => {
    let active = true

    const verifySession = async () => {
      try {
        const res = await api.auth.me.get()

        if (!active) return

        if (res.error) {
          if (res.error.status === 401) {
            logout()
            navigate({ to: LOGIN_PATH, replace: true })
            return
          }
          setErrorMsg(errorText(res, 'Sesi tidak dapat diverifikasi saat ini.'))
          return
        }

        const data = res.data
        if (!data || !('user' in data) || !data.user) return

        const next: UserDTO = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role as UserDTO['role'],
          avatarUrl: data.user.avatarUrl ?? null,
          createdAt: data.user.createdAt,
        }

        updateUser(next)
        setName(next.name)
        setEmail(next.email)
      } catch {
        if (active) {
          setErrorMsg('Gateway API tidak terjangkau. Data profil memakai sesi tersimpan.')
        }
      } finally {
        if (active) setIsRefreshing(false)
      }
    }

    verifySession()

    return () => {
      active = false
    }
  }, [logout, navigate, updateUser])

  // Ambil Biodata & Mail
  const fetchBiodataAndMails = React.useCallback(async () => {
    setIsLoadingBiodata(true)
    try {
      const [biodataRes, mailRes] = await Promise.all([
        (api.auth as any).biodata.get(),
        (api.auth as any).mail.get(),
      ])

      if (biodataRes.data?.success && biodataRes.data.data) {
        const b = biodataRes.data.data
        setBiodata(b)
        setBiodataForm({
          nik: b.nik || '',
          kkNumber: b.kkNumber || '',
          npwp: b.npwp || '',
          bpjsKetenagakerjaan: b.bpjsKetenagakerjaan || '',
          bpjsKesehatan: b.bpjsKesehatan || '',
          gender: b.gender || 'male',
          placeOfBirth: b.placeOfBirth || '',
          dateOfBirth: b.dateOfBirth || '',
          religion: b.religion || 'Islam',
          bloodType: b.bloodType || 'O',
          maritalStatus: b.maritalStatus || 'single',
          phone: b.phone || '',
          emergencyContactName: b.emergencyContactName || '',
          emergencyContactPhone: b.emergencyContactPhone || '',
          emergencyContactRelation: b.emergencyContactRelation || '',
          addressKtp: b.addressKtp || '',
          addressCurrent: b.addressCurrent || '',
          postalCode: b.postalCode || '',
          city: b.city || '',
          province: b.province || '',
          lastEducation: b.lastEducation || 'D4/S1',
          major: b.major || '',
          institution: b.institution || '',
          bankName: b.bankName || 'BCA',
          bankAccountNumber: b.bankAccountNumber || '',
          bankAccountHolder: b.bankAccountHolder || '',
        })
      }

      if (mailRes.data?.success && Array.isArray(mailRes.data.data)) {
        setMails(mailRes.data.data)
      }
    } catch {
      // Abaikan jika jaringan gagal
    } finally {
      setIsLoadingBiodata(false)
    }
  }, [])

  React.useEffect(() => {
    fetchBiodataAndMails()
  }, [fetchBiodataAndMails])

  const handleReset = () => {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    const cleanName = name.trim()
    const cleanEmail = email.trim()

    if (cleanName.length < 2) {
      setErrorMsg('Nama minimal 2 karakter.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Format alamat surel tidak valid.')
      return
    }

    setIsSaving(true)

    try {
      const res = await api.auth.profile.put({ name: cleanName, email: cleanEmail })

      if (res.error) {
        setErrorMsg(errorText(res, 'Profil gagal disimpan.'))
        return
      }

      const data = res.data
      if (!data || !('user' in data) || !data.user) {
        setErrorMsg('Server tidak mengirim data profil yang sah.')
        return
      }

      const next: UserDTO = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role as UserDTO['role'],
        avatarUrl: data.user.avatarUrl ?? null,
        createdAt: data.user.createdAt,
      }

      updateUser(next)
      setName(next.name)
      setEmail(next.email)
      setSuccessMsg(
        'message' in data && data.message
          ? String(data.message)
          : 'Profil berhasil diperbarui.'
      )
    } catch {
      setErrorMsg('Gateway API tidak terjangkau. Perubahan belum tersimpan.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveBiodata = async (event: React.FormEvent) => {
    event.preventDefault()
    setBiodataErrorMsg(null)
    setBiodataSuccessMsg(null)

    if (biodataForm.nik && biodataForm.nik.trim().length !== 16) {
      setBiodataErrorMsg('NIK (Nomor Induk Kependudukan) harus 16 digit angka.')
      return
    }

    setIsSavingBiodata(true)

    try {
      const res = await (api.auth as any).biodata.put(biodataForm)
      if (res.data?.success && res.data.data) {
        setBiodata(res.data.data)
        setBiodataSuccessMsg('Biodata karyawan berhasil disimpan dan diverifikasi lengkap.')
      } else {
        setBiodataErrorMsg(res.data?.message || 'Gagal menyimpan biodata.')
      }
    } catch {
      setBiodataErrorMsg('Terjadi kesalahan koneksi saat menyimpan biodata ke peladen.')
    } finally {
      setIsSavingBiodata(false)
    }
  }

  const handleOpenMail = async (m: Mail) => {
    setActiveMail(m)
    setIsMailOpen(true)
    if (!m.isRead) {
      try {
        await (api.auth as any).mail({ id: m.id }).read.patch()
        setMails((prev) =>
          prev.map((item) => (item.id === m.id ? { ...item, isRead: true } : item))
        )
      } catch {
        // Abaikan
      }
    }
  }

  const handleLogout = () => {
    setIsLogoutOpen(false)
    logout()
    navigate({ to: LOGIN_PATH, replace: true })
  }

  const unreadMailCount = mails.filter((m) => !m.isRead).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil & Kepegawaian"
        description="Identitas akun, kelengkapan biodata karyawan setelah login, dan korespondensi surat internal."
        actions={<Badge tone="accent">{roleLabel(user?.role)}</Badge>}
      />

      {errorMsg && (
        <Notice tone="danger" title="Tidak dapat memperbarui profil" onDismiss={() => setErrorMsg(null)}>
          {errorMsg}
        </Notice>
      )}

      {successMsg && (
        <Notice tone="success" title="Profil tersimpan" onDismiss={() => setSuccessMsg(null)}>
          {successMsg}
        </Notice>
      )}

      {/* Tab Navigasi Profil & Biodata */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('biodata')}
          className={`inline-flex items-center gap-2 rounded-control px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'biodata'
              ? 'bg-primary text-primary-on shadow-xs'
              : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
          }`}
        >
          <HiOutlineDocumentText className="h-4 w-4" />
          <span>Biodata Karyawan</span>
          {biodata?.isCompleted ? (
            <span className="rounded bg-success/20 px-1.5 py-0.5 text-[10px] text-success">
              Lengkap ✓
            </span>
          ) : (
            <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[10px] text-warning">
              Belum Lengkap ○
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('account')}
          className={`inline-flex items-center gap-2 rounded-control px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'account'
              ? 'bg-primary text-primary-on shadow-xs'
              : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
          }`}
        >
          <HiOutlineUserCircle className="h-4 w-4" />
          <span>Identitas Akun</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mail')}
          className={`inline-flex items-center gap-2 rounded-control px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'mail'
              ? 'bg-primary text-primary-on shadow-xs'
              : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
          }`}
        >
          <HiOutlineMail className="h-4 w-4" />
          <span>Kotak Surat (Mail)</span>
          {mails.length > 0 && (
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${unreadMailCount > 0 ? 'bg-primary text-primary-on' : 'bg-surface-3 text-ink-2'}`}>
              {mails.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: BIODATA KARYAWAN (DIISI NANTI SETELAH LOGIN) */}
      {activeTab === 'biodata' && (
        <div className="space-y-5">
          {biodata?.isCompleted ? (
            <div className="rounded-control border border-success/30 bg-success/10 p-4 text-xs text-success flex items-start gap-3">
              <HiOutlineCheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Biodata Karyawan Telah Lengkap & Terverifikasi</p>
                <p className="mt-0.5 text-ink-2">
                  Data administrasi kepegawaian, nomor identitas kependudukan (NIK), BPJS, dan rekening penggajian Anda telah terverifikasi sejak {formatDateTime(biodata.completedAt || biodata.updatedAt)}. Anda tetap dapat memperbarui informasi jika terdapat perubahan data kependudukan.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-control border border-warning/30 bg-warning/10 p-4 text-xs text-warning flex items-start gap-3">
              <HiOutlineExclamationCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Mohon Lengkapi Biodata Kepegawaian Anda</p>
                <p className="mt-0.5 text-ink-2">
                  Sebagai karyawan terdaftar, mohon isi formulir biodata di bawah ini setelah berhasil masuk (login). Data ini dibutuhkan untuk pencatatan administrasi HR, pendaftaran BPJS Ketenagakerjaan & Kesehatan, serta penggajian.
                </p>
              </div>
            </div>
          )}

          {biodataSuccessMsg && (
            <Notice tone="success" title="Biodata Tersimpan" onDismiss={() => setBiodataSuccessMsg(null)}>
              {biodataSuccessMsg}
            </Notice>
          )}

          {biodataErrorMsg && (
            <Notice tone="danger" title="Peringatan Validasi" onDismiss={() => setBiodataErrorMsg(null)}>
              {biodataErrorMsg}
            </Notice>
          )}

          <form onSubmit={handleSaveBiodata} className="space-y-6">
            {/* Bagian 1: Identitas Kependudukan & Pajak */}
            <Panel>
              <PanelHeader
                title="1. Identitas Kependudukan & Jaminan Sosial"
                description="Nomor Induk Kependudukan, NPWP, dan nomor kepesertaan BPJS resmi."
              />
              <div className="space-y-4 p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <TextField
                    label="NIK (Nomor Induk Kependudukan)"
                    value={biodataForm.nik || ''}
                    onChange={(e) => patchBiodata({ nik: e.target.value.replace(/\D/g, '').slice(0, 16) })}
                    placeholder="16 digit sesuai KTP"
                    required
                    hint="16 digit angka"
                  />
                  <TextField
                    label="Nomor Kartu Keluarga (KK)"
                    value={biodataForm.kkNumber || ''}
                    onChange={(e) => patchBiodata({ kkNumber: e.target.value.replace(/\D/g, '').slice(0, 16) })}
                    placeholder="16 digit sesuai KK"
                  />
                  <TextField
                    label="NPWP (Nomor Pokok Wajib Pajak)"
                    value={biodataForm.npwp || ''}
                    onChange={(e) => patchBiodata({ npwp: e.target.value })}
                    placeholder="Contoh: 01.234.567.8-901.000"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Nomor BPJS Ketenagakerjaan"
                    value={biodataForm.bpjsKetenagakerjaan || ''}
                    onChange={(e) => patchBiodata({ bpjsKetenagakerjaan: e.target.value })}
                    placeholder="Nomor kartu kepesertaan BPJS Ketenagakerjaan"
                  />
                  <TextField
                    label="Nomor BPJS Kesehatan"
                    value={biodataForm.bpjsKesehatan || ''}
                    onChange={(e) => patchBiodata({ bpjsKesehatan: e.target.value })}
                    placeholder="Nomor kartu kepesertaan BPJS Kesehatan"
                  />
                </div>
              </div>
            </Panel>

            {/* Bagian 2: Data Pribadi & Demografi */}
            <Panel>
              <PanelHeader
                title="2. Data Pribadi & Demografi"
                description="Informasi kelahiran, jenis kelamin, agama, dan status pernikahan."
              />
              <div className="space-y-4 p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <SelectField
                    label="Jenis kelamin"
                    value={biodataForm.gender || 'male'}
                    onChange={(e) => patchBiodata({ gender: e.target.value })}
                  >
                    {GENDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </SelectField>
                  <TextField
                    label="Tempat lahir"
                    value={biodataForm.placeOfBirth || ''}
                    onChange={(e) => patchBiodata({ placeOfBirth: e.target.value })}
                    placeholder="Kota kelahiran"
                    required
                  />
                  <TextField
                    label="Tanggal lahir"
                    type="date"
                    value={biodataForm.dateOfBirth || ''}
                    onChange={(e) => patchBiodata({ dateOfBirth: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <SelectField
                    label="Agama"
                    value={biodataForm.religion || 'Islam'}
                    onChange={(e) => patchBiodata({ religion: e.target.value })}
                  >
                    {RELIGION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label="Golongan darah"
                    value={biodataForm.bloodType || 'O'}
                    onChange={(e) => patchBiodata({ bloodType: e.target.value })}
                  >
                    {BLOOD_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label="Status pernikahan"
                    value={biodataForm.maritalStatus || 'single'}
                    onChange={(e) => patchBiodata({ maritalStatus: e.target.value })}
                  >
                    {MARITAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>
            </Panel>

            {/* Bagian 3: Kontak & Alamat Domisili */}
            <Panel>
              <PanelHeader
                title="3. Kontak Pribadi & Alamat Tempat Tinggal"
                description="Nomor telepon aktif dan alamat fisik sesuai identitas maupun domisili terkini."
              />
              <div className="space-y-4 p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Nomor telepon / WhatsApp aktif"
                    type="tel"
                    value={biodataForm.phone || ''}
                    onChange={(e) => patchBiodata({ phone: e.target.value })}
                    placeholder="Contoh: 08123456789"
                    required
                  />
                  <TextField
                    label="Kode pos"
                    value={biodataForm.postalCode || ''}
                    onChange={(e) => patchBiodata({ postalCode: e.target.value.slice(0, 10) })}
                    placeholder="Contoh: 12190"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Kota / Kabupaten"
                    value={biodataForm.city || ''}
                    onChange={(e) => patchBiodata({ city: e.target.value })}
                    placeholder="Contoh: Jakarta Selatan"
                    required
                  />
                  <TextField
                    label="Provinsi"
                    value={biodataForm.province || ''}
                    onChange={(e) => patchBiodata({ province: e.target.value })}
                    placeholder="Contoh: DKI Jakarta"
                    required
                  />
                </div>
                <TextAreaField
                  label="Alamat lengkap sesuai KTP"
                  value={biodataForm.addressKtp || ''}
                  onChange={(e) => patchBiodata({ addressKtp: e.target.value })}
                  placeholder="Jalan, RT/RW, Kelurahan, Kecamatan"
                  rows={2}
                  required
                />
                <TextAreaField
                  label="Alamat domisili saat ini"
                  value={biodataForm.addressCurrent || ''}
                  onChange={(e) => patchBiodata({ addressCurrent: e.target.value })}
                  placeholder="Kos, apartemen, atau tempat tinggal saat ini (kosongkan jika sama dengan KTP)"
                  rows={2}
                />
              </div>
            </Panel>

            {/* Bagian 4: Kontak Darurat */}
            <Panel>
              <PanelHeader
                title="4. Kontak Darurat"
                description="Pihak yang dapat dihubungi segera oleh perusahaan jika terjadi kondisi mendesak."
              />
              <div className="space-y-4 p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <TextField
                    label="Nama kontak darurat"
                    value={biodataForm.emergencyContactName || ''}
                    onChange={(e) => patchBiodata({ emergencyContactName: e.target.value })}
                    placeholder="Nama keluarga terdekat"
                    required
                  />
                  <TextField
                    label="Hubungan keluarga"
                    value={biodataForm.emergencyContactRelation || ''}
                    onChange={(e) => patchBiodata({ emergencyContactRelation: e.target.value })}
                    placeholder="Orang Tua / Pasangan / Saudara"
                    required
                  />
                  <TextField
                    label="Nomor telepon darurat"
                    type="tel"
                    value={biodataForm.emergencyContactPhone || ''}
                    onChange={(e) => patchBiodata({ emergencyContactPhone: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    required
                  />
                </div>
              </div>
            </Panel>

            {/* Bagian 5: Pendidikan & Rekening Penggajian */}
            <Panel>
              <PanelHeader
                title="5. Pendidikan Terakhir & Rekening Penggajian"
                description="Riwayat jenjang pendidikan dan rekening bank untuk transfer gaji bulanan."
              />
              <div className="space-y-4 p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <SelectField
                    label="Pendidikan terakhir"
                    value={biodataForm.lastEducation || 'D4/S1'}
                    onChange={(e) => patchBiodata({ lastEducation: e.target.value })}
                  >
                    {EDUCATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </SelectField>
                  <TextField
                    label="Jurusan / Program studi"
                    value={biodataForm.major || ''}
                    onChange={(e) => patchBiodata({ major: e.target.value })}
                    placeholder="Teknik Informatika / Manajemen / dll"
                  />
                  <TextField
                    label="Institusi / Universitas"
                    value={biodataForm.institution || ''}
                    onChange={(e) => patchBiodata({ institution: e.target.value })}
                    placeholder="Nama perguruan tinggi atau sekolah"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <SelectField
                    label="Nama bank"
                    value={biodataForm.bankName || 'BCA'}
                    onChange={(e) => patchBiodata({ bankName: e.target.value })}
                  >
                    {BANK_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </SelectField>
                  <TextField
                    label="Nomor rekening bank"
                    value={biodataForm.bankAccountNumber || ''}
                    onChange={(e) => patchBiodata({ bankAccountNumber: e.target.value })}
                    placeholder="Nomor rekening aktif"
                    required
                  />
                  <TextField
                    label="Nama pemilik rekening"
                    value={biodataForm.bankAccountHolder || ''}
                    onChange={(e) => patchBiodata({ bankAccountHolder: e.target.value })}
                    placeholder="Sesuai buku tabungan"
                    required
                  />
                </div>
              </div>
            </Panel>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="submit"
                tone="primary"
                loading={isSavingBiodata}
                disabled={isLoadingBiodata}
              >
                Simpan & Verifikasi Biodata
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: IDENTITAS AKUN */}
      {activeTab === 'account' && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px] 2xl:gap-7">
          <Panel>
            <PanelHeader
              title="Identitas akun"
              description="Nama tampilan dan alamat surel dipakai di seluruh portal."
              meta={
                isRefreshing
                  ? 'Memeriksa sesi'
                  : errorMsg
                    ? 'Sesi lokal'
                    : 'Sesi terverifikasi'
              }
            />

            <form onSubmit={handleSubmit} className="space-y-5 px-3.5 py-5 sm:px-5 2xl:px-6 2xl:py-6">
              <AvatarUploader user={user} disabled={isRefreshing} onUpdated={updateUser} />

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Nama lengkap"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nama yang tampil di portal"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={255}
                  disabled={isRefreshing}
                />
                <TextField
                  label="Alamat surel"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nama@perusahaan.co.id"
                  autoComplete="email"
                  hint="Dipakai untuk masuk. Perubahan berlaku pada sesi berikutnya."
                  required
                  disabled={isRefreshing}
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] leading-snug text-ink-3">
                  Akun demo pengembangan kembali ke nilai awal saat layanan auth dimulai ulang.
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleReset}
                    disabled={isSaving || isRefreshing}
                  >
                    Atur ulang
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    tone="primary"
                    loading={isSaving}
                    disabled={isRefreshing}
                  >
                    Simpan perubahan
                  </Button>
                </div>
              </div>
            </form>
          </Panel>

          <div className="space-y-5">
            <Panel>
              <PanelHeader title="Ringkasan" />
              <div className="space-y-4 px-3.5 py-4 sm:px-5 2xl:px-6 2xl:py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-[13px] font-bold text-primary-on">
                    {user?.avatarUrl ? (
                      <img
                        src={resolveLogoUrl(user.avatarUrl)}
                        alt={`Foto profil ${user.name}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials(user?.name)
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-bold text-ink">{user?.name ?? 'Pengguna'}</div>
                    <div className="truncate font-mono text-[11px] text-ink-3">{user?.email ?? '—'}</div>
                  </div>
                </div>

                <dl className="divide-y divide-line text-[13px]">
                  <div className="flex items-baseline justify-between gap-3 py-2.5">
                    <dt className="text-ink-2">Peran</dt>
                    <dd className="font-semibold text-ink">{roleLabel(user?.role)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 py-2.5">
                    <dt className="text-ink-2">Anggota sejak</dt>
                    <dd className="font-semibold text-ink">{formatDate(user?.createdAt)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 py-2.5">
                    <dt className="text-ink-2">Status akun</dt>
                    <dd>
                      <Badge tone={user ? 'success' : 'warning'}>
                        {user ? 'Aktif' : 'Tanpa sesi'}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 py-2.5">
                    <dt className="text-ink-2">Status biodata</dt>
                    <dd>
                      <Badge tone={biodata?.isCompleted ? 'success' : 'warning'}>
                        {biodata?.isCompleted ? 'Lengkap ✓' : 'Belum Lengkap ○'}
                      </Badge>
                    </dd>
                  </div>
                </dl>
              </div>
            </Panel>

            <Panel>
              <PanelHeader title="Sesi dan keamanan" />
              <div className="space-y-4 px-3.5 py-4 sm:px-5 2xl:px-6 2xl:py-5">
                <div className="flex items-start gap-2.5">
                  <HiOutlineShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <div className="min-w-0 text-[13px] leading-relaxed text-ink-2">
                    Token akses berlaku tujuh hari dan disimpan di perangkat ini. Keluar akan menghapus
                    sesi lokal seketika.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <HiOutlineBadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 text-[13px] leading-relaxed text-ink-2">
                    Perubahan nama dan surel diverifikasi ulang oleh layanan auth sebelum disimpan.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <HiOutlineIdentification className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
                  <div className="min-w-0 text-[13px] leading-relaxed text-ink-2">
                    ID akun
                    <span
                      className="mt-1 block truncate font-mono text-[11px] text-ink-3"
                      title={user?.id}
                    >
                      {user?.id ?? '—'}
                    </span>
                  </div>
                </div>

                <Button
                  tone="danger"
                  size="sm"
                  full
                  icon={<HiOutlineLogout className="h-4 w-4" />}
                  onClick={() => setIsLogoutOpen(true)}
                >
                  Keluar dari akun
                </Button>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* TAB 3: KOTAK SURAT INTERNAL (MAIL) */}
      {activeTab === 'mail' && (
        <Panel>
          <PanelHeader
            title="Kotak Surat & Korespondensi Internal"
            description="Daftar surat, informasi tugas, dan instruksi resmi dari departemen HR yang terhubung langsung dengan akun Anda."
            meta={`${mails.length} pesan terdaftar`}
          />
          <div className="p-4 sm:p-5">
            {mails.length === 0 ? (
              <div className="py-12 text-center text-ink-3">
                <HiOutlineInbox className="mx-auto h-12 w-12 text-ink-3/40" />
                <p className="mt-3 text-sm font-semibold text-ink">Kotak surat masih kosong</p>
                <p className="text-xs text-ink-3">Belum ada surat atau pesan internal yang dikirim ke akun Anda.</p>
              </div>
            ) : (
              <div className="divide-y divide-line overflow-hidden rounded-control border border-line">
                {mails.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleOpenMail(m)}
                    className={`flex cursor-pointer items-start justify-between gap-4 p-4 transition-colors hover:bg-surface-2 ${
                      !m.isRead ? 'bg-primary-subtle/30 font-medium' : 'bg-surface'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
                        <HiOutlineMail className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-ink">{m.senderName || m.senderEmail}</span>
                          {!m.isRead && (
                            <span className="rounded bg-primary px-1.5 py-0.2 text-[9px] font-bold text-primary-on">
                              Baru
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-ink truncate mt-0.5">{m.subject}</p>
                        <p className="text-xs text-ink-3 truncate mt-0.5 max-w-xl">{m.body}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-[11px] text-ink-3">
                      <div className="flex items-center gap-1 justify-end">
                        <HiOutlineClock className="h-3 w-3" />
                        <span>{formatDateTime(m.sentAt || m.createdAt)}</span>
                      </div>
                      <span className="mt-1 inline-block text-[10px] uppercase font-mono tracking-wider text-ink-3">
                        {m.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* Modal Baca Surat */}
      <Dialog
        isOpen={isMailOpen}
        onRequestClose={() => setIsMailOpen(false)}
        onClose={() => setIsMailOpen(false)}
        width={620}
      >
        <DialogHeading
          title={activeMail?.subject || 'Surat Internal'}
          description={`Dari: ${activeMail?.senderName || activeMail?.senderEmail || 'HR'} · Kepada: ${activeMail?.recipientName || user?.name || ''}`}
        />
        <DialogBody className="space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-2.5 text-xs text-ink-3">
            <span>Waktu: {formatDateTime(activeMail?.sentAt || activeMail?.createdAt)}</span>
            <Badge tone="accent">{activeMail?.category || 'inbox'}</Badge>
          </div>
          <div className="rounded-control bg-surface-2 p-4 text-xs leading-relaxed text-ink whitespace-pre-wrap font-sans">
            {activeMail?.body}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" tone="neutral" onClick={() => setIsMailOpen(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Dialog Konfirmasi Keluar */}
      <ConfirmDialog
        isOpen={isLogoutOpen}
        onRequestClose={() => setIsLogoutOpen(false)}
        onCancel={() => setIsLogoutOpen(false)}
        onConfirm={handleLogout}
        type="danger"
        title="Keluar dari akun"
        confirmText="Keluar"
        cancelText="Batal"
      >
        Sesi lokal di perangkat ini akan dihapus dan Anda kembali ke halaman masuk. Data organisasi
        tidak terpengaruh.
      </ConfirmDialog>
    </div>
  )
}
