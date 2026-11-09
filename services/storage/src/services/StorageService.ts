import { resolve, join } from 'node:path'
import { mkdir, unlink, readdir } from 'node:fs/promises'
import sharp from 'sharp'

export interface StorageOptions {
  folder?: string
  maxDimension?: number
  quality?: number
  preserveOriginalFormat?: boolean
}

export interface StoredFileResult {
  success: boolean
  url: string
  filename: string
  folder: string
  originalName: string
  mimeType: string
  originalSize: number
  compressedSize: number
  compressionRatio: string
  width?: number
  height?: number
  isCompressed: boolean
  createdAt: string
}

export class StorageService {
  private rootDir: string
  private urlPrefix: string

  constructor(options?: { rootDir?: string; urlPrefix?: string }) {
    this.rootDir = options?.rootDir
      ? resolve(options.rootDir)
      : resolve(import.meta.dir, '../../../../storage')
    this.urlPrefix = options?.urlPrefix || '/api/storage'
  }

  /**
   * Sanitasi nama folder untuk mencegah directory traversal
   */
  private sanitizeFolder(folder?: string): string {
    if (!folder) return 'general'
    const clean = folder.toLowerCase().replace(/[^a-z0-9_-]/g, '')
    return clean || 'general'
  }

  /**
   * Mengunggah, merapikan ke subfolder, dan mengompresi gambar ke WebP HD
   */
  async uploadFile(file: File, options?: StorageOptions): Promise<StoredFileResult> {
    if (!file || typeof file.arrayBuffer !== 'function') {
      throw new Error('Berkas tidak ditemukan atau format unggahan tidak valid.')
    }

    const folder = this.sanitizeFolder(options?.folder)
    const targetDir = resolve(this.rootDir, folder)
    await mkdir(targetDir, { recursive: true })

    const rawBuffer = Buffer.from(await file.arrayBuffer())
    const originalSize = file.size
    const originalName = file.name || 'unnamed-file'
    const isImage = file.type.startsWith('image/')
    const isSvg = file.type === 'image/svg+xml'

    const timestamp = Date.now()
    const randomId = crypto.randomUUID().slice(0, 8)

    // Skenario 1: Berkas Gambar Bitmap (PNG, JPEG, WEBP, GIF, AVIF)
    // Otomatis dikompresi ke WebP tanpa menghilangkan ketajaman HD
    if (isImage && !isSvg && !options?.preserveOriginalFormat) {
      const maxDim = options?.maxDimension || 1200
      const quality = options?.quality || 85

      const pipeline = sharp(rawBuffer)
        .rotate() // Auto-rotate sesuai orientasi EXIF
        .resize({
          width: maxDim,
          height: maxDim,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({
          quality,
          effort: 6,
          smartSubsample: true,
        })

      const [webpBuffer, metadata] = await Promise.all([
        pipeline.toBuffer(),
        pipeline.metadata(),
      ])

      const filename = `${folder}-${timestamp}-${randomId}.webp`
      const filePath = resolve(targetDir, filename)
      await Bun.write(filePath, webpBuffer)

      const compressedSize = webpBuffer.byteLength
      const savedBytes = originalSize - compressedSize
      const savedPercent = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0
      const compressionRatio = savedPercent > 0 ? `${savedPercent}% lebih hemat` : 'Ukuran optimal'

      return {
        success: true,
        url: `${this.urlPrefix}/${folder}/${filename}`,
        filename,
        folder,
        originalName,
        mimeType: 'image/webp',
        originalSize,
        compressedSize,
        compressionRatio,
        width: metadata.width,
        height: metadata.height,
        isCompressed: true,
        createdAt: new Date().toISOString(),
      }
    }

    // Skenario 2: Berkas SVG atau Dokumen Lain (PDF, DOCX, XLSX, dsb.)
    // Disimpan dengan ekstensi aslinya secara aman
    const rawExt = originalName.includes('.') ? originalName.split('.').pop()?.toLowerCase() : 'bin'
    const safeExt = rawExt?.replace(/[^a-z0-9]/g, '') || 'bin'
    const filename = `${folder}-${timestamp}-${randomId}.${safeExt}`
    const filePath = resolve(targetDir, filename)
    await Bun.write(filePath, rawBuffer)

    return {
      success: true,
      url: `${this.urlPrefix}/${folder}/${filename}`,
      filename,
      folder,
      originalName,
      mimeType: file.type || 'application/octet-stream',
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 'Format asli dipertahankan',
      isCompressed: false,
      createdAt: new Date().toISOString(),
    }
  }

  /**
   * Mengambil referensi Bun.file untuk penyajian statis
   */
  getFile(folder: string, filename: string) {
    const cleanFolder = this.sanitizeFolder(folder)
    const cleanFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '')
    const filePath = resolve(this.rootDir, cleanFolder, cleanFilename)
    return Bun.file(filePath)
  }

  /**
   * Menghapus berkas dari penyimpanan
   */
  async deleteFile(folder: string, filename: string): Promise<boolean> {
    try {
      const cleanFolder = this.sanitizeFolder(folder)
      const cleanFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '')
      const filePath = resolve(this.rootDir, cleanFolder, cleanFilename)
      await unlink(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Melihat daftar berkas dalam folder tertentu
   */
  async listFiles(folder: string): Promise<string[]> {
    try {
      const cleanFolder = this.sanitizeFolder(folder)
      const targetDir = resolve(this.rootDir, cleanFolder)
      return await readdir(targetDir)
    } catch {
      return []
    }
  }
}

// Instance bawaan penyimpanan
export const defaultStorageService = new StorageService()

