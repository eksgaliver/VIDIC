import { Elysia, t } from 'elysia'
import { and, desc, eq, inArray, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import {
  companyLocations,
  departments,
  db,
  shiftAttendanceLocations,
  shifts,
  users
} from '../db'

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

function normalizeTime(value: string): string | null {
  const trimmed = value.trim()
  if (!TIME_PATTERN.test(trimmed)) return null
  return trimmed.length === 5 ? `${trimmed}:00` : trimmed
}

// Rumus Haversine untuk menghitung jarak antara koordinat pengguna dan pusat geofence
function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

// Algoritma Ray Casting untuk memverifikasi apakah koordinat berada di dalam poligon geofence
function isInsidePolygon(point: [number, number], polygon: [number, number][]): boolean {
  if (!polygon || polygon.length < 3) return false
  const [x, y] = point
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0]
    const yi = polygon[i][1]
    const xj = polygon[j][0]
    const yj = polygon[j][1]

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }

  return inside
}

interface LocationGeoSnapshot {
  id: string
  companyId: string
  name: string
  address: string
  city: string
  province: string | null
  latitude: string | number
  longitude: string | number
  radiusMeters: number
  coordinatesType: string
  polygonCoordinates: [number, number][] | null
  timezone: string
}

interface ShiftInput {
  companyId: string
  name: string
  code: string
  description?: string
  startTime: string
  endTime: string
  workLocationId: string
  attendanceLocationIds: string[]
  status?: string
  employeeId?: string
  position?: string
  supervisorId?: string
  assignedEmployeeIds?: string[]
}

type ValidationResult =
  | {
      ok: true
      companyId: string
      name: string
      code: string
      description: string | null
      startTime: string
      endTime: string
      workLocationId: string
      attendanceLocationIds: string[]
      locations: LocationGeoSnapshot[]
      status: string
      employeeId: string | null
      position: string | null
      supervisorId: string | null
      assignedEmployeeIds?: string[]
    }
  | { ok: false; status: number; message: string }

async function validateShiftInput(input: ShiftInput): Promise<ValidationResult> {
  const name = input.name?.trim()
  if (!name || name.length < 2) {
    return { ok: false, status: 400, message: 'Nama shift minimal 2 karakter.' }
  }

  const code = input.code?.trim().toUpperCase()
  if (!code || code.length < 1) {
    return { ok: false, status: 400, message: 'Kode shift wajib diisi.' }
  }

  const startTime = normalizeTime(input.startTime)
  const endTime = normalizeTime(input.endTime)
  if (!startTime || !endTime) {
    return { ok: false, status: 400, message: 'Format jam harus HH:mm.' }
  }
  if (startTime === endTime) {
    return { ok: false, status: 400, message: 'Jam mulai dan jam selesai tidak boleh sama.' }
  }

  const [workLocation] = await db
    .select({
      id: companyLocations.id,
      companyId: companyLocations.companyId,
      status: companyLocations.status
    })
    .from(companyLocations)
    .where(eq(companyLocations.id, input.workLocationId))
    .limit(1)

  if (!workLocation) {
    return { ok: false, status: 400, message: 'Lokasi kerja tidak ditemukan.' }
  }

  const companyId = input.companyId || workLocation.companyId
  if (workLocation.companyId !== companyId) {
    return { ok: false, status: 400, message: 'Lokasi kerja tidak sesuai dengan perusahaan yang dipilih.' }
  }
  if (workLocation.status !== 'active') {
    return { ok: false, status: 400, message: 'Lokasi kerja sedang nonaktif.' }
  }

  const attendanceLocationIds = [...new Set(input.attendanceLocationIds.filter(Boolean))]
  if (attendanceLocationIds.length < 1) {
    return { ok: false, status: 400, message: 'Pilih minimal satu lokasi absensi.' }
  }

  // Mengambil skema geolokasi lengkap dari company_locations untuk mengantisipasi
  // adanya lebih dari satu lokasi fisik dalam satu kota yang sama.
  const locations = await db
    .select({
      id: companyLocations.id,
      companyId: companyLocations.companyId,
      name: companyLocations.name,
      address: companyLocations.address,
      city: companyLocations.city,
      province: companyLocations.province,
      latitude: companyLocations.latitude,
      longitude: companyLocations.longitude,
      radiusMeters: companyLocations.radiusMeters,
      coordinatesType: companyLocations.coordinatesType,
      polygonCoordinates: companyLocations.polygonCoordinates,
      timezone: companyLocations.timezone,
      status: companyLocations.status
    })
    .from(companyLocations)
    .where(inArray(companyLocations.id, attendanceLocationIds))

  if (locations.length !== attendanceLocationIds.length) {
    return { ok: false, status: 400, message: 'Salah satu lokasi absensi tidak ditemukan.' }
  }
  if (locations.some((location) => location.companyId !== companyId)) {
    return { ok: false, status: 400, message: 'Semua lokasi absensi harus berada di perusahaan yang sama.' }
  }
  if (locations.some((location) => location.status !== 'active')) {
    return { ok: false, status: 400, message: 'Semua lokasi absensi harus berstatus aktif.' }
  }

  let employeeId: string | null = null
  let position: string | null = input.position?.trim() || null
  let supervisorId: string | null = null

  if (input.employeeId?.trim()) {
    const [employee] = await db
      .select({
        id: users.id,
        companyId: users.companyId,
        position: users.position,
        status: users.status
      })
      .from(users)
      .where(eq(users.id, input.employeeId.trim()))
      .limit(1)

    if (employee && employee.companyId === companyId) {
      employeeId = employee.id
      if (!position) position = employee.position
    }
  }

  if (input.supervisorId?.trim()) {
    const [supervisor] = await db
      .select({ id: users.id, companyId: users.companyId, status: users.status })
      .from(users)
      .where(eq(users.id, input.supervisorId.trim()))
      .limit(1)

    if (supervisor && supervisor.companyId === companyId) {
      supervisorId = supervisor.id
    }
  }

  return {
    ok: true,
    companyId,
    name,
    code,
    description: input.description?.trim() || null,
    startTime,
    endTime,
    workLocationId: workLocation.id,
    attendanceLocationIds,
    locations: locations as LocationGeoSnapshot[],
    status: input.status === 'inactive' ? 'inactive' : 'active',
    employeeId,
    position,
    supervisorId,
    assignedEmployeeIds: input.assignedEmployeeIds
  }
}

