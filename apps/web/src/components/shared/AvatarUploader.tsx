import * as React from 'react'
import { HiOutlineCamera, HiOutlineTrash } from 'react-icons/hi'
import type { UserDTO } from 'shared-types'
import { Button } from '@/components/base'
import { useAuthStore } from '@/stores/auth'
import { getBaseUrl, resolveLogoUrl } from './LogoUploader'

interface AvatarUploaderProps {
  user: UserDTO | null
  disabled?: boolean
  onUpdated: (user: UserDTO) => void
}

interface AvatarUploadPayload {
  compressedSize?: number
  width?: number
  height?: number
  compressionRatio?: string
}

interface AvatarResponse {
  success?: boolean
  message?: string
  user?: UserDTO
  upload?: AvatarUploadPayload
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/avif']

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

export function AvatarUploader({ user, disabled = false, onUpdated }: AvatarUploaderProps) {
  const token = useAuthStore((state) => state.token)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [isUploading, setIsUploading] = React.useState(false)
  const [isRemoving, setIsRemoving] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  const busy = isUploading || isRemoving || disabled
  const hasAvatar = Boolean(user?.avatarUrl)

  const sendFile = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMsg('Hanya berkas PNG, JPG, WEBP, GIF, atau AVIF yang diperbolehkan.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setErrorMsg('Ukuran foto melebihi batas 10 MB.')
      return
    }
    if (!token) {
      setErrorMsg('Sesi tidak ditemukan. Silakan masuk kembali.')
      return
    }

    setErrorMsg(null)
    setSuccessMsg(null)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${getBaseUrl()}/api/auth/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const data = (await res.json().catch(() => null)) as AvatarResponse | null

      if (!res.ok || !data?.success || !data.user) {
        throw new Error(data?.message || 'Foto profil gagal diproses.')
      }

      onUpdated(data.user)

      const stats = data.upload
      setSuccessMsg(
        stats?.compressedSize
          ? `Foto tersimpan sebagai WebP ${stats.width ?? 0}×${stats.height ?? 0} px (${(stats.compressedSize / 1024).toFixed(1)} KB).`
          : 'Foto profil berhasil diperbarui.'
      )
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kendala saat mengunggah foto.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) void sendFile(file)
    // Izinkan memilih berkas yang sama lagi setelah validasi gagal
    event.target.value = ''
  }

  const handleRemove = async () => {
    if (!token) {
      setErrorMsg('Sesi tidak ditemukan. Silakan masuk kembali.')
      return
    }

    setErrorMsg(null)
    setSuccessMsg(null)
    setIsRemoving(true)

    try {
      const res = await fetch(`${getBaseUrl()}/api/auth/avatar`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = (await res.json().catch(() => null)) as AvatarResponse | null

      if (!res.ok || !data?.success || !data.user) {
        throw new Error(data?.message || 'Foto profil gagal dihapus.')
      }

      onUpdated(data.user)
      setSuccessMsg('Foto profil dihapus.')
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kendala saat menghapus foto.')
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-center">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-line bg-primary shadow-1">
        {hasAvatar ? (
          <img
            src={resolveLogoUrl(user?.avatarUrl)}
            alt={`Foto profil ${user?.name ?? ''}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xl font-bold text-primary-on">
            {initials(user?.name)}
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/80 backdrop-blur-sm">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            tone={hasAvatar ? 'neutral' : 'primary'}
            icon={<HiOutlineCamera className="h-4 w-4" />}
            loading={isUploading}
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? 'Mengunggah' : hasAvatar ? 'Ganti foto' : 'Unggah foto'}
          </Button>

          {hasAvatar && (
            <Button
              type="button"
              size="sm"
              tone="quiet"
              className="text-error hover:bg-error-subtle hover:text-error"
              icon={<HiOutlineTrash className="h-4 w-4" />}
              loading={isRemoving}
              disabled={busy}
              onClick={handleRemove}
            >
              Hapus
            </Button>
          )}
        </div>

        <p className="text-[11px] leading-snug text-ink-3">
          PNG, JPG, atau WEBP hingga 10 MB. Server memotong ke rasio 1:1, lalu mengompres ke WebP.
        </p>

        {successMsg && <p className="text-[11px] font-medium text-success">{successMsg}</p>}
        {errorMsg && <p className="text-[11px] font-medium text-error">{errorMsg}</p>}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/avif"
        onChange={handleFileChange}
        className="hidden"
        disabled={busy}
      />
    </div>
  )
}
