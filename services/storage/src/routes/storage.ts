import { Elysia, t } from 'elysia'
import { defaultStorageService, type StorageService } from '../services/StorageService'

export const createStorageRoutes = (storage: StorageService = defaultStorageService) =>
  new Elysia()
    // 1. Unggah Berkas ke Folder Dinamis via Query/Body parameter (folder: 'logos', 'documents', dsb.)
    .post(
      '/upload',
      async ({ body, set }) => {
        try {
          const { file, folder } = body as { file: File; folder?: string }
          if (!file) {
            set.status = 400
            return { success: false, message: 'Berkas wajib disertakan.' }
          }

          const result = await storage.uploadFile(file, { folder: folder || 'general' })

          return {
            success: true,
            url: result.url,
            data: result,
            message: `Berkas berhasil diunggah ke folder '${result.folder}' (${(result.compressedSize / 1024).toFixed(1)} KB)`,
          }
        } catch (err: unknown) {
          set.status = 400
          const msg = err instanceof Error ? err.message : 'Gagal mengunggah berkas'
          return { success: false, message: msg }
        }
      },
      {
        body: t.Object({
          file: t.File(),
          folder: t.Optional(t.String()),
        }),
      }
    )

    // 2. Unggah Berkas ke Subfolder Spesifik via URL Path (/upload/:folder)
    .post(
      '/upload/:folder',
      async ({ params, body, set }) => {
        try {
          const { file } = body as { file: File }
          if (!file) {
            set.status = 400
            return { success: false, message: 'Berkas wajib disertakan.' }
          }

          const result = await storage.uploadFile(file, { folder: params.folder })

          return {
            success: true,
            url: result.url,
            data: result,
            message: `Berkas berhasil disimpan di folder '${result.folder}'`,
          }
        } catch (err: unknown) {
          set.status = 400
          const msg = err instanceof Error ? err.message : 'Gagal memproses berkas'
          return { success: false, message: msg }
        }
      },
      {
        params: t.Object({
          folder: t.String(),
        }),
        body: t.Object({
          file: t.File(),
        }),
      }
    )

    // 3. Layanan Penyajian Berkas Statis dari Subfolder (/storage/:folder/:filename)
    .get('/storage/:folder/:filename', async ({ params, set }) => {
      const file = storage.getFile(params.folder, params.filename)

      if (!(await file.exists())) {
        set.status = 404
        return { success: false, message: 'Berkas tidak ditemukan pada server penyimpanan.' }
      }

      set.headers['Content-Type'] = file.type || 'application/octet-stream'
      set.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
      return file
    })

    // 4. Akses Universal Statis /storage/*
    .get('/storage/*', async ({ params, set }) => {
      const parts = (params['*'] || '').split('/')
      if (parts.length >= 2) {
        const folder = parts[0]
        const filename = parts.slice(1).join('/')
        const file = storage.getFile(folder, filename)
        if (await file.exists()) {
          set.headers['Content-Type'] = file.type || 'application/octet-stream'
          set.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
          return file
        }
      }
      set.status = 404
      return { success: false, message: 'Berkas tidak ditemukan' }
    })

export const storageRoutes = createStorageRoutes()

