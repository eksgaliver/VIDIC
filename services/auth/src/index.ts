import { Elysia, t } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { cors } from '@elysiajs/cors'
import { db } from './db'
import { users, companies, departments, companyLocations, companyOperationalAreas } from './db/schema'
import { and, eq } from 'drizzle-orm'
import { companyRoutes } from './routes/companies'
import { departmentRoutes } from './routes/departments'
import { employeeRoutes } from './routes/employees'
import { uploadRoutes } from './routes/upload'
import { handleAvatarUpload, deleteStoredAvatar } from './handlers/uploadHandler'

export { companyRoutes } from './routes/companies'
export { departmentRoutes } from './routes/departments'
export { employeeRoutes } from './routes/employees'
export { uploadRoutes } from './routes/upload'

interface AuthUser {
  id: string
  name: string
  email: string
  passwordHash: string
  avatarUrl: string | null
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
  avatarUrl: null,
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

      // Buat Pengguna & Karyawan Awal jika belum ada
      const existingUser = await db.select().from(users).where(eq(users.email, DEMO_USER.email)).limit(1)
      if (existingUser.length === 0) {
        const [adminUser] = await db.insert(users).values({
          id: DEMO_USER.id,
          companyId: comp.id,
          name: DEMO_USER.name,
          email: DEMO_USER.email,
          passwordHash: DEMO_USER.passwordHash,
          position: 'Direktur Operasional',
          role: 'admin',
          status: 'active'
        }).returning()

        const [itDept] = await db.select().from(departments).where(and(eq(departments.companyId, comp.id), eq(departments.code, 'IT'))).limit(1)
        const [hrDept] = await db.select().from(departments).where(and(eq(departments.companyId, comp.id), eq(departments.code, 'HR'))).limit(1)

        await db.insert(users).values([
          {
            companyId: comp.id,
            departmentId: itDept?.id,
            name: 'Budi Santoso',
            email: 'budi.santoso@srikaya.id',
            passwordHash: DEMO_USER.passwordHash,
            position: 'Staff Rekayasa Perangkat Lunak',
            supervisorId: adminUser.id,
            role: 'member',
            status: 'active'
          },
          {
            companyId: comp.id,
            departmentId: hrDept?.id,
            name: 'Siti Rahma',
            email: 'siti.rahma@srikaya.id',
            passwordHash: DEMO_USER.passwordHash,
            position: 'Spesialis Sumber Daya Manusia',
            supervisorId: adminUser.id,
            role: 'member',
            status: 'active'
          }
        ])
      }

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

      const [existingAdmin] = await db.select().from(users).where(eq(users.email, DEMO_USER.email)).limit(1)
      let adminId = existingAdmin?.id

      if (!existingAdmin) {
        const [adminUser] = await db.insert(users).values({
          id: DEMO_USER.id,
          companyId: comp.id,
          name: DEMO_USER.name,
          email: DEMO_USER.email,
          passwordHash: DEMO_USER.passwordHash,
          position: 'Direktur Operasional',
          role: 'admin',
          status: 'active'
        }).returning()
        adminId = adminUser.id
      }

      const existingEmployees = await db.select().from(users).where(eq(users.email, 'budi.santoso@srikaya.id')).limit(1)
      if (existingEmployees.length === 0) {
        const [itDept] = await db.select().from(departments).where(and(eq(departments.companyId, comp.id), eq(departments.code, 'IT'))).limit(1)
        const [hrDept] = await db.select().from(departments).where(and(eq(departments.companyId, comp.id), eq(departments.code, 'HR'))).limit(1)

        await db.insert(users).values([
          {
            companyId: comp.id,
            departmentId: itDept?.id,
            name: 'Budi Santoso',
            email: 'budi.santoso@srikaya.id',
            passwordHash: DEMO_USER.passwordHash,
            position: 'Staff Rekayasa Perangkat Lunak',
            supervisorId: adminId,
            role: 'member',
            status: 'active'
          },
          {
            companyId: comp.id,
            departmentId: hrDept?.id,
            name: 'Siti Rahma',
            email: 'siti.rahma@srikaya.id',
            passwordHash: DEMO_USER.passwordHash,
            position: 'Spesialis Sumber Daya Manusia',
            supervisorId: adminId,
            role: 'member',
            status: 'active'
          }
        ])
        console.log('[SEED] Menambahkan karyawan aktif default untuk perusahaan yang ada.')
      }
    }
  } catch (err) {
    // Database connection or table might be synchronizing
  }
}

// Jalankan seed saat servis dimuat
seedDefaultData()

// Ambil pengguna aktif dari payload JWT. Akun demo hanya dipakai jika basis data tidak tersedia.
async function resolveSessionUser(payload: unknown): Promise<AuthUser | null> {
  if (!payload || typeof payload !== 'object') return null

  const id = String((payload as { sub?: unknown }).sub ?? '')
  if (!id) return null

  try {
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1)
    if (row) return { ...row, role: row.role as AuthUser['role'] }
  } catch {
    // Basis data tidak tersedia: hanya akun demo yang boleh melanjutkan sesi
  }

  return id === DEMO_USER.id ? DEMO_USER : null
}

