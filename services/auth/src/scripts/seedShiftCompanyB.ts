import { db } from '../../../shifting/src/db'
import { shifts, shiftAttendanceLocations } from '../../../shifting/src/db'
import { companies, companyLocations, users } from '../db/schema'
import { eq } from 'drizzle-orm'

async function seedShiftCompanyB() {
  const [compB] = await db.select().from(companies).where(eq(companies.code, 'NLP')).limit(1)
  if (!compB) return

  const [locB] = await db.select().from(companyLocations).where(eq(companyLocations.companyId, compB.id)).limit(1)
  const [userB] = await db.select().from(users).where(eq(users.email, 'dewi.lestari@nusantara.id')).limit(1)

  const existingShift = await db.select().from(shifts).where(eq(shifts.companyId, compB.id)).limit(1)
  if (existingShift.length === 0) {
    const [shift] = await db.insert(shifts).values({
      companyId: compB.id,
      name: 'Shift Logistik & Distribusi Pagi',
      code: 'NLP-PAGI-01',
      description: 'Jadwal distribusi logistik wilayah Jawa Timur',
      startTime: '07:00:00',
      endTime: '15:30:00',
      workLocationId: locB?.id,
      status: 'active'
    }).returning()

    if (locB) {
      await db.insert(shiftAttendanceLocations).values({
        shiftId: shift.id,
        locationId: locB.id,
        name: locB.name,
        address: locB.address,
        city: locB.city,
        province: locB.province,
        latitude: locB.latitude,
        longitude: locB.longitude,
        radiusMeters: locB.radiusMeters,
        coordinatesType: locB.coordinatesType,
        timezone: locB.timezone
      })
    }

    if (userB) {
      await db.update(users).set({ shiftId: shift.id }).where(eq(users.id, userB.id))
    }

    console.log('[SEED] Shift Perusahaan B berhasil dibuat:', shift.name)
  } else {
    console.log('[SEED] Shift Perusahaan B sudah ada')
  }
}

await seedShiftCompanyB()
process.exit(0)
