import { pgTable, text, timestamp, uuid, varchar, numeric, integer, boolean, index, jsonb, type AnyPgColumn } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// 1. Tabel Perusahaan (Companies)
export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  brandName: varchar('brand_name', { length: 150 }),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  industry: varchar('industry', { length: 100 }),
  website: varchar('website', { length: 255 }),
  logoUrl: text('logo_url'),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_companies_code').on(table.code),
  index('idx_companies_status').on(table.status)
])

// 2. Tabel Lokasi Operasional Perusahaan (Company Locations - Geofencing Presisi untuk Absensi)
export const companyLocations = pgTable('company_locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 150 }).notNull(),
  address: text('address').notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  province: varchar('province', { length: 100 }),
  postalCode: varchar('postal_code', { length: 10 }),
  latitude: numeric('latitude', { precision: 10, scale: 7 }).notNull(),
  longitude: numeric('longitude', { precision: 10, scale: 7 }).notNull(),
  radiusMeters: integer('radius_meters').default(100).notNull(),
  coordinatesType: varchar('coordinates_type', { length: 20 }).default('point').notNull(),
  polygonCoordinates: jsonb('polygon_coordinates').$type<[number, number][]>(),
  timezone: varchar('timezone', { length: 50 }).default('Asia/Jakarta').notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_company_locations_company_id').on(table.companyId),
  index('idx_company_locations_is_primary').on(table.isPrimary)
])

// 3. Tabel Departemen Perusahaan (Departments - Wajib ada HR)
export const departments = pgTable('departments', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
  isMandatory: boolean('is_mandatory').default(false).notNull(), // Untuk departemen wajib seperti HR (tidak boleh dihapus)
  status: varchar('status', { length: 20 }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_departments_company_id').on(table.companyId),
  index('idx_departments_code').on(table.code),
  index('idx_departments_is_mandatory').on(table.isMandatory)
])

// 4. Tabel Pengguna & Karyawan (Users)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .references(() => companies.id, { onDelete: 'set null' }),
  departmentId: uuid('department_id')
    .references(() => departments.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  avatarUrl: text('avatar_url'),
  position: varchar('position', { length: 150 }),
  supervisorId: uuid('supervisor_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  shiftId: uuid('shift_id'),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  role: varchar('role', { length: 50 }).default('member').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_auth_users_email').on(table.email),
  index('idx_auth_users_company_id').on(table.companyId),
  index('idx_auth_users_department_id').on(table.departmentId),
  index('idx_auth_users_supervisor_id').on(table.supervisorId),
  index('idx_auth_users_shift_id').on(table.shiftId),
  index('idx_auth_users_status').on(table.status)
])

// 5. Tabel Wilayah & Kota Operasional Perusahaan (Company Operational Areas)
export const companyOperationalAreas = pgTable('company_operational_areas', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  province: varchar('province', { length: 100 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_comp_op_areas_company_id').on(table.companyId),
  index('idx_comp_op_areas_province').on(table.province),
  index('idx_comp_op_areas_city').on(table.city)
])

// Relasi untuk Drizzle Relational Queries API (db.query)
export const companiesRelations = relations(companies, ({ many }) => ({
  locations: many(companyLocations),
  departments: many(departments),
  employees: many(users),
  operationalAreas: many(companyOperationalAreas)
}))

export const companyOperationalAreasRelations = relations(companyOperationalAreas, ({ one }) => ({
  company: one(companies, {
    fields: [companyOperationalAreas.companyId],
    references: [companies.id]
  })
}))

export const companyLocationsRelations = relations(companyLocations, ({ one }) => ({
  company: one(companies, {
    fields: [companyLocations.companyId],
    references: [companies.id]
  })
}))

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  company: one(companies, {
    fields: [departments.companyId],
    references: [companies.id]
  }),
  employees: many(users)
}))

export const usersRelations = relations(users, ({ one }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id]
  }),
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id]
  })
}))

// Inferensi Tipe TypeScript
export type Company = typeof companies.$inferSelect
export type NewCompany = typeof companies.$inferInsert
export type CompanyLocation = typeof companyLocations.$inferSelect
export type NewCompanyLocation = typeof companyLocations.$inferInsert
export type Department = typeof departments.$inferSelect
export type NewDepartment = typeof departments.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type CompanyOperationalArea = typeof companyOperationalAreas.$inferSelect
export type NewCompanyOperationalArea = typeof companyOperationalAreas.$inferInsert

