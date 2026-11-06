import { Elysia, t } from 'elysia'
import { db } from '../db'
import { departments, companies } from '../db/schema'
import { eq, and, desc } from 'drizzle-orm'

const listDepartments = async ({ query }: any) => {
  const { companyId } = query
  if (companyId) {
    return await db
      .select()
      .from(departments)
      .where(eq(departments.companyId, companyId))
      .orderBy(desc(departments.isMandatory), departments.code)
  }
  return await db
    .select()
    .from(departments)
    .orderBy(desc(departments.isMandatory), departments.code)
}

const listQuerySchema = {
  query: t.Object({
    companyId: t.Optional(t.String())
  })
}

const handleCreateDepartment = async ({ body, set }: any) => {
  const { companyId, code, name, description } = body

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1)

  if (!company) {
    set.status = 404
    return { success: false, message: 'Perusahaan tidak ditemukan' }
  }

  const cleanCode = code.trim().toUpperCase()

  const [existing] = await db
    .select()
    .from(departments)
    .where(and(eq(departments.companyId, companyId), eq(departments.code, cleanCode)))
    .limit(1)

  if (existing) {
    set.status = 400
    return {
      success: false,
      message: `Kode departemen '${cleanCode}' sudah digunakan pada perusahaan ini.`
    }
  }

  const [created] = await db
    .insert(departments)
    .values({
      companyId,
      code: cleanCode,
      name: name.trim(),
      description: description?.trim() || null,
      isMandatory: false,
      status: 'active'
    })
    .returning()

  set.status = 201
  return { success: true, data: created, message: 'Departemen berhasil ditambahkan' }
}

const createDepartmentSchema = {
  body: t.Object({
    companyId: t.String(),
    code: t.String({ minLength: 2, maxLength: 50 }),
    name: t.String({ minLength: 2, maxLength: 150 }),
    description: t.Optional(t.String())
  })
}

export const departmentRoutes = new Elysia({ prefix: '/departments' })
  .get('', listDepartments, listQuerySchema)
  .get('/', listDepartments, listQuerySchema)
  .get('/:id', async ({ params, set }) => {
    const [dep] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, params.id))
      .limit(1)

    if (!dep) {
      set.status = 404
      return { success: false, message: 'Departemen tidak ditemukan' }
    }
    return { success: true, data: dep }
  }, {
    params: t.Object({
      id: t.String()
    })
  })
  .post('', handleCreateDepartment, createDepartmentSchema)
  .post('/', handleCreateDepartment, createDepartmentSchema)
  .put('/:id', async ({ params, body, set }) => {
    const [existing] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, params.id))
      .limit(1)

    if (!existing) {
      set.status = 404
      return { success: false, message: 'Departemen tidak ditemukan' }
    }

    const { name, description, status } = body

    const [updated] = await db
      .update(departments)
      .set({
        name: name.trim(),
        description: description !== undefined ? description?.trim() || null : existing.description,
        status: status || existing.status,
        updatedAt: new Date()
      })
      .where(eq(departments.id, params.id))
      .returning()

    return { success: true, data: updated, message: 'Departemen berhasil diperbarui' }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      name: t.String({ minLength: 2, maxLength: 150 }),
      description: t.Optional(t.String()),
      status: t.Optional(t.String())
    })
  })
  .delete('/:id', async ({ params, set }) => {
    const [existing] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, params.id))
      .limit(1)

    if (!existing) {
      set.status = 404
      return { success: false, message: 'Departemen tidak ditemukan' }
    }

    if (existing.isMandatory) {
      set.status = 400
      return {
        success: false,
        message: `Departemen '${existing.code}' merupakan departemen wajib perusahaan dan tidak dapat dihapus.`
      }
    }

    await db.delete(departments).where(eq(departments.id, params.id))
    return { success: true, message: 'Departemen berhasil dihapus' }
  }, {
    params: t.Object({
      id: t.String()
    })
  })
