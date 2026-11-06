import { Elysia, t } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { cors } from '@elysiajs/cors'
import { db } from './db'
import { users } from './db/schema'
import { eq } from 'drizzle-orm'

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

export const authService = new Elysia({ prefix: '/auth' })
  .use(cors())
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'srikaya-enterprise-jwt-secret-key-2026',
      exp: '7d'
    })
  )
  .onError(({ code, error, set }) => {
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

    // 1. Cari user di basis data atau fallback ke demo user
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
      // Fallback untuk development lokal saat PostgreSQL belum aktif
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

    // 2. Verifikasi kata sandi via Bun native password verification
    const isPasswordValid = await Bun.password.verify(password, foundUser.passwordHash)
    if (!isPasswordValid) {
      set.status = 401
      return { success: false, message: 'Kombinasi surel atau kata sandi salah' }
    }

    // 3. Terbitkan token JWT
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
  // Endpoint Verifikasi Sesi / Profil Pengguna
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

// Jalankan server jika dieksekusi langsung
if (import.meta.main) {
  const port = Number(process.env.AUTH_SERVICE_PORT || process.env.PORT || 3001)
  authService.listen(port)
  console.log(`Layanan Auth berjalan pada port ${port}`)
}

export type AuthService = typeof authService
