import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/srikaya_auth'
const sql = postgres(connectionString)

async function main() {
  console.log('Creating posts and post_comments tables...')

  await sql`
    CREATE TABLE IF NOT EXISTS posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255),
      content TEXT NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'general',
      media_urls JSONB DEFAULT '[]'::jsonb,
      is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
      likes_count INTEGER NOT NULL DEFAULT 0,
      liked_user_ids JSONB DEFAULT '[]'::jsonb,
      comments_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `

  await sql`
    CREATE TABLE IF NOT EXISTS post_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `

  await sql`CREATE INDEX IF NOT EXISTS idx_posts_company_id ON posts(company_id);`
  await sql`CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);`
  await sql`CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);`
  await sql`CREATE INDEX IF NOT EXISTS idx_posts_is_pinned ON posts(is_pinned);`
  await sql`CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);`
  await sql`CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);`

  console.log('✓ Posts and comments tables created successfully.')

  // Cek apakah sudah ada data postingan awal
  const existingPosts = await sql`SELECT count(*) FROM posts`
  if (Number(existingPosts[0].count) === 0) {
    const adminUser = await sql`SELECT id, company_id FROM users WHERE role = 'admin' LIMIT 1`
    const hrUser = await sql`SELECT id, company_id FROM users WHERE email = 'siti.rahma@srikaya.id' LIMIT 1`

    if (adminUser.length > 0) {
      await sql`
        INSERT INTO posts (company_id, author_id, title, content, category, is_pinned, likes_count, liked_user_ids)
        VALUES (
          ${adminUser[0].company_id},
          ${adminUser[0].id},
          'Pengumuman Penerapan Kalender Kerja & Hari Libur Nasional 2026',
          'Halo seluruh tim Srikaya Platform!\n\nManajemen telah merilis kalender operasional resmi untuk tahun 2026 yang mengacu pada SKB 3 Menteri RI. Pastikan masing-masing kepala departemen dan supervisor shift memeriksa alokasi jadwal kerja dan cuti bersama tim Anda.\n\nMari kita jaga produktivitas dan koordinasi kerja tim tetap optimal. Semangat berkarya!',
          'announcement',
          TRUE,
          3,
          '[]'::jsonb
        )
      `
    }

    if (hrUser.length > 0) {
      await sql`
        INSERT INTO posts (company_id, author_id, title, content, category, is_pinned, likes_count, liked_user_ids)
        VALUES (
          ${hrUser[0].company_id},
          ${hrUser[0].id},
          'Pembaruan Kelengkapan Biodata Karyawan & Administrasi BPJS',
          'Kepada seluruh rekan karyawan,\n\nMohon pastikan data biodata kepegawaian Anda di menu Profil telah terverifikasi lengkap (NIK KTP, No. KK, NPWP, dan No. BPJS). Terima kasih kepada rekan-rekan yang telah melengkapi data tepat waktu!\n\nJika ada pertanyaan mengenai nomor rekening payroll atau kepesertaan, silakan hubungi tim HR.',
          'news',
          FALSE,
          2,
          '[]'::jsonb
        )
      `
    }
    console.log('✓ Seed posts created.')
  }

  await sql.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
