import { relations } from 'drizzle-orm'
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'
import { companies, companyLocations, users } from 'auth-service/src/db/schema'

// Master data shift operasional perusahaan. Shift dapat dibuat secara mandiri
// tanpa harus menunggu data karyawan terdaftar (karyawan akan memilih shift saat dibuat).
export const shifts = pgTable('shifts', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 150 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  description: varchar('description', { length: 255 }),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  workLocationId: uuid('work_location_id')
    .references(() => companyLocations.id, { onDelete: 'set null' }),
  employeeId: uuid('employee_id')
    .references(() => users.id, { onDelete: 'set null' }),
  position: varchar('position', { length: 150 }),
  supervisorId: uuid('supervisor_id')
    .references(() => users.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_shifts_company_id').on(table.companyId),
  index('idx_shifts_code').on(table.code),
  index('idx_shifts_employee_id').on(table.employeeId),
  index('idx_shifts_work_location_id').on(table.workLocationId),
  index('idx_shifts_status').on(table.status)
])

// Titik absensi geofence untuk satu shift. Skema geolokasi identik dengan
// lokasi operasional perusahaan (coordinatesType, polygonCoordinates, radiusMeters,
// latitude, longitude, timezone, address, city, province). Hal ini mengantisipasi
// jika suatu perusahaan memiliki lebih dari 1 lokasi fisik dalam 1 kota yang sama.
export const shiftAttendanceLocations = pgTable('shift_attendance_locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  shiftId: uuid('shift_id')
    .notNull()
    .references(() => shifts.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id')
    .references(() => companyLocations.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 150 }).notNull(),
  address: text('address').notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  province: varchar('province', { length: 100 }),
  latitude: numeric('latitude', { precision: 10, scale: 7 }).notNull(),
  longitude: numeric('longitude', { precision: 10, scale: 7 }).notNull(),
  radiusMeters: integer('radius_meters').default(100).notNull(),
  coordinatesType: varchar('coordinates_type', { length: 20 }).default('point').notNull(),
  polygonCoordinates: jsonb('polygon_coordinates').$type<[number, number][]>(),
  timezone: varchar('timezone', { length: 50 }).default('Asia/Jakarta').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_shift_attendance_shift_id').on(table.shiftId),
  index('idx_shift_attendance_location_id').on(table.locationId),
  index('idx_shift_attendance_city').on(table.city)
])

// Jadwal shift harian (Senin - Minggu). Membedakan jam kerja (start & end time)
// per hari dalam 1 minggu atau menentukan hari libur operasional (isOff = true).
export const shiftSchedules = pgTable('shift_schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  shiftId: uuid('shift_id')
    .notNull()
    .references(() => shifts.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(), // 1 = Senin, 2 = Selasa, 3 = Rabu, 4 = Kamis, 5 = Jumat, 6 = Sabtu, 7 = Minggu
  dayName: varchar('day_name', { length: 20 }).notNull(),
  startTime: time('start_time'),
  endTime: time('end_time'),
  isOff: boolean('is_off').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_shift_schedules_shift_id').on(table.shiftId),
  uniqueIndex('uq_shift_schedules_shift_day').on(table.shiftId, table.dayOfWeek)
])

// Master status absensi milik HRD per perusahaan. Label, warna, dan perilaku
// (hadir / dibayar / alpa) sepenuhnya ditentukan HRD tanpa perlu migrasi skema.
export const attendanceStatuses = pgTable('attendance_statuses', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 40 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 255 }),
  color: varchar('color', { length: 20 }).default('#64748b').notNull(),
  isPresent: boolean('is_present').default(false).notNull(),
  isPaid: boolean('is_paid').default(true).notNull(),
  isAbsent: boolean('is_absent').default(false).notNull(),
  isSystem: boolean('is_system').default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_att_statuses_company_id').on(table.companyId),
  uniqueIndex('uq_att_statuses_company_code').on(table.companyId, table.code)
])

// Satu-satunya tabel penyimpan presensi. Satu baris mewakili satu karyawan
// pada satu tanggal kerja, dengan status yang merujuk ke master di atas.
export const attendances = pgTable('attendances', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  shiftId: uuid('shift_id').references(() => shifts.id, { onDelete: 'set null' }),
  statusId: uuid('status_id')
    .notNull()
    .references(() => attendanceStatuses.id, { onDelete: 'restrict' }),
  attendanceDate: date('attendance_date', { mode: 'string' }).notNull(),
  checkInAt: timestamp('check_in_at', { withTimezone: true }),
  checkOutAt: timestamp('check_out_at', { withTimezone: true }),
  checkInLatitude: numeric('check_in_latitude', { precision: 10, scale: 7 }),
  checkInLongitude: numeric('check_in_longitude', { precision: 10, scale: 7 }),
  checkOutLatitude: numeric('check_out_latitude', { precision: 10, scale: 7 }),
  checkOutLongitude: numeric('check_out_longitude', { precision: 10, scale: 7 }),
  attendanceLocationId: uuid('attendance_location_id')
    .references(() => shiftAttendanceLocations.id, { onDelete: 'set null' }),
  checkInDistanceMeters: integer('check_in_distance_meters'),
  lateMinutes: integer('late_minutes').default(0).notNull(),
  workMinutes: integer('work_minutes'),
  source: varchar('source', { length: 20 }).default('auto').notNull(), // auto | clock_in | manual
  note: text('note'),
  timezone: varchar('timezone', { length: 50 }).default('Asia/Jakarta').notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  uniqueIndex('uq_attendances_employee_date').on(table.employeeId, table.attendanceDate),
  index('idx_attendances_company_date').on(table.companyId, table.attendanceDate),
  index('idx_attendances_status_id').on(table.statusId),
  index('idx_attendances_shift_id').on(table.shiftId)
])

export const attendanceStatusRelations = relations(attendanceStatuses, ({ one, many }) => ({
  company: one(companies, {
    fields: [attendanceStatuses.companyId],
    references: [companies.id]
  }),
  attendances: many(attendances)
}))

export const attendanceRelations = relations(attendances, ({ one }) => ({
  company: one(companies, {
    fields: [attendances.companyId],
    references: [companies.id]
  }),
  employee: one(users, {
    fields: [attendances.employeeId],
    references: [users.id]
  }),
  shift: one(shifts, {
    fields: [attendances.shiftId],
    references: [shifts.id]
  }),
  status: one(attendanceStatuses, {
    fields: [attendances.statusId],
    references: [attendanceStatuses.id]
  }),
  attendanceLocation: one(shiftAttendanceLocations, {
    fields: [attendances.attendanceLocationId],
    references: [shiftAttendanceLocations.id]
  })
}))

export type Shift = typeof shifts.$inferSelect
export type NewShift = typeof shifts.$inferInsert
export type ShiftAttendanceLocation = typeof shiftAttendanceLocations.$inferSelect
export type NewShiftAttendanceLocation = typeof shiftAttendanceLocations.$inferInsert
export type ShiftSchedule = typeof shiftSchedules.$inferSelect
export type NewShiftSchedule = typeof shiftSchedules.$inferInsert
export type AttendanceStatus = typeof attendanceStatuses.$inferSelect
export type NewAttendanceStatus = typeof attendanceStatuses.$inferInsert
export type Attendance = typeof attendances.$inferSelect
export type NewAttendance = typeof attendances.$inferInsert
