import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as authSchema from 'auth-service/src/db/schema'
import * as shiftSchema from './schema'

const connectionString =
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/srikaya_auth'

// Service shifting memakai koneksi sendiri. Skema karyawan, perusahaan, dan
// lokasi dibaca dari auth-service agar referensi data tetap satu sumber.
const queryClient = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 5,
  onnotice: () => {}
})

export const db = drizzle(queryClient, {
  schema: {
    ...authSchema,
    ...shiftSchema
  }
})

export { companies, companyLocations, departments, users } from 'auth-service/src/db/schema'
export { shifts, shiftAttendanceLocations } from './schema'