async function listShiftRows(companyId?: string, shiftId?: string) {
  const supervisor = alias(users, 'shift_supervisor')
  const conditions: SQL[] = []
  if (companyId) conditions.push(eq(shifts.companyId, companyId))
  if (shiftId) conditions.push(eq(shifts.id, shiftId))

  return db
    .select({
      id: shifts.id,
      companyId: shifts.companyId,
      name: shifts.name,
      code: shifts.code,
      description: shifts.description,
      employeeId: shifts.employeeId,
      position: shifts.position,
      supervisorId: shifts.supervisorId,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      workLocationId: shifts.workLocationId,
      status: shifts.status,
      createdAt: shifts.createdAt,
      updatedAt: shifts.updatedAt,
      employeeName: users.name,
      employeeEmail: users.email,
      departmentId: users.departmentId,
      departmentName: departments.name,
      departmentCode: departments.code,
      supervisorName: supervisor.name,
      supervisorEmail: supervisor.email,
      workLocationName: companyLocations.name,
      workLocationAddress: companyLocations.address,
      workLocationCity: companyLocations.city,
      workLocationProvince: companyLocations.province,
      workLocationLatitude: companyLocations.latitude,
      workLocationLongitude: companyLocations.longitude,
      workLocationRadiusMeters: companyLocations.radiusMeters,
      workLocationCoordinatesType: companyLocations.coordinatesType,
      workLocationTimezone: companyLocations.timezone
    })
    .from(shifts)
    .leftJoin(users, eq(shifts.employeeId, users.id))
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .innerJoin(companyLocations, eq(shifts.workLocationId, companyLocations.id))
    .leftJoin(supervisor, eq(shifts.supervisorId, supervisor.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(shifts.createdAt))
}

async function attachAttendance<T extends { id: string }>(rows: T[]) {
  if (rows.length === 0) return []

  const shiftIds = rows.map((row) => row.id)

  const [attendance, assignedUsers] = await Promise.all([
    db
      .select({
        shiftId: shiftAttendanceLocations.shiftId,
        id: shiftAttendanceLocations.id,
        locationId: shiftAttendanceLocations.locationId,
        name: shiftAttendanceLocations.name,
        address: shiftAttendanceLocations.address,
        city: shiftAttendanceLocations.city,
        province: shiftAttendanceLocations.province,
        latitude: shiftAttendanceLocations.latitude,
        longitude: shiftAttendanceLocations.longitude,
        radiusMeters: shiftAttendanceLocations.radiusMeters,
        coordinatesType: shiftAttendanceLocations.coordinatesType,
        polygonCoordinates: shiftAttendanceLocations.polygonCoordinates,
        timezone: shiftAttendanceLocations.timezone
      })
      .from(shiftAttendanceLocations)
      .where(inArray(shiftAttendanceLocations.shiftId, shiftIds))
      .orderBy(shiftAttendanceLocations.city, shiftAttendanceLocations.name),

    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        position: users.position,
        status: users.status,
        shiftId: users.shiftId
      })
      .from(users)
      .where(inArray(users.shiftId, shiftIds))
      .orderBy(users.name)
  ])

  const groupedAttendance = new Map<string, typeof attendance>()
  for (const location of attendance) {
    const list = groupedAttendance.get(location.shiftId) ?? []
    list.push(location)
    groupedAttendance.set(location.shiftId, list)
  }

  const groupedUsers = new Map<string, typeof assignedUsers>()
  for (const user of assignedUsers) {
    if (user.shiftId) {
      const list = groupedUsers.get(user.shiftId) ?? []
      list.push(user)
      groupedUsers.set(user.shiftId, list)
    }
  }

  return rows.map((row) => {
    const {
      employeeName,
      employeeEmail,
      departmentId,
      departmentName,
      departmentCode,
      supervisorName,
      supervisorEmail,
      workLocationName,
      workLocationAddress,
      workLocationCity,
      workLocationProvince,
      workLocationLatitude,
      workLocationLongitude,
      workLocationRadiusMeters,
      workLocationCoordinatesType,
      workLocationTimezone,
      ...shift
    } = row as T & Record<string, any>

    const assigned = groupedUsers.get(row.id) ?? []

    return {
      ...shift,
      assignedCount: assigned.length,
      assignedEmployees: assigned,
      employee: (row as any).employeeId && employeeName
        ? {
            id: (row as any).employeeId,
            name: employeeName,
            email: employeeEmail
          }
        : null,
      department: departmentId
        ? { id: departmentId, name: departmentName, code: departmentCode }
        : null,
      supervisor: (row as any).supervisorId && supervisorName
        ? { id: (row as any).supervisorId, name: supervisorName, email: supervisorEmail }
        : null,
      workLocation: {
        id: (row as any).workLocationId,
        name: workLocationName,
        address: workLocationAddress,
        city: workLocationCity,
        province: workLocationProvince,
        latitude: workLocationLatitude,
        longitude: workLocationLongitude,
        radiusMeters: workLocationRadiusMeters,
        coordinatesType: workLocationCoordinatesType,
        timezone: workLocationTimezone
      },
      attendanceLocations: (groupedAttendance.get(row.id) ?? []).map((location) => ({
        id: location.locationId || location.id,
        attendanceLocationId: location.id,
        name: location.name,
        address: location.address,
        city: location.city,
        province: location.province,
        latitude: location.latitude,
        longitude: location.longitude,
        radiusMeters: location.radiusMeters,
        coordinatesType: location.coordinatesType,
        polygonCoordinates: location.polygonCoordinates,
        timezone: location.timezone
      }))
    }
  })
}

