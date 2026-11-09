import { resolve } from 'node:path'
import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'

// Direktori Penyimpanan Berkas Bersama di Server Bun
export const ROOT_STORAGE_DIR = process.env.STORAGE_DIR
  ? resolve(process.env.STORAGE_DIR)
  : resolve(import.meta.dir, '../../../../storage')

export const LOGOS_STORAGE_DIR = resolve(ROOT_STORAGE_DIR, 'logos')

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

/**
 * Handler Pemrosesan dan Kompresi Berkas Unggahan Gambar ke WebP (Presisi HD)
 */
export async function handleLogoUpload(file: File): Promise<ProcessedUploadResult> {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new Error('Berkas tidak ditemukan atau format unggahan tidak valid.')
  }

  // 1. Validasi Ukuran Berkas
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Ukuran berkas melebihi batas maksimum 10 MB (Ukuran: ${(file.size / 1024 / 1024).toFixed(2)} MB).`)
  }

  // 2. Validasi Tipe MIME
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(`Format berkas '${file.type}' tidak didukung. Harap unggah berkas PNG, JPG, JPEG, WEBP, GIF, atau SVG.`)
  }

  // Pastikan direktori penyimpanan tersedia
  await mkdir(LOGOS_STORAGE_DIR, { recursive: true })

  // 3. Baca Buffer Berkas
  const rawArrayBuffer = await file.arrayBuffer()
  const inputBuffer = Buffer.from(rawArrayBuffer)

  // 4. Kompresi & Konversi ke Format WebP Presisi Tinggi (HD Lossless/Smart Subsample)
  // Menjaga ketajaman HD logo hingga 1200px tanpa distorsi atau pembesaran paksa
  const imagePipeline = sharp(inputBuffer)
    .rotate() // Koreksi orientasi EXIF otomatis
    .resize({
      width: 1200,
      height: 1200,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality: 85,          // Keseimbangan optimal: ketajaman visual HD dengan ukuran minimal
      effort: 6,            // Komputasi CPU maksimal untuk rasio kompresi tinggi
      smartSubsample: true, // Mempertahankan ketajaman garis dan kontras warna logo/teks
    })

  const [webpBuffer, metadata] = await Promise.all([
    imagePipeline.toBuffer(),
    imagePipeline.metadata(),
  ])

  // 5. Pembuatan Nama Berkas Unik
  const timestamp = Date.now()
  const randomSuffix = crypto.randomUUID().slice(0, 8)
  const filename = `logo-${timestamp}-${randomSuffix}.webp`
  const targetFilePath = resolve(LOGOS_STORAGE_DIR, filename)

  // 6. Simpan ke Sistem Berkas Menggunakan Bun.write
  await Bun.write(targetFilePath, webpBuffer)

  const originalSize = file.size
  const compressedSize = webpBuffer.byteLength
  const savedBytes = originalSize - compressedSize
  const savedPercent = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0
  const compressionRatio = savedPercent > 0 ? `${savedPercent}% lebih hemat` : 'Ukuran optimal'

  return {
    filename,
    url: `/api/storage/logos/${filename}`,
    originalName: file.name,
    originalSize,
    compressedSize,
    compressionRatio,
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: 'webp',
    mimeType: 'image/webp',
  }
}

