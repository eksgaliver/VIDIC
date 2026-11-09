import { Elysia, t } from 'elysia'
import { and, eq, type SQL } from 'drizzle-orm'
import { alias, pgTable, time, uuid, varchar } from 'drizzle-orm/pg-core'
import { db } from '../db'
import { companies, departments, users } from '../db/schema'

// Referensi tabel shifts untuk relasi penugasan shift pada karyawan
const shifts = pgTable('shifts', {
  id: uuid('id').primaryKey(),
  companyId: uuid('company_id'),
  name: varchar('name', { length: 150 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull()
})

const INITIAL_PASSWORD = 'password'

interface EmployeeInput {
  name: string
  email: string
  position: string
  departmentId: string
  supervisorId?: string
  shiftId?: string
  status?: string
}

type ValidationResult =
  | { ok: true; supervisorId: string | null }
  | { ok: false; status: number; message: string }

async function wouldCreateSupervisorCycle(employeeId: string, supervisorId: string) {
  const visited = new Set<string>([employeeId])
  let current: string | null = supervisorId

  while (current) {
    if (visited.has(current)) return true
    visited.add(current)

    const [row] = await db
      .select({ supervisorId: users.supervisorId })
      .from(users)
      .where(eq(users.id, current))
      .limit(1)

    if (!row) return false
    current = row.supervisorId
  }

  return false
}

async function validateEmployeeOrganization(
  companyId: string,
  departmentId: string,
  supervisorId: string | undefined,
  employeeId?: string
): Promise<ValidationResult> {
  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1)

  if (!company) {
    return { ok: false, status: 404, message: 'Perusahaan tidak ditemukan.' }
  }

  const [department] = await db
    .select({ id: departments.id, companyId: departments.companyId, status: departments.status })
    .from(departments)
    .where(eq(departments.id, departmentId))
    .limit(1)

  if (!department || department.companyId !== companyId) {
    return { ok: false, status: 400, message: 'Departemen tidak valid untuk perusahaan ini.' }
  }
  if (department.status !== 'active') {
    return { ok: false, status: 400, message: 'Departemen yang dipilih sedang nonaktif.' }
  }

  const cleanSupervisorId = supervisorId?.trim() || null
  if (!cleanSupervisorId) {
    return { ok: true, supervisorId: null }
  }

  if (employeeId && cleanSupervisorId === employeeId) {
    return { ok: false, status: 400, message: 'Karyawan tidak dapat menjadi atasan dirinya sendiri.' }
  }

  const [supervisor] = await db
    .select({ id: users.id, companyId: users.companyId, status: users.status })
    .from(users)
    .where(eq(users.id, cleanSupervisorId))
    .limit(1)

  if (!supervisor) {
    return { ok: false, status: 400, message: 'Atasan yang dipilih tidak ditemukan.' }
  }
  if (supervisor.companyId !== companyId) {
    return { ok: false, status: 400, message: 'Atasan harus berasal dari perusahaan yang sama.' }
  }
  if (supervisor.status !== 'active') {
    return { ok: false, status: 400, message: 'Atasan yang dipilih sedang nonaktif.' }
  }

  if (employeeId && (await wouldCreateSupervisorCycle(employeeId, cleanSupervisorId))) {
    return {
      ok: false,
      status: 400,
      message: 'Relasi atasan ini membentuk siklus. Pilih atasan lain.'
    }
  }

  return { ok: true, supervisorId: cleanSupervisorId }
}

function mapEmployee(row: Record<string, any>) {
  const {
    departmentName,
    departmentCode,
    supervisorName,
    supervisorEmail,
    shiftName,
    shiftCode,
    shiftStartTime,
    shiftEndTime,
    ...employee
  } = row

  return {
    ...employee,
    department: employee.departmentId
      ? { id: employee.departmentId, name: departmentName, code: departmentCode }
      : null,
    supervisor: employee.supervisorId && supervisorName
      ? { id: employee.supervisorId, name: supervisorName, email: supervisorEmail }
      : null,
    shift: employee.shiftId && shiftName
      ? {
          id: employee.shiftId,
          name: shiftName,
          code: shiftCode,
          startTime: shiftStartTime,
          endTime: shiftEndTime
        }
      : null
  }
}

async function listEmployeeRows(companyId?: string, employeeId?: string) {
  const supervisor = alias(users, 'employee_supervisor')
  const conditions: SQL[] = []
  if (companyId) conditions.push(eq(users.companyId, companyId))
  if (employeeId) conditions.push(eq(users.id, employeeId))

  return db
    .select({
      id: users.id,
      companyId: users.companyId,
      departmentId: users.departmentId,
      supervisorId: users.supervisorId,
      shiftId: users.shiftId,
      name: users.name,
      email: users.email,
      position: users.position,
      avatarUrl: users.avatarUrl,
      status: users.status,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      departmentName: departments.name,
      departmentCode: departments.code,
      supervisorName: supervisor.name,
      supervisorEmail: supervisor.email,
      shiftName: shifts.name,
      shiftCode: shifts.code,
      shiftStartTime: shifts.startTime,
      shiftEndTime: shifts.endTime
    })
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .leftJoin(supervisor, eq(users.supervisorId, supervisor.id))
    .leftJoin(shifts, eq(users.shiftId, shifts.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(users.name)
}

async function getEmployeeDetail(id: string) {
  const rows = await listEmployeeRows(undefined, id)
  return rows[0] ? mapEmployee(rows[0]) : null
}

const createEmployeeSchema = {
  body: t.Object({
    companyId: t.String(),
    name: t.String({ minLength: 2, maxLength: 255 }),
    email: t.String({ format: 'email' }),
    position: t.String({ minLength: 2, maxLength: 150 }),
    departmentId: t.String(),
    supervisorId: t.Optional(t.String()),
    shiftId: t.Optional(t.String())
  })
}

const updateEmployeeSchema = {
  body: t.Object({
    name: t.String({ minLength: 2, maxLength: 255 }),
    email: t.String({ format: 'email' }),
    position: t.String({ minLength: 2, maxLength: 150 }),
    departmentId: t.String(),
    supervisorId: t.Optional(t.String()),
    shiftId: t.Optional(t.String()),
    status: t.Optional(t.String())
  })
}

export const employeeRoutes = new Elysia({ prefix: '/employees' })
  .get('', async ({ query }) => {
    const rows = await listEmployeeRows(query.companyId)
    return { success: true, data: rows.map(mapEmployee) }
  }, {
    query: t.Object({
      companyId: t.Optional(t.String())
    })
  })
  .get('/', async ({ query }) => {
    const rows = await listEmployeeRows(query.companyId)
    return { success: true, data: rows.map(mapEmployee) }
  }, {
    query: t.Object({
      companyId: t.Optional(t.String())
    })
  })
  .get('/:id', async ({ params, set }) => {
    const employee = await getEmployeeDetail(params.id)
    if (!employee) {
      set.status = 404
      return { success: false, message: 'Karyawan tidak ditemukan.' }
    }
    return { success: true, data: employee }
  }, {
    params: t.Object({ id: t.String() })
  })
  .post('', async ({ body, set }) => {
    const name = body.name.trim()
    const email = body.email.trim().toLowerCase()
    const position = body.position.trim()

    const [emailOwner] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (emailOwner) {
      set.status = 400
      return { success: false, message: 'Alamat surel sudah dipakai akun lain.' }
    }

    const validated = await validateEmployeeOrganization(
      body.companyId,
      body.departmentId,
      body.supervisorId
    )
    if (!validated.ok) {
      set.status = validated.status
      return { success: false, message: validated.message }
    }

    const passwordHash = await Bun.password.hash(INITIAL_PASSWORD, {
      algorithm: 'bcrypt',
      cost: 10
    })

    const shiftId = body.shiftId?.trim() || null

    const [created] = await db
      .insert(users)
      .values({
        companyId: body.companyId,
        departmentId: body.departmentId,
        supervisorId: validated.supervisorId,
        shiftId,
        name,
        email,
        position,
        passwordHash,
        role: 'member',
        status: 'active'
      })
      .returning({ id: users.id })

    set.status = 201
    return {
      success: true,
      data: await getEmployeeDetail(created.id),
      initialPassword: INITIAL_PASSWORD,
      message: `Karyawan berhasil ditambahkan. Kata sandi awal: ${INITIAL_PASSWORD}`
    }
  }, createEmployeeSchema)
  .post('/', async ({ body, set }) => {
    const name = body.name.trim()
    const email = body.email.trim().toLowerCase()
    const position = body.position.trim()

    const [emailOwner] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (emailOwner) {
      set.status = 400
      return { success: false, message: 'Alamat surel sudah dipakai akun lain.' }
    }

    const validated = await validateEmployeeOrganization(
      body.companyId,
      body.departmentId,
      body.supervisorId
    )
    if (!validated.ok) {
      set.status = validated.status
      return { success: false, message: validated.message }
    }

    const passwordHash = await Bun.password.hash(INITIAL_PASSWORD, {
      algorithm: 'bcrypt',
      cost: 10
    })

    const shiftId = body.shiftId?.trim() || null

    const [created] = await db
      .insert(users)
      .values({
        companyId: body.companyId,
        departmentId: body.departmentId,
        supervisorId: validated.supervisorId,
        shiftId,
        name,
        email,
        position,
        passwordHash,
        role: 'member',
        status: 'active'
      })
      .returning({ id: users.id })

    set.status = 201
    return {
      success: true,
      data: await getEmployeeDetail(created.id),
      initialPassword: INITIAL_PASSWORD,
      message: `Karyawan berhasil ditambahkan. Kata sandi awal: ${INITIAL_PASSWORD}`
    }
  }, createEmployeeSchema)
  .put('/:id', async ({ params, body, set }) => {
    const [existing] = await db
      .select({
        id: users.id,
        companyId: users.companyId
      })
      .from(users)
      .where(eq(users.id, params.id))
      .limit(1)

    if (!existing) {
      set.status = 404
      return { success: false, message: 'Karyawan tidak ditemukan.' }
    }
    if (!existing.companyId) {
      set.status = 400
      return { success: false, message: 'Karyawan belum terhubung ke perusahaan.' }
    }

    const email = body.email.trim().toLowerCase()
    const [emailOwner] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (emailOwner && emailOwner.id !== params.id) {
      set.status = 400
      return { success: false, message: 'Alamat surel sudah dipakai akun lain.' }
    }

    const validated = await validateEmployeeOrganization(
      existing.companyId,
      body.departmentId,
      body.supervisorId,
      params.id
    )
    if (!validated.ok) {
      set.status = validated.status
      return { success: false, message: validated.message }
    }

    const shiftId = body.shiftId !== undefined ? (body.shiftId?.trim() || null) : undefined

    await db
      .update(users)
      .set({
        name: body.name.trim(),
        email,
        position: body.position.trim(),
        departmentId: body.departmentId,
        supervisorId: validated.supervisorId,
        ...(shiftId !== undefined ? { shiftId } : {}),
        status: body.status === 'inactive' ? 'inactive' : 'active',
        updatedAt: new Date()
      })
      .where(eq(users.id, params.id))

    return {
      success: true,
      data: await getEmployeeDetail(params.id),
      message: 'Data karyawan berhasil diperbarui.'
    }
  }, {
    params: t.Object({ id: t.String() }),
    ...updateEmployeeSchema
  })
  .delete('/:id', async ({ params, set }) => {
    const [existing] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, params.id))
      .limit(1)

    if (!existing) {
      set.status = 404
      return { success: false, message: 'Karyawan tidak ditemukan.' }
    }

    await db.delete(users).where(eq(users.id, params.id))
    return {
      success: true,
      message: `Karyawan ${existing.name} berhasil dihapus beserta seluruh shift miliknya.`
    }
  }, {
    params: t.Object({ id: t.String() })
  })
