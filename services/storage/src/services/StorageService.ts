import { resolve } from 'node:path'
import { mkdir, unlink, readdir } from 'node:fs/promises'
import sharp from 'sharp'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
  CreateBucketCommand
} from '@aws-sdk/client-s3'

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
  s3Bucket?: string
  s3Key?: string
}

export interface S3Config {
  accessKeyId: string
  secretAccessKey: string
  region: string
  bucket: string
  endpoint: string
  publicUrl?: string
  forcePathStyle?: boolean
}

export class StorageService {
  private rootDir: string
  private urlPrefix: string
  private s3: S3Client
  private bucket: string
  private secondaryBucket: string | null = null
  private endpoint: string
  private publicBaseUrl: string
  private bucketVerified = false

  constructor(options?: {
    rootDir?: string
    urlPrefix?: string
    s3Config?: Partial<S3Config>
  }) {
    this.rootDir = options?.rootDir
      ? resolve(options.rootDir)
      : resolve(import.meta.dir, '../../../../storage')
    this.urlPrefix = options?.urlPrefix || '/api/storage'

    // Konfigurasi S3 AWS / Neva Objects dari Environment Variable
    const accessKeyId =
      options?.s3Config?.accessKeyId ||
      process.env.AWS_ACCESS_KEY_ID ||
      'EIPSX34JC2H5CNOUHAZQ'

    const secretAccessKey =
      options?.s3Config?.secretAccessKey ||
      process.env.AWS_SECRET_ACCESS_KEY ||
      'CpxOfhwRGHfA0Gc1sUY5YpzgMcHE6BJD8okKU9hJ'

    const region =
      options?.s3Config?.region ||
      process.env.AWS_DEFAULT_REGION ||
      process.env.AWS_REGION ||
      'us-east-1'

    this.bucket =
      options?.s3Config?.bucket ||
      process.env.AWS_BUCKET ||
      'temankerja'

    this.endpoint =
      options?.s3Config?.endpoint ||
      process.env.AWS_ENDPOINT ||
      'https://s3.nevaobjects.id'

    const configuredPublicUrl =
      options?.s3Config?.publicUrl ||
      process.env.AWS_URL ||
      'https://s3.nevaobjects.id/stars-app'

    const forcePathStyle =
      options?.s3Config?.forcePathStyle ??
      (process.env.AWS_USE_PATH_STYLE_ENDPOINT === 'true' || true)

    // Tentukan URL Publik Berkas
    if (configuredPublicUrl) {
      this.publicBaseUrl = configuredPublicUrl.replace(/\/+$/, '')
      // Deteksi jika AWS_URL merujuk nama bucket sekunder berbeda (misal: stars-app vs temankerja)
      try {
        const parsed = new URL(configuredPublicUrl)
        const pathSegments = parsed.pathname.split('/').filter(Boolean)
        if (pathSegments.length > 0 && pathSegments[0] !== this.bucket) {
          this.secondaryBucket = pathSegments[0]
        }
      } catch {
        // Biarkan jika format bukan URL lengkap
      }
    } else {
      this.publicBaseUrl = `${this.endpoint.replace(/\/+$/, '')}/${this.bucket}`
    }

    // Inisialisasi AWS SDK S3 Client
    this.s3 = new S3Client({
      region,
      endpoint: this.endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey
      },
      forcePathStyle
    })
  }

  /**
   * Memastikan bucket S3 utama dan sekunder sudah tersedia di server Object Storage
   */
  async ensureBucketExists(): Promise<void> {
    if (this.bucketVerified) return

    const bucketsToCheck = [this.bucket]
    if (this.secondaryBucket && this.secondaryBucket !== this.bucket) {
      bucketsToCheck.push(this.secondaryBucket)
    }

    for (const bName of bucketsToCheck) {
      try {
        await this.s3.send(new HeadBucketCommand({ Bucket: bName }))
      } catch {
        try {
          await this.s3.send(new CreateBucketCommand({ Bucket: bName }))
          console.log(`[StorageService] Berhasil membuat bucket baru: '${bName}'`)
        } catch (createErr) {
          console.warn(`[StorageService] Peringatan saat memastikan bucket '${bName}':`, createErr)
        }
      }
    }

    this.bucketVerified = true
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
   * Mengunggah berkas, mengompresi gambar ke WebP HD, dan menyimpannya langsung ke S3 & Disk Cache
   */
  async uploadFile(file: File, options?: StorageOptions): Promise<StoredFileResult> {
    if (!file || typeof file.arrayBuffer !== 'function') {
      throw new Error('Berkas tidak ditemukan atau format unggahan tidak valid.')
    }

    // Pastikan bucket sudah diverifikasi di awal
    await this.ensureBucketExists()

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

    let finalBuffer: Buffer = rawBuffer
    let finalMimeType = file.type || 'application/octet-stream'
    let filename = ''
    let compressedSize = originalSize
    let isCompressed = false
    let compressionRatio = 'Format asli dipertahankan'
    let width: number | undefined
    let height: number | undefined

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
          withoutEnlargement: true
        })
        .webp({
          quality,
          effort: 6,
          smartSubsample: true
        })

      const [webpBuffer, metadata] = await Promise.all([
        pipeline.toBuffer(),
        pipeline.metadata()
      ])

      finalBuffer = webpBuffer
      finalMimeType = 'image/webp'
      filename = `${folder}-${timestamp}-${randomId}.webp`
      compressedSize = webpBuffer.byteLength
      width = metadata.width
      height = metadata.height
      isCompressed = true

      const savedBytes = originalSize - compressedSize
      const savedPercent = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0
      compressionRatio = savedPercent > 0 ? `${savedPercent}% lebih hemat` : 'Ukuran optimal'
    } else {
      // Skenario 2: Berkas SVG atau Dokumen Lain (PDF, DOCX, XLSX, dsb.)
      const rawExt = originalName.includes('.') ? originalName.split('.').pop()?.toLowerCase() : 'bin'
      const safeExt = rawExt?.replace(/[^a-z0-9]/g, '') || 'bin'
      filename = `${folder}-${timestamp}-${randomId}.${safeExt}`
    }

    // 1. Simpan salinan lokal ke disk server sebagai cadangan cepat (Fast Cache)
    const filePath = resolve(targetDir, filename)
    await Bun.write(filePath, finalBuffer)

    // 2. Unggah berkas ke AWS S3 Object Storage (Neva Objects)
    const s3Key = `${folder}/${filename}`
    const uploadTasks: Promise<any>[] = [
      this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
          Body: finalBuffer,
          ContentType: finalMimeType,
          ACL: 'public-read',
          CacheControl: 'public, max-age=31536000, immutable'
        })
      )
    ]

    // Bila terdapat bucket sekunder yang dikonfigurasi, simpan ke kedua bucket secara paralel
    if (this.secondaryBucket && this.secondaryBucket !== this.bucket) {
      uploadTasks.push(
        this.s3.send(
          new PutObjectCommand({
            Bucket: this.secondaryBucket,
            Key: s3Key,
            Body: finalBuffer,
            ContentType: finalMimeType,
            ACL: 'public-read',
            CacheControl: 'public, max-age=31536000, immutable'
          })
        )
      )
    }

    await Promise.all(uploadTasks)

    // Bentuk URL Publik S3 langsung
    const publicUrl = `${this.publicBaseUrl}/${s3Key}`

    return {
      success: true,
      url: publicUrl,
      filename,
      folder,
      originalName,
      mimeType: finalMimeType,
      originalSize,
      compressedSize,
      compressionRatio,
      width,
      height,
      isCompressed,
      createdAt: new Date().toISOString(),
      s3Bucket: this.bucket,
      s3Key
    }
  }

  /**
   * Mengambil referensi berkas: memprioritaskan cache lokal, atau mengambil dari S3
   */
  getFile(folder: string, filename: string) {
    const cleanFolder = this.sanitizeFolder(folder)
    const cleanFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '')
    const filePath = resolve(this.rootDir, cleanFolder, cleanFilename)
    return Bun.file(filePath)
  }

  /**
   * Mengambil data buffer berkas baik dari disk cache lokal maupun dari S3
   */
  async getFileBuffer(
    folder: string,
    filename: string
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const cleanFolder = this.sanitizeFolder(folder)
    const cleanFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '')
    const filePath = resolve(this.rootDir, cleanFolder, cleanFilename)
    const localFile = Bun.file(filePath)

    if (await localFile.exists()) {
      const buffer = Buffer.from(await localFile.arrayBuffer())
      return {
        buffer,
        contentType: localFile.type || 'application/octet-stream'
      }
    }

    // Ambil dari S3 bila tidak tersedia di cache lokal
    try {
      const s3Key = `${cleanFolder}/${cleanFilename}`
      const s3Res = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: s3Key
        })
      )

      if (s3Res.Body) {
        const stream = s3Res.Body as any
        const chunks: Uint8Array[] = []
        for await (const chunk of stream) {
          chunks.push(chunk)
        }
        const buffer = Buffer.concat(chunks)

        // Tulis ke cache lokal untuk percepatan permintaan selanjutnya
        try {
          await mkdir(resolve(this.rootDir, cleanFolder), { recursive: true })
          await Bun.write(filePath, buffer)
        } catch {
          // Abaikan kegagalan penulisan cache lokal
        }

        return {
          buffer,
          contentType: s3Res.ContentType || 'application/octet-stream'
        }
      }
    } catch {
      // Abaikan jika tidak ditemukan di S3
    }

    return null
  }

  /**
   * Menghapus berkas dari S3 dan cache lokal
   */
  async deleteFile(folder: string, filename: string): Promise<boolean> {
    let success = false
    const cleanFolder = this.sanitizeFolder(folder)
    const cleanFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '')
    const s3Key = `${cleanFolder}/${cleanFilename}`

    // Hapus dari S3
    try {
      const deleteTasks: Promise<any>[] = [
        this.s3.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: s3Key
          })
        )
      ]

      if (this.secondaryBucket && this.secondaryBucket !== this.bucket) {
        deleteTasks.push(
          this.s3.send(
            new DeleteObjectCommand({
              Bucket: this.secondaryBucket,
              Key: s3Key
            })
          )
        )
      }

      await Promise.all(deleteTasks)
      success = true
    } catch {
      // Abaikan jika berkas tidak ditemukan di S3
    }

    // Hapus dari cache lokal jika ada
    try {
      const filePath = resolve(this.rootDir, cleanFolder, cleanFilename)
      await unlink(filePath)
      success = true
    } catch {
      // Abaikan jika berkas lokal tidak ada
    }

    return success
  }

  /**
   * Melihat daftar berkas dalam folder tertentu (menggabungkan S3 & lokal)
   */
  async listFiles(folder: string): Promise<string[]> {
    const cleanFolder = this.sanitizeFolder(folder)
    const files = new Set<string>()

    // Ambil dari S3
    try {
      const res = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: `${cleanFolder}/`
        })
      )
      for (const obj of res.Contents || []) {
        if (obj.Key) {
          const parts = obj.Key.split('/')
          files.add(parts[parts.length - 1])
        }
      }
    } catch {
      // Abaikan jika daftar S3 gagal
    }

    // Ambil dari cache lokal
    try {
      const localList = await readdir(resolve(this.rootDir, cleanFolder))
      for (const f of localList) files.add(f)
    } catch {
      // Abaikan jika direktori lokal belum ada
    }

    return Array.from(files)
  }

  /**
   * Mengembalikan status konfigurasi S3 aktif
   */
  getS3Info() {
    return {
      bucket: this.bucket,
      secondaryBucket: this.secondaryBucket,
      endpoint: this.endpoint,
      publicBaseUrl: this.publicBaseUrl
    }
  }
}

// Instance bawaan penyimpanan
export const defaultStorageService = new StorageService()
