import { resolve, join, relative } from 'node:path'
import { readdir, stat, readFile } from 'node:fs/promises'
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3'
import postgres from 'postgres'

const s3 = new S3Client({
  region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT || 'https://s3.nevaobjects.id',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'EIPSX34JC2H5CNOUHAZQ',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'CpxOfhwRGHfA0Gc1sUY5YpzgMcHE6BJD8okKU9hJ',
  },
  forcePathStyle: true,
})

const BUCKETS = ['temankerja', 'stars-app']
const STORAGE_DIR = resolve(import.meta.dir, '../../../../storage')

function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'webp':
      return 'image/webp'
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'svg':
      return 'image/svg+xml'
    case 'gif':
      return 'image/gif'
    case 'pdf':
      return 'application/pdf'
    default:
      return 'application/octet-stream'
  }
}

async function walkDir(dir: string): Promise<string[]> {
  const files: string[] = []
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        files.push(...(await walkDir(fullPath)))
      } else if (entry.isFile() && !entry.name.startsWith('.git')) {
        files.push(fullPath)
      }
    }
  } catch {
    // folder not found
  }
  return files
}

async function runSync() {
  console.log('=== MEMULAI SINKRONISASI SEMUA ASET LOKAL KE S3 ===')
  console.log('Direktori sumber:', STORAGE_DIR)

  const allFiles = await walkDir(STORAGE_DIR)
  console.log(`Ditemukan ${allFiles.length} berkas aset lokal:`)

  for (const filePath of allFiles) {
    const relPath = relative(STORAGE_DIR, filePath).replace(/\\/g, '/')
    const mimeType = getMimeType(filePath)
    const buffer = await readFile(filePath)

    console.log(`\n• Memproses: ${relPath} (${(buffer.byteLength / 1024).toFixed(1)} KB, ${mimeType})`)

    for (const bucket of BUCKETS) {
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: relPath,
            Body: buffer,
            ContentType: mimeType,
            ACL: 'public-read',
            CacheControl: 'public, max-age=31536000, immutable',
          })
        )
        console.log(`  ✓ Berhasil diunggah ke bucket [${bucket}] s3://${bucket}/${relPath}`)
      } catch (err) {
        console.error(`  ✕ Gagal mengunggah ke [${bucket}]:`, err)
      }
    }

    // Uji akses publik HTTP
    const testUrl = `https://s3.nevaobjects.id/stars-app/${relPath}`
    try {
      const res = await fetch(testUrl, { method: 'HEAD' })
      console.log(`  ✓ Uji akses publik HTTP ${testUrl} -> Status: ${res.status}`)
    } catch (err) {
      console.warn(`  ! Peringatan uji HTTP:`, err)
    }
  }

  // Perbarui referensi database agar menunjuk ke S3 atau URL terkelola
  console.log('\n--- Sinkronisasi Basis Data ---')
  try {
    const pg = postgres(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/srikaya_auth')
    const companies = await pg`SELECT id, name, logo_url FROM companies WHERE logo_url IS NOT NULL`
    for (const c of companies) {
      if (c.logo_url && c.logo_url.startsWith('/api/storage/')) {
        const s3Key = c.logo_url.replace('/api/storage/', '')
        const fullS3Url = `https://s3.nevaobjects.id/stars-app/${s3Key}`
        await pg`UPDATE companies SET logo_url = ${fullS3Url} WHERE id = ${c.id}`
        console.log(`✓ Diperbarui Logo Perusahaan '${c.name}':`)
        console.log(`  Sebelum : ${c.logo_url}`)
        console.log(`  Menjadi : ${fullS3Url}`)
      }
    }
    await pg.end()
  } catch (dbErr) {
    console.warn('Peringatan pembaruan DB:', dbErr)
  }

  // Tampilkan daftar seluruh objek di kedua bucket
  console.log('\n=== DAFTAR OBJEK DALAM BUCKET S3 SAAT INI ===')
  for (const bucket of BUCKETS) {
    try {
      const list = await s3.send(new ListObjectsV2Command({ Bucket: bucket }))
      console.log(`\nBucket [${bucket}] (${list.Contents?.length || 0} objek):`)
      for (const obj of list.Contents || []) {
        console.log(`  - ${obj.Key} (${(obj.Size || 0)} bytes, ${obj.LastModified?.toISOString()})`)
      }
    } catch (listErr) {
      console.error(`Gagal melihat daftar bucket ${bucket}:`, listErr)
    }
  }

  console.log('\n=== SINKRONISASI SEMUA ASET SELESAI DENGAN SUKSES ===')
}

runSync().catch(console.error)