async function getShiftDetail(id: string) {
  const rows = await listShiftRows(undefined, id)
  if (rows.length === 0) return null
  const [detail] = await attachAttendance(rows)
  return detail
}

const shiftBodySchema = {
  body: t.Object({
    companyId: t.String(),
    name: t.String({ minLength: 2, maxLength: 150 }),
    code: t.String({ minLength: 1, maxLength: 50 }),
    description: t.Optional(t.String()),
    startTime: t.String({ minLength: 5, maxLength: 8 }),
    endTime: t.String({ minLength: 5, maxLength: 8 }),
    workLocationId: t.String(),
    attendanceLocationIds: t.Array(t.String(), { minItems: 1 }),
    status: t.Optional(t.String()),
    employeeId: t.Optional(t.String()),
    position: t.Optional(t.String()),
    supervisorId: t.Optional(t.String()),
    assignedEmployeeIds: t.Optional(t.Array(t.String()))
  })
}

export const shiftRoutes = new Elysia({ prefix: '/shifts' })
  .get('', async ({ query }) => {
    const rows = await listShiftRows(query.companyId)
    return { success: true, data: await attachAttendance(rows) }
  }, {
    query: t.Object({
      companyId: t.Optional(t.String())
    })
  })
  .get('/', async ({ query }) => {
    const rows = await listShiftRows(query.companyId)
    return { success: true, data: await attachAttendance(rows) }
  }, {
    query: t.Object({
      companyId: t.Optional(t.String())
    })
  })
  .get('/:id', async ({ params, set }) => {
    const shift = await getShiftDetail(params.id)
    if (!shift) {
      set.status = 404
      return { success: false, message: 'Shift tidak ditemukan.' }
    }
    return { success: true, data: shift }
  }, {
    params: t.Object({ id: t.String() })
  })
  // Endpoint verifikasi koordinat absensi geofence (point radius & polygon)
  .post('/:id/verify-attendance', async ({ params, body, set }) => {
    const shift = await getShiftDetail(params.id)
    if (!shift) {
      set.status = 404
      return { success: false, message: 'Shift tidak ditemukan.' }
    }

    const userLat = Number(body.latitude)
    const userLng = Number(body.longitude)

    if (Number.isNaN(userLat) || Number.isNaN(userLng)) {
      set.status = 400
      return { success: false, message: 'Koordinat lintang dan bujur tidak valid.' }
    }

    for (const loc of shift.attendanceLocations) {
      if (loc.coordinatesType === 'polygon' && loc.polygonCoordinates && loc.polygonCoordinates.length >= 3) {
        if (isInsidePolygon([userLat, userLng], loc.polygonCoordinates)) {
          return {
            success: true,
            verified: true,
            message: `Presensi valid di area polygon: ${loc.name} (${loc.city})`,
            matchedLocation: loc
          }
        }
      } else {
        const centerLat = Number(loc.latitude)
        const centerLng = Number(loc.longitude)
        const distance = haversineDistanceMeters(userLat, userLng, centerLat, centerLng)
        if (distance <= loc.radiusMeters) {
          return {
            success: true,
            verified: true,
            message: `Presensi valid di titik radius: ${loc.name} (${loc.city})`,
            distanceMeters: Math.round(distance),
            matchedLocation: loc
          }
        }
      }
    }

    return {
      success: true,
      verified: false,
      message: 'Koordinat GPS Anda berada di luar seluruh radius / perimeter geofence yang diizinkan untuk shift ini.'
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      latitude: t.Number(),
      longitude: t.Number()
    })
  })
  .post('', async ({ body, set }) => {
    const validated = await validateShiftInput(body)
    if (!validated.ok) {
      set.status = validated.status
      return { success: false, message: validated.message }
    }

    const [created] = await db.transaction(async (tx) => {
      const [shift] = await tx
        .insert(shifts)
        .values({
          companyId: validated.companyId,
          name: validated.name,
          code: validated.code,
          description: validated.description,
          startTime: validated.startTime,
          endTime: validated.endTime,
          workLocationId: validated.workLocationId,
          employeeId: validated.employeeId,
          position: validated.position,
          supervisorId: validated.supervisorId,
          status: validated.status
        })
        .returning()

      // Menyimpan skema geolokasi lengkap ke shift_attendance_locations
      await tx.insert(shiftAttendanceLocations).values(
        validated.locations.map((loc) => ({
          shiftId: shift.id,
          locationId: loc.id,
          name: loc.name,
          address: loc.address,
          city: loc.city,
          province: loc.province,
          latitude: String(loc.latitude),
          longitude: String(loc.longitude),
          radiusMeters: loc.radiusMeters,
          coordinatesType: loc.coordinatesType,
          polygonCoordinates: loc.polygonCoordinates,
          timezone: loc.timezone
        }))
      )

      if (validated.assignedEmployeeIds && validated.assignedEmployeeIds.length > 0) {
        await tx
          .update(users)
          .set({ shiftId: shift.id })
          .where(and(
            eq(users.companyId, validated.companyId),
            inArray(users.id, validated.assignedEmployeeIds)
          ))
      }

      return [shift]
    })

    set.status = 201
    return {
      success: true,
      data: await getShiftDetail(created.id),
      message: 'Master shift berhasil dibuat.'
    }
  }, shiftBodySchema)
  .post('/', async ({ body, set }) => {
    const validated = await validateShiftInput(body)
    if (!validated.ok) {
      set.status = validated.status
      return { success: false, message: validated.message }
    }

    const [created] = await db.transaction(async (tx) => {
      const [shift] = await tx
        .insert(shifts)
        .values({
          companyId: validated.companyId,
          name: validated.name,
          code: validated.code,
          description: validated.description,
          startTime: validated.startTime,
          endTime: validated.endTime,
          workLocationId: validated.workLocationId,
          employeeId: validated.employeeId,
          position: validated.position,
          supervisorId: validated.supervisorId,
          status: validated.status
        })
        .returning()

      await tx.insert(shiftAttendanceLocations).values(
        validated.locations.map((loc) => ({
          shiftId: shift.id,
          locationId: loc.id,
          name: loc.name,
          address: loc.address,
          city: loc.city,
          province: loc.province,
          latitude: String(loc.latitude),
          longitude: String(loc.longitude),
          radiusMeters: loc.radiusMeters,
          coordinatesType: loc.coordinatesType,
          polygonCoordinates: loc.polygonCoordinates,
          timezone: loc.timezone
        }))
      )

      if (validated.assignedEmployeeIds && validated.assignedEmployeeIds.length > 0) {
        await tx
          .update(users)
          .set({ shiftId: shift.id })
          .where(and(
            eq(users.companyId, validated.companyId),
            inArray(users.id, validated.assignedEmployeeIds)
          ))
      }

      return [shift]
    })

    set.status = 201
    return {
      success: true,
      data: await getShiftDetail(created.id),
      message: 'Master shift berhasil dibuat.'
    }
  }, shiftBodySchema)
  .put('/:id', async ({ params, body, set }) => {
    const [existing] = await db
      .select({ id: shifts.id })
      .from(shifts)
      .where(eq(shifts.id, params.id))
      .limit(1)

    if (!existing) {
      set.status = 404
      return { success: false, message: 'Shift tidak ditemukan.' }
    }

    const validated = await validateShiftInput(body)
    if (!validated.ok) {
      set.status = validated.status
      return { success: false, message: validated.message }
    }

    await db.transaction(async (tx) => {
      await tx
        .update(shifts)
        .set({
          companyId: validated.companyId,
          name: validated.name,
          code: validated.code,
          description: validated.description,
          startTime: validated.startTime,
          endTime: validated.endTime,
          workLocationId: validated.workLocationId,
          employeeId: validated.employeeId,
          position: validated.position,
          supervisorId: validated.supervisorId,
          status: validated.status,
          updatedAt: new Date()
        })
        .where(eq(shifts.id, params.id))

      await tx
        .delete(shiftAttendanceLocations)
        .where(eq(shiftAttendanceLocations.shiftId, params.id))

      await tx.insert(shiftAttendanceLocations).values(
        validated.locations.map((loc) => ({
          shiftId: params.id,
          locationId: loc.id,
          name: loc.name,
          address: loc.address,
          city: loc.city,
          province: loc.province,
          latitude: String(loc.latitude),
          longitude: String(loc.longitude),
          radiusMeters: loc.radiusMeters,
          coordinatesType: loc.coordinatesType,
          polygonCoordinates: loc.polygonCoordinates,
          timezone: loc.timezone
        }))
      )

      if (validated.assignedEmployeeIds !== undefined) {
        await tx
          .update(users)
          .set({ shiftId: null })
          .where(eq(users.shiftId, params.id))

        if (validated.assignedEmployeeIds.length > 0) {
          await tx
            .update(users)
            .set({ shiftId: params.id })
            .where(and(
              eq(users.companyId, validated.companyId),
              inArray(users.id, validated.assignedEmployeeIds)
            ))
        }
      }
    })

    return {
      success: true,
      data: await getShiftDetail(params.id),
      message: 'Shift berhasil diperbarui.'
    }
  }, {
    params: t.Object({ id: t.String() }),
    ...shiftBodySchema
  })
  .delete('/:id', async ({ params, set }) => {
    const [existing] = await db
      .select({ id: shifts.id })
      .from(shifts)
      .where(eq(shifts.id, params.id))
      .limit(1)

    if (!existing) {
      set.status = 404
      return { success: false, message: 'Shift tidak ditemukan.' }
    }

    await db.transaction(async (tx) => {
      await tx.update(users).set({ shiftId: null }).where(eq(users.shiftId, params.id))
      await tx.delete(shifts).where(eq(shifts.id, params.id))
    })

    return { success: true, message: 'Shift berhasil dihapus.' }
  }, {
    params: t.Object({ id: t.String() })
  })
