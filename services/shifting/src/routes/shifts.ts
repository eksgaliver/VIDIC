import { Elysia, t } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { and, desc, eq, inArray, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import {
  companyLocations,
  departments,
  db,
  shiftAttendanceLocations,
  shiftSchedules,
  shifts,
  users
} from '../db'
import {
  getLocalDayOfWeek,
  matchAttendanceLocation,
  resolveLocalDate
} from '../lib/geofence'

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

function normalizeTime(value: string): string | null {
  const trimmed = value.trim()
  if (!TIME_PATTERN.test(trimmed)) return null
  return trimmed.length === 5 ? `${trimmed}:00` : trimmed
}

// Rumus Haversine & Ray Casting dipindahkan ke ../lib/geofence agar dipakai
// bersama oleh verifikasi presensi shift dan modul absensi.

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

export interface ShiftAttendancePointInput {
  name: string
  address: string
  city: string
  province?: string
  latitude: number | string
  longitude: number | string
  radiusMeters?: number
  coordinatesType?: string
  polygonCoordinates?: [number, number][] | null
  timezone?: string
  locationId?: string
}

export interface ShiftScheduleInput {
  id?: string
  dayOfWeek: number // 1: Senin, 2: Selasa, 3: Rabu, 4: Kamis, 5: Jumat, 6: Sabtu, 7: Minggu
  dayName: string
  startTime?: string | null
  endTime?: string | null
  isOff: boolean
}

export function generateAutoShiftCode(name: string): string {
  const cleaned = name.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '')
  if (!cleaned) return `SHF-${Date.now().toString().slice(-4)}`
  const words = cleaned.split(/\s+/).filter(Boolean)
  if (words.length === 1) {
    return `SHF-${words[0].slice(0, 8)}`
  }
  if (words[0] === 'SHIFT' && words.length > 1) {
    const remainder = words.slice(1).join('')
    return `SHF-${remainder.slice(0, 8)}`
  }
  const acronym = words.map((w) => w[0]).join('')
  return `SHF-${acronym.slice(0, 6)}`
}

export const STANDARD_DAYS = [
  { dayOfWeek: 1, dayName: 'Senin', defaultOff: false },
  { dayOfWeek: 2, dayName: 'Selasa', defaultOff: false },
  { dayOfWeek: 3, dayName: 'Rabu', defaultOff: false },
  { dayOfWeek: 4, dayName: 'Kamis', defaultOff: false },
  { dayOfWeek: 5, dayName: 'Jumat', defaultOff: false },
  { dayOfWeek: 6, dayName: 'Sabtu', defaultOff: true },
  { dayOfWeek: 7, dayName: 'Minggu', defaultOff: true },
] as const

interface ShiftInput {
  companyId: string
  name: string
  code?: string
  description?: string
  startTime: string
  endTime: string
  workLocationId?: string | null
  attendanceLocationIds?: string[]
  attendanceLocations?: ShiftAttendancePointInput[]
  schedules?: ShiftScheduleInput[]
  status?: string
  employeeId?: string
  position?: string
  supervisorId?: string
  assignedEmployeeIds?: string[]
}

export interface ValidatedSchedule {
  dayOfWeek: number
  dayName: string
  startTime: string | null
  endTime: string | null
  isOff: boolean
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
      workLocationId: string | null
      attendanceLocationIds: string[]
      locations: LocationGeoSnapshot[]
      schedules: ValidatedSchedule[]
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

  const code = (input.code?.trim() || generateAutoShiftCode(name)).toUpperCase()

  const startTime = normalizeTime(input.startTime)
  const endTime = normalizeTime(input.endTime)
  if (!startTime || !endTime) {
    return { ok: false, status: 400, message: 'Format jam harus HH:mm.' }
  }
  if (startTime === endTime) {
    return { ok: false, status: 400, message: 'Jam mulai dan jam selesai tidak boleh sama.' }
  }

  const companyId = input.companyId
  if (!companyId) {
    return { ok: false, status: 400, message: 'ID perusahaan wajib disertakan.' }
  }

  let workLocationId: string | null = null
  let defaultCity = 'Kota Operasional'

