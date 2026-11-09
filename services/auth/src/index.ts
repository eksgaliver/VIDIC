import { Elysia, t } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { cors } from '@elysiajs/cors'
import { db } from './db'
import { users, companies, departments, companyLocations, companyOperationalAreas } from './db/schema'
import { eq } from 'drizzle-orm'
import { companyRoutes } from './routes/companies'
import { departmentRoutes } from './routes/departments'
import { uploadRoutes } from './routes/upload'

export { companyRoutes } from './routes/companies'
export { departmentRoutes } from './routes/departments'
export { uploadRoutes } from './routes/upload'

interface AuthUser {
  id: string
  name: string
  email: string
  passwordHash: string
  role: 'admin' | 'member'
  createdAt: Date
  updatedAt: Date
}

// Inisialisasi user demo untuk lingkungan pengembangan
const DEMO_USER: AuthUser = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  name: process.env.APP_NAME ? `${process.env.APP_NAME} Operator` : 'Srikaya Operator',
  email: 'admin@srikaya.id',
  passwordHash: await Bun.password.hash('rahasia123', { algorithm: 'bcrypt', cost: 10 }),
  role: 'admin',
  createdAt: new Date(),
  updatedAt: new Date()
}

// Fungsi inisialisasi data bawaan (Perusahaan & Departemen Wajib HR)
async function seedDefaultData() {
  try {
    const existing = await db.select().from(companies).limit(1)
    if (existing.length === 0) {
      console.log('[SEED] Menginisialisasi data bawaan perusahaan dan departemen wajib HR...')
      const [comp] = await db.insert(companies).values({
        code: 'SRK',
        name: 'PT Srikaya Digital Solusindo',
        brandName: 'Srikaya Tech',
        email: 'kontak@srikaya.id',
        phone: '021-5550123',
        industry: 'Teknologi Informasi',
        website: 'https://srikaya.id',
        status: 'active'
      }).returning()

      // Buat Departemen Wajib: HR dan departemen awal lainnya
      await db.insert(departments).values([
        {
          companyId: comp.id,
          code: 'HR',
          name: 'Human Resources',
          description: 'Pengelolaan Sumber Daya Manusia, Personalia & Rekrutmen (Departemen Wajib)',
          isMandatory: true,
          status: 'active'
        },
        {
          companyId: comp.id,
          code: 'IT',
          name: 'Teknologi Informasi & Rekayasa',
          description: 'Pengembangan arsitektur sistem, infrastruktur & pemeliharaan aplikasi',
          isMandatory: false,
          status: 'active'
        },
        {
          companyId: comp.id,
          code: 'OPS',
          name: 'Operasional & Layanan',
          description: 'Manajemen operasional harian, kepatuhan & logistik',
          isMandatory: false,
          status: 'active'
        }
      ])

      // Buat Lokasi Geofence Primer
      await db.insert(companyLocations).values({
        companyId: comp.id,
        name: 'Kantor Pusat Jakarta',
        address: 'Jl. Jenderal Sudirman Kav. 52-53, Senayan',
        city: 'Jakarta Selatan',
        province: 'DKI Jakarta',
        postalCode: '12190',
        latitude: '-6.2250140',
        longitude: '106.8097560',
        radiusMeters: 100,
        timezone: 'Asia/Jakarta',
        isPrimary: true,
        status: 'active'
      })

      // Buat Wilayah & Kota Operasional Bawaan
      await db.insert(companyOperationalAreas).values([
        { companyId: comp.id, province: 'DKI Jakarta', city: 'Jakarta Selatan', status: 'active' },
        { companyId: comp.id, province: 'DKI Jakarta', city: 'Jakarta Pusat', status: 'active' },
        { companyId: comp.id, province: 'DKI Jakarta', city: 'Jakarta Barat', status: 'active' },
        { companyId: comp.id, province: 'Jawa Barat', city: 'Kota Bandung', status: 'active' },
        { companyId: comp.id, province: 'Jawa Barat', city: 'Kota Bekasi', status: 'active' },
        { companyId: comp.id, province: 'Jawa Timur', city: 'Kota Surabaya', status: 'active' }
      ])

      console.log('[SEED] Inisialisasi selesai: PT Srikaya Digital Solusindo + Departemen Wajib HR + Wilayah Operasional siap digunakan.')
    } else {
      // Pastikan perusahaan yang sudah ada juga memiliki wilayah operasional default jika masih kosong
      const [comp] = existing
      const existingAreas = await db.select().from(companyOperationalAreas).where(eq(companyOperationalAreas.companyId, comp.id)).limit(1)
      if (existingAreas.length === 0) {
        await db.insert(companyOperationalAreas).values([
          { companyId: comp.id, province: 'DKI Jakarta', city: 'Jakarta Selatan', status: 'active' },
          { companyId: comp.id, province: 'DKI Jakarta', city: 'Jakarta Pusat', status: 'active' },
          { companyId: comp.id, province: 'DKI Jakarta', city: 'Jakarta Barat', status: 'active' },
          { companyId: comp.id, province: 'Jawa Barat', city: 'Kota Bandung', status: 'active' },
          { companyId: comp.id, province: 'Jawa Barat', city: 'Kota Bekasi', status: 'active' },
          { companyId: comp.id, province: 'Jawa Timur', city: 'Kota Surabaya', status: 'active' }
        ])
        console.log('[SEED] Menambahkan wilayah operasional default untuk perusahaan yang ada.')
      }
    }
  } catch (err) {
    // Database connection or table might be synchronizing
  }
}

