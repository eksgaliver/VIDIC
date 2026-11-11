import postgres from 'postgres'

const connectionString =
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/srikaya_auth'

const sql = postgres(connectionString)

export async function migrateKpi() {
  console.log('[migrate_kpi] Menjalankan migrasi skema KPI Karyawan...')

  await sql`
    CREATE TABLE IF NOT EXISTS kpi_periods (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name VARCHAR(150) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      grace_end_date DATE,
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_kpi_periods_company
    ON kpi_periods(company_id, status)
  `

  await sql`
    CREATE TABLE IF NOT EXISTS department_kpi_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
      period_id UUID NOT NULL REFERENCES kpi_periods(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'operational',
      description TEXT,
      measurement_unit VARCHAR(50) NOT NULL,
      target_value NUMERIC(12, 2) NOT NULL,
      weight NUMERIC(5, 2) NOT NULL,
      target_position VARCHAR(100),
      is_active BOOLEAN NOT NULL DEFAULT true,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_dept_kpi_items
    ON department_kpi_items(department_id, period_id)
  `

  await sql`
    CREATE TABLE IF NOT EXISTS employee_kpi_assessments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
      employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      period_id UUID NOT NULL REFERENCES kpi_periods(id) ON DELETE CASCADE,
      evaluator_id UUID REFERENCES users(id) ON DELETE SET NULL,
      total_weight NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
      final_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
      grade VARCHAR(10),
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      notes_from_evaluator TEXT,
      employee_feedback TEXT,
      verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT uq_kpi_emp_period UNIQUE (employee_id, period_id)
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_emp_kpi_assessments
    ON employee_kpi_assessments(department_id, period_id, employee_id)
  `

  await sql`
    CREATE TABLE IF NOT EXISTS employee_kpi_assessment_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      assessment_id UUID NOT NULL REFERENCES employee_kpi_assessments(id) ON DELETE CASCADE,
      department_kpi_item_id UUID REFERENCES department_kpi_items(id) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'operational',
      description TEXT,
      measurement_unit VARCHAR(50) NOT NULL,
      target_value NUMERIC(12, 2) NOT NULL,
      actual_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      weight NUMERIC(5, 2) NOT NULL,
      achievement_percentage NUMERIC(7, 2) NOT NULL DEFAULT 0.00,
      weighted_score NUMERIC(7, 2) NOT NULL DEFAULT 0.00,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_emp_kpi_assessment_items
    ON employee_kpi_assessment_items(assessment_id)
  `

  await sql`
    CREATE TABLE IF NOT EXISTS employee_kpi_tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      assessment_item_id UUID NOT NULL REFERENCES employee_kpi_assessment_items(id) ON DELETE CASCADE,
      assessment_id UUID NOT NULL REFERENCES employee_kpi_assessments(id) ON DELETE CASCADE,
      employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      progress_value NUMERIC(12, 2) NOT NULL,
      completed_date DATE NOT NULL,
      evidence_url TEXT,
      notes TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'pending_review',
      reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      review_notes TEXT,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_kpi_tasks_status
    ON employee_kpi_tasks(department_id, status)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_kpi_tasks_emp
    ON employee_kpi_tasks(employee_id, completed_date)
  `

  console.log('[migrate_kpi] ✓ Seluruh tabel skema KPI berhasil disiapkan.')

  // Seeder Bawaan Sesuai Matriks Nyata Divisi
  await seedDefaultKpiData()
}

