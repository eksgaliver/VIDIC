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

interface ShiftInput {
  employeeId: string
  position: string
  supervisorId?: string
  startTime: string
  endTime: string
  workLocationId: string
  attendanceLocationIds: string[]
  status?: string
}

type ValidationResult =
  | {
      ok: true
      companyId: string
      employeeId: string
      position: string
      supervisorId: string | null
      startTime: string
      endTime: string
      workLocationId: string
      attendanceLocationIds: string[]
      status: string
    }
  | { ok: false; status: number; message: string }

async function validateShiftInput(input: ShiftInput): Promise<ValidationResult> {
  const position = input.position.trim()
  if (position.length < 2) {
    return { ok: false, status: 400, message: 'Posisi kerja minimal 2 karakter.' }
  }

  const startTime = normalizeTime(input.startTime)
  const endTime = normalizeTime(input.endTime)
  if (!startTime || !endTime) {
    return { ok: false, status: 400, message: 'Format jam harus HH:mm.' }
  }
  if (startTime === endTime) {
    return { ok: false, status: 400, message: 'Jam mulai dan jam selesai tidak boleh sama.' }
  }

  const [employee] = await db
    .select({
      id: users.id,
      companyId: users.companyId,
      position: users.position,
      status: users.status
    })
    .from(users)
    .where(eq(users.id, input.employeeId))
    .limit(1)

  if (!employee) {
    return { ok: false, status: 404, message: 'Karyawan tidak ditemukan.' }
  }
  if (!employee.companyId) {
    return {
      ok: false,
      status: 400,
      message: 'Karyawan belum terhubung ke perusahaan. Lengkapi data karyawan terlebih dahulu.'
    }
  }
  if (employee.status !== 'active') {
    return { ok: false, status: 400, message: 'Karyawan nonaktif tidak dapat diberi shift.' }
  }

  const supervisorId = input.supervisorId?.trim() || null
  if (supervisorId) {
    if (supervisorId === employee.id) {
      return { ok: false, status: 400, message: 'Karyawan tidak dapat menjadi atasan dirinya sendiri.' }
    }

    const [supervisor] = await db
      .select({ id: users.id, companyId: users.companyId, status: users.status })
      .from(users)
      .where(eq(users.id, supervisorId))
      .limit(1)

    if (!supervisor) {
      return { ok: false, status: 400, message: 'Atasan yang dipilih tidak ditemukan.' }
    }
    if (supervisor.companyId !== employee.companyId) {
      return { ok: false, status: 400, message: 'Atasan harus berasal dari perusahaan yang sama.' }
    }
    if (supervisor.status !== 'active') {
      return { ok: false, status: 400, message: 'Atasan yang dipilih sedang nonaktif.' }
    }
  }

  const [workLocation] = await db
    .select({ id: companyLocations.id, companyId: companyLocations.companyId, status: companyLocations.status })
    .from(companyLocations)
    .where(eq(companyLocations.id, input.workLocationId))
    .limit(1)

  if (!workLocation) {
    return { ok: false, status: 400, message: 'Lokasi kerja tidak ditemukan.' }
  }
  if (workLocation.companyId !== employee.companyId) {
    return { ok: false, status: 400, message: 'Lokasi kerja harus berada di perusahaan karyawan.' }
  }
  if (workLocation.status !== 'active') {
    return { ok: false, status: 400, message: 'Lokasi kerja sedang nonaktif.' }
  }

  const attendanceLocationIds = [...new Set(input.attendanceLocationIds.filter(Boolean))]
  if (attendanceLocationIds.length < 1) {
    return { ok: false, status: 400, message: 'Pilih minimal satu lokasi absensi.' }
  }

  const locations = await db
    .select({ id: companyLocations.id, companyId: companyLocations.companyId, status: companyLocations.status })
    .from(companyLocations)
    .where(inArray(companyLocations.id, attendanceLocationIds))

  if (locations.length !== attendanceLocationIds.length) {
    return { ok: false, status: 400, message: 'Salah satu lokasi absensi tidak ditemukan.' }
  }
  if (locations.some((location) => location.companyId !== employee.companyId)) {
    return { ok: false, status: 400, message: 'Semua lokasi absensi harus berada di perusahaan karyawan.' }
  }
  if (locations.some((location) => location.status !== 'active')) {
    return { ok: false, status: 400, message: 'Semua lokasi absensi harus berstatus aktif.' }
  }

  return {
    ok: true,
    companyId: employee.companyId,
    employeeId: employee.id,
    position,
    supervisorId,
    startTime,
    endTime,
    workLocationId: workLocation.id,
    attendanceLocationIds,
    status: input.status === 'inactive' ? 'inactive' : 'active'
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
    .innerJoin(users, eq(shifts.employeeId, users.id))
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .innerJoin(companyLocations, eq(shifts.workLocationId, companyLocations.id))
    .leftJoin(supervisor, eq(shifts.supervisorId, supervisor.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(shifts.createdAt))
}

async function attachAttendance<T extends { id: string }>(rows: T[]) {
  if (rows.length === 0) return []

  const attendance = await db
    .select({
      shiftId: shiftAttendanceLocations.shiftId,
      id: companyLocations.id,
      name: companyLocations.name,
      address: companyLocations.address,
      city: companyLocations.city,
      province: companyLocations.province,
      latitude: companyLocations.latitude,
      longitude: companyLocations.longitude,
      radiusMeters: companyLocations.radiusMeters,
      coordinatesType: companyLocations.coordinatesType,
      polygonCoordinates: companyLocations.polygonCoordinates,
      timezone: companyLocations.timezone
    })
    .from(shiftAttendanceLocations)
    .innerJoin(companyLocations, eq(shiftAttendanceLocations.locationId, companyLocations.id))
    .where(inArray(shiftAttendanceLocations.shiftId, rows.map((row) => row.id)))
    .orderBy(companyLocations.name)

  const grouped = new Map<string, typeof attendance>()
  for (const location of attendance) {
    const list = grouped.get(location.shiftId) ?? []
    list.push(location)
    grouped.set(location.shiftId, list)
  }

  return rows.map((row) => {
    const { employeeName, employeeEmail, departmentId, departmentName, departmentCode, supervisorName, supervisorEmail, workLocationName, workLocationAddress, workLocationCity, workLocationProvince, workLocationLatitude, workLocationLongitude, workLocationRadiusMeters, workLocationCoordinatesType, workLocationTimezone, ...shift } = row as T & Record<string, any>

    return {
      ...shift,
      employee: {
        id: (row as any).employeeId,
        name: employeeName,
        email: employeeEmail
      },
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
      attendanceLocations: (grouped.get(row.id) ?? []).map((location) => ({
        id: location.id,
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
    employeeId: t.String(),
    position: t.String({ minLength: 2, maxLength: 150 }),
    supervisorId: t.Optional(t.String()),
    startTime: t.String({ minLength: 5, maxLength: 8 }),
    endTime: t.String({ minLength: 5, maxLength: 8 }),
    workLocationId: t.String(),
    attendanceLocationIds: t.Array(t.String(), { minItems: 1 }),
    status: t.Optional(t.String())
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
          employeeId: validated.employeeId,
          position: validated.position,
          supervisorId: validated.supervisorId,
          startTime: validated.startTime,
          endTime: validated.endTime,
          workLocationId: validated.workLocationId,
          status: validated.status
        })
        .returning()

      await tx.insert(shiftAttendanceLocations).values(
        validated.attendanceLocationIds.map((locationId) => ({
          shiftId: shift.id,
          locationId
        }))
      )

      return [shift]
    })

    set.status = 201
    return {
      success: true,
      data: await getShiftDetail(created.id),
      message: 'Shift karyawan berhasil dibuat.'
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
          employeeId: validated.employeeId,
          position: validated.position,
          supervisorId: validated.supervisorId,
          startTime: validated.startTime,
          endTime: validated.endTime,
          workLocationId: validated.workLocationId,
          status: validated.status
        })
        .returning()

      await tx.insert(shiftAttendanceLocations).values(
        validated.attendanceLocationIds.map((locationId) => ({
          shiftId: shift.id,
          locationId
        }))
      )

      return [shift]
    })

    set.status = 201
    return {
      success: true,
      data: await getShiftDetail(created.id),
      message: 'Shift karyawan berhasil dibuat.'
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
          employeeId: validated.employeeId,
          position: validated.position,
          supervisorId: validated.supervisorId,
          startTime: validated.startTime,
          endTime: validated.endTime,
          workLocationId: validated.workLocationId,
          status: validated.status,
          updatedAt: new Date()
        })
        .where(eq(shifts.id, params.id))

      await tx
        .delete(shiftAttendanceLocations)
        .where(eq(shiftAttendanceLocations.shiftId, params.id))

      await tx.insert(shiftAttendanceLocations).values(
        validated.attendanceLocationIds.map((locationId) => ({
          shiftId: params.id,
          locationId
        }))
      )
    })

    return {
      success: true,
      data: await getShiftDetail(params.id),
      message: 'Shift karyawan berhasil diperbarui.'
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

    await db.delete(shifts).where(eq(shifts.id, params.id))
    return { success: true, message: 'Shift karyawan berhasil dihapus.' }
  }, {
    params: t.Object({ id: t.String() })
  })
