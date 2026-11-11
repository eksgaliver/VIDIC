import { Elysia, t } from 'elysia'
import { and, desc, eq, sql, inArray } from 'drizzle-orm'
import { jwt } from '@elysiajs/jwt'
import { db } from '../db'
import {
  kpiPeriods,
  departmentKpiItems,
  employeeKpiAssessments,
  employeeKpiAssessmentItems,
  employeeKpiTasks,
  users,
  departments,
  companies,
} from '../db/schema'

// Helper: Hitung ulang skor butir dan skor akhir lembar evaluasi KPI karyawan
export async function recalculateAssessment(assessmentId: string) {
  const items = await db
    .select()
    .from(employeeKpiAssessmentItems)
    .where(eq(employeeKpiAssessmentItems.assessmentId, assessmentId))

  let totalScore = 0
  let totalWeight = 0

  for (const item of items) {
    const target = Number(item.targetValue) || 1
    const actual = Number(item.actualValue) || 0
    const weight = Number(item.weight) || 0

    // Persentase capaian target (maksimum dibatasi 150% agar adil)
    const achievement = target > 0 ? Math.min(150, (actual / target) * 100) : 0
    const weightedScore = (achievement * weight) / 100

    totalScore += weightedScore
    totalWeight += weight

    await db
      .update(employeeKpiAssessmentItems)
      .set({
        achievementPercentage: achievement.toFixed(2),
        weightedScore: weightedScore.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(employeeKpiAssessmentItems.id, item.id))
  }

  // Tentukan Predikat Kinerja (Grade)
  let grade = 'D'
  if (totalScore >= 90) grade = 'A'
  else if (totalScore >= 80) grade = 'B'
  else if (totalScore >= 70) grade = 'C'

  await db
    .update(employeeKpiAssessments)
    .set({
      finalScore: totalScore.toFixed(2),
      totalWeight: totalWeight.toFixed(2),
      grade,
      updatedAt: new Date(),
    })
    .where(eq(employeeKpiAssessments.id, assessmentId))

  return { totalScore, grade, totalWeight }
}

// Helper: Sinkronisasi nilai riil indikator dari seluruh tugas mandiri yang telah disetujui (Approved)
export async function syncItemProgressFromTasks(assessmentItemId: string) {
  const approvedTasks = await db
    .select()
    .from(employeeKpiTasks)
    .where(
      and(
        eq(employeeKpiTasks.assessmentItemId, assessmentItemId),
        eq(employeeKpiTasks.status, 'approved')
      )
    )

  const totalProgress = approvedTasks.reduce(
    (acc, task) => acc + (Number(task.progressValue) || 0),
    0
  )

  const [item] = await db
    .update(employeeKpiAssessmentItems)
    .set({
      actualValue: totalProgress.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(employeeKpiAssessmentItems.id, assessmentItemId))
    .returning()

  if (item?.assessmentId) {
    await recalculateAssessment(item.assessmentId)
  }

  return totalProgress
}

export const kpiRoutes = new Elysia({ prefix: '/kpi' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'srikaya-enterprise-jwt-secret-key-2026',
      exp: '7d',
    })
  )

  // 1. Ambil Seluruh Periode Evaluasi KPI
  .get('/periods', async ({ query }) => {
    const conditions = []
    if (query.companyId) {
      conditions.push(eq(kpiPeriods.companyId, query.companyId))
    }

    const periods = await db
      .select({
        id: kpiPeriods.id,
        companyId: kpiPeriods.companyId,
        name: kpiPeriods.name,
        startDate: kpiPeriods.startDate,
        endDate: kpiPeriods.endDate,
        graceEndDate: kpiPeriods.graceEndDate,
        status: kpiPeriods.status,
        description: kpiPeriods.description,
        createdAt: kpiPeriods.createdAt,
        updatedAt: kpiPeriods.updatedAt,
      })
      .from(kpiPeriods)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(kpiPeriods.startDate))

    return {
      success: true,
      data: periods,
    }
  })

  // 2. Buat Periode Evaluasi Baru
  .post(
    '/periods',
    async ({ body, set }) => {
      try {
        const { companyId, name, startDate, endDate, graceEndDate, description, status } = body

        const [created] = await db
          .insert(kpiPeriods)
          .values({
            companyId,
            name,
            startDate,
            endDate,
            graceEndDate: graceEndDate || null,
            description: description || null,
            status: status || 'active',
          })
          .returning()

        return {
          success: true,
          data: created,
          message: 'Periode evaluasi KPI berhasil dibuat.',
        }
      } catch (err: unknown) {
        set.status = 400
        const msg = err instanceof Error ? err.message : 'Gagal membuat periode evaluasi'
        return { success: false, message: msg }
      }
    },
    {
      body: t.Object({
        companyId: t.String(),
        name: t.String(),
        startDate: t.String(),
        endDate: t.String(),
        graceEndDate: t.Optional(t.String()),
        description: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
    }
  )

  // 3. Edit Periode Evaluasi Dinamis (Perpanjang Deadline / Grace Period / Ubah Status)
  .put(
    '/periods/:id',
    async ({ params, body, set }) => {
      try {
        const [existing] = await db
          .select()
          .from(kpiPeriods)
          .where(eq(kpiPeriods.id, params.id))
          .limit(1)

        if (!existing) {
          set.status = 404
          return { success: false, message: 'Periode evaluasi tidak ditemukan.' }
        }

        const updateData: Record<string, unknown> = {
          updatedAt: new Date(),
        }
        if (body.name !== undefined) updateData.name = body.name
        if (body.startDate !== undefined) updateData.startDate = body.startDate
        if (body.endDate !== undefined) updateData.endDate = body.endDate
        if (body.graceEndDate !== undefined) updateData.graceEndDate = body.graceEndDate || null
        if (body.description !== undefined) updateData.description = body.description
        if (body.status !== undefined) updateData.status = body.status

        const [updated] = await db
          .update(kpiPeriods)
          .set(updateData)
          .where(eq(kpiPeriods.id, params.id))
          .returning()

        return {
          success: true,
          data: updated,
          message: 'Periode evaluasi KPI berhasil diperbarui.',
        }
      } catch (err: unknown) {
        set.status = 400
        const msg = err instanceof Error ? err.message : 'Gagal memperbarui periode evaluasi'
        return { success: false, message: msg }
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        graceEndDate: t.Optional(t.String()),
        description: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
    }
  )

  // 4. Ringkasan Dasbor Admin (Matriks Indikator & Lembar Karyawan Terkelompok per Divisi)
  .get('/summary', async ({ query, set }) => {
    try {
      // 1. Tentukan Company ID
      let companyId = query.companyId
      if (!companyId) {
        const firstComp = await db.select({ id: companies.id }).from(companies).limit(1)
        if (firstComp.length > 0) {
          companyId = firstComp[0].id
        }
      }

      if (!companyId) {
        return {
          success: true,
          data: {
            activePeriod: null,
            departments: [],
            stats: { totalEmployees: 0, averageScore: 0, pendingTasksCount: 0 },
          },
        }
      }

      // 2. Tentukan Periode KPI Aktif
      let periodId = query.periodId
      let activePeriod = null

      if (periodId) {
        const [p] = await db.select().from(kpiPeriods).where(eq(kpiPeriods.id, periodId)).limit(1)
        activePeriod = p || null
      }

      if (!activePeriod) {
        const [latest] = await db
          .select()
          .from(kpiPeriods)
          .where(and(eq(kpiPeriods.companyId, companyId), eq(kpiPeriods.status, 'active')))
          .orderBy(desc(kpiPeriods.startDate))
          .limit(1)
        activePeriod = latest || null
        if (latest) periodId = latest.id
      }

      if (!activePeriod) {
        // Ambil periode apa pun jika tidak ada yang bertanda 'active'
        const [anyPeriod] = await db
          .select()
          .from(kpiPeriods)
          .where(eq(kpiPeriods.companyId, companyId))
          .orderBy(desc(kpiPeriods.startDate))
          .limit(1)
        activePeriod = anyPeriod || null
        if (anyPeriod) periodId = anyPeriod.id
      }

      // 3. Ambil Departemen
      const deptConditions = [eq(departments.companyId, companyId)]
      if (query.departmentId) {
        deptConditions.push(eq(departments.id, query.departmentId))
      }

      const deptList = await db
        .select({
          id: departments.id,
          code: departments.code,
          name: departments.name,
          description: departments.description,
          isMandatory: departments.isMandatory,
        })
        .from(departments)
        .where(and(...deptConditions))
        .orderBy(departments.name)

      // 4. Ambil Department KPI Items untuk periode ini
      const deptItems = periodId
        ? await db
            .select()
            .from(departmentKpiItems)
            .where(
              and(
                eq(departmentKpiItems.companyId, companyId),
                eq(departmentKpiItems.periodId, periodId)
              )
            )
            .orderBy(departmentKpiItems.sortOrder, departmentKpiItems.title)
        : []

      // 5. Ambil Asesmen Karyawan untuk periode ini
      const assessments = periodId
        ? await db
            .select({
              id: employeeKpiAssessments.id,
              companyId: employeeKpiAssessments.companyId,
              departmentId: employeeKpiAssessments.departmentId,
              employeeId: employeeKpiAssessments.employeeId,
              periodId: employeeKpiAssessments.periodId,
              evaluatorId: employeeKpiAssessments.evaluatorId,
              totalWeight: employeeKpiAssessments.totalWeight,
              finalScore: employeeKpiAssessments.finalScore,
              grade: employeeKpiAssessments.grade,
              status: employeeKpiAssessments.status,
              notesFromEvaluator: employeeKpiAssessments.notesFromEvaluator,
              employeeFeedback: employeeKpiAssessments.employeeFeedback,
              verifiedAt: employeeKpiAssessments.verifiedAt,
              employeeName: users.name,
              employeeEmail: users.email,
              employeePosition: users.position,
              employeeAvatarUrl: users.avatarUrl,
            })
            .from(employeeKpiAssessments)
            .innerJoin(users, eq(employeeKpiAssessments.employeeId, users.id))
            .where(
              and(
                eq(employeeKpiAssessments.companyId, companyId),
                eq(employeeKpiAssessments.periodId, periodId)
              )
            )
            .orderBy(users.name)
        : []

      // 6. Ambil Butir Evaluasi Karyawan (Assessment Items)
      const assessmentIds = assessments.map((a) => a.id)
      const allAssessmentItems =
        assessmentIds.length > 0
          ? await db
              .select()
              .from(employeeKpiAssessmentItems)
              .where(inArray(employeeKpiAssessmentItems.assessmentId, assessmentIds))
              .orderBy(employeeKpiAssessmentItems.sortOrder)
          : []

      // 7. Ambil antrean tugas pending review
      const pendingTasks = await db
        .select({
          id: employeeKpiTasks.id,
          departmentId: employeeKpiTasks.departmentId,
          assessmentId: employeeKpiTasks.assessmentId,
        })
        .from(employeeKpiTasks)
        .where(
          and(
            eq(employeeKpiTasks.companyId, companyId),
            eq(employeeKpiTasks.status, 'pending_review')
          )
        )

      // Gabungkan struktur data per Departemen
      let companyTotalScore = 0
      let evaluatedCount = 0

      const structuredDepartments = deptList.map((dept) => {
        const items = deptItems.filter((item) => item.departmentId === dept.id)
        const totalWeight = items.reduce(
          (sum, item) => sum + (item.isActive ? Number(item.weight) : 0),
          0
        )

        const deptAssessments = assessments
          .filter((a) => a.departmentId === dept.id)
          .map((a) => {
            const empItems = allAssessmentItems.filter((i) => i.assessmentId === a.id)
            const scoreNum = Number(a.finalScore) || 0
            companyTotalScore += scoreNum
            evaluatedCount += 1

            return {
              ...a,
              items: empItems,
            }
          })

        const deptPendingTasks = pendingTasks.filter((t) => t.departmentId === dept.id).length

        return {
          id: dept.id,
          code: dept.code,
          name: dept.name,
          description: dept.description,
          isMandatory: dept.isMandatory,
          kpiItems: items,
          totalWeight: Number(totalWeight.toFixed(2)),
          isBalanced: Math.abs(totalWeight - 100) < 0.01,
          assessments: deptAssessments,
          pendingTasksCount: deptPendingTasks,
          averageScore:
            deptAssessments.length > 0
              ? Number(
                  (
                    deptAssessments.reduce((sum, a) => sum + (Number(a.finalScore) || 0), 0) /
                    deptAssessments.length
                  ).toFixed(2)
                )
              : 0,
        }
      })

      const averageScore = evaluatedCount > 0 ? Number((companyTotalScore / evaluatedCount).toFixed(2)) : 0

      return {
        success: true,
        data: {
          activePeriod,
          departments: structuredDepartments,
          stats: {
            totalEmployees: evaluatedCount,
            averageScore,
            pendingTasksCount: pendingTasks.length,
          },
        },
      }
    } catch (err: unknown) {
      set.status = 500
      const msg = err instanceof Error ? err.message : 'Gagal memuat ringkasan KPI'
      return { success: false, message: msg }
    }
  })

  // 5. Lembar KPI Karyawan Pribadi (My Score & Tasks)
  .get('/my-score', async ({ headers, query, jwt, set }) => {
    try {
      const authHeader = headers['authorization']
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        set.status = 401
        return { success: false, message: 'Token otorisasi diperlukan.' }
      }

      const payload = (await jwt.verify(authHeader.slice(7))) as { sub?: string; id?: string }
      const userId = payload?.sub || payload?.id
      if (!userId) {
        set.status = 401
        return { success: false, message: 'Sesi kedaluwarsa.' }
      }

      // Ambil profil karyawan
      const [emp] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          position: users.position,
          avatarUrl: users.avatarUrl,
          departmentId: users.departmentId,
          companyId: users.companyId,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      if (!emp) {
        set.status = 404
        return { success: false, message: 'Karyawan tidak ditemukan.' }
      }

      // Cari periode aktif
      let periodId = query.periodId
      let activePeriod = null

      if (periodId) {
        const [p] = await db.select().from(kpiPeriods).where(eq(kpiPeriods.id, periodId)).limit(1)
        activePeriod = p || null
      }

      if (!activePeriod && emp.companyId) {
        const [latest] = await db
          .select()
          .from(kpiPeriods)
          .where(and(eq(kpiPeriods.companyId, emp.companyId), eq(kpiPeriods.status, 'active')))
          .orderBy(desc(kpiPeriods.startDate))
          .limit(1)
        activePeriod = latest || null
        if (latest) periodId = latest.id
      }

      if (!activePeriod && emp.companyId) {
        const [anyP] = await db
          .select()
          .from(kpiPeriods)
          .where(eq(kpiPeriods.companyId, emp.companyId))
          .orderBy(desc(kpiPeriods.startDate))
          .limit(1)
        activePeriod = anyP || null
        if (anyP) periodId = anyP.id
      }

      if (!activePeriod) {
        return {
          success: true,
          data: {
            employee: emp,
            period: null,
            assessment: null,
            items: [],
          },
        }
      }

      // Cari lembar asesmen
      let [assessment] = await db
        .select()
        .from(employeeKpiAssessments)
        .where(
          and(
            eq(employeeKpiAssessments.employeeId, emp.id),
            eq(employeeKpiAssessments.periodId, activePeriod.id)
          )
        )
        .limit(1)

      // Jika belum ada lembar asesmen, inisialisasi otomatis dari department_kpi_items!
      if (!assessment && emp.companyId && emp.departmentId) {
        const deptItems = await db
          .select()
          .from(departmentKpiItems)
          .where(
            and(
              eq(departmentKpiItems.departmentId, emp.departmentId),
              eq(departmentKpiItems.periodId, activePeriod.id),
              eq(departmentKpiItems.isActive, true)
            )
          )
          .orderBy(departmentKpiItems.sortOrder)

        if (deptItems.length > 0) {
          const [newAssessment] = await db
            .insert(employeeKpiAssessments)
            .values({
              companyId: emp.companyId,
              departmentId: emp.departmentId,
              employeeId: emp.id,
              periodId: activePeriod.id,
              totalWeight: '100.00',
              finalScore: '0.00',
              grade: 'D',
              status: 'active',
            })
            .returning()

          assessment = newAssessment

          for (const di of deptItems) {
            await db.insert(employeeKpiAssessmentItems).values({
              assessmentId: newAssessment.id,
              departmentKpiItemId: di.id,
              title: di.title,
              category: di.category,
              description: di.description,
              measurementUnit: di.measurementUnit,
              targetValue: di.targetValue,
              actualValue: '0.00',
              weight: di.weight,
              achievementPercentage: '0.00',
              weightedScore: '0.00',
              sortOrder: di.sortOrder,
            })
          }
        }
      }

      if (!assessment) {
        return {
          success: true,
          data: {
            employee: emp,
            period: activePeriod,
            assessment: null,
            items: [],
          },
        }
      }

      // Ambil butir penilaian
      const items = await db
        .select()
        .from(employeeKpiAssessmentItems)
        .where(eq(employeeKpiAssessmentItems.assessmentId, assessment.id))
        .orderBy(employeeKpiAssessmentItems.sortOrder)

      // Ambil daftar tugas yang telah diajukan untuk setiap butir
      const itemIds = items.map((i) => i.id)
      const tasks =
        itemIds.length > 0
          ? await db
              .select({
                id: employeeKpiTasks.id,
                assessmentItemId: employeeKpiTasks.assessmentItemId,
                title: employeeKpiTasks.title,
                progressValue: employeeKpiTasks.progressValue,
                completedDate: employeeKpiTasks.completedDate,
                evidenceUrl: employeeKpiTasks.evidenceUrl,
                notes: employeeKpiTasks.notes,
                status: employeeKpiTasks.status,
                reviewNotes: employeeKpiTasks.reviewNotes,
                reviewedAt: employeeKpiTasks.reviewedAt,
                createdAt: employeeKpiTasks.createdAt,
              })
              .from(employeeKpiTasks)
              .where(inArray(employeeKpiTasks.assessmentItemId, itemIds))
              .orderBy(desc(employeeKpiTasks.createdAt))
          : []

      const itemsWithTasks = items.map((it) => ({
        ...it,
        tasks: tasks.filter((t) => t.assessmentItemId === it.id),
      }))

      // Ambil nama departemen
      let departmentName = ''
      if (emp.departmentId) {
        const [d] = await db
          .select({ name: departments.name })
          .from(departments)
          .where(eq(departments.id, emp.departmentId))
          .limit(1)
        departmentName = d?.name || ''
      }

      return {
        success: true,
        data: {
          employee: {
            ...emp,
            departmentName,
          },
          period: activePeriod,
          assessment,
          items: itemsWithTasks,
        },
      }
    } catch (err: unknown) {
      set.status = 500
      const msg = err instanceof Error ? err.message : 'Gagal memuat lembar KPI pribadi'
      return { success: false, message: msg }
    }
  })

  // 6. Buat Indikator KPI Baru untuk Suatu Divisi (Admin / Pimpinan)
  .post(
    '/items',
    async ({ body, set }) => {
      try {
        const {
          companyId,
          departmentId,
          periodId,
          title,
          category,
          description,
          measurementUnit,
          targetValue,
          weight,
          targetPosition,
          isActive,
        } = body

        const [created] = await db
          .insert(departmentKpiItems)
          .values({
            companyId,
            departmentId,
            periodId,
            title,
            category: category || 'operational',
            description: description || null,
            measurementUnit,
            targetValue: Number(targetValue).toFixed(2),
            weight: Number(weight).toFixed(2),
            targetPosition: targetPosition || null,
            isActive: isActive !== undefined ? isActive : true,
          })
          .returning()

        // Sinkronisasi otomatis ke lembar evaluasi karyawan yang sudah ada di departemen ini
        const existingAssessments = await db
          .select()
          .from(employeeKpiAssessments)
          .where(
            and(
              eq(employeeKpiAssessments.departmentId, departmentId),
              eq(employeeKpiAssessments.periodId, periodId)
            )
          )

        for (const ass of existingAssessments) {
          await db.insert(employeeKpiAssessmentItems).values({
            assessmentId: ass.id,
            departmentKpiItemId: created.id,
            title: created.title,
            category: created.category,
            description: created.description,
            measurementUnit: created.measurementUnit,
            targetValue: created.targetValue,
            actualValue: '0.00',
            weight: created.weight,
            achievementPercentage: '0.00',
            weightedScore: '0.00',
            sortOrder: created.sortOrder,
          })
          await recalculateAssessment(ass.id)
        }

        return {
          success: true,
          data: created,
          message: 'Indikator sasaran KPI berhasil ditambahkan ke divisi.',
        }
      } catch (err: unknown) {
        set.status = 400
        const msg = err instanceof Error ? err.message : 'Gagal menambahkan indikator sasaran KPI'
        return { success: false, message: msg }
      }
    },
    {
      body: t.Object({
        companyId: t.String(),
        departmentId: t.String(),
        periodId: t.String(),
        title: t.String(),
        category: t.Optional(t.String()),
        description: t.Optional(t.String()),
        measurementUnit: t.String(),
        targetValue: t.Union([t.String(), t.Number()]),
        weight: t.Union([t.String(), t.Number()]),
        targetPosition: t.Optional(t.String()),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )

  // 7. Edit Dinamis Indikator KPI Divisi (Admin / Pimpinan)
  .put(
    '/items/:id',
    async ({ params, body, set }) => {
      try {
        const [existing] = await db
          .select()
          .from(departmentKpiItems)
          .where(eq(departmentKpiItems.id, params.id))
          .limit(1)

        if (!existing) {
          set.status = 404
          return { success: false, message: 'Indikator sasaran tidak ditemukan.' }
        }

        const updateData: Record<string, unknown> = {
          updatedAt: new Date(),
        }
        if (body.title !== undefined) updateData.title = body.title
        if (body.category !== undefined) updateData.category = body.category
        if (body.description !== undefined) updateData.description = body.description
        if (body.measurementUnit !== undefined) updateData.measurementUnit = body.measurementUnit
        if (body.targetValue !== undefined)
          updateData.targetValue = Number(body.targetValue).toFixed(2)
        if (body.weight !== undefined) updateData.weight = Number(body.weight).toFixed(2)
        if (body.targetPosition !== undefined) updateData.targetPosition = body.targetPosition
        if (body.isActive !== undefined) updateData.isActive = body.isActive

        const [updated] = await db
          .update(departmentKpiItems)
          .set(updateData)
          .where(eq(departmentKpiItems.id, params.id))
          .returning()

        // Sinkronisasi pembaruan ke seluruh assessment item yang terhubung
        const affectedAssessmentItems = await db
          .select({ id: employeeKpiAssessmentItems.id, assessmentId: employeeKpiAssessmentItems.assessmentId })
          .from(employeeKpiAssessmentItems)
          .where(eq(employeeKpiAssessmentItems.departmentKpiItemId, params.id))

        for (const ai of affectedAssessmentItems) {
          const aiUpdate: Record<string, unknown> = { updatedAt: new Date() }
          if (body.title !== undefined) aiUpdate.title = body.title
          if (body.category !== undefined) aiUpdate.category = body.category
          if (body.description !== undefined) aiUpdate.description = body.description
          if (body.measurementUnit !== undefined) aiUpdate.measurementUnit = body.measurementUnit
          if (body.targetValue !== undefined) aiUpdate.targetValue = Number(body.targetValue).toFixed(2)
          if (body.weight !== undefined) aiUpdate.weight = Number(body.weight).toFixed(2)

          await db
            .update(employeeKpiAssessmentItems)
            .set(aiUpdate)
            .where(eq(employeeKpiAssessmentItems.id, ai.id))

          await recalculateAssessment(ai.assessmentId)
        }

        return {
          success: true,
          data: updated,
          message: 'Indikator sasaran berhasil diperbarui dan disinkronkan ke karyawan.',
        }
      } catch (err: unknown) {
        set.status = 400
        const msg = err instanceof Error ? err.message : 'Gagal memperbarui indikator sasaran'
        return { success: false, message: msg }
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        title: t.Optional(t.String()),
        category: t.Optional(t.String()),
        description: t.Optional(t.String()),
        measurementUnit: t.Optional(t.String()),
        targetValue: t.Optional(t.Union([t.String(), t.Number()])),
        weight: t.Optional(t.Union([t.String(), t.Number()])),
        targetPosition: t.Optional(t.String()),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )

  // 8. Hapus Indikator KPI Divisi
  .delete('/items/:id', async ({ params, set }) => {
    try {
      const [existing] = await db
        .select()
        .from(departmentKpiItems)
        .where(eq(departmentKpiItems.id, params.id))
        .limit(1)

      if (!existing) {
        set.status = 404
        return { success: false, message: 'Indikator sasaran tidak ditemukan.' }
      }

      // Ambil daftar assessment yang terpengaruh sebelum menghapus
      const affected = await db
        .select({ assessmentId: employeeKpiAssessmentItems.assessmentId })
        .from(employeeKpiAssessmentItems)
        .where(eq(employeeKpiAssessmentItems.departmentKpiItemId, params.id))

      // Hapus assessment item
      await db
        .delete(employeeKpiAssessmentItems)
        .where(eq(employeeKpiAssessmentItems.departmentKpiItemId, params.id))

      // Hapus department KPI item
      await db.delete(departmentKpiItems).where(eq(departmentKpiItems.id, params.id))

      // Hitung ulang lembar asesmen
      const uniqueAssessmentIds = [...new Set(affected.map((a) => a.assessmentId))]
      for (const assId of uniqueAssessmentIds) {
        await recalculateAssessment(assId)
      }

      return {
        success: true,
        message: 'Indikator sasaran berhasil dihapus.',
      }
    } catch (err: unknown) {
      set.status = 400
      const msg = err instanceof Error ? err.message : 'Gagal menghapus indikator sasaran'
      return { success: false, message: msg }
    }
  })

  // 9. Auto-Balance Bobot Indikator Divisi (Otomatis seimbang 100%)
  .post(
    '/items/auto-balance',
    async ({ body, set }) => {
      try {
        const { departmentId, periodId } = body

        const activeItems = await db
          .select()
          .from(departmentKpiItems)
          .where(
            and(
              eq(departmentKpiItems.departmentId, departmentId),
              eq(departmentKpiItems.periodId, periodId),
              eq(departmentKpiItems.isActive, true)
            )
          )
          .orderBy(departmentKpiItems.sortOrder)

        if (activeItems.length === 0) {
          return { success: false, message: 'Tidak ada indikator aktif untuk diseimbangkan.' }
        }

        // Bagi rata 100% dengan pembulatan 2 desimal
        const count = activeItems.length
        const baseWeight = Math.floor((100 / count) * 100) / 100
        const remainder = Number((100 - baseWeight * count).toFixed(2))

        for (let i = 0; i < activeItems.length; i++) {
          const item = activeItems[i]
          const weight = i === 0 ? Number((baseWeight + remainder).toFixed(2)) : baseWeight

          await db
            .update(departmentKpiItems)
            .set({ weight: weight.toFixed(2), updatedAt: new Date() })
            .where(eq(departmentKpiItems.id, item.id))

          // Sinkron ke assessment items
          await db
            .update(employeeKpiAssessmentItems)
            .set({ weight: weight.toFixed(2), updatedAt: new Date() })
            .where(eq(employeeKpiAssessmentItems.departmentKpiItemId, item.id))
        }

        // Hitung ulang semua asesmen terkait departemen ini
        const deptAssessments = await db
          .select({ id: employeeKpiAssessments.id })
          .from(employeeKpiAssessments)
          .where(
            and(
              eq(employeeKpiAssessments.departmentId, departmentId),
              eq(employeeKpiAssessments.periodId, periodId)
            )
          )

        for (const ass of deptAssessments) {
          await recalculateAssessment(ass.id)
        }

        return {
          success: true,
          message: `Berhasil menyeimbangkan bobot ${count} indikator menjadi total 100%.`,
        }
      } catch (err: unknown) {
        set.status = 400
        const msg = err instanceof Error ? err.message : 'Gagal menyeimbangkan bobot indikator'
        return { success: false, message: msg }
      }
    },
    {
      body: t.Object({
        departmentId: t.String(),
        periodId: t.String(),
      }),
    }
  )

  // 10. Karyawan Mengajukan Tugas / Capaian Mandiri (Task Submission)
  .post(
    '/tasks',
    async ({ headers, body, jwt, set }) => {
      try {
        const authHeader = headers['authorization']
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          set.status = 401
          return { success: false, message: 'Token otorisasi diperlukan.' }
        }

        const payload = (await jwt.verify(authHeader.slice(7))) as { sub?: string; id?: string }
        const userId = payload?.sub || payload?.id
        if (!userId) {
          set.status = 401
          return { success: false, message: 'Sesi kedaluwarsa.' }
        }

        const { assessmentItemId, title, progressValue, completedDate, evidenceUrl, notes } = body

        // Validasi butir penilaian yang dituju
        const [assessmentItem] = await db
          .select({
            id: employeeKpiAssessmentItems.id,
            assessmentId: employeeKpiAssessmentItems.assessmentId,
            targetValue: employeeKpiAssessmentItems.targetValue,
          })
          .from(employeeKpiAssessmentItems)
          .where(eq(employeeKpiAssessmentItems.id, assessmentItemId))
          .limit(1)

        if (!assessmentItem) {
          set.status = 404
          return { success: false, message: 'Indikator sasaran lembar evaluasi tidak ditemukan.' }
        }

        const [assessment] = await db
          .select()
          .from(employeeKpiAssessments)
          .where(eq(employeeKpiAssessments.id, assessmentItem.assessmentId))
          .limit(1)

        if (!assessment) {
          set.status = 404
          return { success: false, message: 'Lembar evaluasi tidak ditemukan.' }
        }

        const [createdTask] = await db
          .insert(employeeKpiTasks)
          .values({
            assessmentItemId,
            assessmentId: assessment.id,
            employeeId: userId,
            companyId: assessment.companyId,
            departmentId: assessment.departmentId,
            title,
            progressValue: Number(progressValue).toFixed(2),
            completedDate,
            evidenceUrl: evidenceUrl || null,
            notes: notes || null,
            status: 'pending_review',
          })
          .returning()

        return {
          success: true,
          data: createdTask,
          message: 'Tugas kerja mandiri berhasil diajukan dan menunggu verifikasi penilai.',
        }
      } catch (err: unknown) {
        set.status = 400
        const msg = err instanceof Error ? err.message : 'Gagal mengajukan tugas'
        return { success: false, message: msg }
      }
    },
    {
      body: t.Object({
        assessmentItemId: t.String(),
        title: t.String(),
        progressValue: t.Union([t.String(), t.Number()]),
        completedDate: t.String(),
        evidenceUrl: t.Optional(t.String()),
        notes: t.Optional(t.String()),
      }),
    }
  )

  // 11. Antrean Review Tugas Mandiri untuk Admin / Evaluator
  .get('/tasks/queue', async ({ query, set }) => {
    try {
      const conditions = []
      if (query.companyId) {
        conditions.push(eq(employeeKpiTasks.companyId, query.companyId))
      }
      if (query.departmentId) {
        conditions.push(eq(employeeKpiTasks.departmentId, query.departmentId))
      }
      if (query.status) {
        conditions.push(eq(employeeKpiTasks.status, query.status))
      } else {
        conditions.push(eq(employeeKpiTasks.status, 'pending_review'))
      }

      const queue = await db
        .select({
          id: employeeKpiTasks.id,
          assessmentItemId: employeeKpiTasks.assessmentItemId,
          assessmentId: employeeKpiTasks.assessmentId,
          employeeId: employeeKpiTasks.employeeId,
          companyId: employeeKpiTasks.companyId,
          departmentId: employeeKpiTasks.departmentId,
          title: employeeKpiTasks.title,
          progressValue: employeeKpiTasks.progressValue,
          completedDate: employeeKpiTasks.completedDate,
          evidenceUrl: employeeKpiTasks.evidenceUrl,
          notes: employeeKpiTasks.notes,
          status: employeeKpiTasks.status,
          reviewedBy: employeeKpiTasks.reviewedBy,
          reviewNotes: employeeKpiTasks.reviewNotes,
          reviewedAt: employeeKpiTasks.reviewedAt,
          createdAt: employeeKpiTasks.createdAt,
          employeeName: users.name,
          employeeEmail: users.email,
          employeeAvatarUrl: users.avatarUrl,
          employeePosition: users.position,
          departmentName: departments.name,
          itemTitle: employeeKpiAssessmentItems.title,
          measurementUnit: employeeKpiAssessmentItems.measurementUnit,
          targetValue: employeeKpiAssessmentItems.targetValue,
          actualValue: employeeKpiAssessmentItems.actualValue,
        })
        .from(employeeKpiTasks)
        .innerJoin(users, eq(employeeKpiTasks.employeeId, users.id))
        .innerJoin(departments, eq(employeeKpiTasks.departmentId, departments.id))
        .innerJoin(
          employeeKpiAssessmentItems,
          eq(employeeKpiTasks.assessmentItemId, employeeKpiAssessmentItems.id)
        )
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(employeeKpiTasks.createdAt))

      return {
        success: true,
        data: queue,
      }
    } catch (err: unknown) {
      set.status = 500
      const msg = err instanceof Error ? err.message : 'Gagal memuat antrean verifikasi tugas'
      return { success: false, message: msg }
    }
  })

  // 12. Review Tugas (Setujui / Tolak dan Hitung Ulang Capaian Karyawan Otomatis)
  .post(
    '/tasks/:id/review',
    async ({ headers, params, body, jwt, set }) => {
      try {
        let reviewerId: string | null = null
        const authHeader = headers['authorization']
        if (authHeader && authHeader.startsWith('Bearer ')) {
          try {
            const payload = (await jwt.verify(authHeader.slice(7))) as { sub?: string; id?: string }
            reviewerId = payload?.sub || payload?.id || null
          } catch {
            // Evaluator tamu jika tanpa token
          }
        }

        const { status, reviewNotes, approvedProgressValue } = body

        const [existingTask] = await db
          .select()
          .from(employeeKpiTasks)
          .where(eq(employeeKpiTasks.id, params.id))
          .limit(1)

        if (!existingTask) {
          set.status = 404
          return { success: false, message: 'Tugas kerja tidak ditemukan.' }
        }

        const finalProgress =
          approvedProgressValue !== undefined && approvedProgressValue !== null
            ? Number(approvedProgressValue).toFixed(2)
            : existingTask.progressValue

        const [updatedTask] = await db
          .update(employeeKpiTasks)
          .set({
            status,
            progressValue: finalProgress,
            reviewedBy: reviewerId,
            reviewNotes: reviewNotes || null,
            reviewedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(employeeKpiTasks.id, params.id))
          .returning()

        // Sinkronisasi kemajuan tugas ke butir indikator KPI dan hitung ulang skor total
        await syncItemProgressFromTasks(existingTask.assessmentItemId)

        return {
          success: true,
          data: updatedTask,
          message:
            status === 'approved'
              ? 'Tugas berhasil disetujui. Skor KPI karyawan telah diperbarui.'
              : 'Tugas telah ditolak dengan catatan evaluasi.',
        }
      } catch (err: unknown) {
        set.status = 400
        const msg = err instanceof Error ? err.message : 'Gagal memproses review tugas'
        return { success: false, message: msg }
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.Union([t.Literal('approved'), t.Literal('rejected')]),
        reviewNotes: t.Optional(t.String()),
        approvedProgressValue: t.Optional(t.Union([t.String(), t.Number()])),
      }),
    }
  )

  // 13. Penyesuaian Nilai Riil Mandiri (Direct Evaluation Scoring by Admin / Evaluator)
  .put(
    '/assessments/item/:id',
    async ({ params, body, set }) => {
      try {
        const { actualValue } = body

        const [item] = await db
          .update(employeeKpiAssessmentItems)
          .set({
            actualValue: Number(actualValue).toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(employeeKpiAssessmentItems.id, params.id))
          .returning()

        if (!item) {
          set.status = 404
          return { success: false, message: 'Butir penilaian tidak ditemukan.' }
        }

        const scoreSummary = await recalculateAssessment(item.assessmentId)

        return {
          success: true,
          data: { item, scoreSummary },
          message: 'Nilai capaian berhasil diperbarui.',
        }
      } catch (err: unknown) {
        set.status = 400
        const msg = err instanceof Error ? err.message : 'Gagal menyesuaikan nilai'
        return { success: false, message: msg }
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        actualValue: t.Union([t.String(), t.Number()]),
      }),
    }
  )

