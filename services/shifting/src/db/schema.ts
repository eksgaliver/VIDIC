import {
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
    .notNull()
    .references(() => companyLocations.id, { onDelete: 'restrict' }),
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

export type Shift = typeof shifts.$inferSelect
export type NewShift = typeof shifts.$inferInsert
export type ShiftAttendanceLocation = typeof shiftAttendanceLocations.$inferSelect
export type NewShiftAttendanceLocation = typeof shiftAttendanceLocations.$inferInsert
