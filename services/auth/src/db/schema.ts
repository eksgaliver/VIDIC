import { pgTable, text, timestamp, uuid, varchar, numeric, integer, boolean, index, jsonb, date, type AnyPgColumn } from 'drizzle-orm/pg-core'
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

// 6. Tabel Surat / Surel / Pesan Internal Karyawan (Mail)
// Setiap karyawan memiliki relasi dengan tabel mail untuk komunikasi internal, pesan onboarding, dan notifikasi tugas.
export const mail = pgTable('mail', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id')
    .references(() => companies.id, { onDelete: 'cascade' }),
  senderEmail: varchar('sender_email', { length: 255 }).notNull(),
  senderName: varchar('sender_name', { length: 255 }),
  recipientEmail: varchar('recipient_email', { length: 255 }).notNull(),
  recipientName: varchar('recipient_name', { length: 255 }),
  subject: varchar('subject', { length: 255 }).notNull(),
  body: text('body').notNull(),
  category: varchar('category', { length: 50 }).default('inbox').notNull(), // 'inbox' | 'sent' | 'announcement' | 'system'
  isRead: boolean('is_read').default(false).notNull(),
  isStarred: boolean('is_starred').default(false).notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_mail_user_id').on(table.userId),
  index('idx_mail_company_id').on(table.companyId),
  index('idx_mail_recipient_email').on(table.recipientEmail),
  index('idx_mail_category').on(table.category),
  index('idx_mail_is_read').on(table.isRead)
])

// 7. Tabel Biodata Karyawan (Biodata)
// Dibuat saat pendaftaran karyawan awal dan akan dilengkapi oleh karyawan bersangkutan setelah berhasil login.
export const biodata = pgTable('biodata', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id')
    .references(() => companies.id, { onDelete: 'cascade' }),

  // 1. Identitas Kependudukan & Pajak
  nik: varchar('nik', { length: 20 }), // 16 digit NIK KTP
  kkNumber: varchar('kk_number', { length: 20 }), // No. Kartu Keluarga
  npwp: varchar('npwp', { length: 30 }),
  bpjsKetenagakerjaan: varchar('bpjs_ketenagakerjaan', { length: 30 }),
  bpjsKesehatan: varchar('bpjs_kesehatan', { length: 30 }),

  // 2. Data Pribadi & Demografi
  gender: varchar('gender', { length: 20 }), // 'male' | 'female'
  placeOfBirth: varchar('place_of_birth', { length: 100 }),
  dateOfBirth: varchar('date_of_birth', { length: 20 }), // Format YYYY-MM-DD
  religion: varchar('religion', { length: 50 }), // Islam, Kristen, Katolik, Hindu, Buddha, Khonghucu
  bloodType: varchar('blood_type', { length: 10 }), // A, B, AB, O
  maritalStatus: varchar('marital_status', { length: 30 }), // single, married, widow, widower

  // 3. Kontak & Domisili
  phone: varchar('phone', { length: 30 }),
  emergencyContactName: varchar('emergency_contact_name', { length: 150 }),
  emergencyContactPhone: varchar('emergency_contact_phone', { length: 30 }),
  emergencyContactRelation: varchar('emergency_contact_relation', { length: 50 }),
  addressKtp: text('address_ktp'),
  addressCurrent: text('address_current'),
  postalCode: varchar('postal_code', { length: 10 }),
  city: varchar('city', { length: 100 }),
  province: varchar('province', { length: 100 }),

  // 4. Pendidikan Terakhir & Rekening Bank
  lastEducation: varchar('last_education', { length: 50 }), // SMA/SMK, D3, S1, S2, S3
  major: varchar('major', { length: 100 }),
  institution: varchar('institution', { length: 150 }),
  bankName: varchar('bank_name', { length: 50 }),
  bankAccountNumber: varchar('bank_account_number', { length: 50 }),
  bankAccountHolder: varchar('bank_account_holder', { length: 150 }),

  // 5. Status Kelengkapan Pengisian Biodata
  isCompleted: boolean('is_completed').default(false).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_biodata_user_id').on(table.userId),
  index('idx_biodata_company_id').on(table.companyId),
  index('idx_biodata_nik').on(table.nik),
  index('idx_biodata_is_completed').on(table.isCompleted)
])

// Relasi untuk Drizzle Relational Queries API (db.query)
export const companiesRelations = relations(companies, ({ many }) => ({
  locations: many(companyLocations),
  departments: many(departments),
  employees: many(users),
  operationalAreas: many(companyOperationalAreas),
  mails: many(mail),
  biodatas: many(biodata)
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

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id]
  }),
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id]
  }),
  biodata: one(biodata, {
    fields: [users.id],
    references: [biodata.userId]
  }),
  mails: many(mail)
}))

export const mailRelations = relations(mail, ({ one }) => ({
  user: one(users, {
    fields: [mail.userId],
    references: [users.id]
  }),
  company: one(companies, {
    fields: [mail.companyId],
    references: [companies.id]
  })
}))