// Jalankan seed saat servis dimuat
seedDefaultData()

export const authService = new Elysia({ prefix: '/auth' })
  .use(cors())
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'srikaya-enterprise-jwt-secret-key-2026',
      exp: '7d'
    })
  )
  .onError(({ code, set }) => {
    if (code === 'VALIDATION') {
      set.status = 400
      return { success: false, message: 'Validasi gagal: format input tidak sesuai' }
    }
    set.status = 500
    return { success: false, message: 'Terjadi kesalahan internal pada layanan autentikasi' }
  })
  // Endpoint Login
  .post('/login', async ({ body, jwt, set }) => {
    const { email, password } = body

    let foundUser: AuthUser | null = null

    try {
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1)
      if (result.length > 0) {
        foundUser = {
          ...result[0],
          role: result[0].role as 'admin' | 'member'
        }
      }
    } catch {
      if (email.toLowerCase() === DEMO_USER.email.toLowerCase()) {
        foundUser = DEMO_USER
      }
    }

    if (!foundUser && email.toLowerCase() === DEMO_USER.email.toLowerCase()) {
      foundUser = DEMO_USER
    }

    if (!foundUser) {
      set.status = 401
      return { success: false, message: 'Kombinasi surel atau kata sandi salah' }
    }

    const isPasswordValid = await Bun.password.verify(password, foundUser.passwordHash)
    if (!isPasswordValid) {
      set.status = 401
      return { success: false, message: 'Kombinasi surel atau kata sandi salah' }
    }

    const token = await jwt.sign({
      sub: foundUser.id,
      email: foundUser.email,
      role: foundUser.role
    })

    return {
      success: true,
      token,
      user: {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role,
        createdAt: foundUser.createdAt
      },
      message: 'Autentikasi berhasil'
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 6 })
    })
  })
  // Endpoint Verifikasi Sesi
  .get('/me', async ({ headers, jwt, set }) => {
    const authHeader = headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return { success: false, message: 'Token otorisasi tidak ditemukan' }
    }

    const token = authHeader.slice(7)
    const payload = await jwt.verify(token)

    if (!payload) {
      set.status = 401
      return { success: false, message: 'Token kadaluarsa atau tidak sah' }
    }

    return {
      success: true,
      user: {
        id: String(payload.sub),
        email: String(payload.email),
        role: String(payload.role)
      }
    }
  })

// Aplikasi Layanan Auth lengkap (Termasuk Otentikasi, Perusahaan & Departemen)
export const authApp = new Elysia()
  .use(authService)
  .use(companyRoutes)
  .use(departmentRoutes)
  .use(uploadRoutes)

// Jalankan server jika dieksekusi langsung
if (import.meta.main) {
  const port = Number(process.env.AUTH_SERVICE_PORT || process.env.PORT || 3001)
  authApp.listen(port)
  console.log(`Layanan Auth & Organisasi berjalan pada port ${port}`)
}

export type AuthService = typeof authService
export type AuthApp = typeof authApp
