import { Elysia, t } from 'elysia'
import { db } from '../db'
import { companies, companyLocations, departments, companyOperationalAreas } from '../db/schema'
import { eq, desc } from 'drizzle-orm'
import { handleLogoUpload } from '../handlers/uploadHandler'

const listCompanies = async () => {
  return await db.query.companies.findMany({
    orderBy: [desc(companies.createdAt)],
    with: {
      locations: true,
      departments: true,
      operationalAreas: true
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
    logoUrl: t.Optional(t.String()),
    // Wilayah & Kota Operasional
    operationalAreas: t.Optional(
      t.Array(
        t.Object({
          province: t.String(),
          city: t.String()
        })
      )
    ),
    // Lokasi operasional primer (Wajib minimal 1 lokasi per perusahaan)
    locationName: t.Optional(t.String()),
    locationAddress: t.Optional(t.String()),
    locationCity: t.Optional(t.String()),
    locationProvince: t.Optional(t.String()),
    locationPostalCode: t.Optional(t.String()),
    locationLatitude: t.Optional(t.String()),
    locationLongitude: t.Optional(t.String()),
    locationRadiusMeters: t.Optional(t.Number()),
    locationCoordinatesType: t.Optional(t.String()),
    locationPolygonCoordinates: t.Optional(t.Any()),
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
    logoUrl,
    operationalAreas = [],
    locationName = 'Kantor Pusat',
    locationAddress = 'Alamat Belum Diisi',
    locationCity = 'Jakarta',
    locationProvince,
    locationPostalCode,
    locationLatitude = '-6.2088000',
    locationLongitude = '106.8456000',
    locationRadiusMeters = 100,
    locationCoordinatesType = 'point',
    locationPolygonCoordinates = null,
    locationTimezone = 'Asia/Jakarta'
  } = body

  const cleanCode = code.trim().toUpperCase()

  const [existing] = await db.select().from(companies).where(eq(companies.code, cleanCode)).limit(1)
  if (existing) {
    set.status = 400
    return { success: false, message: `Kode perusahaan '${cleanCode}' sudah digunakan.` }
  }

  const result = await db.transaction(async (tx) => {
    // 1. Simpan profil badan usaha
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
        logoUrl: logoUrl?.trim() || null,
        status: 'active'
      })
      .returning()

    // 2. Otomatis buat Departemen Wajib: HR
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

    // 3. Otomatis buat Titik Lokasi Operasional Primer (Kaidah minimal 1 lokasi)
    const [primaryLoc] = await tx
      .insert(companyLocations)
      .values({
        companyId: newCompany.id,
        name: locationName.trim(),
        address: locationAddress.trim(),
        city: locationCity.trim(),
        province: locationProvince?.trim() || null,
        postalCode: locationPostalCode?.trim() || null,
        latitude: String(locationLatitude),
        longitude: String(locationLongitude),
        radiusMeters: Number(locationRadiusMeters),
        coordinatesType: locationCoordinatesType === 'polygon' ? 'polygon' : 'point',
        polygonCoordinates: Array.isArray(locationPolygonCoordinates) ? locationPolygonCoordinates : null,
        timezone: locationTimezone,
        isPrimary: true,
        status: 'active'
      })
      .returning()

    // 4. Simpan Wilayah & Kota Operasional jika dipilih
    let savedAreas: any[] = []
    if (Array.isArray(operationalAreas) && operationalAreas.length > 0) {
      savedAreas = await tx
        .insert(companyOperationalAreas)
        .values(
          operationalAreas.map((area: any) => ({
            companyId: newCompany.id,
            province: area.province.trim(),
            city: area.city.trim(),
            status: 'active'
          }))
        )
        .returning()
    } else if (locationProvince && locationCity) {
      // Bawaan dari lokasi primer jika form wilayah tidak diisi terpisah
      savedAreas = await tx
        .insert(companyOperationalAreas)
        .values({
          companyId: newCompany.id,
          province: locationProvince.trim(),
          city: locationCity.trim(),
          status: 'active'
        })
        .returning()
    }

    return {
      company: newCompany,
      mandatoryDepartment: hrDept,
      primaryLocation: primaryLoc,
      operationalAreas: savedAreas
    }
  })

  set.status = 201
  return {
    success: true,
    data: result,
    message: 'Perusahaan berhasil didaftarkan beserta Departemen Wajib (HR) dan Titik Lokasi Primer.'
  }
}

