import { Elysia, t } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { cors } from '@elysiajs/cors'
import { db } from './db'
import { users, companies, departments, companyLocations, companyOperationalAreas, mail, biodata } from './db/schema'
import { and, eq } from 'drizzle-orm'
import { companyRoutes } from './routes/companies'
import { departmentRoutes } from './routes/departments'
import { employeeRoutes } from './routes/employees'
import { uploadRoutes } from './routes/upload'
import { postRoutes } from './routes/posts'
import { subUserRoutes } from './routes/subusers'
import { handleAvatarUpload, deleteStoredAvatar } from './handlers/uploadHandler'

export { companyRoutes } from './routes/companies'
export { departmentRoutes } from './routes/departments'
export { employeeRoutes } from './routes/employees'
export { uploadRoutes } from './routes/upload'
export { postRoutes } from './routes/posts'
export { subUserRoutes } from './routes/subusers'

interface AuthUser {
  id: string
  companyId?: string | null
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

    // Data Biodata bawaan untuk akun demo dan karyawan awal
    const DEFAULT_BIODATA_MAP: Record<string, any> = {
      'budi.santoso@srikaya.id': {
        nik: '3174051203920001',
        kkNumber: '3174050101180005',
        npwp: '81.423.567.8-015.000',
        bpjsKetenagakerjaan: '21098472910',
        bpjsKesehatan: '0001847291023',
        gender: 'male',
        placeOfBirth: 'Jakarta',
        dateOfBirth: '1992-03-12',
        religion: 'Islam',
        bloodType: 'O',
        maritalStatus: 'married',
        phone: '081289234561',
        emergencyContactName: 'Dewi Lestari',
        emergencyContactPhone: '081298765432',
        emergencyContactRelation: 'Istri',
        addressKtp: 'Jl. Tebet Barat Dalam VII No. 14, RT 004/RW 03',
        addressCurrent: 'Jl. Tebet Barat Dalam VII No. 14, RT 004/RW 03',
        postalCode: '12810',
        city: 'Jakarta Selatan',
        province: 'DKI Jakarta',
        lastEducation: 'D4/S1',
        major: 'Teknik Informatika',
        institution: 'Institut Teknologi Bandung',
        bankName: 'BCA',
        bankAccountNumber: '7120938421',
        bankAccountHolder: 'Budi Santoso',
        isCompleted: true,
        completedAt: new Date()
      },
      'siti.rahma@srikaya.id': {
        nik: '3275034507950002',
        kkNumber: '3275030205190008',
        npwp: '72.819.345.1-017.000',
        bpjsKetenagakerjaan: '21098472911',
        bpjsKesehatan: '0001847291024',
        gender: 'female',
        placeOfBirth: 'Bandung',
        dateOfBirth: '1995-07-15',
        religion: 'Islam',
        bloodType: 'A',
        maritalStatus: 'single',
        phone: '081377889922',
        emergencyContactName: 'Hj. Maryam',
        emergencyContactPhone: '081399887766',
        emergencyContactRelation: 'Ibu Kandung',
        addressKtp: 'Jl. Dago Asri No. 28, RT 002/RW 05',
        addressCurrent: 'Jl. Mampang Prapatan VIII No. 12',
        postalCode: '12790',
        city: 'Jakarta Selatan',
        province: 'DKI Jakarta',
        lastEducation: 'D4/S1',
        major: 'Manajemen SDM / Psikologi',
        institution: 'Universitas Padjadjaran',
        bankName: 'Mandiri',
        bankAccountNumber: '1310018293041',
        bankAccountHolder: 'Siti Rahma',
        isCompleted: true,
        completedAt: new Date()
      },
      'ahmad.fauzi@srikaya.id': {
        nik: '3578012010930003',
        kkNumber: '3578010508170004',
        npwp: '63.928.471.2-021.000',
        bpjsKetenagakerjaan: '21098472912',
        bpjsKesehatan: '0001847291025',
        gender: 'male',
        placeOfBirth: 'Surabaya',
        dateOfBirth: '1993-10-20',
        religion: 'Islam',
        bloodType: 'B',
        maritalStatus: 'married',
        phone: '081233445566',
        emergencyContactName: 'Nurul Hidayah',
        emergencyContactPhone: '081255667788',
        emergencyContactRelation: 'Istri',
        addressKtp: 'Jl. Rungkut Madya No. 45',
        addressCurrent: 'Jl. Panglima Polim XIII No. 7',
        postalCode: '12160',
        city: 'Jakarta Selatan',
        province: 'DKI Jakarta',
        lastEducation: 'D4/S1',
        major: 'Sistem Informasi',
        institution: 'Institut Teknologi Sepuluh Nopember',
        bankName: 'BRI',
        bankAccountNumber: '034101002345501',
        bankAccountHolder: 'Ahmad Fauzi',
        isCompleted: true,
        completedAt: new Date()
      },
      [DEMO_USER.email]: {
        nik: '3171011508880001',
        kkNumber: '3171010204120003',
        npwp: '91.823.412.5-011.000',
        bpjsKetenagakerjaan: '21098472901',
        bpjsKesehatan: '0001847291001',
        gender: 'male',
        placeOfBirth: 'Jakarta',
        dateOfBirth: '1988-08-15',
        religion: 'Islam',
        bloodType: 'O',
        maritalStatus: 'married',
        phone: '08119876543',
        emergencyContactName: 'Rina Kartika',
        emergencyContactPhone: '08119876544',
        emergencyContactRelation: 'Istri',
        addressKtp: 'Jl. Jenderal Sudirman Kav. 52-53, Senayan',
        addressCurrent: 'Jl. Senopati No. 88, Kebayoran Baru',
        postalCode: '12190',
        city: 'Jakarta Selatan',
        province: 'DKI Jakarta',
        lastEducation: 'S2',
        major: 'Manajemen Bisnis & Teknologi',
        institution: 'Universitas Indonesia',
        bankName: 'BCA',
        bankAccountNumber: '5001239841',
        bankAccountHolder: 'Srikaya Administrator',
        isCompleted: true,
        completedAt: new Date()
      }
    }

