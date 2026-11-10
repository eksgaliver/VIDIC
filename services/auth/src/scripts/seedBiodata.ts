import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/srikaya_auth'
const sql = postgres(connectionString)

const data = [
  {
    email: 'budi.santoso@srikaya.id',
    nik: '3174051203920001',
    kk_number: '3174050101180005',
    npwp: '81.423.567.8-015.000',
    bpjs_ketenagakerjaan: '21098472910',
    bpjs_kesehatan: '0001847291023',
    gender: 'male',
    place_of_birth: 'Jakarta',
    date_of_birth: '1992-03-12',
    religion: 'Islam',
    blood_type: 'O',
    marital_status: 'married',
    phone: '081289234561',
    emergency_contact_name: 'Dewi Lestari',
    emergency_contact_phone: '081298765432',
    emergency_contact_relation: 'Istri',
    address_ktp: 'Jl. Tebet Barat Dalam VII No. 14, RT 004/RW 03',
    address_current: 'Jl. Tebet Barat Dalam VII No. 14, RT 004/RW 03',
    postal_code: '12810',
    city: 'Jakarta Selatan',
    province: 'DKI Jakarta',
    last_education: 'D4/S1',
    major: 'Teknik Informatika',
    institution: 'Institut Teknologi Bandung',
    bank_name: 'BCA',
    bank_account_number: '7120938421',
    bank_account_holder: 'Budi Santoso',
    is_completed: true
  },
  {
    email: 'siti.rahma@srikaya.id',
    nik: '3275034507950002',
    kk_number: '3275030205190008',
    npwp: '72.819.345.1-017.000',
    bpjs_ketenagakerjaan: '21098472911',
    bpjs_kesehatan: '0001847291024',
    gender: 'female',
    place_of_birth: 'Bandung',
    date_of_birth: '1995-07-15',
    religion: 'Islam',
    blood_type: 'A',
    marital_status: 'single',
    phone: '081377889922',
    emergency_contact_name: 'Hj. Maryam',
    emergency_contact_phone: '081399887766',
    emergency_contact_relation: 'Ibu Kandung',
    address_ktp: 'Jl. Dago Asri No. 28, RT 002/RW 05',
    address_current: 'Jl. Mampang Prapatan VIII No. 12',
    postal_code: '12790',
    city: 'Jakarta Selatan',
    province: 'DKI Jakarta',
    last_education: 'D4/S1',
    major: 'Manajemen SDM / Psikologi',
    institution: 'Universitas Padjadjaran',
    bank_name: 'Mandiri',
    bank_account_number: '1310018293041',
    bank_account_holder: 'Siti Rahma',
    is_completed: true
  },
  {
    email: 'ahmad.fauzi@srikaya.id',
    nik: '3578012010930003',
    kk_number: '3578010508170004',
    npwp: '63.928.471.2-021.000',
    bpjs_ketenagakerjaan: '21098472912',
    bpjs_kesehatan: '0001847291025',
    gender: 'male',
    place_of_birth: 'Surabaya',
    date_of_birth: '1993-10-20',
    religion: 'Islam',
    blood_type: 'B',
    marital_status: 'married',
    phone: '081233445566',
    emergency_contact_name: 'Nurul Hidayah',
    emergency_contact_phone: '081255667788',
    emergency_contact_relation: 'Istri',
    address_ktp: 'Jl. Rungkut Madya No. 45',
    address_current: 'Jl. Panglima Polim XIII No. 7',
    postal_code: '12160',
    city: 'Jakarta Selatan',
    province: 'DKI Jakarta',
    last_education: 'D4/S1',
    major: 'Sistem Informasi',
    institution: 'Institut Teknologi Sepuluh Nopember',
    bank_name: 'BRI',
    bank_account_number: '034101002345501',
    bank_account_holder: 'Ahmad Fauzi',
    is_completed: true
  },
  {
    email: 'admin@srikaya.id',
    nik: '3171011508880001',
    kk_number: '3171010204120003',
    npwp: '54.123.456.7-011.000',
    bpjs_ketenagakerjaan: '21098472900',
    bpjs_kesehatan: '0001847291000',
    gender: 'male',
    place_of_birth: 'Jakarta',
    date_of_birth: '1988-08-15',
    religion: 'Islam',
    blood_type: 'AB',
    marital_status: 'married',
    phone: '08111223344',
    emergency_contact_name: 'Ratna Sari',
    emergency_contact_phone: '08119988776',
    emergency_contact_relation: 'Istri',
    address_ktp: 'Jl. Jenderal Sudirman Kav. 52-53',
    address_current: 'Jl. Senopati No. 88',
    postal_code: '12190',
    city: 'Jakarta Selatan',
    province: 'DKI Jakarta',
    last_education: 'S2',
    major: 'Master of Business Administration',
    institution: 'Universitas Indonesia',
    bank_name: 'BCA',
    bank_account_number: '0012938471',
    bank_account_holder: 'Srikaya Enterprise Operator',
    is_completed: true
  }
]

