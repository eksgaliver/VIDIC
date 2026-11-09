import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { shiftRoutes } from './routes/shifts'

export * from './db/schema'
export * from './routes/shifts'

// Layanan shifting berdiri sendiri: CRUD shift karyawan, jam kerja,
// lokasi kerja, dan titik geofence absensi.
export const shiftingApp = new Elysia({ prefix: '/shifting' })
  .use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    })
  )
  .use(shiftRoutes)
  .onError(({ code, set }) => {
    if (code === 'VALIDATION') {
      set.status = 400
      return { success: false, message: 'Validasi gagal: format input shift tidak sesuai.' }
    }
    set.status = 500
    return { success: false, message: 'Terjadi kesalahan internal pada layanan shifting.' }
  })

if (import.meta.main) {
  const port = Number(process.env.SHIFTING_SERVICE_PORT || process.env.PORT || 3003)
  shiftingApp.listen(port)
  console.log(`Layanan Shifting berjalan pada port ${port}`)
}

export type ShiftingApp = typeof shiftingApp