    // Pastikan setiap karyawan memiliki relasi dengan tabel mail dan baris biodata terisi lengkap
    const allUsers = await db.select().from(users)
    for (const u of allUsers) {
      const defaultBio = DEFAULT_BIODATA_MAP[u.email.toLowerCase()]
      const [existingBiodata] = await db.select().from(biodata).where(eq(biodata.userId, u.id)).limit(1)

      if (!existingBiodata) {
        await db.insert(biodata).values({
          userId: u.id,
          companyId: u.companyId,
          ...(defaultBio || { isCompleted: false })
        })
      } else if (defaultBio && !existingBiodata.isCompleted) {
        await db.update(biodata).set({
          ...defaultBio,
          updatedAt: new Date()
        }).where(eq(biodata.userId, u.id))
      }

      const [existingMail] = await db.select().from(mail).where(eq(mail.userId, u.id)).limit(1)
      if (!existingMail) {
        await db.insert(mail).values({
          userId: u.id,
          companyId: u.companyId,
          senderEmail: 'hr@srikaya.id',
          senderName: 'Departemen HR & Personalia',
          recipientEmail: u.email,
          recipientName: u.name,
          subject: 'Selamat Datang di Srikaya Platform - Informasi Akun & Pengisian Biodata',
          body: `Halo ${u.name},\n\nSelamat bergabung di perusahaan kami! Akun karyawan Anda telah aktif dengan posisi ${u.position || 'Staff'}.\n\nSilakan masuk (login) ke platform menggunakan surel Anda (${u.email}).\n\nSetelah berhasil masuk, mohon segera lengkapi Biodata Karyawan Anda pada menu Profil untuk kelengkapan administrasi kepegawaian, BPJS, dan perpajakan.\n\nSalam hangat,\nDepartemen HR & Personalia`,
          category: 'inbox',
          isRead: false,
          isStarred: true
        })
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

// Nama perusahaan ikut dikirim agar klien web dan mobile tidak perlu permintaan tambahan
async function resolveCompanyName(companyId?: string | null): Promise<string | null> {
  if (!companyId) return null

  try {
    const [row] = await db.select({ name: companies.name }).from(companies).where(eq(companies.id, companyId)).limit(1)
    return row?.name ?? null
  } catch {
    return null
  }
}

async function toPublicUser(user: AuthUser) {
  return {
    id: user.id,
    companyId: user.companyId ?? null,
    companyName: await resolveCompanyName(user.companyId),
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
      role: foundUser.role,
      companyId: foundUser.companyId ?? null
    })

    return {
      success: true,
      token,
      user: await toPublicUser(foundUser),
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
      user: await toPublicUser(current)
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
        user: await toPublicUser(DEMO_USER),
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
      user: await toPublicUser({ ...updated, role: updated.role as AuthUser['role'] }),
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
          user: await toPublicUser(DEMO_USER),
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
        user: await toPublicUser({ ...updated, role: updated.role as AuthUser['role'] }),
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
        user: await toPublicUser(DEMO_USER),
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
      user: await toPublicUser({ ...updated, role: updated.role as AuthUser['role'] }),
      message: 'Foto profil berhasil dihapus'
    }
  })
  // Ambil Biodata Karyawan yang Sedang Login
  .get('/biodata', async ({ headers, jwt, set }) => {
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

    const [row] = await db
      .select()
      .from(biodata)
      .where(eq(biodata.userId, current.id))
      .limit(1)

    return {
      success: true,
      data: row || {
        userId: current.id,
        isCompleted: false
      }
    }
  })
  // Lengkapi atau Perbarui Biodata Karyawan Setelah Login
  .put('/biodata', async ({ headers, body, jwt, set }) => {
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

    const [existing] = await db
      .select()
      .from(biodata)
      .where(eq(biodata.userId, current.id))
      .limit(1)

    const payloadValues = {
      nik: body.nik?.trim() || null,
      kkNumber: body.kkNumber?.trim() || null,
      npwp: body.npwp?.trim() || null,
      bpjsKetenagakerjaan: body.bpjsKetenagakerjaan?.trim() || null,
      bpjsKesehatan: body.bpjsKesehatan?.trim() || null,
      gender: body.gender?.trim() || null,
      placeOfBirth: body.placeOfBirth?.trim() || null,
      dateOfBirth: body.dateOfBirth?.trim() || null,
      religion: body.religion?.trim() || null,
      bloodType: body.bloodType?.trim() || null,
      maritalStatus: body.maritalStatus?.trim() || null,
      phone: body.phone?.trim() || null,
      emergencyContactName: body.emergencyContactName?.trim() || null,
      emergencyContactPhone: body.emergencyContactPhone?.trim() || null,
      emergencyContactRelation: body.emergencyContactRelation?.trim() || null,
      addressKtp: body.addressKtp?.trim() || null,
      addressCurrent: body.addressCurrent?.trim() || null,
      postalCode: body.postalCode?.trim() || null,
      city: body.city?.trim() || null,
      province: body.province?.trim() || null,
      lastEducation: body.lastEducation?.trim() || null,
      major: body.major?.trim() || null,
      institution: body.institution?.trim() || null,
      bankName: body.bankName?.trim() || null,
      bankAccountNumber: body.bankAccountNumber?.trim() || null,
      bankAccountHolder: body.bankAccountHolder?.trim() || null,
      isCompleted: true,
      completedAt: new Date(),
      updatedAt: new Date()
    }

    if (existing) {
      const [updated] = await db
        .update(biodata)
        .set(payloadValues)
        .where(eq(biodata.userId, current.id))
        .returning()

      return {
        success: true,
        data: updated,
        message: 'Biodata karyawan berhasil disimpan dan diverifikasi lengkap.'
      }
    }

    const [created] = await db
      .insert(biodata)
      .values({
        userId: current.id,
        companyId: current.companyId || null,
        ...payloadValues
      })
      .returning()

    return {
      success: true,
      data: created,
      message: 'Biodata karyawan berhasil dilengkapi.'
    }
  }, {
    body: t.Object({
      nik: t.Optional(t.String()),
      kkNumber: t.Optional(t.String()),
      npwp: t.Optional(t.String()),
      bpjsKetenagakerjaan: t.Optional(t.String()),
      bpjsKesehatan: t.Optional(t.String()),
      gender: t.Optional(t.String()),
      placeOfBirth: t.Optional(t.String()),
      dateOfBirth: t.Optional(t.String()),
      religion: t.Optional(t.String()),
      bloodType: t.Optional(t.String()),
      maritalStatus: t.Optional(t.String()),
      phone: t.Optional(t.String()),
      emergencyContactName: t.Optional(t.String()),
      emergencyContactPhone: t.Optional(t.String()),
      emergencyContactRelation: t.Optional(t.String()),
      addressKtp: t.Optional(t.String()),
      addressCurrent: t.Optional(t.String()),
      postalCode: t.Optional(t.String()),
      city: t.Optional(t.String()),
      province: t.Optional(t.String()),
      lastEducation: t.Optional(t.String()),
      major: t.Optional(t.String()),
      institution: t.Optional(t.String()),
      bankName: t.Optional(t.String()),
      bankAccountNumber: t.Optional(t.String()),
      bankAccountHolder: t.Optional(t.String())
    })
  })
  // Ambil Seluruh Surat / Pesan Internal Karyawan yang Login
  .get('/mail', async ({ headers, jwt, set }) => {
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

    const mails = await db
      .select()
      .from(mail)
      .where(eq(mail.userId, current.id))
      .orderBy(mail.createdAt)

    return {
      success: true,
      data: mails
    }
  })
  // Tandai Surat Sebagai Dibaca
  .patch('/mail/:id/read', async ({ headers, params, jwt, set }) => {
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

    const [updated] = await db
      .update(mail)
      .set({ isRead: true, updatedAt: new Date() })
      .where(and(eq(mail.id, params.id), eq(mail.userId, current.id)))
      .returning()

    if (!updated) {
      set.status = 404
      return { success: false, message: 'Surat tidak ditemukan.' }
    }

    return {
      success: true,
      data: updated,
      message: 'Surat ditandai telah dibaca.'
    }
  }, {
    params: t.Object({ id: t.String() })
  })

// Aplikasi Layanan Auth lengkap (Termasuk Otentikasi, Perusahaan & Departemen)
export const authApp = new Elysia()
  .use(authService)
  .use(companyRoutes)
  .use(departmentRoutes)
  .use(employeeRoutes)
  .use(uploadRoutes)
  .use(postRoutes)
  .use(subUserRoutes)

// Jalankan server jika dieksekusi langsung
if (import.meta.main) {
  const port = Number(process.env.AUTH_SERVICE_PORT || process.env.PORT || 3001)
  authApp.listen(port)
  console.log(`Layanan Auth & Organisasi berjalan pada port ${port}`)
}

export type AuthService = typeof authService
export type AuthApp = typeof authApp
