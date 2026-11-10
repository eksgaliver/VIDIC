import postgres from 'postgres'

const connectionString =
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/srikaya_auth'

const sql = postgres(connectionString, {
  max: 1,
  onnotice: () => {}
})

const DAYS = [
  { dayOfWeek: 1, dayName: 'Senin', isOff: false },
  { dayOfWeek: 2, dayName: 'Selasa', isOff: false },
  { dayOfWeek: 3, dayName: 'Rabu', isOff: false },
  { dayOfWeek: 4, dayName: 'Kamis', isOff: false },
  { dayOfWeek: 5, dayName: 'Jumat', isOff: false },
  { dayOfWeek: 6, dayName: 'Sabtu', isOff: true },
  { dayOfWeek: 7, dayName: 'Minggu', isOff: true },
]

async function migrate() {
  console.log('Running shift_schedules migration...')

  await sql`
    CREATE TABLE IF NOT EXISTS "shift_schedules" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "shift_id" uuid NOT NULL REFERENCES "shifts"("id") ON DELETE CASCADE,
      "day_of_week" integer NOT NULL,
      "day_name" varchar(20) NOT NULL,
      "start_time" time,
      "end_time" time,
      "is_off" boolean DEFAULT false NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `

  await sql`
    CREATE INDEX IF NOT EXISTS "idx_shift_schedules_shift_id" ON "shift_schedules" ("shift_id");
  `

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "uq_shift_schedules_shift_day" ON "shift_schedules" ("shift_id", "day_of_week");
  `

  console.log('Table shift_schedules and indexes ensured.')

  // Populate existing shifts that do not have schedules yet
  const existingShifts = await sql<{ id: string; startTime: string; endTime: string }[]>`
    SELECT id, start_time as "startTime", end_time as "endTime" FROM "shifts"
  `

  for (const shift of existingShifts) {
    const [existingCount] = await sql`
      SELECT count(*)::int as count FROM "shift_schedules" WHERE shift_id = ${shift.id}
    `
    if (existingCount.count === 0) {
      console.log(`Populating 7-day default schedules for shift ${shift.id}`)
      for (const d of DAYS) {
        await sql`
          INSERT INTO "shift_schedules" (shift_id, day_of_week, day_name, start_time, end_time, is_off)
          VALUES (
            ${shift.id},
            ${d.dayOfWeek},
            ${d.dayName},
            ${d.isOff ? null : shift.startTime},
            ${d.isOff ? null : shift.endTime},
            ${d.isOff}
          )
          ON CONFLICT (shift_id, day_of_week) DO NOTHING
        `
      }
    }
  }

  console.log('Migration completed successfully.')
  await sql.end()
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})