export const companyRoutes = new Elysia({ prefix: '/companies' })
  // 1. Daftar Perusahaan
  .get('', listCompanies)
  .get('/', listCompanies)
  // 2. Detail Satu Perusahaan
  .get('/:id', async ({ params, set }) => {
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, params.id),
      with: {
        locations: true,
        departments: true,
        operationalAreas: true
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
  // 2b. Perbarui / Set Wilayah & Kota Operasional Perusahaan
  .put('/:id/operational-areas', async ({ params, body, set }) => {
    const [existing] = await db.select().from(companies).where(eq(companies.id, params.id)).limit(1)
    if (!existing) {
      set.status = 404
      return { success: false, message: 'Perusahaan tidak ditemukan' }
    }

    const { areas } = body

    await db.transaction(async (tx) => {
      // Hapus data lama wilayah
      await tx.delete(companyOperationalAreas).where(eq(companyOperationalAreas.companyId, params.id))

      // Masukkan wilayah baru
      if (Array.isArray(areas) && areas.length > 0) {
        await tx.insert(companyOperationalAreas).values(
          areas.map((a: any) => ({
            companyId: params.id,
            province: a.province.trim(),
            city: a.city.trim(),
            status: 'active'
          }))
        )
      }
    })

    const updated = await db.query.companyOperationalAreas.findMany({
      where: eq(companyOperationalAreas.companyId, params.id)
    })

    return {
      success: true,
      data: updated,
      message: 'Wilayah dan kota operasional perusahaan berhasil diperbarui'
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      areas: t.Array(
        t.Object({
          province: t.String(),
          city: t.String()
        })
      )
    })
  })
  // 3. Tambah Perusahaan (Beserta Lokasi Primer & Departemen HR)
  .post('', handleCreateCompany, createCompanySchema)
  .post('/', handleCreateCompany, createCompanySchema)
  // 4. Ubah Data Profil Perusahaan
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
        logoUrl: body.logoUrl !== undefined ? body.logoUrl?.trim() || null : existing.logoUrl,
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
      logoUrl: t.Optional(t.String()),
      status: t.Optional(t.String())
    })
  })
  // 4b. Unggah & Perbarui Logo Perusahaan
  .post('/:id/logo', async ({ params, body, set }) => {
    const [existing] = await db.select().from(companies).where(eq(companies.id, params.id)).limit(1)
    if (!existing) {
      set.status = 404
      return { success: false, message: 'Perusahaan tidak ditemukan' }
    }

    try {
      const file = (body as { file: File }).file
      if (!file) {
        set.status = 400
        return { success: false, message: 'Berkas logo wajib disertakan.' }
      }

      const uploadResult = await handleLogoUpload(file)

      const [updated] = await db
        .update(companies)
        .set({
          logoUrl: uploadResult.url,
          updatedAt: new Date()
        })
        .where(eq(companies.id, params.id))
        .returning()

      return {
        success: true,
        data: updated,
        upload: uploadResult,
        message: 'Logo perusahaan berhasil diunggah dan dikompresi ke WebP'
      }
    } catch (err: unknown) {
      set.status = 400
      const errorMessage = err instanceof Error ? err.message : 'Gagal memproses unggahan logo'
      return { success: false, message: errorMessage }
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      file: t.File()
    })
  })
  // 5. Hapus Perusahaan (Cascade ke Lokasi dan Departemen)
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
  // 6. Tambah Titik Lokasi Operasional Tambahan ke Perusahaan
  .post('/:id/locations', async ({ params, body, set }) => {
    const [company] = await db.select().from(companies).where(eq(companies.id, params.id)).limit(1)
    if (!company) {
      set.status = 404
      return { success: false, message: 'Perusahaan tidak ditemukan' }
    }

    const {
      name,
      address,
      city,
      province,
      postalCode,
      latitude,
      longitude,
      radiusMeters = 100,
      coordinatesType = 'point',
      polygonCoordinates = null,
      timezone = 'Asia/Jakarta',
      isPrimary = false
    } = body

    if (isPrimary) {
      await db.update(companyLocations).set({ isPrimary: false }).where(eq(companyLocations.companyId, params.id))
    }

    const [createdLoc] = await db
      .insert(companyLocations)
      .values({
        companyId: params.id,
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        province: province?.trim() || null,
        postalCode: postalCode?.trim() || null,
        latitude: String(latitude),
        longitude: String(longitude),
        radiusMeters: Number(radiusMeters),
        coordinatesType: coordinatesType === 'polygon' ? 'polygon' : 'point',
        polygonCoordinates: Array.isArray(polygonCoordinates) ? polygonCoordinates : null,
        timezone,
        isPrimary: Boolean(isPrimary),
        status: 'active'
      })
      .returning()

    set.status = 201
    return { success: true, data: createdLoc, message: 'Titik lokasi operasional berhasil ditambahkan' }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      name: t.String({ minLength: 2, maxLength: 150 }),
      address: t.String({ minLength: 5 }),
      city: t.String({ minLength: 2, maxLength: 100 }),
      province: t.Optional(t.String()),
      postalCode: t.Optional(t.String()),
      latitude: t.String(),
      longitude: t.String(),
      radiusMeters: t.Optional(t.Number()),
      coordinatesType: t.Optional(t.String()),
      polygonCoordinates: t.Optional(t.Any()),
      timezone: t.Optional(t.String()),
      isPrimary: t.Optional(t.Boolean())
    })
  })
  // 7. Ubah Data Titik Lokasi Operasional
  .put('/locations/:locationId', async ({ params, body, set }) => {
    const [loc] = await db.select().from(companyLocations).where(eq(companyLocations.id, params.locationId)).limit(1)
    if (!loc) {
      set.status = 404
      return { success: false, message: 'Titik lokasi tidak ditemukan' }
    }

    const { name, address, city, province, postalCode, latitude, longitude, radiusMeters, coordinatesType, polygonCoordinates, timezone, isPrimary, status } = body

    if (isPrimary) {
      await db.update(companyLocations).set({ isPrimary: false }).where(eq(companyLocations.companyId, loc.companyId))
    }

    const [updated] = await db
      .update(companyLocations)
      .set({
        name: name?.trim() || loc.name,
        address: address?.trim() || loc.address,
        city: city?.trim() || loc.city,
        province: province !== undefined ? province?.trim() || null : loc.province,
        postalCode: postalCode !== undefined ? postalCode?.trim() || null : loc.postalCode,
        latitude: latitude !== undefined ? String(latitude) : loc.latitude,
        longitude: longitude !== undefined ? String(longitude) : loc.longitude,
        radiusMeters: radiusMeters !== undefined ? Number(radiusMeters) : loc.radiusMeters,
        ...(coordinatesType !== undefined ? { coordinatesType: coordinatesType === 'polygon' ? 'polygon' : 'point' } : {}),
        ...(polygonCoordinates !== undefined ? { polygonCoordinates: Array.isArray(polygonCoordinates) ? polygonCoordinates : null } : {}),
        timezone: timezone || loc.timezone,
        isPrimary: isPrimary !== undefined ? Boolean(isPrimary) : loc.isPrimary,
        status: status || loc.status,
        updatedAt: new Date()
      })
      .where(eq(companyLocations.id, params.locationId))
      .returning()

    return { success: true, data: updated, message: 'Data titik lokasi berhasil diperbarui' }
  }, {
    params: t.Object({ locationId: t.String() }),
    body: t.Object({
      name: t.Optional(t.String()),
      address: t.Optional(t.String()),
      city: t.Optional(t.String()),
      province: t.Optional(t.String()),
      postalCode: t.Optional(t.String()),
      latitude: t.Optional(t.String()),
      longitude: t.Optional(t.String()),
      radiusMeters: t.Optional(t.Number()),
      coordinatesType: t.Optional(t.String()),
      polygonCoordinates: t.Optional(t.Any()),
      timezone: t.Optional(t.String()),
      isPrimary: t.Optional(t.Boolean()),
      status: t.Optional(t.String())
    })
  })
  // 8. Hapus Titik Lokasi Operasional (Minimal 1 lokasi per perusahaan wajib bertahan!)
  .delete('/locations/:locationId', async ({ params, set }) => {
    const [loc] = await db.select().from(companyLocations).where(eq(companyLocations.id, params.locationId)).limit(1)
    if (!loc) {
      set.status = 404
      return { success: false, message: 'Titik lokasi tidak ditemukan' }
    }

    const companyLocs = await db.select().from(companyLocations).where(eq(companyLocations.companyId, loc.companyId))
    if (companyLocs.length <= 1) {
      set.status = 400
      return {
        success: false,
        message: 'Perusahaan wajib memiliki minimal 1 titik lokasi operasional. Lokasi ini tidak dapat dihapus.'
      }
    }

    await db.delete(companyLocations).where(eq(companyLocations.id, params.locationId))

    if (loc.isPrimary) {
      const remaining = companyLocs.filter((l) => l.id !== loc.id)
      if (remaining.length > 0) {
        await db.update(companyLocations).set({ isPrimary: true }).where(eq(companyLocations.id, remaining[0].id))
      }
    }

    return { success: true, message: 'Titik lokasi berhasil dihapus' }
  }, {
    params: t.Object({ locationId: t.String() })
  })
