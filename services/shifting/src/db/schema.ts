import {
  index,
  pgTable,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'
import { companies, companyLocations, users } from 'auth-service/src/db/schema'

// Shift selalu milik satu karyawan. Posisi dan atasan disimpan pada shift
// agar penugasan historis tetap utuh saat data karyawan berubah.
export const shifts = pgTable('shifts', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  position: varchar('position', { length: 150 }).notNull(),
  supervisorId: uuid('supervisor_id')
    .references(() => users.id, { onDelete: 'set null' }),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  workLocationId: uuid('work_location_id')
    .notNull()
    .references(() => companyLocations.id, { onDelete: 'restrict' }),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_shifts_company_id').on(table.companyId),
  index('idx_shifts_employee_id').on(table.employeeId),
  index('idx_shifts_supervisor_id').on(table.supervisorId),
  index('idx_shifts_work_location_id').on(table.workLocationId),
  index('idx_shifts_status').on(table.status)
])

// Titik absensi geofence untuk satu shift. Minimal satu titik dijaga di
// lapisan validasi API; tabel ini mengizinkan lebih dari satu titik.
export const shiftAttendanceLocations = pgTable('shift_attendance_locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  shiftId: uuid('shift_id')
    .notNull()
    .references(() => shifts.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id')
    .notNull()
    .references(() => companyLocations.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  uniqueIndex('uq_shift_attendance_location').on(table.shiftId, table.locationId),
  index('idx_shift_attendance_shift_id').on(table.shiftId),
  index('idx_shift_attendance_location_id').on(table.locationId)
])

export type Shift = typeof shifts.$inferSelect
export type NewShift = typeof shifts.$inferInsert
export type ShiftAttendanceLocation = typeof shiftAttendanceLocations.$inferSelect
export type NewShiftAttendanceLocation = typeof shiftAttendanceLocations.$inferInsert