async function seedDefaultKpiData() {
  console.log('[migrate_kpi] Memeriksa data bawaan KPI per divisi...')

  const companiesList = await sql`SELECT id, name FROM companies`
  if (companiesList.length === 0) return

  for (const comp of companiesList) {
    // 1. Buat Periode Kuartal I 2026 jika belum ada
    let [period] = await sql`
      SELECT id, name FROM kpi_periods
      WHERE company_id = ${comp.id} AND name = 'Kuartal I 2026'
      LIMIT 1
    `

    if (!period) {
      ;[period] = await sql`
        INSERT INTO kpi_periods (
          company_id, name, start_date, end_date, grace_end_date, status, description
        ) VALUES (
          ${comp.id},
          'Kuartal I 2026',
          '2026-01-01',
          '2026-03-31',
          '2026-04-07',
          'active',
          'Periode evaluasi kinerja kuartal pertama tahun anggaran 2026 dengan fleksibilitas grace period 7 hari.'
        ) RETURNING id, name
      `
      console.log(`[migrate_kpi] ✓ Dibuat periode Kuartal I 2026 untuk ${comp.name}`)
    }

    // 2. Ambil seluruh departemen perusahaan ini
    const depts = await sql`SELECT id, name, code FROM departments WHERE company_id = ${comp.id}`

    for (const d of depts) {
      // Periksa apakah item KPI divisi sudah ada
      const existingItems = await sql`
        SELECT id FROM department_kpi_items
        WHERE department_id = ${d.id} AND period_id = ${period.id}
      `

      if (existingItems.length === 0) {
        // Tentukan template item berdasarkan nama/kode departemen
        const isIt = d.code === 'IT' || d.name.toLowerCase().includes('teknologi')
        const isOps = d.code === 'OPS' || d.code === 'LOG' || d.name.toLowerCase().includes('operasional')
        const isHr = d.code === 'HR' || d.name.toLowerCase().includes('sumber daya')

        let itemsToInsert: Array<{
          title: string
          category: string
          unit: string
          target: number
          weight: number
          desc: string
        }> = []

        if (isIt) {
          itemsToInsert = [
            {
              title: 'Ketuntasan Tiket & Sprint Backlog',
              category: 'operational',
              unit: 'tiket',
              target: 100,
              weight: 30,
              desc: 'Persentase penyelesaian fitur dan task sprint sesuai jadwal rilis.'
            },
            {
              title: 'Ketersediaan Sistem (Uptime)',
              category: 'operational',
              unit: 'persen',
              target: 99.8,
              weight: 25,
              desc: 'Tingkat ketersediaan layanan backend dan frontend tanpa insiden pemadaman tak terencana.'
            },
            {
              title: 'Waktu Mitigasi Bug Kritis (MTTR)',
              category: 'quality',
              unit: 'jam',
              target: 2,
              weight: 25,
              desc: 'Rata-rata kecepatan penanganan bug prioritas tinggi hingga rilis patch perbaikan.'
            },
            {
              title: 'Kualitas Kode & Dokumentasi Arsitektur',
              category: 'development',
              unit: 'modul',
              target: 12,
              weight: 20,
              desc: 'Kelengkapan dokumentasi arsitektur dan kepatuhan review kode tanpa utang teknis.'
            }
          ]
        } else if (isOps) {
          itemsToInsert = [
            {
              title: 'Ketepatan Jadwal Pengantaran & Distribusi',
              category: 'operational',
              unit: 'trip',
              target: 120,
              weight: 35,
              desc: 'Penyelesaian rute pengantaran tepat waktu sesuai estimasi surat jalan.'
            },
            {
              title: 'Efisiensi Rute & Konsumsi Bahan Bakar (BBM)',
              category: 'financial',
              unit: 'persen',
              target: 95,
              weight: 25,
              desc: 'Kepatuhan rute optimal dengan efisiensi penggunaan bahan bakar armada.'
            },
            {
              title: 'Kepatuhan Geofence & Standar Keselamatan',
              category: 'compliance',
              unit: 'kasus',
              target: 0,
              weight: 20,
              desc: 'Nihil pelanggaran perimeter geofence dan kepatuhan standar keselamatan kerja.'
            },
            {
              title: 'Kelayakan & Perawatan Armada Terjadwal',
              category: 'operational',
              unit: 'unit',
              target: 12,
              weight: 20,
              desc: 'Pelaksanaan servis preventif armada kendaraan agar siap jalan 100%.'
            }
          ]
        } else if (isHr) {
          itemsToInsert = [
            {
              title: 'Pemenuhan Rekrutmen & Onboarding Staf',
              category: 'operational',
              unit: 'posisi',
              target: 10,
              weight: 30,
              desc: 'Kecepatan pemenuhan lowongan kerja divisi dalam batas waktu maksimal 30 hari.'
            },
            {
              title: 'Akurasi Administrasi Payroll & BPJS',
              category: 'compliance',
              unit: 'persen',
              target: 100,
              weight: 25,
              desc: 'Ketepatan kalkulasi gaji, lembur, dan iuran tanpa kekeliruan setiap tanggal 25.'
            },
            {
              title: 'Penyelenggaraan Program Pelatihan Kerja',
              category: 'development',
              unit: 'sesi',
              target: 4,
              weight: 25,
              desc: 'Pelaksanaan lokakarya peningkatan keahlian bagi seluruh departemen.'
            },
            {
              title: 'Indeks Kepuasan Karyawan (eNPS)',
              category: 'quality',
              unit: 'skor',
              target: 85,
              weight: 20,
              desc: 'Skor survei kepuasan lingkungan kerja dan retensi loyalitas tim.'
            }
          ]
        } else {
          itemsToInsert = [
            {
              title: 'Pencapaian Sasaran Utama Departemen',
              category: 'operational',
              unit: 'tugas',
              target: 50,
              weight: 40,
              desc: 'Penyelesaian program kerja prioritas kuartalan.'
            },
            {
              title: 'Efisiensi Anggaran & Pengendalian Biaya',
              category: 'financial',
              unit: 'persen',
              target: 95,
              weight: 30,
              desc: 'Kepatuhan realisasi pengeluaran terhadap pagu anggaran.'
            },
            {
              title: 'Kepatuhan Regulasi & Standar Pelayanan',
              category: 'compliance',
              unit: 'persen',
              target: 100,
              weight: 30,
              desc: 'Penyelesaian kewajiban administrasi tepat waktu.'
            }
          ]
        }

        let sort = 0
        for (const item of itemsToInsert) {
          await sql`
            INSERT INTO department_kpi_items (
              company_id, department_id, period_id, title, category,
              description, measurement_unit, target_value, weight, sort_order
            ) VALUES (
              ${comp.id}, ${d.id}, ${period.id}, ${item.title}, ${item.category},
              ${item.desc}, ${item.unit}, ${item.target}, ${item.weight}, ${sort++}
            )
          `
        }
        console.log(`[migrate_kpi] ✓ Dibuat ${itemsToInsert.length} indikator KPI untuk Divisi ${d.name}`)
      }

      // 3. Buat lembar kerja evaluasi untuk seluruh karyawan di divisi ini
      const deptUsers = await sql`
        SELECT id, name, position FROM users
        WHERE department_id = ${d.id} AND company_id = ${comp.id}
      `

      const deptKpiItems = await sql`
        SELECT * FROM department_kpi_items
        WHERE department_id = ${d.id} AND period_id = ${period.id} AND is_active = true
        ORDER BY sort_order
      `

      for (const u of deptUsers) {
        let [assessment] = await sql`
          SELECT id FROM employee_kpi_assessments
          WHERE employee_id = ${u.id} AND period_id = ${period.id}
          LIMIT 1
        `

        if (!assessment && deptKpiItems.length > 0) {
          ;[assessment] = await sql`
            INSERT INTO employee_kpi_assessments (
              company_id, department_id, employee_id, period_id, total_weight, final_score, status
            ) VALUES (
              ${comp.id}, ${d.id}, ${u.id}, ${period.id}, 100.00, 0.00, 'active'
            ) RETURNING id
          `

          let itemSort = 0
          for (const kpi of deptKpiItems) {
            await sql`
              INSERT INTO employee_kpi_assessment_items (
                assessment_id, department_kpi_item_id, title, category, description,
                measurement_unit, target_value, actual_value, weight, achievement_percentage,
                weighted_score, sort_order
              ) VALUES (
                ${assessment.id}, ${kpi.id}, ${kpi.title}, ${kpi.category}, ${kpi.description},
                ${kpi.measurement_unit}, ${kpi.target_value}, 0.00, ${kpi.weight}, 0.00,
                0.00, ${itemSort++}
              )
            `
          }
          console.log(`[migrate_kpi] ✓ Dibuat lembar evaluasi untuk karyawan: ${u.name} (${deptKpiItems.length} indikator)`)
        }
      }
    }
  }

  console.log('[migrate_kpi] ✓ Seeder data KPI selesai.')
}

if (import.meta.main) {
  migrateKpi()
    .then(() => {
      console.log('[migrate_kpi] Selesai 100%')
      process.exit(0)
    })
    .catch((err) => {
      console.error('[migrate_kpi] Gagal:', err)
      process.exit(1)
    })
}

