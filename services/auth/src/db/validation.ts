import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import { companies, companyLocations, users } from './schema'

// 1. Skema Validasi Perusahaan
export const insertCompanySchema = createInsertSchema(companies, {
  code: (schema) => schema.min(2, 'Kode perusahaan minimal 2 karakter').max(50, 'Kode maksimal 50 karakter'),
  name: (schema) => schema.min(2, 'Nama resmi perusahaan minimal 2 karakter').max(255, 'Nama maksimal 255 karakter'),
  brandName: (schema) => schema.max(150, 'Nama merk maksimal 150 karakter').optional(),
  email: (schema) => schema.email('Alamat surel tidak valid'),
  phone: (schema) => schema.max(50, 'Nomor telepon maksimal 50 karakter').optional(),
  industry: (schema) => schema.max(100, 'Sektor industri maksimal 100 karakter').optional(),
  website: (schema) => schema.url('Tautan situs web tidak valid').optional().or(schema.literal('')),
  status: (schema) => z.enum(['active', 'suspended', 'inactive']).default('active')
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
})

export const selectCompanySchema = createSelectSchema(companies)

export type InsertCompany = z.infer<typeof insertCompanySchema>
export type SelectCompany = z.infer<typeof selectCompanySchema>

// 2. Skema Validasi Lokasi Operasional (Geofence Absensi)
export const insertCompanyLocationSchema = createInsertSchema(companyLocations, {
  name: (schema) => schema.min(2, 'Nama titik lokasi minimal 2 karakter').max(150, 'Nama maksimal 150 karakter'),
  address: (schema) => schema.min(5, 'Alamat fisik kantor minimal 5 karakter'),
  city: (schema) => schema.min(2, 'Nama kota minimal 2 karakter').max(100, 'Nama kota maksimal 100 karakter'),
  province: (schema) => schema.max(100, 'Nama provinsi maksimal 100 karakter').optional(),
  postalCode: (schema) => schema.max(10, 'Kode pos maksimal 10 karakter').optional(),
  latitude: (schema) => schema.refine((val) => !isNaN(Number(val)) && Number(val) >= -90 && Number(val) <= 90, {
    message: 'Latitude harus bernilai antara -90 dan 90 derajat'
  }),
  longitude: (schema) => schema.refine((val) => !isNaN(Number(val)) && Number(val) >= -180 && Number(val) <= 180, {
    message: 'Longitude harus bernilai antara -180 dan 180 derajat'
  }),
  radiusMeters: (schema) => schema.min(10, 'Radius minimal 10 meter').max(5000, 'Radius maksimal 5000 meter').default(100),
  timezone: (schema) => z.enum(['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']).default('Asia/Jakarta'),
  isPrimary: (schema) => z.boolean().default(false),
  status: (schema) => z.enum(['active', 'inactive']).default('active')
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
})

export const selectCompanyLocationSchema = createSelectSchema(companyLocations)

export type InsertCompanyLocation = z.infer<typeof insertCompanyLocationSchema>
export type SelectCompanyLocation = z.infer<typeof selectCompanyLocationSchema>

// 3. Skema Validasi Pengguna
export const insertUserSchema = createInsertSchema(users, {
  name: (schema) => schema.min(2, 'Nama minimal 2 karakter'),
  email: (schema) => schema.email('Format surel tidak valid')
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
})

export const selectUserSchema = createSelectSchema(users)