  if (input.workLocationId?.trim()) {
    const [workLocation] = await db
      .select({
        id: companyLocations.id,
        companyId: companyLocations.companyId,
        city: companyLocations.city,
        status: companyLocations.status
      })
      .from(companyLocations)
      .where(eq(companyLocations.id, input.workLocationId.trim()))
      .limit(1)

    if (workLocation && workLocation.companyId === companyId && workLocation.status === 'active') {
      workLocationId = workLocation.id
      defaultCity = workLocation.city
    }
  }

  // Jika workLocationId tidak dipilih secara eksplisit, ambil lokasi utama perusahaan jika tersedia
  if (!workLocationId) {
    const [primaryLoc] = await db
      .select({
        id: companyLocations.id,
        city: companyLocations.city
      })
      .from(companyLocations)
      .where(and(eq(companyLocations.companyId, companyId), eq(companyLocations.status, 'active')))
      .limit(1)

    if (primaryLoc) {
      workLocationId = primaryLoc.id
      defaultCity = primaryLoc.city
    }
  }

  let locations: LocationGeoSnapshot[] = []
  let attendanceLocationIds: string[] = []

  if (Array.isArray(input.attendanceLocations) && input.attendanceLocations.length > 0) {
    for (let i = 0; i < input.attendanceLocations.length; i++) {
      const p = input.attendanceLocations[i]
      const locName = p.name?.trim()
      if (!locName || locName.length < 2) {
        return { ok: false, status: 400, message: `Nama titik lokasi #${i + 1} minimal 2 karakter.` }
      }
      const lat = Number(p.latitude)
      const lng = Number(p.longitude)
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return { ok: false, status: 400, message: `Koordinat GPS titik #${i + 1} tidak valid.` }
      }
      const radius = Number(p.radiusMeters) || 50
      const coordType = p.coordinatesType === 'polygon' ? 'polygon' : 'point'
      const poly = Array.isArray(p.polygonCoordinates) ? p.polygonCoordinates : null

      locations.push({
        id: p.locationId || workLocationId || 'attendance-point',
        companyId,
        name: locName,
        address: p.address?.trim() || 'Alamat Titik Presensi',
        city: p.city?.trim() || defaultCity,
        province: p.province?.trim() || null,
        latitude: lat,
        longitude: lng,
        radiusMeters: radius,
        coordinatesType: coordType,
        polygonCoordinates: poly,
        timezone: p.timezone?.trim() || 'Asia/Jakarta'
      })
    }
    attendanceLocationIds = locations.map((l) => l.id)
  } else {
    // Fallback ke attendanceLocationIds jika ada
    const rawIds = [...new Set((input.attendanceLocationIds || []).filter(Boolean))]
    if (rawIds.length < 1) {
      return { ok: false, status: 400, message: 'Tandai minimal satu titik lokasi absensi pada peta.' }
    }

    const dbLocs = await db
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
      .where(inArray(companyLocations.id, rawIds))

    if (dbLocs.length !== rawIds.length) {
      return { ok: false, status: 400, message: 'Salah satu lokasi absensi tidak ditemukan.' }
    }
    if (dbLocs.some((location) => location.companyId !== companyId)) {
      return { ok: false, status: 400, message: 'Semua lokasi absensi harus berada di perusahaan yang sama.' }
    }
    if (dbLocs.some((location) => location.status !== 'active')) {
      return { ok: false, status: 400, message: 'Semua lokasi absensi harus berstatus aktif.' }
    }

    locations = dbLocs
    attendanceLocationIds = rawIds
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

  const validatedSchedules: ValidatedSchedule[] = []
  if (Array.isArray(input.schedules) && input.schedules.length > 0) {
    for (const std of STANDARD_DAYS) {
      const match = input.schedules.find((s) => s.dayOfWeek === std.dayOfWeek)
      if (match) {
        const isOff = Boolean(match.isOff)
        if (isOff) {
          validatedSchedules.push({
            dayOfWeek: std.dayOfWeek,
            dayName: std.dayName,
            startTime: null,
            endTime: null,
            isOff: true
          })
        } else {
          const sTime = normalizeTime(match.startTime || startTime)
          const eTime = normalizeTime(match.endTime || endTime)
          if (!sTime || !eTime) {
            return { ok: false, status: 400, message: `Jam kerja hari ${std.dayName} harus berformat HH:mm.` }
          }
          if (sTime === eTime) {
            return { ok: false, status: 400, message: `Jam mulai dan jam selesai hari ${std.dayName} tidak boleh sama.` }
          }
          validatedSchedules.push({
            dayOfWeek: std.dayOfWeek,
            dayName: std.dayName,
            startTime: sTime,
            endTime: eTime,
            isOff: false
          })
        }
      } else {
        if (std.defaultOff) {
          validatedSchedules.push({
            dayOfWeek: std.dayOfWeek,
            dayName: std.dayName,
            startTime: null,
            endTime: null,
            isOff: true
          })
        } else {
          validatedSchedules.push({
            dayOfWeek: std.dayOfWeek,
            dayName: std.dayName,
            startTime,
            endTime,
            isOff: false
          })
        }
      }
    }
  } else {
    for (const std of STANDARD_DAYS) {
      validatedSchedules.push({
        dayOfWeek: std.dayOfWeek,
        dayName: std.dayName,
        startTime: std.defaultOff ? null : startTime,
        endTime: std.defaultOff ? null : endTime,
        isOff: std.defaultOff
      })
    }
  }

  if (validatedSchedules.every((s) => s.isOff)) {
    return { ok: false, status: 400, message: 'Shift harus memiliki minimal satu hari kerja aktif dalam sepekan.' }
  }

  const firstActiveDay = validatedSchedules.find((s) => !s.isOff)
  const representativeStartTime = firstActiveDay?.startTime || startTime
  const representativeEndTime = firstActiveDay?.endTime || endTime

  return {
    ok: true,
    companyId,
    name,
    code,
    description: input.description?.trim() || null,
    startTime: representativeStartTime,
    endTime: representativeEndTime,
    workLocationId: workLocationId || null,
    attendanceLocationIds,
    locations: locations as LocationGeoSnapshot[],
    schedules: validatedSchedules,
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
    .leftJoin(companyLocations, eq(shifts.workLocationId, companyLocations.id))
    .leftJoin(supervisor, eq(shifts.supervisorId, supervisor.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(shifts.createdAt))
}

async function attachAttendance<T extends { id: string }>(rows: T[]) {
  if (rows.length === 0) return []

  const shiftIds = rows.map((row) => row.id)

  const [attendance, assignedUsers, schedulesList] = await Promise.all([
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
      .orderBy(users.name),

    db
      .select({
        id: shiftSchedules.id,
        shiftId: shiftSchedules.shiftId,
        dayOfWeek: shiftSchedules.dayOfWeek,
        dayName: shiftSchedules.dayName,
        startTime: shiftSchedules.startTime,
        endTime: shiftSchedules.endTime,
        isOff: shiftSchedules.isOff
      })
      .from(shiftSchedules)
      .where(inArray(shiftSchedules.shiftId, shiftIds))
      .orderBy(shiftSchedules.dayOfWeek)
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

  const groupedSchedules = new Map<string, typeof schedulesList>()
  for (const schedule of schedulesList) {
    const list = groupedSchedules.get(schedule.shiftId) ?? []
    list.push(schedule)
    groupedSchedules.set(schedule.shiftId, list)
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
      schedules: groupedSchedules.get(row.id) ?? [],
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
      workLocation: (row as any).workLocationId && workLocationName
        ? {
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
          }
        : null,
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

const attendancePointSchema = t.Object({
  name: t.String({ minLength: 2, maxLength: 150 }),
  address: t.String({ minLength: 2 }),
  city: t.String({ minLength: 1, maxLength: 100 }),
  province: t.Optional(t.String()),
  latitude: t.Union([t.Number(), t.String()]),
  longitude: t.Union([t.Number(), t.String()]),
  radiusMeters: t.Optional(t.Number({ minimum: 10, maximum: 5000 })),
  coordinatesType: t.Optional(t.String()),
  polygonCoordinates: t.Optional(t.Any()),
  timezone: t.Optional(t.String()),
  locationId: t.Optional(t.String())
})

const shiftScheduleSchema = t.Object({
  id: t.Optional(t.String()),
  dayOfWeek: t.Number({ minimum: 1, maximum: 7 }),
  dayName: t.String(),
  startTime: t.Optional(t.Nullable(t.String())),
  endTime: t.Optional(t.Nullable(t.String())),
  isOff: t.Boolean()
})

const shiftBodySchema = {
  body: t.Object({
    companyId: t.String(),
    name: t.String({ minLength: 2, maxLength: 150 }),
    code: t.Optional(t.String({ maxLength: 50 })),
    description: t.Optional(t.String()),
    startTime: t.String({ minLength: 5, maxLength: 8 }),
    endTime: t.String({ minLength: 5, maxLength: 8 }),
    workLocationId: t.Optional(t.Nullable(t.String())),
    attendanceLocationIds: t.Optional(t.Array(t.String())),
    attendanceLocations: t.Optional(t.Array(attendancePointSchema)),
    schedules: t.Optional(t.Array(shiftScheduleSchema)),
    status: t.Optional(t.String()),
    employeeId: t.Optional(t.String()),
    position: t.Optional(t.String()),
    supervisorId: t.Optional(t.String()),
    assignedEmployeeIds: t.Optional(t.Array(t.String()))
  })
}

export async function resolveShiftingUser(headers: Record<string, string | undefined>, jwtInstance: any) {
  const authHeader = headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  try {
    const payload = (await jwtInstance.verify(authHeader.slice(7))) as { sub?: string }
    if (!payload?.sub) return null
    const [row] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1)
    return row || null
  } catch {
    return null
  }
}

export const shiftRoutes = new Elysia({ prefix: '/shifts' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'srikaya-enterprise-jwt-secret-key-2026',
      exp: '7d'
    })
  )
  .get('', async ({ query, headers, jwt, set }) => {
    const user = await resolveShiftingUser(headers, jwt)
    let companyId = query.companyId

    if (user && user.companyId && user.role !== 'superadmin') {
      if (companyId && companyId !== user.companyId) {
        set.status = 403
        return { success: false, message: 'Akses ditolak: Anda tidak memiliki izin untuk melihat jadwal shift perusahaan lain.' }
      }
      companyId = user.companyId
    }

    const rows = await listShiftRows(companyId)
    return { success: true, data: await attachAttendance(rows) }
  }, {
    query: t.Object({
      companyId: t.Optional(t.String())
    })
  })
  .get('/', async ({ query, headers, jwt, set }) => {
    const user = await resolveShiftingUser(headers, jwt)
    let companyId = query.companyId

    if (user && user.companyId && user.role !== 'superadmin') {
      if (companyId && companyId !== user.companyId) {
        set.status = 403
        return { success: false, message: 'Akses ditolak: Anda tidak memiliki izin untuk melihat jadwal shift perusahaan lain.' }
      }
      companyId = user.companyId
    }

    const rows = await listShiftRows(companyId)
    return { success: true, data: await attachAttendance(rows) }
  }, {
    query: t.Object({
      companyId: t.Optional(t.String())
    })
  })
  .get('/:id', async ({ params, headers, jwt, set }) => {
    const user = await resolveShiftingUser(headers, jwt)
    const shift = await getShiftDetail(params.id)
    if (!shift) {
      set.status = 404
      return { success: false, message: 'Shift tidak ditemukan.' }
    }

    if (user && user.companyId && user.role !== 'superadmin') {
      if (shift.companyId !== user.companyId) {
        set.status = 403
        return { success: false, message: 'Akses ditolak: Anda tidak memiliki izin untuk mengakses shift perusahaan lain.' }
      }
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

    // Periksa jadwal harian shift untuk hari ini pada zona waktu titik presensi
    const timezone = shift.attendanceLocations?.[0]?.timezone || 'Asia/Jakarta'
    const localDate = resolveLocalDate(new Date(), timezone)
    const currentDayOfWeek = getLocalDayOfWeek(localDate)
    const daySchedule = shift.schedules?.find((s: any) => s.dayOfWeek === currentDayOfWeek)

    if (daySchedule?.isOff) {
      return {
        success: true,
        verified: false,
        message: `Hari ini (${daySchedule.dayName}) adalah hari libur (Day Off) yang terjadwal untuk shift ini.`
      }
    }

    const userLat = Number(body.latitude)
    const userLng = Number(body.longitude)

    if (Number.isNaN(userLat) || Number.isNaN(userLng)) {
      set.status = 400
      return { success: false, message: 'Koordinat lintang dan bujur tidak valid.' }
    }

    const match = matchAttendanceLocation(shift.attendanceLocations, userLat, userLng)

    if (match.matched && match.location) {
      const isPolygon = match.location.coordinatesType === 'polygon'
      return {
        success: true,
        verified: true,
        message: isPolygon
          ? `Presensi valid di area polygon: ${match.location.name} (${match.location.city}) · Hari ${daySchedule?.dayName || 'Kerja'}`
          : `Presensi valid di titik radius: ${match.location.name} (${match.location.city}) · Hari ${daySchedule?.dayName || 'Kerja'}`,
        distanceMeters: match.distanceMeters ?? undefined,
        matchedLocation: match.location,
        todaySchedule: daySchedule || null
      }
    }

    return {
      success: true,
      verified: false,
      message: 'Koordinat GPS Anda berada di luar seluruh radius / perimeter geofence yang diizinkan untuk shift ini.',
      distanceMeters: match.distanceMeters ?? undefined
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      latitude: t.Number(),
      longitude: t.Number()
    })
  })
  .post('', async ({ body, headers, jwt, set }) => {
    const user = await resolveShiftingUser(headers, jwt)
    if (user && user.companyId && user.role !== 'superadmin') {
      if (body.companyId !== user.companyId) {
        set.status = 403
        return { success: false, message: 'Akses ditolak: Anda tidak memiliki wewenang membuat shift untuk perusahaan lain.' }
      }
    }

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

      if (validated.schedules && validated.schedules.length > 0) {
        await tx.insert(shiftSchedules).values(
          validated.schedules.map((s) => ({
            shiftId: shift.id,
            dayOfWeek: s.dayOfWeek,
            dayName: s.dayName,
            startTime: s.isOff ? null : s.startTime,
            endTime: s.isOff ? null : s.endTime,
            isOff: s.isOff
          }))
        )
      }

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

      if (validated.schedules && validated.schedules.length > 0) {
        await tx.insert(shiftSchedules).values(
          validated.schedules.map((s) => ({
            shiftId: shift.id,
            dayOfWeek: s.dayOfWeek,
            dayName: s.dayName,
            startTime: s.isOff ? null : s.startTime,
            endTime: s.isOff ? null : s.endTime,
            isOff: s.isOff
          }))
        )
      }

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
  .put('/:id', async ({ params, headers, jwt, body, set }) => {
    const user = await resolveShiftingUser(headers, jwt)
    const [existing] = await db
      .select({ id: shifts.id, companyId: shifts.companyId })
      .from(shifts)
      .where(eq(shifts.id, params.id))
      .limit(1)

    if (!existing) {
      set.status = 404
      return { success: false, message: 'Shift tidak ditemukan.' }
    }

    if (user && user.companyId && user.role !== 'superadmin') {
      if (existing.companyId !== user.companyId) {
        set.status = 403
        return { success: false, message: 'Akses ditolak: Anda tidak dapat memperbarui shift perusahaan lain.' }
      }
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

      await tx
        .delete(shiftSchedules)
        .where(eq(shiftSchedules.shiftId, params.id))

      if (validated.schedules && validated.schedules.length > 0) {
        await tx.insert(shiftSchedules).values(
          validated.schedules.map((s) => ({
            shiftId: params.id,
            dayOfWeek: s.dayOfWeek,
            dayName: s.dayName,
            startTime: s.isOff ? null : s.startTime,
            endTime: s.isOff ? null : s.endTime,
            isOff: s.isOff
          }))
        )
      }

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
  .delete('/:id', async ({ params, headers, jwt, set }) => {
    const user = await resolveShiftingUser(headers, jwt)
    const [existing] = await db
      .select({ id: shifts.id, companyId: shifts.companyId })
      .from(shifts)
      .where(eq(shifts.id, params.id))
      .limit(1)

    if (!existing) {
      set.status = 404
      return { success: false, message: 'Shift tidak ditemukan.' }
    }

    if (user && user.companyId && user.role !== 'superadmin') {
      if (existing.companyId !== user.companyId) {
        set.status = 403
        return { success: false, message: 'Akses ditolak: Anda tidak dapat menghapus shift perusahaan lain.' }
      }
    }

    await db.transaction(async (tx) => {
      await tx.update(users).set({ shiftId: null }).where(eq(users.shiftId, params.id))
      await tx.delete(shifts).where(eq(shifts.id, params.id))
    })

    return { success: true, message: 'Shift berhasil dihapus.' }
  }, {
    params: t.Object({ id: t.String() })
  })
