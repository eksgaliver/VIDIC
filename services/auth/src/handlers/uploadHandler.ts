import { resolve } from 'node:path'
import { mkdir, unlink } from 'node:fs/promises'
import sharp from 'sharp'

// Direktori Penyimpanan Berkas Bersama di Server Bun
export const ROOT_STORAGE_DIR = process.env.STORAGE_DIR
  ? resolve(process.env.STORAGE_DIR)
  : resolve(import.meta.dir, '../../../../storage')

export const LOGOS_STORAGE_DIR = resolve(ROOT_STORAGE_DIR, 'logos')
export const AVATARS_STORAGE_DIR = resolve(ROOT_STORAGE_DIR, 'avatars')

// Batasan dan Validasi Jenis Berkas
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
])

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 Megabyte

export interface ProcessedUploadResult {
  filename: string
  url: string
  originalName: string
  originalSize: number
  compressedSize: number
  compressionRatio: string
  width: number
  height: number
  format: string
  mimeType: string
}

function validateImageFile(file: File) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new Error('Berkas tidak ditemukan atau format unggahan tidak valid.')
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Ukuran berkas melebihi batas maksimum 10 MB (Ukuran: ${(file.size / 1024 / 1024).toFixed(2)} MB).`)
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(`Format berkas '${file.type}' tidak didukung. Harap unggah berkas PNG, JPG, JPEG, WEBP, GIF, atau SVG.`)
  }
}

interface ResizeOptions {
  width: number
  height: number
  fit: 'inside' | 'cover'
  withoutEnlargement?: boolean
}

async function processImageToWebp(
  file: File,
  targetDir: string,
  filenamePrefix: string,
  resize: ResizeOptions,
  urlFolder: string
): Promise<ProcessedUploadResult> {
  validateImageFile(file)

  await mkdir(targetDir, { recursive: true })

  const inputBuffer = Buffer.from(await file.arrayBuffer())

  const imagePipeline = sharp(inputBuffer)
    .rotate() // Koreksi orientasi EXIF otomatis
    .resize({
      width: resize.width,
      height: resize.height,
      fit: resize.fit,
      position: 'centre',
      withoutEnlargement: resize.withoutEnlargement ?? true,
    })
    .webp({
      quality: 85,
      effort: 6,
      smartSubsample: true,
    })

  const { data: webpBuffer, info } = await imagePipeline.toBuffer({ resolveWithObject: true })

  const timestamp = Date.now()
  const randomSuffix = crypto.randomUUID().slice(0, 8)
  const filename = `${filenamePrefix}-${timestamp}-${randomSuffix}.webp`
  const targetFilePath = resolve(targetDir, filename)

  await Bun.write(targetFilePath, webpBuffer)

  const originalSize = file.size
  const compressedSize = webpBuffer.byteLength
  const savedBytes = originalSize - compressedSize
  const savedPercent = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0
  const compressionRatio = savedPercent > 0 ? `${savedPercent}% lebih hemat` : 'Ukuran optimal'

  return {
    filename,
    url: `/api/storage/${urlFolder}/${filename}`,
    originalName: file.name,
    originalSize,
    compressedSize,
    compressionRatio,
    width: info.width || 0,
    height: info.height || 0,
    format: 'webp',
    mimeType: 'image/webp',
  }
}

/**
 * Handler Pemrosesan dan Kompresi Berkas Unggahan Logo ke WebP (Presisi HD)
 */
export async function handleLogoUpload(file: File): Promise<ProcessedUploadResult> {
  return processImageToWebp(
    file,
    LOGOS_STORAGE_DIR,
    'logo',
    { width: 1200, height: 1200, fit: 'inside' },
    'logos'
  )
}

/**
 * Handler Foto Profil: potong persegi 1:1, lalu kompres ke WebP.
 */
export async function handleAvatarUpload(file: File): Promise<ProcessedUploadResult> {
  return processImageToWebp(
    file,
    AVATARS_STORAGE_DIR,
    'avatar',
    { width: 512, height: 512, fit: 'cover', withoutEnlargement: false },
    'avatars'
  )
}

/**
 * Hapus berkas avatar lama tanpa menyentuh berkas di luar folder avatar.
 */
export async function deleteStoredAvatar(url?: string | null) {
  if (!url) return

  const match = url.match(/^\/api\/storage\/avatars\/([A-Za-z0-9_.-]+)$/)
  if (!match) return

  await unlink(resolve(AVATARS_STORAGE_DIR, match[1])).catch(() => {
    // Berkas sudah tidak ada: tidak perlu menghentikan pembaruan profil
  })
}
