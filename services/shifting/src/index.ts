import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { shiftRoutes } from './routes/shifts'
import { attendanceRoutes, ensureAttendanceStatuses } from './routes/attendance'

export * from './db/schema'
export * from './routes/shifts'
export * from './routes/attendance'

// Layanan shifting berdiri sendiri: CRUD shift karyawan, jam kerja,
// lokasi kerja, titik geofence absensi, dan pencatatan presensi harian.
export const shiftingApp = new Elysia({ prefix: '/shifting' })
  .use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    })
  )
  .use(shiftRoutes)
  .use(attendanceRoutes)
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

  // Pastikan setiap perusahaan memiliki master status absensi bawaan
  ensureAttendanceStatuses()
    .then(() => console.log('[SEED] Master status absensi siap.'))
    .catch((error) => console.error('[SEED] Gagal menyiapkan master status absensi:', error))
}

export type ShiftingApp = typeof shiftingApp
