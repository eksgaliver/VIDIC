import { Elysia, t } from 'elysia'
import { db } from '../db'
import { companies, companyLocations, departments } from '../db/schema'
import { eq, desc } from 'drizzle-orm'

const listCompanies = async () => {
  return await db.query.companies.findMany({
    orderBy: [desc(companies.createdAt)],
    with: {
      locations: true,
      departments: true
    }
  })
}

const createCompanySchema = {
  body: t.Object({
    code: t.String({ minLength: 2, maxLength: 50 }),
    name: t.String({ minLength: 2, maxLength: 255 }),
    brandName: t.Optional(t.String()),
    email: t.String({ format: 'email' }),
    phone: t.Optional(t.String()),
    industry: t.Optional(t.String()),
    website: t.Optional(t.String()),
    locationName: t.Optional(t.String()),
    locationAddress: t.Optional(t.String()),
    locationCity: t.Optional(t.String()),
    locationLatitude: t.Optional(t.String()),
    locationLongitude: t.Optional(t.String()),
    locationRadiusMeters: t.Optional(t.Number()),
    locationTimezone: t.Optional(t.String())
  })
}

const handleCreateCompany = async ({ body, set }: any) => {
  const {
    code,
    name,
    brandName,
    email,
    phone,
    industry,
    website,
    locationName = 'Kantor Pusat',
    locationAddress = 'Alamat Belum Diisi',
    locationCity = 'Jakarta',
    locationLatitude = '-6.2088000',
    locationLongitude = '106.8456000',
    locationRadiusMeters = 100,
    locationTimezone = 'Asia/Jakarta'
  } = body

  const cleanCode = code.trim().toUpperCase()

  const [existing] = await db.select().from(companies).where(eq(companies.code, cleanCode)).limit(1)
  if (existing) {
    set.status = 400
    return { success: false, message: `Kode perusahaan '${cleanCode}' sudah digunakan.` }
  }

  const result = await db.transaction(async (tx) => {
    const [newCompany] = await tx
      .insert(companies)
      .values({
        code: cleanCode,
        name: name.trim(),
        brandName: brandName?.trim() || null,
        email: email.trim(),
        phone: phone?.trim() || null,
        industry: industry?.trim() || null,
        website: website?.trim() || null,
        status: 'active'
      })
      .returning()

    const [hrDept] = await tx
      .insert(departments)
      .values({
        companyId: newCompany.id,
        code: 'HR',
        name: 'Human Resources',
        description: 'Departemen Pengelolaan Sumber Daya Manusia & Personalia (Departemen Wajib)',
        isMandatory: true,
        status: 'active'
      })
      .returning()

    const [primaryLoc] = await tx
      .insert(companyLocations)
      .values({
        companyId: newCompany.id,
        name: locationName.trim(),
        address: locationAddress.trim(),
        city: locationCity.trim(),
        latitude: String(locationLatitude),
        longitude: String(locationLongitude),
        radiusMeters: Number(locationRadiusMeters),
        timezone: locationTimezone,
        isPrimary: true,
        status: 'active'
      })
      .returning()

    return {
      company: newCompany,
      mandatoryDepartment: hrDept,
      primaryLocation: primaryLoc
    }
  })

  set.status = 201
  return {
    success: true,
    data: result,
    message: 'Perusahaan berhasil didaftarkan beserta Departemen Wajib (HR) dan Lokasi Primer.'
  }
}

export const companyRoutes = new Elysia({ prefix: '/companies' })
  .get('', listCompanies)
  .get('/', listCompanies)
  .get('/:id', async ({ params, set }) => {
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, params.id),
      with: {
        locations: true,
        departments: true
      }
    })

    if (!company) {
      set.status = 404
      return { success: false, message: 'Perusahaan tidak ditemukan' }
    }
    return { success: true, data: company }
  }, {
    params: t.Object({
      id: t.String()
    })
  })
  .post('', handleCreateCompany, createCompanySchema)
  .post('/', handleCreateCompany, createCompanySchema)
  .put('/:id', async ({ params, body, set }) => {
    const [existing] = await db.select().from(companies).where(eq(companies.id, params.id)).limit(1)
    if (!existing) {
      set.status = 404
      return { success: false, message: 'Perusahaan tidak ditemukan' }
    }

    const [updated] = await db
      .update(companies)
      .set({
        name: body.name?.trim() || existing.name,
        brandName: body.brandName !== undefined ? body.brandName?.trim() || null : existing.brandName,
        email: body.email?.trim() || existing.email,
        phone: body.phone !== undefined ? body.phone?.trim() || null : existing.phone,
        industry: body.industry !== undefined ? body.industry?.trim() || null : existing.industry,
        website: body.website !== undefined ? body.website?.trim() || null : existing.website,
        status: body.status || existing.status,
        updatedAt: new Date()
      })
      .where(eq(companies.id, params.id))
      .returning()

    return { success: true, data: updated, message: 'Data perusahaan berhasil diperbarui' }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      name: t.Optional(t.String()),
      brandName: t.Optional(t.String()),
      email: t.Optional(t.String({ format: 'email' })),
      phone: t.Optional(t.String()),
      industry: t.Optional(t.String()),
      website: t.Optional(t.String()),
      status: t.Optional(t.String())
    })
  })
  .delete('/:id', async ({ params, set }) => {
    const [existing] = await db.select().from(companies).where(eq(companies.id, params.id)).limit(1)
    if (!existing) {
      set.status = 404
      return { success: false, message: 'Perusahaan tidak ditemukan' }
    }

    await db.delete(companies).where(eq(companies.id, params.id))
    return { success: true, message: 'Perusahaan berhasil dihapus beserta seluruh dependensinya.' }
  }, {
    params: t.Object({
      id: t.String()
    })
  })
