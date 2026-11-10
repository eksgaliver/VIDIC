import { Elysia, t } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { and, eq, type SQL } from 'drizzle-orm'
import { alias, pgTable, time, uuid, varchar } from 'drizzle-orm/pg-core'
import { db } from '../db'
import { companies, departments, users, mail, biodata } from '../db/schema'
import { resolveTenantUser, assertCompanyAccess } from '../utils/tenant'

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
    biodataCompleted,
    ...employee
  } = row

  return {
    ...employee,
    companyId: (employee.companyId as string) || '',
    biodataCompleted: Boolean(biodataCompleted),
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
      shiftEndTime: shifts.endTime,
      biodataCompleted: biodata.isCompleted
    })
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .leftJoin(supervisor, eq(users.supervisorId, supervisor.id))
    .leftJoin(shifts, eq(users.shiftId, shifts.id))
    .leftJoin(biodata, eq(users.id, biodata.userId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(users.name)
}

async function getEmployeeDetail(id: string) {
  const rows = await listEmployeeRows(undefined, id)
  if (!rows[0]) return null
  const base = mapEmployee(rows[0])

  const [biodataRow] = await db
    .select()
    .from(biodata)
    .where(eq(biodata.userId, id))
    .limit(1)

  const mailRows = await db
    .select()
    .from(mail)
    .where(eq(mail.userId, id))
    .orderBy(mail.createdAt)

  return {
    ...base,
    biodata: biodataRow || null,
    mails: mailRows
  }
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
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'srikaya-enterprise-jwt-secret-key-2026',
      exp: '7d'
    })
  )
  .get('', async ({ query, headers, jwt, set }) => {
    const user = await resolveTenantUser(headers, jwt)
    let companyId = query.companyId

    if (user && user.companyId && user.role !== 'superadmin') {
      if (companyId && companyId !== user.companyId) {
        set.status = 403
        return { success: false, message: 'Akses ditolak: Anda tidak memiliki wewenang melihat data karyawan perusahaan lain.' }
      }
      companyId = user.companyId
    }

    const rows = await listEmployeeRows(companyId)
    return { success: true, data: rows.map(mapEmployee) }
  }, {
    query: t.Object({
      companyId: t.Optional(t.String())
    })
  })
  .get('/', async ({ query, headers, jwt, set }) => {
    const user = await resolveTenantUser(headers, jwt)
    let companyId = query.companyId

    if (user && user.companyId && user.role !== 'superadmin') {
      if (companyId && companyId !== user.companyId) {
        set.status = 403
        return { success: false, message: 'Akses ditolak: Anda tidak memiliki wewenang melihat data karyawan perusahaan lain.' }
      }
      companyId = user.companyId
    }

    const rows = await listEmployeeRows(companyId)
    return { success: true, data: rows.map(mapEmployee) }
  }, {
    query: t.Object({
      companyId: t.Optional(t.String())
    })
  })
  .get('/:id', async ({ params, headers, jwt, set }) => {
    const user = await resolveTenantUser(headers, jwt)
    const employee = await getEmployeeDetail(params.id)
    if (!employee) {
      set.status = 404
      return { success: false, message: 'Karyawan tidak ditemukan.' }
    }

    if (user) {
      const check = assertCompanyAccess(user, employee.companyId)
      if (!check.allowed) {
        set.status = 403
        return { success: false, message: check.message }
      }
    }

    return { success: true, data: employee }
  }, {
    params: t.Object({ id: t.String() })
  })
  .post('', async ({ body, headers, jwt, set }) => {
    const user = await resolveTenantUser(headers, jwt)
    if (user) {
      const check = assertCompanyAccess(user, body.companyId)
      if (!check.allowed) {
        set.status = 403
        return { success: false, message: check.message }
      }
    }

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

    // Inisialisasi baris biodata karyawan awal (akan diisi nanti saat login)
    await db.insert(biodata).values({
      userId: created.id,
      companyId: body.companyId,
      isCompleted: false
    })

    // Buat relasi surat onboarding di tabel mail
    await db.insert(mail).values({
      userId: created.id,
      companyId: body.companyId,
      senderEmail: 'hr@srikaya.id',
      senderName: 'Departemen HR & Personalia',
      recipientEmail: email,
      recipientName: name,
      subject: 'Selamat Datang di Srikaya Platform - Informasi Akun & Pengisian Biodata',
      body: `Halo ${name},\n\nSelamat bergabung di perusahaan kami! Akun karyawan Anda telah berhasil didaftarkan dengan posisi ${position}.\n\nSilakan masuk (login) ke platform menggunakan surel Anda (${email}) dan kata sandi sementara "${INITIAL_PASSWORD}".\n\nSetelah berhasil masuk, mohon segera lengkapi Biodata Karyawan Anda pada menu Profil untuk keperluan kelengkapan administrasi kepegawaian, BPJS, dan perpajakan.\n\nSalam hangat,\nDepartemen HR & Personalia`,
      category: 'inbox',
      isRead: false,
      isStarred: true
    })

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

    // Inisialisasi baris biodata karyawan awal (akan diisi nanti saat login)
    await db.insert(biodata).values({
      userId: created.id,
      companyId: body.companyId,
      isCompleted: false
    })

    // Buat relasi surat onboarding di tabel mail
    await db.insert(mail).values({
      userId: created.id,
      companyId: body.companyId,
      senderEmail: 'hr@srikaya.id',
      senderName: 'Departemen HR & Personalia',
      recipientEmail: email,
      recipientName: name,
      subject: 'Selamat Datang di Srikaya Platform - Informasi Akun & Pengisian Biodata',
      body: `Halo ${name},\n\nSelamat bergabung di perusahaan kami! Akun karyawan Anda telah berhasil didaftarkan dengan posisi ${position}.\n\nSilakan masuk (login) ke platform menggunakan surel Anda (${email}) dan kata sandi sementara "${INITIAL_PASSWORD}".\n\nSetelah berhasil masuk, mohon segera lengkapi Biodata Karyawan Anda pada menu Profil untuk keperluan kelengkapan administrasi kepegawaian, BPJS, dan perpajakan.\n\nSalam hangat,\nDepartemen HR & Personalia`,
      category: 'inbox',
      isRead: false,
      isStarred: true
    })

    set.status = 201
    return {
      success: true,
      data: await getEmployeeDetail(created.id),
      initialPassword: INITIAL_PASSWORD,
      message: `Karyawan berhasil ditambahkan. Kata sandi awal: ${INITIAL_PASSWORD}`
    }
  }, createEmployeeSchema)
  .put('/:id', async ({ params, headers, jwt, body, set }) => {
    const user = await resolveTenantUser(headers, jwt)
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

    if (user) {
      const check = assertCompanyAccess(user, existing.companyId)
      if (!check.allowed) {
        set.status = 403
        return { success: false, message: check.message }
      }
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
  .delete('/:id', async ({ params, headers, jwt, set }) => {
    const user = await resolveTenantUser(headers, jwt)
    const [existing] = await db
      .select({ id: users.id, name: users.name, companyId: users.companyId })
      .from(users)
      .where(eq(users.id, params.id))
      .limit(1)

    if (!existing) {
      set.status = 404
      return { success: false, message: 'Karyawan tidak ditemukan.' }
    }

    if (user) {
      const check = assertCompanyAccess(user, existing.companyId)
      if (!check.allowed) {
        set.status = 403
        return { success: false, message: check.message }
      }
    }

    await db.delete(users).where(eq(users.id, params.id))
    return {
      success: true,
      message: `Karyawan ${existing.name} berhasil dihapus beserta seluruh shift miliknya.`
    }
  }, {
    params: t.Object({ id: t.String() })
  })
  .get('/:id/biodata', async ({ params, headers, jwt, set }) => {
    const user = await resolveTenantUser(headers, jwt)
    const [existing] = await db
      .select({ id: users.id, companyId: users.companyId })
      .from(users)
      .where(eq(users.id, params.id))
      .limit(1)

    if (!existing) {
      set.status = 404
      return { success: false, message: 'Karyawan tidak ditemukan.' }
    }

    if (user) {
      const check = assertCompanyAccess(user, existing.companyId)
      if (!check.allowed) {
        set.status = 403
        return { success: false, message: check.message }
      }
    }

    const [row] = await db
      .select()
      .from(biodata)
      .where(eq(biodata.userId, params.id))
      .limit(1)

    if (!row) {
      set.status = 404
      return { success: false, message: 'Biodata karyawan tidak ditemukan.' }
    }
    return { success: true, data: row }
  }, {
    params: t.Object({ id: t.String() })
  })
  .get('/:id/mails', async ({ params, headers, jwt, set }) => {
    const user = await resolveTenantUser(headers, jwt)
    const [existing] = await db
      .select({ id: users.id, companyId: users.companyId })
      .from(users)
      .where(eq(users.id, params.id))
      .limit(1)

    if (!existing) {
      set.status = 404
      return { success: false, message: 'Karyawan tidak ditemukan.' }
    }

    if (user) {
      const check = assertCompanyAccess(user, existing.companyId)
      if (!check.allowed) {
        set.status = 403
        return { success: false, message: check.message }
      }
    }

    const mails = await db
      .select()
      .from(mail)
      .where(eq(mail.userId, params.id))
      .orderBy(mail.createdAt)

    return { success: true, data: mails }
  }, {
    params: t.Object({ id: t.String() })
  })
