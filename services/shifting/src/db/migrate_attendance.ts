import postgres from 'postgres'
import { DEFAULT_ATTENDANCE_STATUSES } from '../lib/attendance-status-defaults'

const connectionString =
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/srikaya_auth'

const sql = postgres(connectionString, {
  max: 1,
  onnotice: () => {}
})

async function migrate() {
  console.log('Running attendance migration...')

  await sql`
    CREATE TABLE IF NOT EXISTS "attendance_statuses" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
      "code" varchar(40) NOT NULL,
      "name" varchar(100) NOT NULL,
      "description" varchar(255),
      "color" varchar(20) DEFAULT '#64748b' NOT NULL,
      "is_present" boolean DEFAULT false NOT NULL,
      "is_paid" boolean DEFAULT true NOT NULL,
      "is_absent" boolean DEFAULT false NOT NULL,
      "is_system" boolean DEFAULT false NOT NULL,
      "sort_order" integer DEFAULT 0 NOT NULL,
      "status" varchar(20) DEFAULT 'active' NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `

  await sql`
    CREATE INDEX IF NOT EXISTS "idx_att_statuses_company_id" ON "attendance_statuses" ("company_id");
  `

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "uq_att_statuses_company_code" ON "attendance_statuses" ("company_id", "code");
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "attendances" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
      "employee_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "shift_id" uuid REFERENCES "shifts"("id") ON DELETE SET NULL,
      "status_id" uuid NOT NULL REFERENCES "attendance_statuses"("id") ON DELETE RESTRICT,
      "attendance_date" date NOT NULL,
      "check_in_at" timestamp with time zone,
      "check_out_at" timestamp with time zone,
      "check_in_latitude" numeric(10, 7),
      "check_in_longitude" numeric(10, 7),
      "check_out_latitude" numeric(10, 7),
      "check_out_longitude" numeric(10, 7),
      "attendance_location_id" uuid REFERENCES "shift_attendance_locations"("id") ON DELETE SET NULL,
      "check_in_distance_meters" integer,
      "late_minutes" integer DEFAULT 0 NOT NULL,
      "work_minutes" integer,
      "source" varchar(20) DEFAULT 'auto' NOT NULL,
      "note" text,
      "timezone" varchar(50) DEFAULT 'Asia/Jakarta' NOT NULL,
      "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "uq_attendances_employee_date" ON "attendances" ("employee_id", "attendance_date");
  `

  await sql`
    CREATE INDEX IF NOT EXISTS "idx_attendances_company_date" ON "attendances" ("company_id", "attendance_date");
  `

  await sql`
    CREATE INDEX IF NOT EXISTS "idx_attendances_status_id" ON "attendances" ("status_id");
  `

  await sql`
    CREATE INDEX IF NOT EXISTS "idx_attendances_shift_id" ON "attendances" ("shift_id");
  `

  console.log('Tables attendance_statuses & attendances ensured.')

  const companies = await sql<{ id: string }[]>`SELECT id FROM "companies"`

  for (const company of companies) {
    const [existing] = await sql`
      SELECT count(*)::int as count FROM "attendance_statuses" WHERE company_id = ${company.id}
    `
    if (existing.count > 0) continue

    console.log(`Seeding default attendance statuses for company ${company.id}`)

    for (const status of DEFAULT_ATTENDANCE_STATUSES) {
      await sql`
        INSERT INTO "attendance_statuses"
          (company_id, code, name, description, color, is_present, is_paid, is_absent, is_system, sort_order)
        VALUES (
          ${company.id},
          ${status.code},
          ${status.name},
          ${status.description},
          ${status.color},
          ${status.isPresent},
          ${status.isPaid},
          ${status.isAbsent},
          ${status.isSystem},
          ${status.sortOrder}
        )
        ON CONFLICT (company_id, code) DO NOTHING
      `
    }
  }

  console.log('Migration completed successfully.')
  await sql.end()
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
