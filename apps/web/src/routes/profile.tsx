import * as React from 'react'
import { createRoute, useNavigate } from '@tanstack/react-router'
import {
  HiOutlineBadgeCheck,
  HiOutlineIdentification,
  HiOutlineLogout,
  HiOutlineShieldCheck,
} from 'react-icons/hi'
import type { UserDTO } from 'shared-types'
import { authenticatedRoute } from './_authenticated'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import {
  Badge,
  Button,
  Notice,
  PageHeader,
  Panel,
  PanelHeader,
  TextField,
} from '@/components/base'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { AvatarUploader } from '@/components/shared/AvatarUploader'
import { resolveLogoUrl } from '@/components/shared/LogoUploader'
import { errorText } from '@/utils/apiError'
import { LOGIN_PATH, PROFILE_PATH } from '@/constants/route.constant'

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

export function ProfilePage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const logout = useAuthStore((state) => state.logout)

  const [name, setName] = React.useState(user?.name ?? '')
  const [email, setEmail] = React.useState(user?.email ?? '')
  const [isRefreshing, setIsRefreshing] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)
  const [isLogoutOpen, setIsLogoutOpen] = React.useState(false)

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

  const handleLogout = () => {
    setIsLogoutOpen(false)
    logout()
    navigate({ to: LOGIN_PATH, replace: true })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil"
        description="Identitas akun yang dipakai untuk masuk ke portal, plus kendali sesi berjalan."
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
                  <dt className="text-ink-2">Status</dt>
                  <dd>
                    <Badge tone={user ? 'success' : 'warning'}>
                      {user ? 'Aktif' : 'Tanpa sesi'}
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