function toPublicUser(user: AuthUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt
  }
}

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
        avatarUrl: foundUser.avatarUrl ?? null,
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

    const payload = await jwt.verify(authHeader.slice(7))
    const current = await resolveSessionUser(payload)

    if (!current) {
      set.status = 401
      return { success: false, message: 'Sesi tidak lagi valid. Silakan masuk kembali.' }
    }

    return {
      success: true,
      user: toPublicUser(current)
    }
  })
  // Endpoint Perbarui Profil Akun
  .put('/profile', async ({ headers, body, jwt, set }) => {
    const authHeader = headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return { success: false, message: 'Token otorisasi tidak ditemukan' }
    }

    const payload = await jwt.verify(authHeader.slice(7))
    const current = await resolveSessionUser(payload)

    if (!current) {
      set.status = 401
      return { success: false, message: 'Sesi tidak lagi valid. Silakan masuk kembali.' }
    }

    const name = body.name.trim()
    const email = body.email.trim().toLowerCase()

    if (name.length < 2) {
      set.status = 400
      return { success: false, message: 'Nama minimal 2 karakter' }
    }

    const isDemoAccount = current.id === DEMO_USER.id

    let emailOwner: { id: string } | undefined
    try {
      const [owner] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1)
      emailOwner = owner
    } catch (err) {
      if (!isDemoAccount) throw err
    }

    if (emailOwner && emailOwner.id !== current.id) {
      set.status = 400
      return { success: false, message: 'Alamat surel sudah dipakai akun lain' }
    }

    if (isDemoAccount) {
      DEMO_USER.name = name
      DEMO_USER.email = email
      DEMO_USER.updatedAt = new Date()

      return {
        success: true,
        user: toPublicUser(DEMO_USER),
        message: 'Profil akun demo diperbarui untuk sesi berjalan'
      }
    }

    const [updated] = await db
      .update(users)
      .set({ name, email, updatedAt: new Date() })
      .where(eq(users.id, current.id))
      .returning()

    return {
      success: true,
      user: toPublicUser({ ...updated, role: updated.role as AuthUser['role'] }),
      message: 'Profil berhasil diperbarui'
    }
  }, {
    body: t.Object({
      name: t.String({ minLength: 2, maxLength: 255 }),
      email: t.String({ format: 'email' })
    })
  })
  // Unggah atau ganti foto profil
  .post('/avatar', async ({ headers, body, jwt, set }) => {
    const authHeader = headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return { success: false, message: 'Token otorisasi tidak ditemukan' }
    }

    const payload = await jwt.verify(authHeader.slice(7))
    const current = await resolveSessionUser(payload)

    if (!current) {
      set.status = 401
      return { success: false, message: 'Sesi tidak lagi valid. Silakan masuk kembali.' }
    }

    const file = (body as { file?: File }).file
    if (!file) {
      set.status = 400
      return { success: false, message: 'Berkas foto profil wajib disertakan' }
    }

    try {
      const upload = await handleAvatarUpload(file)
      const previousAvatar = current.avatarUrl

      if (current.id === DEMO_USER.id) {
        DEMO_USER.avatarUrl = upload.url
        DEMO_USER.updatedAt = new Date()

        await deleteStoredAvatar(previousAvatar)

        return {
          success: true,
          user: toPublicUser(DEMO_USER),
          upload,
          message: 'Foto profil berhasil diperbarui'
        }
      }

      const [updated] = await db
        .update(users)
        .set({ avatarUrl: upload.url, updatedAt: new Date() })
        .where(eq(users.id, current.id))
        .returning()

      await deleteStoredAvatar(previousAvatar)

      return {
        success: true,
        user: toPublicUser({ ...updated, role: updated.role as AuthUser['role'] }),
        upload,
        message: 'Foto profil berhasil diperbarui'
      }
    } catch (err: unknown) {
      set.status = 400
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Gagal memproses foto profil'
      }
    }
  }, {
    body: t.Object({
      file: t.File()
    })
  })
  // Hapus foto profil
  .delete('/avatar', async ({ headers, jwt, set }) => {
    const authHeader = headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return { success: false, message: 'Token otorisasi tidak ditemukan' }
    }

    const payload = await jwt.verify(authHeader.slice(7))
    const current = await resolveSessionUser(payload)

    if (!current) {
      set.status = 401
      return { success: false, message: 'Sesi tidak lagi valid. Silakan masuk kembali.' }
    }

    const previousAvatar = current.avatarUrl

    if (current.id === DEMO_USER.id) {
      DEMO_USER.avatarUrl = null
      DEMO_USER.updatedAt = new Date()

      await deleteStoredAvatar(previousAvatar)

      return {
        success: true,
        user: toPublicUser(DEMO_USER),
        message: 'Foto profil berhasil dihapus'
      }
    }

    const [updated] = await db
      .update(users)
      .set({ avatarUrl: null, updatedAt: new Date() })
      .where(eq(users.id, current.id))
      .returning()

    await deleteStoredAvatar(previousAvatar)

    return {
      success: true,
      user: toPublicUser({ ...updated, role: updated.role as AuthUser['role'] }),
      message: 'Foto profil berhasil dihapus'
    }
  })

// Aplikasi Layanan Auth lengkap (Termasuk Otentikasi, Perusahaan & Departemen)
export const authApp = new Elysia()
  .use(authService)
  .use(companyRoutes)
  .use(departmentRoutes)
  .use(employeeRoutes)
  .use(uploadRoutes)

// Jalankan server jika dieksekusi langsung
if (import.meta.main) {
  const port = Number(process.env.AUTH_SERVICE_PORT || process.env.PORT || 3001)
  authApp.listen(port)
  console.log(`Layanan Auth & Organisasi berjalan pada port ${port}`)
}

export type AuthService = typeof authService
export type AuthApp = typeof authApp
