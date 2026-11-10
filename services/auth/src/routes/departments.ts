import { Elysia, t } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { db } from '../db'
import { departments, companies } from '../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { resolveTenantUser, assertCompanyAccess } from '../utils/tenant'

const createDepartmentSchema = {
  body: t.Object({
    companyId: t.String(),
    code: t.String({ minLength: 2, maxLength: 50 }),
    name: t.String({ minLength: 2, maxLength: 150 }),
    description: t.Optional(t.String())
  })
}

export const departmentRoutes = new Elysia({ prefix: '/departments' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'srikaya-enterprise-jwt-secret-key-2026',
      exp: '7d'
    })
  )
  // 1. Ambil Seluruh Departemen (Terkunci ke perusahaan sub-user)
  .get('', async ({ query, headers, jwt, set }) => {
    const user = await resolveTenantUser(headers, jwt)
    let companyId = query.companyId

    if (user && user.companyId && user.role !== 'superadmin') {
      if (companyId && companyId !== user.companyId) {
        set.status = 403
        return { success: false, message: 'Akses ditolak: Anda tidak dapat mengakses departemen perusahaan lain.' }
      }
      companyId = user.companyId
    }

    if (companyId) {
      const data = await db
        .select()
        .from(departments)
        .where(eq(departments.companyId, companyId))
        .orderBy(desc(departments.isMandatory), departments.code)
      return { success: true, data }
    }

    const data = await db
      .select()
      .from(departments)
      .orderBy(desc(departments.isMandatory), departments.code)
    return { success: true, data }
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
        return { success: false, message: 'Akses ditolak: Anda tidak dapat mengakses departemen perusahaan lain.' }
      }
      companyId = user.companyId
    }

    if (companyId) {
      const data = await db
        .select()
        .from(departments)
        .where(eq(departments.companyId, companyId))
        .orderBy(desc(departments.isMandatory), departments.code)
      return { success: true, data }
    }

    const data = await db
      .select()
      .from(departments)
      .orderBy(desc(departments.isMandatory), departments.code)
    return { success: true, data }
  }, {
    query: t.Object({
      companyId: t.Optional(t.String())
    })
  })
  // 2. Detail Departemen
  .get('/:id', async ({ params, headers, jwt, set }) => {
    const user = await resolveTenantUser(headers, jwt)

    const [dep] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, params.id))
      .limit(1)

    if (!dep) {
      set.status = 404
      return { success: false, message: 'Departemen tidak ditemukan' }
    }

    if (user) {
      const check = assertCompanyAccess(user, dep.companyId)
      if (!check.allowed) {
        set.status = 403
        return { success: false, message: check.message }
      }
    }

    return { success: true, data: dep }
  }, {
    params: t.Object({
      id: t.String()
    })
  })
  // 3. Tambah Departemen
  .post('', async ({ body, headers, jwt, set }) => {
    const user = await resolveTenantUser(headers, jwt)
    const { companyId, code, name, description } = body

    if (user) {
      const check = assertCompanyAccess(user, companyId)
      if (!check.allowed) {
        set.status = 403
        return { success: false, message: check.message }
      }
    }

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
  }, createDepartmentSchema)
  // 4. Ubah Departemen
  .put('/:id', async ({ params, headers, jwt, body, set }) => {
    const user = await resolveTenantUser(headers, jwt)

    const [existing] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, params.id))
      .limit(1)

    if (!existing) {
      set.status = 404
      return { success: false, message: 'Departemen tidak ditemukan' }
    }

    if (user) {
      const check = assertCompanyAccess(user, existing.companyId)
      if (!check.allowed) {
        set.status = 403
        return { success: false, message: check.message }
      }
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
  // 5. Hapus Departemen
  .delete('/:id', async ({ params, headers, jwt, set }) => {
    const user = await resolveTenantUser(headers, jwt)

    const [existing] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, params.id))
      .limit(1)

    if (!existing) {
      set.status = 404
      return { success: false, message: 'Departemen tidak ditemukan' }
    }

    if (user) {
      const check = assertCompanyAccess(user, existing.companyId)
      if (!check.allowed) {
        set.status = 403
        return { success: false, message: check.message }
      }
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