export const biodataRelations = relations(biodata, ({ one }) => ({
  user: one(users, {
    fields: [biodata.userId],
    references: [users.id]
  }),
  company: one(companies, {
    fields: [biodata.companyId],
    references: [companies.id]
  })
}))

// 8. Tabel Postingan Berita & Pengumuman (Posts)
export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .references(() => companies.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }),
  content: text('content').notNull(),
  category: varchar('category', { length: 50 }).default('general').notNull(),
  mediaUrls: jsonb('media_urls').$type<string[]>().default([]),
  isPinned: boolean('is_pinned').default(false).notNull(),
  likesCount: integer('likes_count').default(0).notNull(),
  likedUserIds: jsonb('liked_user_ids').$type<string[]>().default([]),
  commentsCount: integer('comments_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_posts_company_id').on(table.companyId),
  index('idx_posts_author_id').on(table.authorId),
  index('idx_posts_category').on(table.category),
  index('idx_posts_is_pinned').on(table.isPinned),
  index('idx_posts_created_at').on(table.createdAt)
])

// 9. Tabel Komentar Postingan (Post Comments)
export const postComments = pgTable('post_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_post_comments_post_id').on(table.postId)
])

// 10. Tabel Periode Evaluasi KPI (KPI Periods)
export const kpiPeriods = pgTable('kpi_periods', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 150 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  graceEndDate: date('grace_end_date'),
  status: varchar('status', { length: 30 }).default('active').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_kpi_periods_company').on(table.companyId, table.status)
])

// 11. Tabel Indikator KPI Divisi (Department KPI Items)
export const departmentKpiItems = pgTable('department_kpi_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  departmentId: uuid('department_id')
    .notNull()
    .references(() => departments.id, { onDelete: 'cascade' }),
  periodId: uuid('period_id')
    .notNull()
    .references(() => kpiPeriods.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  category: varchar('category', { length: 50 }).default('operational').notNull(),
  description: text('description'),
  measurementUnit: varchar('measurement_unit', { length: 50 }).notNull(),
  targetValue: numeric('target_value', { precision: 12, scale: 2 }).notNull(),
  weight: numeric('weight', { precision: 5, scale: 2 }).notNull(),
  targetPosition: varchar('target_position', { length: 100 }),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_dept_kpi_items').on(table.departmentId, table.periodId)
])

// 12. Tabel Lembar Evaluasi KPI Karyawan (Employee KPI Assessments)
export const employeeKpiAssessments = pgTable('employee_kpi_assessments', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  departmentId: uuid('department_id')
    .notNull()
    .references(() => departments.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  periodId: uuid('period_id')
    .notNull()
    .references(() => kpiPeriods.id, { onDelete: 'cascade' }),
  evaluatorId: uuid('evaluator_id')
    .references(() => users.id, { onDelete: 'set null' }),
  totalWeight: numeric('total_weight', { precision: 5, scale: 2 }).default('100.00').notNull(),
  finalScore: numeric('final_score', { precision: 5, scale: 2 }).default('0.00').notNull(),
  grade: varchar('grade', { length: 10 }),
  status: varchar('status', { length: 30 }).default('active').notNull(),
  notesFromEvaluator: text('notes_from_evaluator'),
  employeeFeedback: text('employee_feedback'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_emp_kpi_assessments').on(table.departmentId, table.periodId, table.employeeId)
])

// 13. Tabel Butir Penilaian KPI Karyawan (Employee KPI Assessment Items)
export const employeeKpiAssessmentItems = pgTable('employee_kpi_assessment_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  assessmentId: uuid('assessment_id')
    .notNull()
    .references(() => employeeKpiAssessments.id, { onDelete: 'cascade' }),
  departmentKpiItemId: uuid('department_kpi_item_id')
    .references(() => departmentKpiItems.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }).notNull(),
  category: varchar('category', { length: 50 }).default('operational').notNull(),
  description: text('description'),
  measurementUnit: varchar('measurement_unit', { length: 50 }).notNull(),
  targetValue: numeric('target_value', { precision: 12, scale: 2 }).notNull(),
  actualValue: numeric('actual_value', { precision: 12, scale: 2 }).default('0.00').notNull(),
  weight: numeric('weight', { precision: 5, scale: 2 }).notNull(),
  achievementPercentage: numeric('achievement_percentage', { precision: 7, scale: 2 }).default('0.00').notNull(),
  weightedScore: numeric('weighted_score', { precision: 7, scale: 2 }).default('0.00').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_emp_kpi_assessment_items').on(table.assessmentId)
])

