import { Elysia, t } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { and, asc, desc, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm'
import {
  attendanceStatuses,
  attendances,
  companies,
  db,
  departments,
  shiftAttendanceLocations,
  shiftSchedules,
  shifts,
  users
} from '../db'
import {
  computeLateMinutes,
  computeWorkMinutes,
  getLocalDayOfWeek,
  isOvernightShift,
  matchAttendanceLocation,
  resolveLocalDate
} from '../lib/geofence'
import {
  DEFAULT_ATTENDANCE_STATUSES,
  attendanceStatusCodeFromName
} from '../lib/attendance-status-defaults'
import { resolveShiftingUser } from './shifts'

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

function monthRange(month: string): { start: string; end: string } | null {
  if (!MONTH_PATTERN.test(month)) return null
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, '0')}` }
}

function eachDate(start: string, end: string): string[] {
  const dates: string[] = []
  const cursor = new Date(`${start}T12:00:00Z`)
  const last = new Date(`${end}T12:00:00Z`).getTime()

  while (cursor.getTime() <= last) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return dates
}

async function ensureAttendanceStatuses() {
  const companyRows = await db.select({ id: companies.id }).from(companies)

  for (const company of companyRows) {
    const [existing] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(attendanceStatuses)
      .where(eq(attendanceStatuses.companyId, company.id))

    if ((existing?.total ?? 0) > 0) continue

    await db
      .insert(attendanceStatuses)
      .values(DEFAULT_ATTENDANCE_STATUSES.map((status) => ({ companyId: company.id, ...status })))
      .onConflictDoNothing()
  }
}

export { ensureAttendanceStatuses }

async function loadStatuses(companyId: string) {
  return db
    .select()
    .from(attendanceStatuses)
    .where(eq(attendanceStatuses.companyId, companyId))
    .orderBy(asc(attendanceStatuses.sortOrder), asc(attendanceStatuses.name))
}

async function listStatusesWithUsage(companyId: string) {
  const [statuses, usage] = await Promise.all([
    loadStatuses(companyId),
    db
      .select({ statusId: attendances.statusId, total: sql<number>`count(*)::int` })
      .from(attendances)
      .where(eq(attendances.companyId, companyId))
      .groupBy(attendances.statusId)
  ])

  const counts = new Map(usage.map((item) => [item.statusId, item.total]))
  return statuses.map((status) => ({ ...status, usageCount: counts.get(status.id) ?? 0 }))
}

interface ShiftContext {
  shift: { id: string; companyId: string; name: string; code: string; startTime: string; endTime: string }
  schedules: (typeof shiftSchedules.$inferSelect)[]
  locations: (typeof shiftAttendanceLocations.$inferSelect)[]
  timezone: string
}

async function loadShiftContext(shiftId: string): Promise<ShiftContext | null> {
  const [shift] = await db
    .select({
      id: shifts.id,
      companyId: shifts.companyId,
      name: shifts.name,
      code: shifts.code,
      startTime: shifts.startTime,
      endTime: shifts.endTime
    })
    .from(shifts)
    .where(eq(shifts.id, shiftId))
    .limit(1)

  if (!shift) return null

  const [schedules, locations] = await Promise.all([
    db
      .select()
      .from(shiftSchedules)
      .where(eq(shiftSchedules.shiftId, shiftId))
      .orderBy(asc(shiftSchedules.dayOfWeek)),
    db.select().from(shiftAttendanceLocations).where(eq(shiftAttendanceLocations.shiftId, shiftId))
  ])

  return {
    shift,
    schedules,
    locations,
    timezone: locations[0]?.timezone || 'Asia/Jakarta'
  }
}

interface AttendanceFilters {
  companyId: string
  start?: string
  end?: string
  employeeId?: string
  statusId?: string
}

function toIsoDateString(value: unknown): string {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

function toIsoTimestampString(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

async function listAttendanceRows(filters: AttendanceFilters) {
  const conditions: SQL[] = [eq(attendances.companyId, filters.companyId)]
  if (filters.start) conditions.push(gte(attendances.attendanceDate, filters.start))
  if (filters.end) conditions.push(lte(attendances.attendanceDate, filters.end))
  if (filters.employeeId) conditions.push(eq(attendances.employeeId, filters.employeeId))
  if (filters.statusId) conditions.push(eq(attendances.statusId, filters.statusId))

  const rows = await db
    .select({
      id: attendances.id,
      companyId: attendances.companyId,
      attendanceDate: attendances.attendanceDate,
      checkInAt: attendances.checkInAt,
      checkOutAt: attendances.checkOutAt,
      checkInDistanceMeters: attendances.checkInDistanceMeters,
      lateMinutes: attendances.lateMinutes,
      workMinutes: attendances.workMinutes,
      source: attendances.source,
      note: attendances.note,
      timezone: attendances.timezone,
      createdAt: attendances.createdAt,
      updatedAt: attendances.updatedAt,
      employeeId: attendances.employeeId,
      employeeName: users.name,
      employeeEmail: users.email,
      employeePosition: users.position,
      departmentName: departments.name,
      shiftId: attendances.shiftId,
      shiftName: shifts.name,
      shiftCode: shifts.code,
      statusId: attendances.statusId,
      statusName: attendanceStatuses.name,
      statusCode: attendanceStatuses.code,
      statusColor: attendanceStatuses.color,
      statusIsPresent: attendanceStatuses.isPresent,
      statusIsPaid: attendanceStatuses.isPaid,
      statusIsAbsent: attendanceStatuses.isAbsent,
      statusIsSystem: attendanceStatuses.isSystem
    })
    .from(attendances)
    .innerJoin(users, eq(attendances.employeeId, users.id))
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .leftJoin(shifts, eq(attendances.shiftId, shifts.id))
    .innerJoin(attendanceStatuses, eq(attendances.statusId, attendanceStatuses.id))
    .where(and(...conditions))
    .orderBy(desc(attendances.attendanceDate), asc(users.name))

  return rows.map((row) => ({
    id: row.id,
    companyId: row.companyId,
    attendanceDate: toIsoDateString(row.attendanceDate),
    checkInAt: toIsoTimestampString(row.checkInAt),
    checkOutAt: toIsoTimestampString(row.checkOutAt),
    checkInDistanceMeters: row.checkInDistanceMeters,
    lateMinutes: row.lateMinutes,
    workMinutes: row.workMinutes,
    source: row.source,
    note: row.note,
    timezone: row.timezone,
    createdAt: toIsoTimestampString(row.createdAt),
    updatedAt: toIsoTimestampString(row.updatedAt),
    employee: {
      id: row.employeeId,
      name: row.employeeName,
      email: row.employeeEmail,
      position: row.employeePosition,
      departmentName: row.departmentName
    },
    shift: row.shiftId ? { id: row.shiftId, name: row.shiftName, code: row.shiftCode } : null,
    status: {
      id: row.statusId,
      name: row.statusName,
      code: row.statusCode,
      color: row.statusColor,
      isPresent: row.statusIsPresent,
      isPaid: row.statusIsPaid,
      isAbsent: row.statusIsAbsent,
      isSystem: row.statusIsSystem
    }
  }))
}

async function findAttendanceRow(companyId: string, employeeId: string, date: string) {
  const rows = await listAttendanceRows({ companyId, employeeId, start: date, end: date })
  return rows[0] ?? null
}

interface AttendanceListContext {
  query: { companyId?: string; month: string; employeeId?: string; statusId?: string }
  headers: Record<string, string | undefined>
  jwt: any
  set: { status?: number | string }
}

async function handleListAttendance({ query, headers, jwt, set }: AttendanceListContext) {
  const user = await resolveShiftingUser(headers, jwt)
  const scope = await resolveCompanyId(user, query.companyId)

  if (scope.forbidden) {
    set.status = 403
    return { success: false, message: 'Akses ditolak: rekap milik perusahaan lain.' }
  }
  if (!scope.companyId) {
    set.status = 400
    return { success: false, message: 'Perusahaan belum ditentukan.' }
  }

  const range = monthRange(query.month)
  if (!range) {
    set.status = 400
    return { success: false, message: 'Format bulan harus YYYY-MM.' }
  }

  const rows = await listAttendanceRows({
    companyId: scope.companyId,
    start: range.start,
    end: range.end,
    employeeId: query.employeeId,
    statusId: query.statusId
  })

  return { success: true, month: query.month, data: rows }
}

type SessionUser = Awaited<ReturnType<typeof resolveShiftingUser>>

function canManage(user: SessionUser) {
  return !!user && (user.role === 'admin' || user.role === 'superadmin')
}

async function resolveCompanyId(user: SessionUser, requested?: string) {
  if (!user) return { companyId: requested ?? null, forbidden: false }
  if (user.role === 'superadmin') return { companyId: requested ?? user.companyId ?? null, forbidden: false }
  if (!user.companyId) return { companyId: null, forbidden: false }
  if (requested && requested !== user.companyId) return { companyId: null, forbidden: true }
  return { companyId: user.companyId, forbidden: false }
}

const statusCreateSchema = t.Object({
  companyId: t.Optional(t.String()),
  code: t.Optional(t.String({ maxLength: 40 })),
  name: t.String({ minLength: 2, maxLength: 100 }),
  description: t.Optional(t.String({ maxLength: 255 })),
  color: t.Optional(t.String({ maxLength: 20 })),
  isPresent: t.Optional(t.Boolean()),
  isPaid: t.Optional(t.Boolean()),
  isAbsent: t.Optional(t.Boolean()),
  sortOrder: t.Optional(t.Number()),
  status: t.Optional(t.String())
})

const statusUpdateSchema = t.Object({
  code: t.Optional(t.String({ maxLength: 40 })),
  name: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
  description: t.Optional(t.Nullable(t.String({ maxLength: 255 }))),
  color: t.Optional(t.String({ maxLength: 20 })),
  isPresent: t.Optional(t.Boolean()),
  isPaid: t.Optional(t.Boolean()),
  isAbsent: t.Optional(t.Boolean()),
  sortOrder: t.Optional(t.Number()),
  status: t.Optional(t.String())
})

const locationBodySchema = t.Object({
  latitude: t.Number(),
  longitude: t.Number()
})

export const attendanceRoutes = new Elysia({ prefix: '/attendance' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'srikaya-enterprise-jwt-secret-key-2026',
      exp: '7d'
    })
  )
  // Master status absensi milik HRD
  .get('/statuses', async ({ query, headers, jwt, set }) => {
    const user = await resolveShiftingUser(headers, jwt)
    const scope = await resolveCompanyId(user, query.companyId)

    if (scope.forbidden) {
      set.status = 403
      return { success: false, message: 'Akses ditolak: master status milik perusahaan lain.' }
    }
    if (!scope.companyId) {
      set.status = 400
      return { success: false, message: 'Perusahaan belum ditentukan.' }
    }

    return { success: true, data: await listStatusesWithUsage(scope.companyId) }
  }, {
    query: t.Object({ companyId: t.Optional(t.String()) })
  })
  .post('/statuses', async ({ body, headers, jwt, set }) => {
    const user = await resolveShiftingUser(headers, jwt)
    if (!canManage(user)) {
      set.status = 403
      return { success: false, message: 'Hanya HRD perusahaan yang dapat menambah status absensi.' }
    }

    const scope = await resolveCompanyId(user, body.companyId)
    if (scope.forbidden) {
      set.status = 403
      return { success: false, message: 'Akses ditolak: master status milik perusahaan lain.' }
    }
    if (!scope.companyId) {
      set.status = 400
      return { success: false, message: 'Perusahaan belum ditentukan.' }
    }

    const color = (body.color || '#64748b').trim()
    if (!HEX_COLOR_PATTERN.test(color)) {
      set.status = 400
      return { success: false, message: 'Warna status harus memakai format hex enam digit, misal #059669.' }
    }

    const code = (body.code?.trim() || attendanceStatusCodeFromName(body.name)).toLowerCase()
    const [duplicate] = await db
      .select({ id: attendanceStatuses.id })
      .from(attendanceStatuses)
      .where(and(eq(attendanceStatuses.companyId, scope.companyId), eq(attendanceStatuses.code, code)))
      .limit(1)

    if (duplicate) {
      set.status = 409
      return { success: false, message: `Kode status '${code}' sudah dipakai di perusahaan ini.` }
    }

    const [created] = await db
      .insert(attendanceStatuses)
      .values({
        companyId: scope.companyId,
        code,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        color,
        isPresent: body.isPresent ?? false,
        isPaid: body.isPaid ?? true,
        isAbsent: body.isAbsent ?? false,
        sortOrder: body.sortOrder ?? 100,
        status: body.status === 'inactive' ? 'inactive' : 'active'
      })
      .returning()

    return { success: true, data: { ...created, usageCount: 0 }, message: `Status '${created.name}' ditambahkan.` }
  }, { body: statusCreateSchema })
  .put('/statuses/:id', async ({ params, body, headers, jwt, set }) => {
    const user = await resolveShiftingUser(headers, jwt)
    if (!canManage(user)) {
      set.status = 403
      return { success: false, message: 'Hanya HRD perusahaan yang dapat mengubah status absensi.' }
    }

    const [current] = await db
      .select()
      .from(attendanceStatuses)
      .where(eq(attendanceStatuses.id, params.id))
      .limit(1)

    if (!current) {
      set.status = 404
      return { success: false, message: 'Status absensi tidak ditemukan.' }
    }
    if (user!.role !== 'superadmin' && current.companyId !== user!.companyId) {
      set.status = 403
      return { success: false, message: 'Akses ditolak: master status milik perusahaan lain.' }
    }

    const color = body.color?.trim()
    if (color && !HEX_COLOR_PATTERN.test(color)) {
      set.status = 400
      return { success: false, message: 'Warna status harus memakai format hex enam digit, misal #059669.' }
    }

    const nextCode = body.code?.trim() ? body.code.trim().toLowerCase() : current.code
    if (nextCode !== current.code) {
      const [duplicate] = await db
        .select({ id: attendanceStatuses.id })
        .from(attendanceStatuses)
        .where(
          and(
            eq(attendanceStatuses.companyId, current.companyId),
            eq(attendanceStatuses.code, nextCode)
          )
        )
        .limit(1)

      if (duplicate) {
        set.status = 409
        return { success: false, message: `Kode status '${nextCode}' sudah dipakai di perusahaan ini.` }
      }
    }

    const nextPresent = body.isPresent ?? current.isPresent
    const nextStatus = body.status === undefined
      ? current.status
      : body.status === 'inactive' ? 'inactive' : 'active'

    if (current.isPresent && current.status === 'active' && (!nextPresent || nextStatus === 'inactive')) {
      const activePresentRows = await db
        .select({ id: attendanceStatuses.id })
        .from(attendanceStatuses)
        .where(
          and(
            eq(attendanceStatuses.companyId, current.companyId),
            eq(attendanceStatuses.isPresent, true),
            eq(attendanceStatuses.status, 'active')
          )
        )

      if (activePresentRows.filter((row) => row.id !== current.id).length === 0) {
        set.status = 409
        return {
          success: false,
          message: 'Perusahaan harus memiliki minimal satu status hadir yang aktif.'
        }
      }
    }

    const [updated] = await db
      .update(attendanceStatuses)
      .set({
        code: nextCode,
        name: body.name?.trim() || current.name,
        description: body.description === undefined ? current.description : body.description,
        color: color || current.color,
        isPresent: nextPresent,
        isPaid: body.isPaid ?? current.isPaid,
        isAbsent: body.isAbsent ?? current.isAbsent,
        sortOrder: body.sortOrder ?? current.sortOrder,
        status: nextStatus,
        updatedAt: new Date()
      })
      .where(eq(attendanceStatuses.id, current.id))
      .returning()

    return { success: true, data: updated, message: `Status '${updated.name}' diperbarui.` }
  }, {
    params: t.Object({ id: t.String() }),
    body: statusUpdateSchema
  })
  .delete('/statuses/:id', async ({ params, headers, jwt, set }) => {
    const user = await resolveShiftingUser(headers, jwt)
    if (!canManage(user)) {
      set.status = 403
      return { success: false, message: 'Hanya HRD perusahaan yang dapat menghapus status absensi.' }
    }

    const [current] = await db
      .select()
      .from(attendanceStatuses)
      .where(eq(attendanceStatuses.id, params.id))
      .limit(1)

    if (!current) {
      set.status = 404
      return { success: false, message: 'Status absensi tidak ditemukan.' }
    }
    if (user!.role !== 'superadmin' && current.companyId !== user!.companyId) {
      set.status = 403
      return { success: false, message: 'Akses ditolak: master status milik perusahaan lain.' }
    }
    if (current.isSystem) {
      set.status = 409
      return {
        success: false,
        message: 'Status bawaan sistem tidak dapat dihapus. Nonaktifkan bila sudah tidak dipakai.'
      }
    }

    const [used] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(attendances)
      .where(eq(attendances.statusId, current.id))

    if ((used?.total ?? 0) > 0) {
      set.status = 409
      return {
        success: false,
        message: `Status '${current.name}' sudah dipakai ${used.total} baris presensi. Nonaktifkan saja agar riwayat tetap utuh.`
      }
    }

    await db.delete(attendanceStatuses).where(eq(attendanceStatuses.id, current.id))
    return { success: true, message: `Status '${current.name}' dihapus.` }
  }, { params: t.Object({ id: t.String() }) })
  // Presensi karyawan hari ini
  .get('/today', async ({ headers, jwt, set }) => {
    const user = await resolveShiftingUser(headers, jwt)
    if (!user) {
      set.status = 401
      return { success: false, message: 'Autentikasi diperlukan. Silakan masuk terlebih dahulu.' }
    }
    if (!user.companyId) {
      set.status = 400
      return { success: false, message: 'Akun Anda belum ditautkan ke perusahaan manapun.' }
    }

    const statuses = await loadStatuses(user.companyId)

    if (!user.shiftId) {
      return {
        success: true,
        data: {
          date: resolveLocalDate(new Date(), 'Asia/Jakarta'),
          timezone: 'Asia/Jakarta',
          shift: null,
          schedule: null,
          row: null,
          locations: [],
          canClockIn: false,
          canClockOut: false,
          statuses,
          message: 'Akun Anda belum memiliki shift kerja. Hubungi HRD.'
        }
      }
    }

    const context = await loadShiftContext(user.shiftId)
    if (!context) {
      return {
        success: true,
        data: {
          date: resolveLocalDate(new Date(), 'Asia/Jakarta'),
          timezone: 'Asia/Jakarta',
          shift: null,
          schedule: null,
          row: null,
          locations: [],
          canClockIn: false,
          canClockOut: false,
          statuses,
          message: 'Shift kerja yang ditugaskan tidak lagi tersedia.'
        }
      }
    }

    const date = resolveLocalDate(new Date(), context.timezone)
    const dayOfWeek = getLocalDayOfWeek(date)
    const schedule = context.schedules.find((item) => item.dayOfWeek === dayOfWeek) ?? null
    const row = await findAttendanceRow(user.companyId, user.id, date)

    return {
      success: true,
      data: {
        date,
        timezone: context.timezone,
        shift: {
          id: context.shift.id,
          name: context.shift.name,
          code: context.shift.code
        },
        schedule,
        row,
        locations: context.locations.map((location) => ({
          id: location.id,
          name: location.name,
          city: location.city,
          radiusMeters: location.radiusMeters,
          coordinatesType: location.coordinatesType
        })),
        canClockIn: !!schedule && !schedule.isOff && !row?.checkInAt,
        canClockOut: !!row?.checkInAt && !row?.checkOutAt,
        statuses,
        message: null
      }
    }
  })
  // Rekap per karyawan untuk satu bulan
  .get('/summary', async ({ query, headers, jwt, set }) => {
    const user = await resolveShiftingUser(headers, jwt)
    const scope = await resolveCompanyId(user, query.companyId)

    if (scope.forbidden) {
      set.status = 403
      return { success: false, message: 'Akses ditolak: rekap milik perusahaan lain.' }
    }
    if (!scope.companyId) {
      set.status = 400
      return { success: false, message: 'Perusahaan belum ditentukan.' }
    }

    const range = monthRange(query.month)
    if (!range) {
      set.status = 400
      return { success: false, message: 'Format bulan harus YYYY-MM.' }
    }

    const rows = await db
      .select({
        employeeId: attendances.employeeId,
        employeeName: users.name,
        departmentName: departments.name,
        statusId: attendanceStatuses.id,
        statusName: attendanceStatuses.name,
        statusColor: attendanceStatuses.color,
        isPresent: attendanceStatuses.isPresent,
        isPaid: attendanceStatuses.isPaid,
        isAbsent: attendanceStatuses.isAbsent,
        total: sql<number>`count(*)::int`,
        lateMinutes: sql<number>`coalesce(sum(${attendances.lateMinutes}), 0)::int`,
        workMinutes: sql<number>`coalesce(sum(${attendances.workMinutes}), 0)::int`
      })
      .from(attendances)
      .innerJoin(users, eq(attendances.employeeId, users.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .innerJoin(attendanceStatuses, eq(attendances.statusId, attendanceStatuses.id))
      .where(
        and(
          eq(attendances.companyId, scope.companyId),
          gte(attendances.attendanceDate, range.start),
          lte(attendances.attendanceDate, range.end)
        )
      )
      .groupBy(
        attendances.employeeId,
        users.name,
        departments.name,
        attendanceStatuses.id,
        attendanceStatuses.name,
        attendanceStatuses.color,
        attendanceStatuses.isPresent,
        attendanceStatuses.isPaid,
        attendanceStatuses.isAbsent
      )

    const grouped = new Map<string, {
      employeeId: string
      employeeName: string
      departmentName: string | null
      totalDays: number
      presentDays: number
      paidDays: number
      absentDays: number
      lateMinutes: number
      workMinutes: number
      perStatus: { statusId: string; name: string; color: string; total: number }[]
    }>()

    for (const row of rows) {
      const current = grouped.get(row.employeeId) ?? {
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        departmentName: row.departmentName,
        totalDays: 0,
        presentDays: 0,
        paidDays: 0,
        absentDays: 0,
        lateMinutes: 0,
        workMinutes: 0,
        perStatus: []
      }

      current.totalDays += row.total
      if (row.isPresent) current.presentDays += row.total
      if (row.isPaid) current.paidDays += row.total
      if (row.isAbsent) current.absentDays += row.total
      current.lateMinutes += row.lateMinutes
      current.workMinutes += row.workMinutes
      current.perStatus.push({
        statusId: row.statusId,
        name: row.statusName,
        color: row.statusColor,
        total: row.total
      })

      grouped.set(row.employeeId, current)
    }

    const data = [...grouped.values()].sort((a, b) => a.employeeName.localeCompare(b.employeeName))
    return { success: true, month: query.month, data }
  }, {
    query: t.Object({
      companyId: t.Optional(t.String()),
      month: t.String()
    })
  })
  // Generate baris presensi harian untuk satu bulan
  .post('/generate', async ({ body, headers, jwt, set }) => {
    const user = await resolveShiftingUser(headers, jwt)
    if (!canManage(user)) {
      set.status = 403
      return { success: false, message: 'Hanya HRD perusahaan yang dapat membuat baris presensi.' }
    }

    const scope = await resolveCompanyId(user, body.companyId)
    if (scope.forbidden) {
      set.status = 403
      return { success: false, message: 'Akses ditolak: rekap milik perusahaan lain.' }
    }
    if (!scope.companyId) {
      set.status = 400
      return { success: false, message: 'Perusahaan belum ditentukan.' }
    }

    const range = monthRange(body.month)
    if (!range) {
      set.status = 400
      return { success: false, message: 'Format bulan harus YYYY-MM.' }
    }

    const statuses = await loadStatuses(scope.companyId)
    const unfilled =
      statuses.find((status) => status.code === 'unfilled') ??
      statuses.find((status) => status.isAbsent) ??
      statuses[0]

    if (!unfilled) {
      set.status = 409
      return { success: false, message: 'Master status absensi belum tersedia untuk perusahaan ini.' }
    }

    const employeeRows = await db
      .select({ id: users.id, shiftId: users.shiftId, createdAt: users.createdAt })
      .from(users)
      .where(and(eq(users.companyId, scope.companyId), eq(users.status, 'active')))

    const withShift = employeeRows.filter((employee) => employee.shiftId)
    if (withShift.length === 0) {
      return {
        success: true,
        created: 0,
        skipped: 0,
        employees: 0,
        message: 'Tidak ada karyawan aktif dengan shift kerja.'
      }
    }

    const shiftIds = [...new Set(withShift.map((employee) => employee.shiftId!))]
    const [scheduleRows, locationRows] = await Promise.all([
      db
        .select({
          shiftId: shiftSchedules.shiftId,
          dayOfWeek: shiftSchedules.dayOfWeek,
          isOff: shiftSchedules.isOff
        })
        .from(shiftSchedules)
        .where(inArray(shiftSchedules.shiftId, shiftIds)),
      db
        .select({ shiftId: shiftAttendanceLocations.shiftId, timezone: shiftAttendanceLocations.timezone })
        .from(shiftAttendanceLocations)
        .where(inArray(shiftAttendanceLocations.shiftId, shiftIds))
    ])

    const scheduleMap = new Map<string, Map<number, { isOff: boolean }>>()
    for (const schedule of scheduleRows) {
      const days = scheduleMap.get(schedule.shiftId) ?? new Map<number, { isOff: boolean }>()
      days.set(schedule.dayOfWeek, { isOff: schedule.isOff })
      scheduleMap.set(schedule.shiftId, days)
    }

    const timezoneMap = new Map<string, string>()
    for (const location of locationRows) {
      if (!timezoneMap.has(location.shiftId)) timezoneMap.set(location.shiftId, location.timezone)
    }

    const dates = eachDate(range.start, range.end)
    const now = new Date()
    const values: (typeof attendances.$inferInsert)[] = []
    let skipped = 0
    let todayCache: { date: string; today: string } | null = null

    for (const employee of withShift) {
      const shiftId = employee.shiftId!
      const timezone = timezoneMap.get(shiftId) || 'Asia/Jakarta'

      if (!todayCache || todayCache.date !== timezone) {
        todayCache = { date: timezone, today: resolveLocalDate(now, timezone) }
      }

      const today = todayCache.today
      const joinedAt = resolveLocalDate(new Date(employee.createdAt), timezone)
      const days = scheduleMap.get(shiftId)

      for (const date of dates) {
        if (date > today || date < joinedAt) {
          skipped += 1
          continue
        }

        const schedule = days?.get(getLocalDayOfWeek(date))
        if (!schedule || schedule.isOff) {
          skipped += 1
          continue
        }

        values.push({
          companyId: scope.companyId,
          employeeId: employee.id,
          shiftId,
          statusId: unfilled.id,
          attendanceDate: date,
          source: 'auto',
          timezone,
          createdBy: user!.id
        })
      }
    }

    let created = 0
    for (let index = 0; index < values.length; index += 200) {
      const chunk = values.slice(index, index + 200)
      const inserted = await db
        .insert(attendances)
        .values(chunk)
        .onConflictDoNothing({ target: [attendances.employeeId, attendances.attendanceDate] })
        .returning({ id: attendances.id })
      created += inserted.length
    }

    return {
      success: true,
      created,
      skipped,
      employees: withShift.length,
      month: body.month,
      message: `${created} baris presensi dibuat, ${values.length - created} sudah ada sebelumnya.`
    }
  }, {
    body: t.Object({
      companyId: t.Optional(t.String()),
      month: t.String()
    })
  })
  // Presensi masuk
  .post('/clock-in', async ({ body, headers, jwt, set }) => {
    const user = await resolveShiftingUser(headers, jwt)
    if (!user) {
      set.status = 401
      return { success: false, message: 'Autentikasi diperlukan. Silakan masuk terlebih dahulu.' }
    }
    if (!user.companyId) {
      set.status = 400
      return { success: false, message: 'Akun Anda belum ditautkan ke perusahaan manapun.' }
    }
    if (!user.shiftId) {
      set.status = 400
      return { success: false, message: 'Karyawan belum memiliki shift kerja. Hubungi HRD.' }
    }

    const context = await loadShiftContext(user.shiftId)
    if (!context) {
      set.status = 404
      return { success: false, message: 'Shift kerja yang ditugaskan tidak ditemukan.' }
    }

    const now = new Date()
    const date = resolveLocalDate(now, context.timezone)
    const schedule = context.schedules.find((item) => item.dayOfWeek === getLocalDayOfWeek(date))

    if (!schedule) {
      set.status = 400
      return { success: false, message: 'Jadwal shift untuk hari ini belum diatur.' }
    }
    if (schedule.isOff) {
      set.status = 400
      return {
        success: false,
        message: `Hari ini (${schedule.dayName}) adalah hari libur terjadwal untuk shift ini.`
      }
    }
    if (context.locations.length === 0) {
      set.status = 400
      return { success: false, message: 'Shift belum memiliki titik presensi yang sah.' }
    }

    const latitude = Number(body.latitude)
    const longitude = Number(body.longitude)
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      set.status = 400
      return { success: false, message: 'Koordinat lintang dan bujur tidak valid.' }
    }

    const [existing] = await db
      .select()
      .from(attendances)
      .where(and(eq(attendances.employeeId, user.id), eq(attendances.attendanceDate, date)))
      .limit(1)

    if (existing?.checkInAt) {
      set.status = 409
      return { success: false, message: 'Presensi masuk hari ini sudah tercatat.' }
    }

    const match = matchAttendanceLocation(context.locations, latitude, longitude)
    if (!match.matched || !match.location) {
      return {
        success: true,
        verified: false,
        distanceMeters: match.distanceMeters,
        message: 'Koordinat GPS Anda berada di luar seluruh radius / perimeter geofence shift ini.'
      }
    }

    const statuses = await loadStatuses(user.companyId)
    const unfilledId = statuses.find((status) => status.code === 'unfilled')?.id
    const presentStatus = statuses
      .filter((status) => status.isPresent && status.status === 'active')
      .sort((a, b) => a.sortOrder - b.sortOrder)[0]

    if (!presentStatus && !existing) {
      set.status = 409
      return {
        success: false,
        message: 'Belum ada status hadir yang aktif pada master status absensi perusahaan.'
      }
    }

    const lateMinutes = computeLateMinutes(schedule.startTime, now, context.timezone)
    const statusId =
      !existing || existing.statusId === unfilledId
        ? presentStatus?.id ?? existing!.statusId
        : existing.statusId

    const payload = {
      shiftId: user.shiftId,
      statusId,
      checkInAt: now,
      checkInLatitude: latitude.toFixed(7),
      checkInLongitude: longitude.toFixed(7),
      attendanceLocationId: match.location.id,
      checkInDistanceMeters: match.distanceMeters ?? 0,
      lateMinutes,
      timezone: context.timezone,
      source: 'clock_in',
      updatedBy: user.id,
      updatedAt: now
    }

    if (existing) {
      await db.update(attendances).set(payload).where(eq(attendances.id, existing.id))
    } else {
      await db.insert(attendances).values({
        ...payload,
        companyId: user.companyId,
        employeeId: user.id,
        attendanceDate: date,
        createdBy: user.id
      })
    }

    return {
      success: true,
      verified: true,
      distanceMeters: match.distanceMeters ?? 0,
      lateMinutes,
      message: `Presensi masuk tercatat di ${match.location.name} · deviasi ${match.distanceMeters ?? 0} m.`,
      data: await findAttendanceRow(user.companyId, user.id, date)
    }
  }, { body: locationBodySchema })
  // Presensi pulang
  .post('/clock-out', async ({ body, headers, jwt, set }) => {
    const user = await resolveShiftingUser(headers, jwt)
    if (!user) {
      set.status = 401
      return { success: false, message: 'Autentikasi diperlukan. Silakan masuk terlebih dahulu.' }
    }
    if (!user.companyId) {
      set.status = 400
      return { success: false, message: 'Akun Anda belum ditautkan ke perusahaan manapun.' }
    }

    const shiftId = user.shiftId
    if (!shiftId) {
      set.status = 400
      return { success: false, message: 'Karyawan belum memiliki shift kerja. Hubungi HRD.' }
    }

    const context = await loadShiftContext(shiftId)
    if (!context) {
      set.status = 404
      return { success: false, message: 'Shift kerja yang ditugaskan tidak ditemukan.' }
    }

    const now = new Date()
    const date = resolveLocalDate(now, context.timezone)
    const schedule = context.schedules.find((item) => item.dayOfWeek === getLocalDayOfWeek(date))

    const [existing] = await db
      .select()
      .from(attendances)
      .where(and(eq(attendances.employeeId, user.id), eq(attendances.attendanceDate, date)))
      .limit(1)

    if (!existing?.checkInAt) {
      set.status = 409
      return { success: false, message: 'Belum ada presensi masuk yang tercatat untuk hari ini.' }
    }
    if (existing.checkOutAt) {
      set.status = 409
      return { success: false, message: 'Presensi pulang hari ini sudah tercatat.' }
    }

    const latitude = Number(body.latitude)
    const longitude = Number(body.longitude)
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      set.status = 400
      return { success: false, message: 'Koordinat lintang dan bujur tidak valid.' }
    }

    if (context.locations.length > 0) {
      const match = matchAttendanceLocation(context.locations, latitude, longitude)
      if (!match.matched) {
        return {
          success: true,
          verified: false,
          distanceMeters: match.distanceMeters,
          message: 'Koordinat GPS Anda berada di luar seluruh radius / perimeter geofence shift ini.'
        }
      }
    }

    const overnight = isOvernightShift(schedule?.startTime ?? context.shift.startTime, schedule?.endTime ?? context.shift.endTime)
    const workMinutes = computeWorkMinutes(existing.checkInAt, now, overnight)

    await db
      .update(attendances)
      .set({
        checkOutAt: now,
        checkOutLatitude: latitude.toFixed(7),
        checkOutLongitude: longitude.toFixed(7),
        workMinutes,
        source: existing.source === 'auto' ? 'clock_in' : existing.source,
        updatedBy: user.id,
        updatedAt: now
      })
      .where(eq(attendances.id, existing.id))

    return {
      success: true,
      verified: true,
      workMinutes,
      message: `Presensi pulang tercatat · durasi kerja ${Math.floor(workMinutes / 60)} jam ${workMinutes % 60} menit.`,
      data: await findAttendanceRow(user.companyId, user.id, date)
    }
  }, { body: locationBodySchema })
  // Rekap presensi
  .get('/', handleListAttendance, {
    query: t.Object({
      companyId: t.Optional(t.String()),
      month: t.String(),
      employeeId: t.Optional(t.String()),
      statusId: t.Optional(t.String())
    })
  })
  .get('', handleListAttendance, {
    query: t.Object({
      companyId: t.Optional(t.String()),
      month: t.String(),
      employeeId: t.Optional(t.String()),
      statusId: t.Optional(t.String())
    })
  })
  // Override status oleh HRD
  .put('/:id', async ({ params, body, headers, jwt, set }) => {
    const user = await resolveShiftingUser(headers, jwt)
    if (!canManage(user)) {
      set.status = 403
      return { success: false, message: 'Hanya HRD perusahaan yang dapat menimpa status presensi.' }
    }

    const [current] = await db.select().from(attendances).where(eq(attendances.id, params.id)).limit(1)
    if (!current) {
      set.status = 404
      return { success: false, message: 'Baris presensi tidak ditemukan.' }
    }
    if (user!.role !== 'superadmin' && current.companyId !== user!.companyId) {
      set.status = 403
      return { success: false, message: 'Akses ditolak: presensi milik perusahaan lain.' }
    }

    const statusChanged = !!body.statusId && body.statusId !== current.statusId
    if (statusChanged && !body.note?.trim()) {
      set.status = 400
      return { success: false, message: 'Catatan alasan wajib diisi saat mengubah status presensi.' }
    }

    if (body.statusId) {
      const [status] = await db
        .select({ id: attendanceStatuses.id, companyId: attendanceStatuses.companyId })
        .from(attendanceStatuses)
        .where(eq(attendanceStatuses.id, body.statusId))
        .limit(1)

      if (!status || status.companyId !== current.companyId) {
        set.status = 400
        return { success: false, message: 'Status absensi tidak valid untuk perusahaan ini.' }
      }
    }

    const nextCheckIn =
      body.checkInAt === undefined
        ? current.checkInAt
        : body.checkInAt === null
          ? null
          : new Date(body.checkInAt)
    const nextCheckOut =
      body.checkOutAt === undefined
        ? current.checkOutAt
        : body.checkOutAt === null
          ? null
          : new Date(body.checkOutAt)

    if (nextCheckIn && Number.isNaN(nextCheckIn.getTime())) {
      set.status = 400
      return { success: false, message: 'Format jam masuk tidak valid.' }
    }
    if (nextCheckOut && Number.isNaN(nextCheckOut.getTime())) {
      set.status = 400
      return { success: false, message: 'Format jam keluar tidak valid.' }
    }

    let lateMinutes = current.lateMinutes
    let workMinutes = current.workMinutes

    if (typeof body.checkInAt === 'string' || typeof body.checkOutAt === 'string') {
      const context = current.shiftId ? await loadShiftContext(current.shiftId) : null
      const schedule = context?.schedules.find(
        (item) => item.dayOfWeek === getLocalDayOfWeek(current.attendanceDate)
      )
      const overnight = isOvernightShift(
        schedule?.startTime ?? context?.shift.startTime,
        schedule?.endTime ?? context?.shift.endTime
      )

      if (nextCheckIn && typeof body.checkInAt === 'string') {
        lateMinutes = computeLateMinutes(
          schedule?.startTime ?? context?.shift.startTime,
          nextCheckIn,
          current.timezone
        )
      }
      if (nextCheckIn && nextCheckOut) {
        workMinutes = computeWorkMinutes(nextCheckIn, nextCheckOut, overnight)
      }
    }

    await db
      .update(attendances)
      .set({
        statusId: body.statusId ?? current.statusId,
        note: body.note?.trim() || current.note,
        checkInAt: nextCheckIn,
        checkOutAt: nextCheckOut,
        lateMinutes,
        workMinutes,
        source: 'manual',
        updatedBy: user!.id,
        updatedAt: new Date()
      })
      .where(eq(attendances.id, current.id))

    return {
      success: true,
      message: 'Presensi diperbarui.',
      data: await findAttendanceRow(current.companyId, current.employeeId, current.attendanceDate)
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      statusId: t.Optional(t.String()),
      note: t.Optional(t.String()),
      checkInAt: t.Optional(t.Nullable(t.String())),
      checkOutAt: t.Optional(t.Nullable(t.String()))
    })
  })