async function run() {
  for (const item of data) {
    const [user] = await sql`SELECT id, company_id FROM users WHERE email = ${item.email}`
    if (user) {
      const [existing] = await sql`SELECT id FROM biodata WHERE user_id = ${user.id}`
      if (existing) {
        await sql`
          UPDATE biodata SET
            nik = ${item.nik},
            kk_number = ${item.kk_number},
            npwp = ${item.npwp},
            bpjs_ketenagakerjaan = ${item.bpjs_ketenagakerjaan},
            bpjs_kesehatan = ${item.bpjs_kesehatan},
            gender = ${item.gender},
            place_of_birth = ${item.place_of_birth},
            date_of_birth = ${item.date_of_birth},
            religion = ${item.religion},
            blood_type = ${item.blood_type},
            marital_status = ${item.marital_status},
            phone = ${item.phone},
            emergency_contact_name = ${item.emergency_contact_name},
            emergency_contact_phone = ${item.emergency_contact_phone},
            emergency_contact_relation = ${item.emergency_contact_relation},
            address_ktp = ${item.address_ktp},
            address_current = ${item.address_current},
            postal_code = ${item.postal_code},
            city = ${item.city},
            province = ${item.province},
            last_education = ${item.last_education},
            major = ${item.major},
            institution = ${item.institution},
            bank_name = ${item.bank_name},
            bank_account_number = ${item.bank_account_number},
            bank_account_holder = ${item.bank_account_holder},
            is_completed = true,
            completed_at = NOW(),
            updated_at = NOW()
          WHERE user_id = ${user.id}
        `
        console.log('✓ Updated biodata for:', item.email)
      } else {
        await sql`
          INSERT INTO biodata (
            user_id, company_id, nik, kk_number, npwp, bpjs_ketenagakerjaan, bpjs_kesehatan,
            gender, place_of_birth, date_of_birth, religion, blood_type, marital_status,
            phone, emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
            address_ktp, address_current, postal_code, city, province,
            last_education, major, institution, bank_name, bank_account_number, bank_account_holder,
            is_completed, completed_at, created_at, updated_at
          ) VALUES (
            ${user.id}, ${user.company_id}, ${item.nik}, ${item.kk_number}, ${item.npwp}, ${item.bpjs_ketenagakerjaan}, ${item.bpjs_kesehatan},
            ${item.gender}, ${item.place_of_birth}, ${item.date_of_birth}, ${item.religion}, ${item.blood_type}, ${item.marital_status},
            ${item.phone}, ${item.emergency_contact_name}, ${item.emergency_contact_phone}, ${item.emergency_contact_relation},
            ${item.address_ktp}, ${item.address_current}, ${item.postal_code}, ${item.city}, ${item.province},
            ${item.last_education}, ${item.major}, ${item.institution}, ${item.bank_name}, ${item.bank_account_number}, ${item.bank_account_holder},
            true, NOW(), NOW(), NOW()
          )
        `
        console.log('✓ Inserted biodata for:', item.email)
      }
    }
  }

  await sql.end()
  console.log('Semua biodata karyawan berhasil disinkronisasi!')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
