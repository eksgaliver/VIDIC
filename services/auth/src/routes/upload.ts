import { Elysia, t } from 'elysia'
import { resolve, join } from 'node:path'
import { handleLogoUpload, LOGOS_STORAGE_DIR, ROOT_STORAGE_DIR } from '../handlers/uploadHandler'

export const uploadRoutes = new Elysia()
  // 1. Endpoint Upload Logo Perusahaan (Kompresi Otomatis ke WebP HD)
  .post(
    '/upload/logo',
    async ({ body, set }) => {
      try {
        const file = (body as { file: File }).file
        if (!file) {
          set.status = 400
          return { success: false, message: 'Berkas gambar logo wajib disertakan.' }
        }

        const result = await handleLogoUpload(file)

        return {
          success: true,
          data: result,
          message: `Logo berhasil dikompresi ke WebP (${(result.compressedSize / 1024).toFixed(1)} KB, ${result.compressionRatio})`,
        }
      } catch (err: unknown) {
        set.status = 400
        const errorMessage = err instanceof Error ? err.message : 'Gagal memproses berkas gambar'
        return {
          success: false,
          message: errorMessage,
        }
      }
    },
    {
      body: t.Object({
        file: t.File(),
      }),
    }
  )

  // 2. Layanan Penyajian Berkas Statis /storage/logos/:filename
  .get('/storage/logos/:filename', async ({ params, set }) => {
    const filePath = resolve(LOGOS_STORAGE_DIR, params.filename)
    const file = Bun.file(filePath)

    if (!(await file.exists())) {
      set.status = 404
      return { success: false, message: 'Berkas gambar tidak ditemukan di server penyimpanan.' }
    }

    set.headers['Content-Type'] = 'image/webp'
    set.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    return file
  })

  // 3. Layanan Akses Universal Berkas Statis /storage/*
  .get('/storage/*', async ({ params, set }) => {
    const rawPath = params['*']
    const safePath = join(ROOT_STORAGE_DIR, rawPath)
    const file = Bun.file(safePath)

    if (!(await file.exists())) {
      set.status = 404
      return { success: false, message: 'Berkas tidak ditemukan di server penyimpanan.' }
    }

    set.headers['Content-Type'] = file.type || 'application/octet-stream'
    set.headers['Cache-Control'] = 'public, max-age=86400'
    return file
  })