// 14. Tabel Tugas / Bukti Kerja Mandiri Karyawan (Employee KPI Tasks)
export const employeeKpiTasks = pgTable('employee_kpi_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  assessmentItemId: uuid('assessment_item_id')
    .notNull()
    .references(() => employeeKpiAssessmentItems.id, { onDelete: 'cascade' }),
  assessmentId: uuid('assessment_id')
    .notNull()
    .references(() => employeeKpiAssessments.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  departmentId: uuid('department_id')
    .notNull()
    .references(() => departments.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  progressValue: numeric('progress_value', { precision: 12, scale: 2 }).notNull(),
  completedDate: date('completed_date').notNull(),
  evidenceUrl: text('evidence_url'),
  notes: text('notes'),
  status: varchar('status', { length: 30 }).default('pending_review').notNull(),
  reviewedBy: uuid('reviewed_by')
    .references(() => users.id, { onDelete: 'set null' }),
  reviewNotes: text('review_notes'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_kpi_tasks_status').on(table.departmentId, table.status),
  index('idx_kpi_tasks_emp').on(table.employeeId, table.completedDate)
])

// Relasi Skema KPI
export const kpiPeriodsRelations = relations(kpiPeriods, ({ one, many }) => ({
  company: one(companies, {
    fields: [kpiPeriods.companyId],
    references: [companies.id]
  }),
  departmentItems: many(departmentKpiItems),
  assessments: many(employeeKpiAssessments)
}))

export const departmentKpiItemsRelations = relations(departmentKpiItems, ({ one, many }) => ({
  company: one(companies, {
    fields: [departmentKpiItems.companyId],
    references: [companies.id]
  }),
  department: one(departments, {
    fields: [departmentKpiItems.departmentId],
    references: [departments.id]
  }),
  period: one(kpiPeriods, {
    fields: [departmentKpiItems.periodId],
    references: [kpiPeriods.id]
  }),
  assessmentItems: many(employeeKpiAssessmentItems)
}))

export const employeeKpiAssessmentsRelations = relations(employeeKpiAssessments, ({ one, many }) => ({
  company: one(companies, {
    fields: [employeeKpiAssessments.companyId],
    references: [companies.id]
  }),
  department: one(departments, {
    fields: [employeeKpiAssessments.departmentId],
    references: [departments.id]
  }),
  employee: one(users, {
    fields: [employeeKpiAssessments.employeeId],
    references: [users.id]
  }),
  evaluator: one(users, {
    fields: [employeeKpiAssessments.evaluatorId],
    references: [users.id]
  }),
  period: one(kpiPeriods, {
    fields: [employeeKpiAssessments.periodId],
    references: [kpiPeriods.id]
  }),
  items: many(employeeKpiAssessmentItems),
  tasks: many(employeeKpiTasks)
}))

export const employeeKpiAssessmentItemsRelations = relations(employeeKpiAssessmentItems, ({ one, many }) => ({
  assessment: one(employeeKpiAssessments, {
    fields: [employeeKpiAssessmentItems.assessmentId],
    references: [employeeKpiAssessments.id]
  }),
  departmentKpiItem: one(departmentKpiItems, {
    fields: [employeeKpiAssessmentItems.departmentKpiItemId],
    references: [departmentKpiItems.id]
  }),
  tasks: many(employeeKpiTasks)
}))

export const employeeKpiTasksRelations = relations(employeeKpiTasks, ({ one }) => ({
  assessmentItem: one(employeeKpiAssessmentItems, {
    fields: [employeeKpiTasks.assessmentItemId],
    references: [employeeKpiAssessmentItems.id]
  }),
  assessment: one(employeeKpiAssessments, {
    fields: [employeeKpiTasks.assessmentId],
    references: [employeeKpiAssessments.id]
  }),
  employee: one(users, {
    fields: [employeeKpiTasks.employeeId],
    references: [users.id]
  }),
  company: one(companies, {
    fields: [employeeKpiTasks.companyId],
    references: [companies.id]
  }),
  department: one(departments, {
    fields: [employeeKpiTasks.departmentId],
    references: [departments.id]
  }),
  reviewer: one(users, {
    fields: [employeeKpiTasks.reviewedBy],
    references: [users.id]
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
export type Mail = typeof mail.$inferSelect
export type NewMail = typeof mail.$inferInsert
export type Biodata = typeof biodata.$inferSelect
export type NewBiodata = typeof biodata.$inferInsert
export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
export type PostComment = typeof postComments.$inferSelect
export type NewPostComment = typeof postComments.$inferInsert
export type KpiPeriod = typeof kpiPeriods.$inferSelect
export type NewKpiPeriod = typeof kpiPeriods.$inferInsert
export type DepartmentKpiItem = typeof departmentKpiItems.$inferSelect
export type NewDepartmentKpiItem = typeof departmentKpiItems.$inferInsert
export type EmployeeKpiAssessment = typeof employeeKpiAssessments.$inferSelect
export type NewEmployeeKpiAssessment = typeof employeeKpiAssessments.$inferInsert
export type EmployeeKpiAssessmentItem = typeof employeeKpiAssessmentItems.$inferSelect
export type NewEmployeeKpiAssessmentItem = typeof employeeKpiAssessmentItems.$inferInsert
export type EmployeeKpiTask = typeof employeeKpiTasks.$inferSelect
export type NewEmployeeKpiTask = typeof employeeKpiTasks.$inferInsert

