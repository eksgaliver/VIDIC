import * as React from 'react'
import {
  HiOutlinePhotograph,
  HiOutlineCloudUpload,
  HiOutlineTrash,
  HiOutlineCheckCircle,
} from 'react-icons/hi'
import { Button } from '@/components/base'

export interface UploadedLogoData {
  filename: string
  url: string
  originalName: string
  originalSize: number
  compressedSize: number
  compressionRatio: string
  width: number
  height: number
  format: string
}

export interface LogoUploaderProps {
  value?: string | null
  folder?: string
  label?: string
  onChange: (url: string | null, uploadData?: UploadedLogoData | null) => void
  disabled?: boolean
  className?: string
}

export const getBaseUrl = (): string => {
  const configured = import.meta.env.VITE_API_URL
  if (configured) {
    try {
      return new URL(configured).origin
    } catch {
      return window.location.origin
    }
  }
  return window.location.origin
}

export const resolveLogoUrl = (url?: string | null): string => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const base = getBaseUrl().replace(/\/+$/, '')
  const path = url.startsWith('/') ? url : `/${url}`
  return `${base}${path}`
}

export function LogoUploader({
  value,
  folder = 'logos',
  label = 'Logo Resmi Badan Usaha',
  onChange,
  disabled = false,
  className = '',
}: LogoUploaderProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [stats, setStats] = React.useState<UploadedLogoData | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  const handleUploadFile = async (file: File) => {
    setUploadError(null)

    // Validasi Tipe Berkas Klien
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      setUploadError('Hanya berkas gambar (PNG, JPG, WEBP, GIF, SVG) yang diperbolehkan.')
      return
    }

    // Validasi Ukuran (Max 10 MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Ukuran gambar melebihi batas 10 MB.')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const endpoint = `${getBaseUrl()}/api/upload/${folder}`
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal memproses unggahan gambar.')
      }

      const uploadData: UploadedLogoData = data.data
      setStats(uploadData)
      onChange(uploadData.url || data.url, uploadData)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kendala saat mengunggah berkas.'
      setUploadError(msg)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUploadFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled || isUploading) return

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleUploadFile(file)
    }
  }

  const handleRemove = () => {
    setStats(null)
    setUploadError(null)
    onChange(null, null)
  }

  const fullImageUrl = value ? resolveLogoUrl(value) : null

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-xs font-semibold text-ink">
        {label}
      </label>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Pratinjau Logo */}
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-control border border-line bg-surface shadow-xs">
          {fullImageUrl ? (
            <img
              src={fullImageUrl}
              alt="Logo Perusahaan"
              className="h-full w-full object-contain p-1.5"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-ink-3">
              <HiOutlinePhotograph className="h-8 w-8 stroke-[1.2]" />
              <span className="text-2xs font-medium">Belum ada</span>
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/80 backdrop-blur-xs">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>

        {/* Area Aksi & Drag-Drop */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex min-w-0 flex-1 flex-col justify-center rounded-control border-2 border-dashed p-3 transition-colors ${
            isDragging
              ? 'border-primary bg-primary-subtle/50'
              : 'border-line hover:border-line-strong bg-surface-2/40'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              tone={fullImageUrl ? 'neutral' : 'primary'}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              icon={<HiOutlineCloudUpload className="h-4 w-4" />}
            >
              {isUploading
                ? 'Mengompresi ke WebP...'
                : fullImageUrl
                ? 'Ganti Logo'
                : 'Pilih Berkas Logo'}
            </Button>

            {fullImageUrl && (
              <Button
                type="button"
                size="sm"
                tone="quiet"
                className="text-error hover:bg-error-subtle hover:text-error"
                onClick={handleRemove}
                disabled={disabled || isUploading}
                icon={<HiOutlineTrash className="h-4 w-4" />}
              >
                Hapus
              </Button>
            )}
          </div>

          <p className="mt-1.5 text-2xs text-ink-3">
            Format PNG, JPG, WEBP hingga 10 MB. Server Bun akan mengompresi otomatis ke format WebP HD (komputasi tinggi, tanpa kehilangan ketajaman).
          </p>
        </div>
      </div>

      {/* Notifikasi Statistik Kompresi WebP */}
      {stats && (
        <div className="flex items-center gap-1.5 rounded-md border border-success-line bg-success-subtle px-2.5 py-1 text-2xs font-medium text-success">
          <HiOutlineCheckCircle className="h-3.5 w-3.5 shrink-0" />
          <span>
            Terkonversi ke WebP: {(stats.compressedSize / 1024).toFixed(1)} KB (hemat {stats.compressionRatio}) · Resolusi {stats.width}×{stats.height} px
          </span>
        </div>
      )}

      {/* Notifikasi Galat */}
      {uploadError && (
        <p className="text-2xs font-medium text-error">{uploadError}</p>
      )}
    </div>
  )
}

