import { z } from 'zod'

// 1. Skema Validasi Login
export const loginSchema = z.object({
  email: z.string().trim().email('Format surel tidak valid'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter')
})

export type LoginInput = z.infer<typeof loginSchema>

// 2. Data Transfer Object (DTO) Pengguna
export const userDtoSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().nullable().optional(),
  companyName: z.string().nullable().optional(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['admin', 'member', 'guest', 'superadmin']),
  avatarUrl: z.string().nullable().optional(),
  createdAt: z.string().or(z.date())
})

export type UserDTO = z.infer<typeof userDtoSchema>

// 3. Respon Autentikasi
export const authResponseSchema = z.object({
  success: z.boolean(),
  token: z.string().optional(),
  user: userDtoSchema.optional(),
  message: z.string().optional()
})

export type AuthResponse = z.infer<typeof authResponseSchema>

// 4. Data Wilayah Indonesia (38 Provinsi & Kota/Kabupaten)
export * from './indonesia-regions'


