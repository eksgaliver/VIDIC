import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

export interface AuthenticatedUser {
  id: string
  companyId: string | null
  email: string
  role: string
  name: string
  position?: string | null
}

export async function resolveTenantUser(
  headers: Record<string, string | undefined>,
  jwtInstance: any
): Promise<AuthenticatedUser | null> {
  const authHeader = headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  try {
    const payload = (await jwtInstance.verify(authHeader.slice(7))) as { sub?: string }
    if (!payload?.sub) return null

    const [row] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1)
    if (!row) return null

    return {
      id: row.id,
      companyId: row.companyId ?? null,
      email: row.email,
      role: row.role,
      name: row.name,
      position: row.position
    }
  } catch {
    return null
  }
}

export function assertCompanyAccess(
  user: AuthenticatedUser | null,
  targetCompanyId: string | undefined | null
): { allowed: boolean; message: string } {
  if (!user) {
    return { allowed: false, message: 'Autentikasi diperlukan. Silakan masuk terlebih dahulu.' }
  }

  if (user.role === 'superadmin') {
    return { allowed: true, message: 'Akses diizinkan (Superadmin)' }
  }

  if (!user.companyId) {
    return { allowed: false, message: 'Akun Anda belum ditautkan ke perusahaan manapun.' }
  }

  if (!targetCompanyId) {
    return { allowed: true, message: 'Akses diizinkan (Konteks perusahaan sendiri)' }
  }

  if (user.companyId !== targetCompanyId) {
    return {
      allowed: false,
      message: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengakses data perusahaan lain.'
    }
  }

  return { allowed: true, message: 'Akses diizinkan' }
}

