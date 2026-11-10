import { db } from '../db'
import { companies, departments, users, companyLocations, companyOperationalAreas } from '../db/schema'
import { eq } from 'drizzle-orm'

export async function seedSecondCompany() {
  console.log('[SEED] Memeriksa keberadaan perusahaan kedua (PT Nusantara Logistik Prima)...')
  
  const existing = await db.select().from(companies).where(eq(companies.code, 'NLP')).limit(1)
  if (existing.length > 0) {
    console.log('[SEED] Perusahaan kedua sudah ada:', existing[0].name)
    return existing[0]
  }

  const [compB] = await db.insert(companies).values({
    code: 'NLP',
    name: 'PT Nusantara Logistik Prima',
    brandName: 'Nusantara Express',
    email: 'kontak@nusantara.id',
    phone: '031-7788990',
    industry: 'Logistik & Rantai Pasok',
    website: 'https://nusantara.id',
    status: 'active'
  }).returning()

  // 1. Lokasi Primer
  const [locB] = await db.insert(companyLocations).values({
    companyId: compB.id,
    name: 'Depo Utama Tanjung Perak',
    address: 'Jl. Perak Barat No. 88',
    city: 'Surabaya',
    province: 'Jawa Timur',
    postalCode: '60165',
    latitude: '-7.2052000',
    longitude: '112.7328000',
    radiusMeters: 150,
    coordinatesType: 'point',
    timezone: 'Asia/Jakarta',
    isPrimary: true,
    status: 'active'
  }).returning()

  // 2. Wilayah Operasional
  await db.insert(companyOperationalAreas).values([
    { companyId: compB.id, province: 'Jawa Timur', city: 'Kota Surabaya', status: 'active' },
    { companyId: compB.id, province: 'Jawa Timur', city: 'Kabupaten Sidoarjo', status: 'active' },
    { companyId: compB.id, province: 'Jawa Tengah', city: 'Kota Semarang', status: 'active' }
  ])

  // 3. Departemen (HR Wajib & Operasional Logistik)
  const [hrDept] = await db.insert(departments).values({
    companyId: compB.id,
    code: 'HR',
    name: 'Sumber Daya Manusia',
    description: 'Departemen HR & Personalia',
    isMandatory: true,
    status: 'active'
  }).returning()

  const [opsDept] = await db.insert(departments).values({
    companyId: compB.id,
    code: 'LOG',
    name: 'Operasional Distribusi',
    description: 'Divisi pengelolaan rantai pasok dan armada',
    isMandatory: false,
    status: 'active'
  }).returning()

  // 4. Sub-User Perusahaan B
  const passwordHash = await Bun.password.hash('password', { algorithm: 'bcrypt', cost: 10 })

  const [adminB] = await db.insert(users).values({
    companyId: compB.id,
    departmentId: hrDept.id,
    name: 'Bambang Sudarsono',
    email: 'admin@nusantara.id',
    passwordHash,
    position: 'Kepala Operasional Cabang',
    role: 'admin',
    status: 'active'
  }).returning()

  await db.insert(users).values([
    {
      companyId: compB.id,
      departmentId: opsDept.id,
      name: 'Dewi Lestari',
      email: 'dewi.lestari@nusantara.id',
      passwordHash,
      position: 'Koordinator Distribusi Barang',
      supervisorId: adminB.id,
      role: 'member',
      status: 'active'
    },
    {
      companyId: compB.id,
      departmentId: opsDept.id,
      name: 'Hendra Wijaya',
      email: 'hendra.wijaya@nusantara.id',
      passwordHash,
      position: 'Pengemudi Armada Eksekutif',
      supervisorId: adminB.id,
      role: 'member',
      status: 'active'
    }
  ])

  console.log('[SEED] Berhasil menginisialisasi PT Nusantara Logistik Prima beserta sub-usernya.')
  return compB
}

if (import.meta.main) {
  await seedSecondCompany()
  process.exit(0)
}
