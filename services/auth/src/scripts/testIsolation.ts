import { authApp } from '../index'
import { shiftRoutes } from '../../../shifting/src/routes/shifts'
import { db } from '../db'
import { companies } from '../db/schema'
import { eq } from 'drizzle-orm'

async function runTest() {
  console.log('[TEST] Menjalankan Pengujian Isolasi Multi-Tenant Antar Perusahaan...')

  // 1. Ambil Perusahaan A & B
  const [compA] = await db.select().from(companies).where(eq(companies.code, 'SRK')).limit(1)
  const [compB] = await db.select().from(companies).where(eq(companies.code, 'NLP')).limit(1)

  if (!compA || !compB) {
    console.error('Perusahaan A atau B belum ada di database!')
    process.exit(1)
  }

  console.log(`Perusahaan A: ${compA.name} (${compA.id})`)
  console.log(`Perusahaan B: ${compB.name} (${compB.id})`)

  // 2. Login sebagai Admin Perusahaan A
  const loginResA = await authApp.handle(
    new Request('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@srikaya.id', password: 'rahasia123' })
    })
  )
  const loginDataA = await loginResA.json()
  const tokenA = loginDataA.token
  console.log(`Login Admin Perusahaan A berhasil: ${loginDataA.user?.name} (Company: ${loginDataA.user?.companyId})`)

  // 3. Login sebagai Admin Perusahaan B
  const loginResB = await authApp.handle(
    new Request('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@nusantara.id', password: 'password' })
    })
  )
  const loginDataB = await loginResB.json()
  const tokenB = loginDataB.token
  console.log(`Login Admin Perusahaan B berhasil: ${loginDataB.user?.name} (Company: ${loginDataB.user?.companyId})`)

  console.log('\n--- SKENARIO 1: Pengguna Perusahaan A Mengakses Data ---')
  // 1.1 List companies sebagai user A -> Hanya boleh melihat Perusahaan A!
  const listCompResA = await authApp.handle(
    new Request('http://localhost/companies', {
      headers: { Authorization: `Bearer ${tokenA}` }
    })
  )
  const listCompA = await listCompResA.json()
  console.log(`Perusahaan terlihat oleh User A: ${listCompA.length} entitas -> ${listCompA.map((c: any) => c.name).join(', ')}`)
  const test1 = listCompA.length === 1 && listCompA[0].id === compA.id
  console.log(`Status Isolasi List Perusahaan: ${test1 ? 'BERHASIL TERISOLASI ✓' : 'GAGAL ✕'}`)

  // 1.2 User A mencoba akses detail Perusahaan B
  const getCompBRes = await authApp.handle(
    new Request(`http://localhost/companies/${compB.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    })
  )
  console.log(`User A mencoba GET /companies/${compB.id} -> Status: ${getCompBRes.status} (Harus 403)`)
  const test2 = getCompBRes.status === 403
  console.log(`Status Proteksi Profil Perusahaan Lain: ${test2 ? 'BERHASIL DIBLOKIR ✓' : 'GAGAL ✕'}`)

  // 1.3 User A mencoba ambil Departemen Perusahaan B
  const getDeptBRes = await authApp.handle(
    new Request(`http://localhost/departments?companyId=${compB.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    })
  )
  console.log(`User A mencoba GET /departments?companyId=${compB.id} -> Status: ${getDeptBRes.status} (Harus 403)`)
  const test3 = getDeptBRes.status === 403
  console.log(`Status Proteksi Departemen Perusahaan Lain: ${test3 ? 'BERHASIL DIBLOKIR ✓' : 'GAGAL ✕'}`)

  // 1.4 User A mencoba ambil Karyawan Perusahaan B
  const getEmpBRes = await authApp.handle(
    new Request(`http://localhost/employees?companyId=${compB.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    })
  )
  console.log(`User A mencoba GET /employees?companyId=${compB.id} -> Status: ${getEmpBRes.status} (Harus 403)`)
  const test4 = getEmpBRes.status === 403
  console.log(`Status Proteksi Karyawan Perusahaan Lain: ${test4 ? 'BERHASIL DIBLOKIR ✓' : 'GAGAL ✕'}`)

  // 1.5 User A mencoba ambil Shift Perusahaan B
  const getShiftBRes = await shiftRoutes.handle(
    new Request(`http://localhost/shifts?companyId=${compB.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    })
  )
  console.log(`User A mencoba GET /shifts?companyId=${compB.id} -> Status: ${getShiftBRes.status} (Harus 403)`)
  const test5 = getShiftBRes.status === 403
  console.log(`Status Proteksi Shift Perusahaan Lain: ${test5 ? 'BERHASIL DIBLOKIR ✓' : 'GAGAL ✕'}`)

  console.log('\n--- SKENARIO 2: Pengguna Perusahaan B Mengakses Data ---')
  // 2.1 List companies sebagai user B -> Hanya boleh melihat Perusahaan B!
  const listCompResB = await authApp.handle(
    new Request('http://localhost/companies', {
      headers: { Authorization: `Bearer ${tokenB}` }
    })
  )
  const listCompB = await listCompResB.json()
  console.log(`Perusahaan terlihat oleh User B: ${listCompB.length} entitas -> ${listCompB.map((c: any) => c.name).join(', ')}`)
  const test6 = listCompB.length === 1 && listCompB[0].id === compB.id
  console.log(`Status Isolasi List Perusahaan: ${test6 ? 'BERHASIL TERISOLASI ✓' : 'GAGAL ✕'}`)

  // 2.2 User B mencoba akses detail Perusahaan A
  const getCompARes = await authApp.handle(
    new Request(`http://localhost/companies/${compA.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    })
  )
  console.log(`User B mencoba GET /companies/${compA.id} -> Status: ${getCompARes.status} (Harus 403)`)
  const test7 = getCompARes.status === 403
  console.log(`Status Proteksi Profil Perusahaan Lain: ${test7 ? 'BERHASIL DIBLOKIR ✓' : 'GAGAL ✕'}`)

  // 2.3 User B mencoba ambil Departemen Perusahaan A
  const getDeptARes = await authApp.handle(
    new Request(`http://localhost/departments?companyId=${compA.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    })
  )
  console.log(`User B mencoba GET /departments?companyId=${compA.id} -> Status: ${getDeptARes.status} (Harus 403)`)
  const test8 = getDeptARes.status === 403
  console.log(`Status Proteksi Departemen Perusahaan Lain: ${test8 ? 'BERHASIL DIBLOKIR ✓' : 'GAGAL ✕'}`)

  const allPassed = test1 && test2 && test3 && test4 && test5 && test6 && test7 && test8
  console.log(`\n=================================================`)
  console.log(`HASIL AKHIR AUDIT: ${allPassed ? '100% LOLOS - ZERO CROSS-TENANT DATA LEAK ✓' : 'ADA KEGAGALAN ✕'}`)
  console.log(`=================================================`)

  process.exit(allPassed ? 0 : 1)
}

runTest()
