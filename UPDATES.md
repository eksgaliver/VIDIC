# Log Pembaruan Sistem & Rangkuman Arsitektur Srikaya Platform

Dokumen ini memuat rangkuman teknis seluruh pembaruan sistem yang telah diimplementasikan pada repositori Srikaya Platform (VIDIC), ditujukan sebagai referensi arsitektur, panduan pengembang, dan catatan konteks untuk agen AI berikutnya.

---

## § 1. Peta Layanan & Topologi Monorepo

Repositori Srikaya Platform diorganisasikan berbasis Bun Monorepo Workspaces (`services/*`, `packages/*`, `apps/*`):

```text
c:/project/
├── storage/                                  # Direktori fisik berkas publik peladen Bun
│   ├── logos/                                # Subdirektori logo resmi perusahaan (WebP)
│   ├── avatars/                              # Subdirektori foto profil / avatar pengguna
│   ├── documents/                            # Subdirektori dokumen berkas (PDF, DOCX)
│   └── general/                              # Subdirektori berkas umum
│
├── services/                                 # Klaster Mikroservis (Runtime: Bun)
│   ├── gateway/                              # API Gateway & Reverse Proxy (Port 3000)
│   │   ├── src/index.ts                      # Mount authApp, shiftingApp, & storageApp ke /api
│   │   └── package.json
│   │
│   ├── shifting/                             # Shifting Microservice (Port 3003)
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema.ts                 # Drizzle schema (shifts & shift_attendance_locations)
│   │   │   │   └── index.ts                  # Koneksi DB terisolasi
│   │   │   ├── routes/
│   │   │   │   └── shifts.ts                 # Handler CRUD Shift Karyawan & Geofence Absensi
│   │   │   └── index.ts                      # Inisialisasi shiftingApp
│   │   └── package.json
│   │
│   ├── storage/                              # Storage Microservice (Port 3002)
│   │   ├── src/
│   │   │   ├── services/
│   │   │   │   └── StorageService.ts         # Kelas inti unggah, segregasi folder & kompresi WebP
│   │   │   ├── routes/
│   │   │   │   └── storage.ts                # Endpoint POST /upload/:folder & GET /storage/*
│   │   │   └── index.ts                      # Inisialisasi storageApp
│   │   └── package.json
│   │
│   └── auth/                                 # Layanan Autentikasi & Organisasi (Port 3001)
│       ├── src/
│       │   ├── db/
│       │   │   └── schema.ts                 # Drizzle schema (PostgreSQL)
│       │   ├── handlers/
│       │   │   └── uploadHandler.ts          # Handler pemrosesan logo lokal
│       │   ├── routes/
│       │   │   ├── companies.ts              # Rute perusahaan, lokasi, geofence, & wilayah
│       │   │   ├── departments.ts            # Rute departemen & validasi wajib HR
│       │   │   └── upload.ts                 # Rute upload pelengkap
│       │   └── index.ts                      # Sub-app Elysia auth & master seed
│       └── package.json
│
├── apps/
│   └── web/                                  # Client Web SPA (Runtime: Node.js / Vite 6 / React 19)
│       ├── src/
│       │   ├── components/shared/
│       │   │   ├── LeafletMapPicker.tsx      # Peta interaktif Leaflet gaya Google Maps
│       │   │   ├── OperationalAreaSelector.tsx # Selektor 38 provinsi & kota Indonesia
│       │   │   └── LogoUploader.tsx          # Komponen pengunggah logo & pratinjau WebP
│       │   ├── routes/
│       │   │   ├── companies.tsx             # Multi-step wizard pendaftaran & kartu perusahaan
│       │   │   └── dashboard.tsx             # Dasbor operasional responsif (FHD, HD, SD)
│       │   ├── layouts/AppLayout.tsx         # Layout utama adaptif resolusi layar
│       │   └── index.css                     # Token desain & CSS overrides
│       └── package.json
│
├── packages/
│   └── shared-types/                         # Kontrak data bersama
│       ├── src/
│       │   ├── indonesia-regions.ts          # Dataset 38 provinsi, kota/kabupaten & zona waktu
│       │   └── index.ts                      # Ekspor publik
│       └── package.json
│
├── scripts/
│   └── dev.ts                                # Orkestrator 4 proses: AUTH, STORAGE, GATEWAY, CLIENT
└── UPDATES.md                                # Berkas dokumentasi ini
```

---

## § 2. Layanan Penyimpanan & Kompresi WebP (`services/storage`)

### 1. Fitur & Tanggung Jawab
• **Pemisahan Folder Dinamis (*Folder Segregation*)**:
  Menyimpan berkas ke subdirektori spesifik secara otomatis berdasarkan parameter `folder` (misal: `/upload/logos`, `/upload/avatars`, `/upload/documents`). Direktori fisik pada `storage/<folder>/` otomatis dibuat via `mkdir`. Nama folder disanitasi terhadap karakter berbahaya untuk mencegah *directory traversal*.
• **Pipeline Kompresi Gambar WebP HD**:
  - Ditenagai oleh pustaka `sharp`.
  - Berkas gambar (`PNG`, `JPG`, `JPEG`, `WEBP`, `GIF`, `AVIF`) otomatis dikoreksi orientasinya (`.rotate()`) dan dibatasi dimensinya maksimal 1.200×1.200 px (`fit: 'inside'`, `withoutEnlargement: true`) agar kualitas Full HD tetap tajam tanpa pembesaran paksa (*no upscaling*).
  - Dikompresi ke format WebP dengan `quality: 85`, `effort: 6`, dan `smartSubsample: true`.
  - Ukuran berkas tereduksi sebesar 85% hingga 95% dibanding berkas mentah.
• **Penanganan Berkas Non-Gambar**:
  Berkas seperti dokumen PDF, DOCX, dan XLSX disimpan secara aman mempertahankan ekstensi aslinya.
• **Penamaan Berkas Unik**:
  Pola: `${folder}-${Date.now()}-${randomId}.${ext}`.

### 2. Antarmuka Endpoint API
• `POST /upload/:folder`: Mengunggah berkas ke subfolder tertentu.  
• `POST /upload`: Mengunggah berkas dengan folder fleksibel via form-data (`folder`).  
• `GET /storage/:folder/:filename`: Menyajikan berkas langsung dengan *header* `Cache-Control: public, max-age=31536000, immutable` dan MIME type yang sesuai.

### 3. Kontrak Output JSON
```json
{
  "success": true,
  "url": "/api/storage/logos/logos-1794203780052-54784886.webp",
  "filename": "logos-1794203780052-54784886.webp",
  "folder": "logos",
  "originalName": "sample-logo.png",
  "mimeType": "image/webp",
  "originalSize": 53757,
  "compressedSize": 2646,
  "compressionRatio": "95% lebih hemat",
  "width": 1200,
  "height": 1200,
  "isCompressed": true,
  "createdAt": "2026-11-09T05:56:20.202Z"
}
```

---

## § 3. Skema Basis Data PostgreSQL (`srikaya_auth`)

Perubahan skema Drizzle ORM pada berkas [`services/auth/src/db/schema.ts`](file:///c:/project/services/auth/src/db/schema.ts):

### 1. Tabel `companies`
• Menambahkan kolom `logoUrl: text('logo_url')` untuk menyimpan tautan berkas logo resmi WebP.

### 2. Tabel `company_operational_areas`
• Menghubungkan perusahaan dengan provinsi dan kota operasionalnya di Indonesia:
  - `id`: UUID (Primary Key, default random)
  - `companyId`: UUID (Foreign Key ke `companies.id`, `onDelete: 'cascade'`)
  - `province`: VARCHAR(100) (Nama provinsi Indonesia)
  - `city`: VARCHAR(100) (Nama kota/kabupaten operasional)
  - `status`: VARCHAR(20) (Default `'active'`)
• Indeks majemuk: `(company_id, province, city)`.

### 3. Tabel `company_locations`
• Menambahkan dukungan Geofencing ganda:
  - `coordinates_type`: VARCHAR(20) (`'point'` atau `'polygon'`, default `'point'`)
  - `polygon_coordinates`: JSONB (Larik koordinat titik sudut `[[lat, lng], ...]`)
  - `radius_meters`: INTEGER (Radius toleransi absensi lingkaran dalam meter)

---

## § 4. Integrasi Peta Leaflet Bergaya Google Maps & Geofencing

Berkas: [`apps/web/src/components/shared/LeafletMapPicker.tsx`](file:///c:/project/apps/web/src/components/shared/LeafletMapPicker.tsx)

### 1. Penyedia Ubin (Murni Leaflet tanpa CartoDB)
• **Peta Jalan (Default)**: Ubin Google Maps resmi berbahasa Indonesia (`https://mt{s}.google.com/vt/lyrs=m&hl=id&x={x}&y={y}&z={z}`) dengan 4 subdomain distribusi (`0`, `1`, `2`, `3`).  
• **Peta Satelit**: Citra satelit Google Hybrid (`lyrs=y`) dengan lapisan jalan dan label gedung.  
• **Fallback OpenStreetMap**: Pilihan ubin OSM resmi (`tile.openstreetmap.org`).

### 2. Kontrol Antarmuka Google Maps
• *Segmented Map Switcher* kiri atas: `[ Peta | Satelit | OSM ]`.  
• *Floating Action Stack* kanan bawah:
  - Tombol GPS lokasi saya (*crosshair*).
  - Tombol pusatkan pin penanda.
  - Tombol vertikal pembesar/pengecil zoom (`+` dan `−`) bergaya Google Maps.

### 3. Mode Geofence: Point vs Polygon
• **Mode Titik & Radius (*Point*)**:
  - Penanda pin merah Google Maps (`#EA4335`, `iconSize: [32, 42]`, `iconAnchor: [16, 42]`).
  - Lingkaran geofence warna biru Google (`#1a73e8`) dengan slider penyesuaian radius 25 m – 1.000 m.
• **Mode Perimeter Area (*Polygon*)**:
  - Penentuan tapak kavling industri/kantor berbasis poligon banyak sudut (*multi-vertex*).
  - Setiap klik pada peta menambahkan titik sudut baru.
  - Setiap titik sudut memiliki *draggable handle* berpenomoran untuk penyesuaian bentuk batas.
  - Tombol aksi: "Persegi Default", "Hapus Titik", "Reset".
  - Penghitungan luas area tapak tanah *real-time* dalam m² dan hektar.

### 4. Reverse Geocoding & Pengisian Alamat Otomatis
• Mengklik atau menggeser pin/sudut poligon pada peta memicu *reverse geocoding* via Nominatim API.  
• Menampilkan popup Google Maps di atas marker: `✓ Alamat Terisi Otomatis`.  
• Mengisi input formulir secara otomatis: `alamat fisik lengkap`, `kota`, `provinsi`, dan `kode pos`.  
• Dilengkapi `ResizeObserver` untuk memastikan peta langsung terisi penuh tanpa bidang abu-abu saat dialog modal dibuka.

---

## § 5. Dataset Wilayah Administratif Indonesia

Berkas: [`packages/shared-types/src/indonesia-regions.ts`](file:///c:/project/packages/shared-types/src/indonesia-regions.ts)

• Mencakup seluruh 38 provinsi di Indonesia yang dikelompokkan ke dalam 6 region kepulauan:
  1. Pulau Jawa
  2. Pulau Sumatera
  3. Kepulauan Bali & Nusa Tenggara
  4. Pulau Kalimantan
  5. Pulau Sulawesi
  6. Kepulauan Maluku & Papua
• Memuat daftar lengkap kota/kabupaten per provinsi beserta koordinat lintang/bujur bawaan dan penentuan zona waktu otomatis (`WIB`, `WITA`, `WIT`).
• Komponen pemilih [`OperationalAreaSelector.tsx`](file:///c:/project/apps/web/src/components/shared/OperationalAreaSelector.tsx) menyediakan fitur filter kepulauan, pencarian kota, aksi massal "Pilih Semua", dan lencana chip rekapitulasi.

---

## § 6. Multi-Step Form Wizard & Pengalaman Antarmuka Web

Berkas: [`apps/web/src/routes/companies.tsx`](file:///c:/project/apps/web/src/routes/companies.tsx)

### 1. Empat Langkah Wizard Pendaftaran Perusahaan
• **Langkah 1 (Profil & Identitas Badan Usaha)**:
  Kode unik, nama resmi, merek, sektor industri, kontak, situs web, serta upload logo via [`LogoUploader.tsx`](file:///c:/project/apps/web/src/components/shared/LogoUploader.tsx) dengan pratinjau WebP langsung.
• **Langkah 2 (Cakupan Wilayah Operasional)**:
  Pemilihan provinsi dan kota operasional di seluruh Indonesia melalui `OperationalAreaSelector`.
• **Langkah 3 (Peta Geofence & Titik Kantor Primer)**:
  Penentuan titik kantor dan geofence presisi (Point/Polygon) dengan peta interaktif dan otomasi pengisian alamat fisik.
• **Langkah 4 (Konfirmasi & Rekapitulasi Data)**:
  Peninjauan menyeluruh data profil, logo, cakupan kota, titik koordinat, dan kepatuhan HR sebelum penyimpanan.

### 2. Modal Manajemen Mandiri
• Tombol **Wilayah**: Membuka modal untuk menambah atau menghapus kota operasional perusahaan tanpa mengubah atribut profil perusahaan lainnya.  
• Tombol **Kelola Lokasi**: Membuka pengelolaan titik kantor cabang baru dengan dukungan mode poligon/point.

### 3. Responsivitas Layar (FHD, HD, SD)
• Breakpoint `fhd: 1920px` pada Tailwind CSS.  
• **FHD (1920×1080 px ke atas)**: Kontainer `max-w-[1840px]`, sidebar dok 288–304 px, peta tinggi 360–480 px, grid kartu 3–4 kolom.  
• **HD (1280×720 px / 1366×768 px)**: Kontainer `max-w-[1240px]`, sidebar dok 260–272 px.  
• **SD (Layar Ponsel & Tablet ≤ 768 px)**: Sidebar berubah menjadi *slide-over drawer* dengan target sentuh minimum 44 px dan susunan vertikal 1 kolom.

---

## § 7. Layanan Shifting & CRUD Master Shift (`services/shifting`)

### 1. Fitur & Tanggung Jawab
• **Layanan Mikroservis Mandiri (*Autonomous Service*)**:
  Berdiri sendiri pada port `3003` dengan runtime Bun dan framework ElysiaJS. Memiliki koneksi basis data terisolasi, skema Drizzle khusus, dan di-mount ke API Gateway pada prefix `/api/shifting`.
• **Pembuatan Shift Independen (*Decoupled Master Shifts*)**:
  Master shift dapat dibuat secara mandiri tanpa harus menunggu adanya karyawan di perusahaan (`canCreate` hanya mensyaratkan perusahaan dan lokasi kerja aktif). Hal ini memungkinkan administrator HR menyiapkan jadwal kerja terlebih dahulu agar langsung tersedia saat menambahkan karyawan baru.
• **Penugasan Karyawan Bidirectional**:
  - Kolom `shift_id` pada tabel `users` mengaitkan karyawan langsung ke master shift.
  - Saat mendaftarkan atau memperbarui karyawan di menu Karyawan, admin dapat memilih shift kerja aktif.
  - Layanan shift secara otomatis menghitung `assignedCount` dan mengembalikan daftar karyawan yang bertugas pada shift tersebut.
• **Geofence Dialihkan ke Shifting (Data Corp Terbatas Level Kota)**:
  - Geofence presensi (peta, radius meter, poligon) sepenuhnya dihapus dari data korporasi/perusahaan (`companies.tsx`).
  - Data korporasi disederhanakan hanya sebatas cakupan provinsi dan kota operasional (`OperationalAreaSelector`).
  - Pendaftaran badan usaha kini menjadi 3 langkah ringkas (Profil → Kota Operasional → Konfirmasi).
• **Wizard Multistep Shifting dengan Peta Interaktif & Pointer Lokasi**:
  - Formulir pembuatan dan pengubahan master shift diimplementasikan dalam bentuk *Multi-Step Wizard* (3 Langkah):
    - **Langkah 1**: Informasi jadwal, jam kerja operasional (dengan kalkulator durasi & deteksi *overnight*), kantor acuan operasional, status, dan penugasan karyawan opsional.
    - **Langkah 2**: Peta presisi interaktif (*LeafletMapPicker*) dengan pin pointer lokasi untuk menandai absensi point. Alamat lengkap dan kota otomatis terisi dari klik peta (*reverse geocoding*).
    - **Langkah 3**: Rekapitulasi lengkap jadwal kerja dan kartu titik-titik geofence yang ditandai sebelum disimpan.
  - **Dukungan Multi-Titik Presensi**: Administrator dapat menambahkan lebih dari 1 lokasi presensi (`+ Tambah Titik Presensi`) dengan koordinat dan radius masing-masing, dan sistem mewajibkan minimal 1 lokasi aktif (tombol hapus terproteksi jika tersisa 1 titik).
• **Algoritma Verifikasi Presensi Geofence**:
  - *Haversine Formula*: Menghitung deviasi jarak meter terhadap titik pusat kantor radius lingkaran.
  - *Ray Casting (Even-Odd)*: Memvalidasi apakah koordinat GPS pengguna berada di dalam batas perimeter poligon tapak kantor.
• **Pendeteksian Shift Lintas Hari (*Overnight Shift*)**:
  Sistem secara otomatis mendeteksi dan memberi indikasi jika jam selesai lebih awal dari jam mulai (`endTime <= startTime`), menandakan shift melewati tengah malam.

### 2. Skema Basis Data PostgreSQL (`srikaya_auth`)
• **Tabel `shifts`**:
  - `id` (UUID PK)
  - `company_id` (FK `companies.id`, `ON DELETE CASCADE`)
  - `name` (VARCHAR 150, Nama shift, misal "Shift Pagi", "Shift Siang", "Shift Malam")
  - `code` (VARCHAR 50, Kode unik, misal "PAGI", "SIANG", "MALAM")
  - `description` (VARCHAR 255, Keterangan operasional)
  - `start_time` (TIME, Jam mulai kerja)
  - `end_time` (TIME, Jam selesai kerja)
  - `work_location_id` (FK `company_locations.id`, `ON DELETE RESTRICT`)
  - `employee_id` (FK `users.id`, nullable, `ON DELETE SET NULL`)
  - `position` (VARCHAR 150, nullable)
  - `supervisor_id` (FK `users.id`, nullable, `ON DELETE SET NULL`)
  - `status` (VARCHAR 20, default `'active'`)
  - `created_at`, `updated_at` (TIMESTAMPTZ)
• **Tabel `users` (Pembaruan)**:
  - `shift_id` (UUID, FK `shifts.id`, `ON DELETE SET NULL`, Berindeks)
• **Tabel `shift_attendance_locations` (Skema Geolokasi Lengkap)**:
  - `id` (UUID PK)
  - `shift_id` (FK `shifts.id`, `ON DELETE CASCADE`)
  - `location_id` (FK `company_locations.id`, nullable, `ON DELETE SET NULL`)
  - `name` (VARCHAR 150, Nama lokasi kantor/cabang)
  - `address` (TEXT, Alamat lengkap)
  - `city` (VARCHAR 100, Kota/Kabupaten)
  - `province` (VARCHAR 100, Provinsi)
  - `latitude` (NUMERIC 10,7, Titik lintang GPS)
  - `longitude` (NUMERIC 10,7, Titik bujur GPS)
  - `radius_meters` (INTEGER, Radius toleransi presensi dalam meter, default 50)
  - `coordinates_type` (VARCHAR 20, `'point'` atau `'polygon'`, default `'point'`)
  - `polygon_coordinates` (JSONB, Array pasangan koordinat `[[lat, lng], ...]`)
  - `timezone` (VARCHAR 50, default `'Asia/Jakarta'`)
  - `created_at` (TIMESTAMPTZ)

### 3. Kontrak Endpoint CRUD & Verifikasi Shift
• `GET /api/shifting/shifts`: Mengambil daftar master shift beserta relasi lokasi kerja, titik geofence absensi lengkap, jumlah karyawan bertugas (`assignedCount`), dan daftar karyawan bertugas (`assignedEmployees`).
• `GET /api/shifting/shifts/:id`: Mengambil rincian spesifik satu master shift.
• `POST /api/shifting/shifts`: Membuat master shift baru tanpa keharusan adanya karyawan (hanya membutuhkan nama, kode, jam kerja, lokasi kerja, dan titik geofence absensi).
• `PUT /api/shifting/shifts/:id`: Memperbarui data shift dan menyelaraskan titik lokasi absensi secara transaksional (`db.transaction`).
• `DELETE /api/shifting/shifts/:id`: Menghapus data shift dan me-reset penugasan `shift_id` pada karyawan terkait menjadi null.
• `POST /api/shifting/shifts/:id/verify-attendance`: Endpoint verifikasi absensi geolokasi berbasis posisi GPS pengguna (`latitude`, `longitude`). Mengembalikan status `verified: true/false`, deviasi jarak meter (`distanceMeters`), serta data titik lokasi yang cocok (`matchedLocation`).

### 4. Integrasi Frontend (`apps/web/src/routes/shifts.tsx` & `companies.tsx`)
• **Halaman Badan Usaha / Perusahaan (`companies.tsx`)**:
  - Pendaftaran badan usaha disederhanakan menjadi 3 langkah ringkas: Profil → Wilayah & Kota Operasional → Konfirmasi.
  - Geofence presensi, peta Leaflet, dan pembatasan radius dihapus dari data perusahaan karena presensi absensi dikelola penuh oleh layanan shifting.
• **Halaman Master Shift (`shifts.tsx`)**:
  - Modal pembuatan & pengubahan shift kini mengadopsi *Multi-Step Wizard* (3 Langkah).
  - Terdapat peta interaktif dengan pin pointer lokasi untuk menandai absensi point secara visual.
  - Alamat jalan, nomor, dan kota otomatis terisi berkat integrasi reverse geocoding Leaflet.
  - Administrator dapat menambahkan lebih dari 1 lokasi presensi (`+ Tambah Titik Presensi`) dan wajib menyertakan minimal 1 lokasi aktif.
  - Tab navigator antar-titik presensi memudahkan penyuntingan atribut titik secara individual (nama titik, alamat, radius toleransi meter, zona waktu).
  - **Penyempurnaan Mode Geofence & Transisi Pointer**:
    - Memperbaiki bug di mana layer poligon dan marker sudut (handle 1, 2, 3, 4) tetap tertinggal di peta saat beralih kembali ke mode pointer/titik.
    - Menambahkan tombol aksi `← Kembali ke Pointer` pada floating toolbar poligon dan selector `Tipe Geofence Presensi` di panel atribut titik.
    - Sinkronisasi reaktif: saat berpindah ke mode pointer, seluruh layer poligon Leaflet dan vertex markers dihapus total dari kanvas, `polygonCoordinates` di-reset ke array kosong `[]`, dan lingkaran toleransi radius kembali aktif dengan opasitas penuh.
• **Halaman Karyawan (`employees.tsx`)**:
  - Formulir penambahan & pengubahan karyawan dilengkapi pemilih shift kerja (`SelectField` Shift kerja).
  - Tabel karyawan menampilkan kolom shift kerja aktif dengan nama shift, kode badge, dan jam kerja.
  - Menampilkan kolom status kelengkapan biodata (`Lengkap ✓` / `Belum Diisi ○`) serta indikator relasi tabel mail aktif.

---

## § 8. Relasi Tabel Mail & Biodata Karyawan Pasca-Login

Untuk mendukung tata kelola administrasi kepegawaian Indonesia dan korespondensi internal resmi:

### 1. Tabel `mail` (Surat & Pesan Internal Karyawan)
• **Struktur Skema Drizzle**:
  - `id` (UUID PRIMARY KEY DEFAULT gen_random_uuid())
  - `user_id` (UUID NOT NULL, REFERENCES users(id) ON DELETE CASCADE)
  - `company_id` (UUID, REFERENCES companies(id) ON DELETE CASCADE)
  - `sender_email` (VARCHAR 255 NOT NULL)
  - `sender_name` (VARCHAR 255)
  - `recipient_email` (VARCHAR 255 NOT NULL)
  - `recipient_name` (VARCHAR 255)
  - `subject` (VARCHAR 255 NOT NULL)
  - `body` (TEXT NOT NULL)
  - `category` (VARCHAR 50 DEFAULT 'inbox' NOT NULL)
  - `is_read` (BOOLEAN DEFAULT false NOT NULL)
  - `is_starred` (BOOLEAN DEFAULT false NOT NULL)
  - `metadata` (JSONB)
  - `sent_at`, `created_at`, `updated_at` (TIMESTAMPTZ)
• **Relasi 1:N Antara Karyawan & Mail**:
  - Setiap pendaftaran karyawan baru (`POST /api/employees`) otomatis menerbitkan surat onboarding awal dari Departemen HR & Personalia yang masuk ke tabel `mail`.
  - Memastikan seluruh karyawan terikat secara relasional dengan tabel `mail`.
  - Tersedia endpoint `GET /api/auth/mail` untuk membaca kotak surat personal dan `PATCH /api/auth/mail/:id/read` untuk menandai surat telah dibaca.

### 2. Tabel `biodata` (Biodata Lengkap Karyawan Pasca-Login)
• **Struktur Skema Drizzle**:
  - `id` (UUID PRIMARY KEY DEFAULT gen_random_uuid())
  - `user_id` (UUID NOT NULL UNIQUE, REFERENCES users(id) ON DELETE CASCADE)
  - `company_id` (UUID, REFERENCES companies(id) ON DELETE CASCADE)
  - **Identitas Kependudukan & Pajak**: `nik` (16 digit), `kk_number`, `npwp`, `bpjs_ketenagakerjaan`, `bpjs_kesehatan`.
  - **Pribadi & Demografi**: `gender`, `place_of_birth`, `date_of_birth`, `religion`, `blood_type`, `marital_status`.
  - **Kontak & Domisili**: `phone`, `emergency_contact_name`, `emergency_contact_phone`, `emergency_contact_relation`, `address_ktp`, `address_current`, `postal_code`, `city`, `province`.
  - **Pendidikan & Bank**: `last_education`, `major`, `institution`, `bank_name`, `bank_account_number`, `bank_account_holder`.
  - **Status Kelengkapan**: `is_completed` (BOOLEAN DEFAULT false), `completed_at` (TIMESTAMPTZ).
• **Alur Pengisian Pasca-Login**:
  - Saat karyawan didaftarkan oleh HR, baris awal biodata langsung dibuat dengan status `is_completed: false`.
  - Ketika karyawan masuk (*login*) ke portal, mereka membuka tab **Biodata Karyawan** pada halaman Profil (`/profile`) untuk melengkapi data kependudukan, nomor BPJS, kontak darurat, dan rekening gaji.
  - Endpoint `PUT /api/auth/biodata` memvalidasi input NIK 16 digit, menyimpan seluruh atribut, menandai `is_completed: true`, dan mencatat `completed_at`.

---

## § 10. Konfigurasi Jadwal Shift Berbasis Hari (Day-by-Day Shift Schedules)

Untuk mengakomodasi fleksibilitas operasional perusahaan di mana jam kerja bervariasi antar-hari dalam sepekan (misalnya hari Senin–Kamis pukul 08:00–17:00, Jumat pulang lebih awal pukul 08:00–16:30, Sabtu setengah hari atau libur, dan Minggu libur):

### 1. Skema Database Relasional `shift_schedules`
• **Tabel PostgreSQL**:
  ```sql
  CREATE TABLE IF NOT EXISTS "shift_schedules" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "shift_id" uuid NOT NULL REFERENCES "shifts"("id") ON DELETE CASCADE,
    "day_of_week" integer NOT NULL, -- 1: Senin, 2: Selasa, 3: Rabu, 4: Kamis, 5: Jumat, 6: Sabtu, 7: Minggu
    "day_name" varchar(20) NOT NULL,
    "start_time" time,              -- Nullable saat is_off = true
    "end_time" time,                -- Nullable saat is_off = true
    "is_off" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  );
  CREATE INDEX IF NOT EXISTS "idx_shift_schedules_shift_id" ON "shift_schedules" ("shift_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "uq_shift_schedules_shift_day" ON "shift_schedules" ("shift_id", "day_of_week");
  ```
• **Kompatibilitas Mundur (*Backward Compatibility*)**:
  Kolom `startTime` dan `endTime` pada tabel induk `shifts` tetap dipertahankan dan otomatis disinkronisasi ke jam kerja hari aktif pertama (misal hari Senin). Hal ini memastikan referensi ringkas pada profil staf, badge karyawan, dan tabel lama tetap bekerja tanpa *breaking changes*.

### 2. Mikroservis Shifting (`services/shifting`)
• **Validasi Input Jadwal Harian (`validateShiftInput`)**:
  - Memeriksa array `schedules` 7 hari (Senin s/d Minggu).
  - Untuk hari aktif (`isOff: false`), memvalidasi format jam `HH:mm` dan memastikan jam mulai tidak sama dengan jam selesai.
  - Untuk hari libur (`isOff: true`), jam mulai dan selesai di-reset menjadi `null`.
  - Memastikan minimal ada 1 hari kerja aktif dalam sepekan.
• **Penyimpanan Transaksional**:
  - `POST /shifts`: Menyimpan entitas shift induk, titik geofence absensi, dan 7 baris jadwal harian ke `shift_schedules` dalam 1 transaksi DB ACID.
  - `PUT /shifts/:id`: Memperbarui induk shift, merefresh titik geofence, menghapus jadwal lama, dan menyisipkan jadwal harian terbaru.
• **Relasi Baca (`attachAttendance`)**:
  - Melakukan query paralel ke `shift_schedules` yang diurutkan berdasarkan `day_of_week ASC` dan mengaitkannya ke respons shift sebagai array `schedules`.
• **Verifikasi Absensi Berbasis Hari (`POST /shifts/:id/verify-attendance`)**:
  - Mendeteksi hari saat absensi dilakukan (`new Date().getDay()`).
  - Jika hari tersebut ditandai sebagai hari libur operasional (`isOff: true`), endpoint mengembalikan `verified: false` dengan pesan informatif: `Hari ini (<Nama Hari>) adalah hari libur (Day Off) yang terjadwal untuk shift ini.`
  - Jika hari aktif, sistem memverifikasi geofence pengguna (point radius / poligon) dan menyertakan jadwal spesifik hari berjalan pada atribut `todaySchedule`.

### 3. Antarmuka Pengguna Frontend Web (`apps/web/src/routes/shifts.tsx`)
• **Langkah 1 Wizard (Jadwal Operasional Harian)**:
  - Komponen matriks editor jadwal 7 hari (Senin s/d Minggu) dengan status badge `Kerja` atau `Libur`.
  - Tombol sakelar (*switch*) mandiri: `Masuk` / `Libur` per hari.
  - Input jam mulai dan jam selesai per hari dengan kalkulator durasi instan (misal `9 jam`, `8 jam 30 mnt`) serta deteksi shift lintas hari (*overnight*).
  - Toolbar preset otomatis:
    - `Sen–Jum`: Mengatur Senin s/d Jumat masuk, Sabtu & Minggu libur.
    - `Sen–Sab`: Mengatur Senin s/d Sabtu masuk, Minggu libur.
    - `7 Hari`: Mengatur seluruh 7 hari masuk kerja.
    - `Samakan Jam`: Menyalin jam kerja hari aktif pertama ke seluruh hari kerja aktif.
  - Indikator metrik mingguan: menampilkan total jam kerja mingguan dan perbandingan hari aktif vs hari libur.
• **Langkah 3 Wizard (Rekapitulasi)**:
  - Kartu ringkasan jadwal kerja 7 hari menampilkan rincian jam kerja, durasi per hari, status libur, dan total akumulasi jam kerja mingguan sebelum tombol simpan ditekan.
• **Tabel Master Shift**:
  - Kolom "Jam kerja" dilengkapi deretan chip hari (`Sen`, `Sel`, `Rab`, `Kam`, `Jum`, `Sab`, `Min`).
  - Hari kerja aktif disorot dengan warna primer dan jam operasionalnya saat dihover.
  - Hari libur ditampilkan coret (*strikethrough*) dengan gaya visual muted.
  - Dilengkapi label `• Jam berbeda per hari` jika shift memiliki jam operasional yang bervariasi antar-hari.

---

## § 11. Otomatisasi Kode Shift & Eliminasi Input Redundan (Streamlined Shift Creation)

Untuk memangkas friksi dan mempercepat pembuatan master shift (*anti-slop*), sistem disederhanakan dengan mengeliminasi ketergantungan manual terhadap kantor acuan dan mengotomatiskan pembuatan kode shift:

### 1. Eliminasi Ketergantungan Kolom `work_location_id`
• **Database PostgreSQL & Drizzle Schema**:
  - Kolom `shifts.work_location_id` diubah menjadi *nullable* dengan referensi `ON DELETE SET NULL`.
  - Shift tidak lagi terkunci secara kaku pada satu kantor acuan tertentu karena titik absensi presensi sesungguhnya ditentukan langsung pada peta interaktif Leaflet di Langkah 2 (*shift_attendance_locations*).
• **Mikroservis Shifting (`services/shifting/src/routes/shifts.ts`)**:
  - `workLocationId` bersifat opsional pada payload HTTP `POST /shifts` dan `PUT /shifts/:id`.
  - Jika tidak disertakan, sistem secara cerdas menghubungkannya ke lokasi utama perusahaan jika tersedia, atau membiarkannya `null`.
  - Query daftar shift (`listShiftRows`) menggunakan `LEFT JOIN company_locations` sehingga shift tanpa kantor acuan tetap tampil konsisten.

### 2. Otomatisasi Kode Shift (`generateAutoShiftCode`)
• **Algoritma Pembuat Kode**:
  - Nama satu kata (misal `Operasional`) → `SHF-OPERASIO`.
  - Nama multi-kata berawalan Shift (misal `Shift Pagi`) → `SHF-PAGI`, `Shift Malam Gudang` → `SHF-MALAMGU`.
  - Nama umum majemuk (misal `Reguler Full Time`) → `SHF-RFT`.
• Kode shift digenerate secara instan saat pengguna mengetik nama master shift pada frontend dan divalidasi dengan fallback otomatis pada backend.

### 3. Pembersihan Antarmuka (*Frictionless Wizard Form*)
• **Langkah 1 Dialog Buat Shift**:
  - Menghapus input manual `Kode shift` dan pemilih dropdown `Kantor acuan operasional`.
  - Pengguna hanya memasukkan `Nama master shift` (kode terbuat otomatis dan ditampilkan sebagai badge indikator), `Jadwal Jam Kerja Harian (7 Hari)`, dan catatan/karyawan opsional.
  - Menghilangkan dropdown `Status shift` pada dialog buat baru (otomatis berstatus `active`).
• **Langkah 3 Dialog Wizard**:
  - Kartu ringkasan disesuaikan menjadi `Penugasan & Geofence` yang menyajikan jumlah karyawan bertugas dan total titik geofence presensi tanpa atribut kantor acuan yang redundan.
• **Tabel Master Shift**:
  - Kolom diubah menjadi `Area operasional` dengan penyajian cerdas berbasis nama kantor acuan, kota geofence presensi, atau entitas operasional perusahaan.
• **Aksesibilitas Pembuatan**:
  - Tombol "Buat Shift" dapat langsung diakses segera setelah entitas perusahaan dipilih (`canCreate = Boolean(selectedCompanyId)`), tanpa harus menunggu unit kantor terdaftar.

---

## § 12. Pembaruan Sinkronisasi Biodata Karyawan & Dialog Inspeksi HR

Untuk memastikan seluruh data kepegawaian memenuhi standar kelengkapan administrasi, BPJS, perpajakan, dan payroll, sistem telah dilengkapi dengan sinkronisasi biodata terpadu:

### 1. Inisialisasi & Sinkronisasi Biodata Karyawan Lengkap
• **Database PostgreSQL (`biodata` table)**:
  - Seluruh pengguna terdaftar (`budi.santoso@srikaya.id`, `siti.rahma@srikaya.id`, `ahmad.fauzi@srikaya.id`, dan `admin@srikaya.id`) telah disinkronisasi dengan biodata lengkap: NIK 16 digit, No. KK, NPWP, BPJS Ketenagakerjaan, BPJS Kesehatan, demografi (tempat/tanggal lahir, agama, golongan darah, status pernikahan), kontak darurat, alamat KTP, alamat domisili, pendidikan terakhir, dan nomor rekening bank payroll.
  - Status `is_completed` diset `true` dan `completed_at` tercatat otomatis.
• **Otomatisasi Seeding Bawaan (`services/auth/src/index.ts`)**:
  - Fungsi `seedDefaultData()` diperkaya dengan `DEFAULT_BIODATA_MAP` sehingga akun awal atau akun yang belum lengkap otomatis terisi data valid saat servis dijalankan.
• **Script Sinkronisasi Mandiri (`services/auth/src/scripts/seedBiodata.ts`)**:
  - Disediakan script mandiri untuk inspeksi dan sinkronisasi biodata cepat via `bun run services/auth/src/scripts/seedBiodata.ts`.

### 2. Dialog Inspeksi Rincian Biodata Karyawan pada Antarmuka HR
• **Halaman Manajemen Karyawan (`apps/web/src/routes/employees.tsx`)**:
  - Kolom **Biodata & Mail**: Badge status (`Lengkap ✓` / `Belum Diisi ○`) kini bersifat interaktif dan dapat diklik untuk membuka dialog rincian lengkap biodata karyawan.
  - Kolom **Aksi**: Ditambahkan tombol aksi inspeksi biodata (`HiOutlineIdentification`) untuk akses cepat.
  - **Dialog Rincian Biodata**:
    - **Header Profil**: Menampilkan avatar inisial, nama, surel, posisi, departemen, dan badge status kelengkapan serta tanggal verifikasi.
    - **§ 1 Kependudukan & Pajak**: Menampilkan NIK (16 digit), No. KK, NPWP, BPJS Ketenagakerjaan, dan BPJS Kesehatan.
    - **§ 2 Pribadi & Demografi**: Menampilkan jenis kelamin, golongan darah, tempat & tanggal lahir, agama, dan status pernikahan.
    - **§ 3 Kontak & Domisili**: Menampilkan nomor telepon/seluler, alamat KTP, alamat domisili sekarang, kota/provinsi/kodepos, dan kontak darurat (nama, relasi, nomor HP).
    - **§ 4 Pendidikan & Payroll**: Menampilkan jenjang pendidikan & jurusan, institusi, nama bank payroll, nomor rekening, dan nama pemilik rekening.

---

## § 13. Pembaruan Penugasan Karyawan Shift: Search Form & Kartu Status Interaktif

Untuk meningkatkan kemudahan dan fleksibilitas manajer HR dalam mengelola alokasi shift karyawan (*frictionless UX*), antarmuka penugasan karyawan pada dialog **Ubah Master Shift** (dan dialog **Buat Shift**) telah diperbarui menjadi selektor interaktif modern:

### 1. Form Pencarian & Filter Cepat (*Search & Filter Pills*)
• **Input Pencarian**: Menyediakan input teks pencarian cepat berbasis nama karyawan, surel, jabatan, kode/nama departemen, maupun nama shift saat ini dengan tombol pembersih instan (`✕`).
• **Pill Kategori Real-Time**:
  - `Semua (N)`: Menampilkan seluruh karyawan aktif.
  - `Shift Ini (N)`: Menampilkan karyawan yang sedang ditugaskan pada shift yang sedang diedit.
  - `Shift Lain (N)`: Menampilkan karyawan yang saat ini terdaftar pada master shift lain.
  - `Tanpa Shift (N)`: Menampilkan karyawan yang belum memiliki penugasan shift apapun.
• **Aksi Massal (*Batch Toggle*)**: Tombol cepat untuk `Pilih Semua Hasil` atau `Lepas Semua Hasil` dari karyawan yang sedang tampil pada filter/pencarian aktif.
• **Indikator Live Counter**: Badge indikator hidup yang menyajikan jumlah karyawan yang dipilih berbanding total karyawan perusahaan.

### 2. Kartu Interaktif Berstatus Hijau & Transisi Shift Real-Time
• **Visualisasi Aktif Hijau**:
  - Saat kartu karyawan diklik/dipilih, seluruh kartu bertransformasi dengan styling hijau cerah (`border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40 shadow-xs`).
  - Avatar inisial berubah menjadi warna emerald tebal dengan indikator centang hijau `✓`.
• **Status Transisi Shift Otomatis**:
  - **Pindah Shift**: Jika karyawan sebelumnya telah bertugas di shift lain (misal "Shift Reguler"), status otomatis menampilkan badge transisi: `Pindah: ~Shift Reguler~ → Shift Ini ✓`.
  - **Tetap di Shift Ini**: Jika karyawan memang sudah berada di shift ini sejak awal: `Tetap ditugaskan di shift ini ✓`.
  - **Baru Ditugaskan**: Jika karyawan belum memiliki shift sebelumnya: `Ditugaskan ke shift ini ✓`.
  - **Akan Dilepas**: Jika karyawan yang sebelumnya berada di shift ini di-uncheck: `○ Akan dilepas dari shift ini` (badge peringatan amber halus).
  - **Shift Lain / Tanpa Shift**: Saat kartu tidak dipilih, badge menampilkan shift aktif mereka saat ini secara informatif.

---

## § 14. Integrasi Kalender Kerja & Hari Libur Nasional 2026 pada Dasbor

Halaman utama Dasbor (`apps/web/src/routes/dashboard.tsx`) kini telah dilengkapi dengan modul kalender operasional interaktif tahun 2026 (`apps/web/src/components/dashboard/HolidayCalendar2026.tsx`) yang terhubung langsung dengan API resmi Hari Libur Indonesia:

### 1. Sinkronisasi API Eksternal (`https://tanggalmerah.upset.dev/api/holidays?year=2026`)
• **Live Integration**: Kalender secara otomatis mengambil data hari libur nasional dan cuti bersama resmi Pemerintah RI tahun 2026 saat halaman dasbor dimuat.
• **High Availability & Fallback**: Dilengkapi dengan dataset bawaan lengkap 25 hari libur resmi 2026 (SKB 3 Menteri) sebagai *fallback cache* sehingga kalender tetap berfungsi 100% cepat dan akurat saat luring (*offline*).
• **Indikator Status Sambungan**: Menampilkan badge live connection `API Terhubung ✓` beserta tombol segarkan data (`HiOutlineRefresh`).

### 2. Desain Minimalis & Penandaan Hari Libur (*Minimalist Architecture*)
• **Desain Bersih & Elegan (*Anti-Slop*)**:
  - Mengeliminasi elemen berlebih (*visual clutter*), seperti kartu statistik redundan dan kolom pencarian panjang, menjadi widget kalender ringkas yang proporsional.
  - Ditempatkan secara natural di bilah samping dasbor (*sidebar panel*) mendampingi ringkasan cakupan organisasi.
• **Grid Matriks 7 Hari Ringkas**:
  - Penandaan hari libur nasional (`type: 'holiday'`) dengan dot merah `●` di bawah angka tanggal dan aksen teks rose.
  - Penandaan cuti bersama (`type: 'leave'`) dengan dot amber `●` dan aksen teks amber.
  - Penandaan tanggal hari ini (`today`) dengan border primer dan latar lembut.
  - Tanggal yang dipilih disorot dengan styling kontras tegas (`bg-ink text-surface font-bold`).
• **Navigasi & Rincian Tanggal Satu Baris**:
  - Navigasi bulan ringkas (`<` Bulan Tahun `>`) dengan tombol cepat "Hari Ini".
  - Baris informasi dinamis menampilkan status tanggal yang diklik (`Hari Kerja Efektif` atau nama hari libur nasional/cuti bersama).
  - Ringkasan libur bulan aktif ditampilkan secara ringkas di bagian bawah panel kalender.

### 3. Pembersihan Status Chrome & Tombol Refresh (*Modern Aesthetic Polish*)
• **Header Aplikasi (`apps/web/src/layouts/AppLayout.tsx`)**:
  - Menghilangkan tombol/badge status konektivitas `Gateway terhubung` di sebelah ikon tema, memberikan tampilan bilah navigasi atas yang tenang dan bersih.
• **Halaman Dasbor (`apps/web/src/routes/dashboard.tsx`)**:
  - Menghilangkan tombol manual `Muat ulang` pada `PageHeader` dasbor; pembaruan data berjalan otomatis saat transisi halaman tanpa friksi manual.
• **Panel Kalender (`apps/web/src/components/dashboard/HolidayCalendar2026.tsx`)**:
  - Menghilangkan badge `● Live` dan ikon tombol refresh pada header kalender, menjaga tampilan tetap minimalis dan fokus pada konten jadwal kerja.

---

## § 15. Halaman Postingan Berita & Pengumuman Bergaya X (Twitter) & Instagram

Telah dibangun modul lengkap halaman publikasi dan interaksi sosial linimasa perusahaan (`apps/web/src/routes/posts.tsx`) dengan endpoint backend PostgreSQL (`services/auth/src/routes/posts.ts`):

### 1. Desain Linimasa Modern (*Anti-Slop X / Twitter & Instagram Style*)
• **Komposer Postingan Fleksibel**:
  - Input teks dinamis ("Ada berita, jadwal operasional, atau edaran penting apa hari ini?") yang otomatis membesar saat difokuskan.
  - Bidang opsional judul berita/edaran dengan tipografi tajam dan berbobot.
  - Pemilih kategori instan (Pengumuman Resmi, Berita Internal, Operasional & Shift, Prestasi Tim, Umum).
  - Unggah foto/gambar langsung dari komputer/perangkat (terkompresi WebP via `storage-service`) atau sematkan tautan URL web, dilengkapi kartu pratinjau dan opsi hapus gambar.
  - Opsi sematkan pengumuman prioritas (*pin to top*) khusus untuk pengguna bertingkat admin atau HR.
  - Indikator penghitung karakter dan tombol kirim dengan transisi halus.
• **Feed Kartu Postingan Elegan**:
  - **Banner Disematkan**: Menampilkan penanda prioritas amber `★ Pengumuman Prioritas · Disematkan oleh Manajemen` untuk edaran wajib.
  - **Identitas Penulis**: Avatar foto/inisial bulat, nama tebal, badge terverifikasi `✓` (untuk admin/HR), jabatan, divisi perusahaan, penanda waktu relatif (*relative time*: "Baru saja", "15 mnt lalu", "2 jam lalu", "Kemarin"), dan badge kategori.
  - **Tipografi Bersih**: Judul terstruktur jelas dan konten paragraf menjaga kerapian jarak baris.
  - **Tampilan Media Bergaya Instagram / X**: Pratinjau gambar terlampir dengan rasio proporsional, sudut membulat, dan fitur perbesaran dialog modal gambar penuh (*full zoom*) saat diklik.
  - **Bar Interaksi Sosial Terpadu**:
    - Tombol Suka / Hati (`♥` / `♡`) dengan pembaruan instan (*optimistic UI*) dan penghitung live.
    - Tombol Komentar (`HiOutlineChatAlt2`) dengan penghitung komentar yang membuka thread diskusi.
    - Tombol Bagikan (`HiOutlineShare`) yang menyalin tautan jangkar postingan langsung ke papan klip (*clipboard*) disertai notifikasi konfirmasi `✓ Tersalin`.
    - Tombol Hapus Postingan (`HiOutlineTrash`) dengan konfirmasi dialog, khusus untuk pembuat postingan atau admin.
• **Thread Komentar Interaktif (*Inline Comments*)**:
  - Menampilkan daftar tanggapan terdahulu dengan avatar, nama pembuat komentar, label peran, dan waktu relatif.
  - Formulir kirim komentar cepat dengan tombol kirim `HiOutlinePaperAirplane`.
• **Filter & Pencarian Real-time**:
  - Filter kategori berbentuk tombol pil (*pills*): `Semua Postingan`, `Pengumuman Resmi`, `Berita Internal`, `Operasional & Shift`, `Prestasi Tim`, `Umum & Diskusi`.
  - Bilah pencarian instan untuk mencari kata kunci isi, judul, maupun nama penulis berita.

### 2. Arsitektur Basis Data & Backend Microservice
• **Tabel PostgreSQL**:
  - `posts`: Menyimpan `company_id`, `author_id`, `title`, `content`, `category`, `media_urls` (JSONB array), `is_pinned`, `likes_count`, `liked_user_ids` (JSONB array), `comments_count`, `created_at`, `updated_at`.
  - `post_comments`: Menyimpan `post_id` (foreign key berjenjang `onDelete: cascade`), `author_id`, `content`, `created_at`, `updated_at`.
• **API Endpoints (`services/auth/src/routes/posts.ts`)**:
  - `GET /api/posts`: Mengambil feed linimasa lengkap dengan relasi `author`, `department`, penghitung like, status `isLiked` per sesi aktif, dan komentar terurut.
  - `POST /api/posts`: Validasi JWT dan pembuatan postingan baru.
  - `POST /api/posts/:id/like`: Mengaktifkan/menonaktifkan (toggle) like pengguna dan menyesuaikan `likes_count`.
  - `POST /api/posts/:id/comments`: Menambahkan komentar baru dan menaikkan `comments_count`.
  - `DELETE /api/posts/:id`: Menghapus postingan beserta seluruh relasi komentar (otorisasi author atau admin).

---

## § 16. Penegakan Isolasi Multi-Tenant & Halaman Skala Sub-User (Zero Cross-Tenant Data Leak)

Telah diimplementasikan arsitektur proteksi multi-tenant penuh di seluruh mikroservis backend (`auth-service` dan `shifting-service`) serta antarmuka web khusus **Skala Sub-User & Isolasi Perusahaan** (`apps/web/src/routes/sub-users.tsx`):

### 1. Penegakan Batas Multi-Tenant Backend (*Tenant Boundary Isolation*)
• **Resolusi Otomatis Sub-User via JWT**:
  - Token JWT kini menyertakan `companyId` resmi pengguna.
  - Setiap permintaan API divalidasi silang terhadap identitas `companyId` pengguna aktif melalui utilitas [`tenant.ts`](file:///c:/project/services/auth/src/utils/tenant.ts).
• **Pencegahan Kebocoran Data Lintas Perusahaan (*Cross-Tenant Leak Prevention*)**:
  - **Profil Badan Usaha (`/companies`)**: Sub-user hanya diizinkan melihat data perusahaannya sendiri. Percobaan membaca, mengubah, atau menghapus profil perusahaan lain ditolak dengan respons status **`403 Forbidden`**.
  - **Departemen Organisasi (`/departments`)**: Permintaan daftar departemen secara otomatis dikunci pada `departments.companyId === user.companyId`. Jika klien mengirimkan kueri `companyId` milik perusahaan lain, sistem mengembalikan **`403 Forbidden`**.
  - **Data Karyawan & Biodata (`/employees`)**: Sub-user Perusahaan A tidak dapat membaca atau memodifikasi karyawan Perusahaan B. Akses diblokir dengan **`403 Forbidden`**.
  - **Shift Kerja & Geofence Titik Presensi (`/shifts`)**: Jadwal kerja, jam operasional harian, dan perimeter koordinat presensi dikunci ketat per `companyId`. Usaha akses lintas entitas menghasilkan **`403 Forbidden`**.
  - **Feed Postingan & Pengumuman (`/posts`)**: Linimasa kabar perusahaan hanya menampilkan edaran internal milik perusahaan bersangkutan.

### 2. Modul Skala Sub-User & Audit Penetrasi Interaktif (`/sub-users`)
• **Kartu Lingkup Batas Tenant (*Tenant Boundary Scope Card*)**:
  - Menampilkan profil perusahaan aktif, kode badan usaha, jumlah sub-user yang terikat, serta status perlindungan *Zero Cross-Tenant Leak Active*.
• **Audit Penetrasi & Simulasi Isolasi Antar-Perusahaan (*Interactive Cross-Tenant Audit Tool*)**:
  - Panel interaktif yang memungkinkan admin perusahaan memilih badan usaha pembanding (misal: PT Nusantara Logistik Prima vs PT Srikaya Digital Solusindo).
  - Melakukan simulasi pengujian penetrasi 4 titik rawan data secara *real-time* melalui endpoint backend `POST /api/sub-users/test-isolation`:
    1. *Uji Akses Profil Badan Usaha* -> `403 Forbidden (Terisolasi Aman ✓)`
    2. *Uji Akses Departemen Organisasi* -> `403 Forbidden (Terisolasi Aman ✓)`
    3. *Uji Akses Data Karyawan & Biodata* -> `403 Forbidden (Terisolasi Aman ✓)`
    4. *Uji Akses Jam Kerja & Shift Geofence* -> `403 Forbidden (Terisolasi Aman ✓)`
  - Menampilkan putusan keamanan definitif (*security verdict*) bahwa batas organisasi terisolasi 100%.
• **Tata Kelola Akun Sub-User**:
  - Tabel daftar sub-user lengkap dengan filter peran (*Admin Perusahaan*, *Sub-User / Anggota*) dan pencarian cepat.
  - Formulir pendaftaran sub-user baru yang secara otomatis mengunci `companyId` pada perusahaan aktif.
  - Dialog perubahan peran, departemen, dan reset kata sandi sub-user.
  - Dialog konfirmasi pencabutan hak akses sub-user.

---

## § 17. Manifest Kubernetes & Visualisasi Topologi Arsitektur Sistem

Telah dibuat paket manifest deklaratif Kubernetes (`k8s/`) yang merefleksikan seluruh arsitektur monorepo mikroservis dan relasi datanya secara presisi untuk diinspeksi pada **Kubernetes Visualizer** (Lens, Monokle, Octant, K9s, atau web visualizer):

### 1. Rincian Sumber Daya Deklaratif (`k8s/`)
• **Namespace (`00-namespace.yaml`)**:
  - `srikaya-system` dengan label standar `app.kubernetes.io/part-of: srikaya-platform`.
• **Konfigurasi & Rahasia (`01-configmap-secret.yaml`)**:
  - `ConfigMap srikaya-config`: Konfigurasi port (3000, 3001, 3002, 3003), URL komunikasi internal, dan direktori penyimpanan bersama.
  - `Secret srikaya-secret`: Kredensial PostgreSQL 16 dan kunci JWT HMAC-SHA256.
• **Penyimpanan Persisten (`02-storage-pvc.yaml`)**:
  - `PersistentVolumeClaim srikaya-media-pvc` (20Gi, ReadWriteMany) untuk sinkronisasi berkas media WebP antara `storage-service` dan `gateway-service`.
  - `PersistentVolumeClaim srikaya-postgres-pvc` (10Gi, ReadWriteOnce) untuk persistensi data relasional database.
• **Basis Data Stateful (`03-postgres.yaml`)**:
  - `StatefulSet postgres` (PostgreSQL 16) dengan health probe `pg_isready` dan Service ClusterIP `postgres-service:5432`.
• **Mikroservis Backend Bun & ElysiaJS (`04-auth-service.yaml`, `05-shifting-service.yaml`, `06-storage-service.yaml`, `07-gateway-service.yaml`)**:
  - Setiap servis memiliki Deployment ber-replika 2, strategi *RollingUpdate*, alokasi sumber daya (*CPU/Memory requests & limits*), serta probe liveness/readiness.
  - `gateway-service` bertindak sebagai reverse proxy dan aggregator mikroservis (Port 3000).
• **Klien Web SPA (`08-web-client.yaml`)**:
  - Deployment klien antarmuka React 19 (Port 80) ber-replika 2 dengan Service ClusterIP `web-client`.
• **Gerbang Ingress (`09-ingress.yaml`)**:
  - Router Ingress mengarahkan jalur `/api` dan `/storage` ke `gateway-service:3000`, serta jalur `/` ke `web-client:80`.
• **Kebijakan Jaringan Zero-Trust (`10-network-policy.yaml`)**:
  - Merender garis graf koneksi keamanan visual: Ingress hanya dapat menghubungi Gateway & Web Client; Gateway menghubungi Auth, Shifting, Storage; hanya Auth & Shifting yang diizinkan mengakses port 5432 PostgreSQL.
• **Skalabilitas Otomatis (`11-hpa.yaml`)**:
  - HorizontalPodAutoscaler (HPA) untuk Gateway, Auth, Shifting, dan Web Client berdasarkan metrik utilisasi CPU dan memori.
• **Berkas Gabungan Siap Visualizer (`k8s/srikaya-all-in-one.yaml`)**:
  - Berkas tunggal berisi 25 spesifikasi sumber daya lengkap untuk langsung diimpor atau di-drag-and-drop ke Kubernetes Visualizer.

---

## § 18. Panduan Perintah Operasional

```powershell
# 1. Menjalankan seluruh ekosistem (AUTH, SHIFTING, STORAGE, GATEWAY, CLIENT):
bun run dev

# 2. Menjalankan mikroservis spesifik secara mandiri:
bun run --cwd services/auth src/index.ts       # Port 3001
bun run --cwd services/shifting src/index.ts   # Port 3003
bun run --cwd services/storage src/index.ts    # Port 3002
bun run --cwd services/gateway src/index.ts    # Port 3000

# 3. Menjalankan pengujian otomatis isolasi multi-tenant:
bun run services/auth/src/scripts/testIsolation.ts

# 4. Menerapkan manifest Kubernetes ke klaster (atau periksa via visualizer):
kubectl apply -f k8s/srikaya-all-in-one.yaml

# 5. Kompilasi & validasi tipe frontend:
npm --prefix apps/web run build

# 6. Menjalankan pengujian aplikasi mobile Flutter:
cd flutter ; flutter test -r expanded
```

---

## § 19. Aplikasi Mobile Flutter Independen untuk Pengujian (Login & Welcome)

Telah dibangun modul aplikasi Flutter mandiri pada direktori [`flutter/`](file:///c:/project/flutter) yang terisolasi khusus untuk pengujian antarmuka mobile, alur masuk pengguna (*login*), dan sambutan (*welcome onboarding*):

### 1. Struktur & Komponen Mandiri (`flutter/lib`)
• **Layar Sambutan (`lib/screens/welcome_screen.dart`)**:
  - Menampilkan branding resmi Srikaya Platform dengan tema Material 3 modern berskema warna slate-900 dan aksen emerald.
  - Kartu pengenalan fitur utama: Isolasi Multi-Tenant, Manajemen Shift Kerja, dan Bebas Dependensi.
  - Tombol aksi navigasi: `Masuk ke Akun →` serta `Mulai Cepat (Mode Tamu / Sandbox)`.
• **Layar Autentikasi (`lib/screens/login_screen.dart`)**:
  - Pilihan cepat kredensial uji coba (*quick autofill chips*): Admin Srikaya, HRD Nusantara, dan Staff Srikaya.
  - Validasi formulir email, password (dengan toggle visibilitas), dan Tenant ID.
  - Sakelar *Mode Pengujian Independen* (Mock Mode): dapat dijalankan 100% mandiri tanpa backend, atau dimatikan untuk mengirim permintaan langsung ke API Gateway (`http://localhost:3000/api/auth/login`).
• **Dasbor Sambutan Pengguna (`lib/screens/home_screen.dart`)**:
  - Menampilkan sesi aktif, nama pengguna, peran (*ADMIN/HRD/STAFF/GUEST*), dan ID Perusahaan (*CID*).
  - Simulasi interaktif pencatatan presensi masuk shift harian.
  - Alat uji validasi isolasi multi-tenant dengan simulasi penolakan akses lintas-organisasi.
• **Layanan & Tema (`lib/services/auth_service.dart`, `lib/theme/app_theme.dart`)**:
  - Arsitektur singleton autentikasi dengan simulasi latensi dan penanganan error terstruktur.
  - Desain responsif bebas dari resiko *RenderFlex overflow* pada berbagai resolusi layar ponsel.

### 2. Hasil Verifikasi Pengujian Otomatis (`flutter/test/widget_test.dart`)
• 4/4 pengujian widget lolos 100% via `flutter test -r expanded`:
  1. `✓ Welcome screen renders properly with branding and CTAs`
  2. `✓ Navigates to Login screen on tapping Masuk ke Akun`
  3. `✓ Performs mock authentication and enters Home Dashboard`
  4. `✓ Guest sandbox mode navigates directly to Home Dashboard`
• `flutter analyze` tervalidasi bersih tanpa peringatan (*0 issues found*).

---

## § 20. Sistem Absensi Karyawan dengan Status Fleksibel HRD

Presensi kini memiliki tabelnya sendiri di `services/shifting`, terpisah dari konfigurasi shift. Seluruh kejadian presensi disimpan pada satu tabel, sedangkan daftar statusnya disusun bebas oleh HRD lewat tabel master.

### 1. Skema Basis Data (`services/shifting/src/db/schema.ts`)
• **`attendance_statuses`** — master status milik tiap perusahaan: `code` (unik per perusahaan), `name`, `description`, `color`, tiga flag perilaku `is_present` / `is_paid` / `is_absent`, penanda `is_system`, `sort_order`, dan `status` aktif/nonaktif. Unique index `(company_id, code)`.
• **`attendances`** — satu baris per karyawan per tanggal kerja. Unique index `(employee_id, attendance_date)` menutup kemungkinan presensi ganda. Kolom waktu `check_in_at` / `check_out_at`, koordinat masuk dan pulang `numeric(10,7)`, `attendance_location_id`, `check_in_distance_meters`, `late_minutes`, `work_minutes`, `source` (`auto` / `clock_in` / `manual`), `note`, dan `timezone`.
• Integritas: `status_id` memakai `ON DELETE RESTRICT` (status terpakai tidak bisa dihapus), sedangkan `shift_id` dan `attendance_location_id` memakai `SET NULL` agar riwayat presensi tetap utuh ketika master shift atau titik geofence dihapus.
• Relasi Drizzle `attendanceStatusRelations` dan `attendanceRelations` beserta tipe inferensi `Attendance`, `NewAttendance`, `AttendanceStatus`, `NewAttendanceStatus`.

### 2. Migrasi & Seeder
• Berkas baru `services/shifting/src/db/migrate_attendance.ts` mengikuti pola idempotent `migrate_schedules.ts`: `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS`, tanpa query builder. Perintah: `bun run services/shifting/src/db/migrate_attendance.ts`.
• Tujuh status bawaan pada `lib/attendance-status-defaults.ts`: `unfilled` (Belum Diisi), `hadir`, `dinas`, `izin`, `sakit`, `cuti`, dan `alpa`.
• `unfilled` sengaja tidak berstatus hadir maupun alpa. Hasil generate tidak boleh menebak "Alpa", karena tebakan itu berisiko memotong gaji karyawan yang sebenarnya masuk.
• `ensureAttendanceStatuses()` dipanggil sekali saat boot di `services/shifting/src/index.ts`, dibungkus `try/catch`, sehingga perusahaan tanpa status langsung terisi tanpa menggandakan data yang sudah ada.

### 3. Ekstraksi Helper Geofence (`services/shifting/src/lib/geofence.ts`)
• `haversineDistanceMeters` dan `isInsidePolygon` dipindahkan dari `routes/shifts.ts` agar presensi dan `verify-attendance` memakai perhitungan yang sama.
• Tambahan: `matchAttendanceLocation` (mengembalikan titik terdekat beserta deviasi meter), `resolveLocalDate`, `getLocalDayOfWeek`, `computeLateMinutes`, `computeWorkMinutes`, dan `isOvernightShift`.
• Perbaikan yang ikut terbawa: penentuan hari kerja tidak lagi memakai `new Date().getDay()` (jam server) melainkan tanggal lokal zona waktu perusahaan. Karyawan WITA yang presensi pukul 00:30 kini tercatat pada tanggal lokal yang benar.

### 4. Endpoint (`services/shifting/src/routes/attendance.ts`, prefix `/attendance`)
• **Master status** — `GET /statuses` (termasuk `usageCount`), `POST /statuses`, `PUT /statuses/:id`, `DELETE /statuses/:id`. Guard tulis hanya `admin` / `superadmin`. Penghapusan status bawaan atau status yang sudah dipakai ditolak `409` dengan arahan menonaktifkan. Perubahan yang membuat perusahaan kehilangan status hadir aktif terakhir juga ditolak `409`.
• **Presensi** — `GET /` (filter `companyId`, `month`, `employeeId`, `statusId`), `GET /today`, `GET /summary`, `POST /generate`, `POST /clock-in`, `POST /clock-out`, `PUT /:id` (override HRD).
• `POST /generate` melewati hari libur jadwal, tanggal masa depan, dan tanggal sebelum karyawan bergabung; idempotent via `ON CONFLICT (employee_id, attendance_date) DO NOTHING` dan mengembalikan `{ created, skipped, employees }`.
• `POST /clock-in` memverifikasi geofence dengan titik terdekat. Di luar seluruh radius/perimeter, respons `200 { verified: false, distanceMeters }` tanpa menulis apa pun. Di dalam radius, `check_in_at`, koordinat, titik presensi, dan `late_minutes` tersimpan; status `unfilled` otomatis berpindah ke status hadir aktif pertama menurut `sort_order`.
• `PUT /:id` mewajibkan `note` ketika status berubah, mengunci `statusId` ke perusahaan yang sama, menandai `source: 'manual'`, dan menghitung ulang `late_minutes` / `work_minutes` bila jam masuk atau pulang diubah.

### 5. Antarmuka Web
• Rute baru `/attendance` (`attendance.tsx`) dengan dua tab: **Rekap Presensi** dan **Status Absensi**.
• Komponen pada `apps/web/src/components/attendance/`: `AttendanceStatusBadge` (warna chip dari basis data dengan kontras teks terhitung), `AttendanceStatusMaster` (CRUD + pratinjau warna), `ClockInCard` (jam langsung per zona waktu, tombol masuk/pulang via `navigator.geolocation`, umpan balik `verified` dan deviasi meter), `AttendanceRecapTable`, dan `HrOverrideDialog` (status + catatan wajib + peringatan status alpa).
• `ClockInCard` disisipkan ke dasbor, dan item navigasi **Presensi** ditambahkan setelah **Shift**.

### 6. Hasil Verifikasi
• `npm --prefix apps/web run build` (termasuk `tsc -b` yang mengetik seluruh layanan lewat alias `gateway`) lolos tanpa galat.
• Uji endpoint langsung terhadap layanan shifting:
  1. `POST /generate` dua kali → `created: 8` lalu `created: 0` (idempotent).
  2. Clock-in di luar geofence → `verified: false`, deviasi 11.275.018 m, tidak ada baris berubah.
  3. Clock-in di dalam radius → `verified: true`, deviasi 0 m, status berpindah dari `unfilled` ke `hadir`, `source: clock_in`, `late_minutes` 383.
  4. Clock-in kedua di hari sama → `409`.
  5. Clock-out tanpa clock-in → `409`; clock-out normal mengisi `work_minutes`.
  6. Override status tanpa catatan → `400`; dengan catatan → `200`, `source: manual`, `note` tersimpan.
  7. Override jam masuk ke 08:15 → `late_minutes` dihitung ulang menjadi 15 menit dan `work_minutes` 368.
  8. Menghapus status bawaan → `409`; status buatan HRD dapat dibuat, diubah, dinonaktifkan, lalu dihapus.
  9. Warna bukan hex → `400`.
  10. Mematikan satu-satunya status hadir aktif → `409`.
  11. Member membuka rekap perusahaan lain → `403`.

---

## § 21. Penyambungan Login Bun ke Klien Web dan Aplikasi Flutter

Layanan auth sudah menjadi satu-satunya sumber kebenaran kredensial. Bagian ini menyambungkan kedua klien ke endpoint yang sama, `POST /api/auth/login` lewat gateway, tanpa jalur tiruan yang menyamar sebagai sesi sah.

### 1. Layanan Auth (`services/auth/src/index.ts`)
• Balasan `POST /auth/login` dan `GET /auth/me` kini menyertakan `companyName` dari tabel `companies`, sehingga klien web dan mobile tidak perlu permintaan tambahan hanya untuk menampilkan nama perusahaan.
• `toPublicUser()` menjadi asinkron dan dipakai seluruh endpoint profil serta avatar, sehingga bentuk balasan tetap seragam di delapan titik pemakaian.
• `companyId` tetap berasal dari rekaman pengguna, bukan dari isian klien. Kolom Tenant ID pada klien karena itu dihapus.

### 2. Klien Web (`apps/web`, `packages/shared-types`)
• `login.tsx` meneruskan `companyId` dan `companyName` hasil login ke `setAuth()`, sehingga sesi di `localStorage` (`srikaya_auth_session`) memuat identitas perusahaan, bukan hanya token.
• `userDtoSchema` pada `shared-types` menambah `companyName` opsional agar tipe sesi web sesuai dengan balasan layanan auth.
• Token tetap ditempel otomatis ke seluruh permintaan berikutnya oleh klien Eden Treaty melalui header `Authorization: Bearer`.

### 3. Aplikasi Flutter (`flutter/lib`)
• `UserSession.fromLoginResponse()` membaca bentuk balasan nyata `{ success, token, user: { ... } }`. Sebelumnya objek `user` tidak dibaca sehingga identitas pengguna jatuh ke nilai bawaan tebakan.
• `UserSession.normalizeRole()` memetakan peran basis data (`admin`, `superadmin`, `member`, `guest`) ke label tampilan (`ADMIN`, `SUPER ADMIN`, `STAFF`, `GUEST`). Akun contoh `hrd@nusantara.id` dan `staff@srikaya.id` yang tidak ada di basis data dihapus.
• `AuthService.login()` kini berjalan daring secara bawaan (`isMock: false`), mengirim `{ email, password }` tanpa `companyId`, dan membedakan kegagalan jaringan dari penolakan kredensial. Sebelumnya seluruh kesalahan dibungkus menjadi pesan "gagal terhubung".
• Alamat gateway mengikuti platform: `http://localhost:3000` untuk web/desktop, `http://10.0.2.2:3000` untuk emulator Android, dan dapat ditimpa lewat `--dart-define=API_BASE_URL=...`.
• `AuthService.authHeaders` menyediakan header Bearer untuk permintaan berikutnya, dan `isLiveSession` menandai apakah sesi berasal dari gateway atau dari mode luring.
• Layar login menampilkan kolom **URL Gateway (Bun)** sebagai pengganti kolom Tenant ID, tombol isi cepat memakai tiga akun yang benar-benar tersemai, dan sakelar mode luring dimatikan secara bawaan. `dispose()` pada tiga pengendali teks diperbaiki (sebelumnya hanya merujuk metodenya tanpa memanggil).

### 4. Hasil Verifikasi
• `POST /api/auth/login` lewat gateway → `200` dengan token JWT, `role: admin`, dan `companyName: PT Srikaya Digital Solusindo`; kata sandi salah → `401 "Kombinasi surel atau kata sandi salah"`.
• `GET /api/auth/me` dengan token hasil login → `200` beserta `companyName`.
• `flutter analyze` bersih, `flutter test` 12/12 lolos (termasuk pengujian pemetaan balasan login, normalisasi peran, header Bearer, dan isolasi tenant).
• Uji sementara langsung ke gateway dari sisi Flutter berhasil: sesi terbaca dengan peran `ADMIN`, ID perusahaan UUID, dan nama perusahaan terisi.
• `npm --prefix apps/web run build` lolos (`tsc -b` + vite, 704 modul).

---

## § 22. Perbaikan Runtime Crash React: Sanitasi Objek Tanggal pada Komponen Tampilan

### 1. Masalah & Akar Penyebab
• **Gejala**: Halaman web memicu galat React runtime:
  `Objects are not valid as a React child (found: [object Date]). If you meant to render a collection of children, use an array instead.`
• **Akar Masalah 1 (`apps/web/src/utils/attendance.ts`)**:
  Fungsi pembantu tampilan `formatDateLabel`, `formatDayName`, dan `monthLabel` sebelumnya mengevaluasi ekspresi `${value}T12:00:00Z`. Apabila `value` berupa objek `Date` asli (dari driver basis data atau serialisasi RPC), konversi string menghasilkan string tanggal tak valid yang memicu `Number.isNaN(date.getTime()) === true`. Jalur fallback sebelumnya menjalankan `return value`, yang mengembalikan objek `Date` mentah secara langsung ke pohon JSX pada `ClockInCard`, `AttendanceRecapTable`, dan `HrOverrideDialog`.
• **Akar Masalah 2 (`services/shifting/src/routes/attendance.ts`)**:
  Driver `postgres.js` mem-parsing kolom PostgreSQL `DATE` (OID 1082) dan `TIMESTAMP` (OID 1114/1184) menjadi objek `Date` JavaScript secara bawaan. Tanpa serialisasi eksplisit di handler layanan shifting, nilai `attendanceDate` berisiko dikirim sebagai instance `Date`.

### 2. Solusi & Normalisasi Tipe
• **`apps/web/src/utils/attendance.ts`**:
  - `formatDateLabel(value?: string | Date | null)`: Memeriksa `value instanceof Date`, parsing string ISO/format `YYYY-MM-DD`, dan selalu mengembalikan string terformat berbahasa Indonesia (`Rab, 11 Nov 2026`) atau tanda pisah `—`. Nilai balik tidak pernah berupa objek `Date`.
  - `formatDayName(value?: string | Date | null)`: Menangani `Date` maupun string secara defensif dan selalu mengembalikan string nama hari atau `—`.
  - `monthLabel(month?: string | Date | null)`: Menangani `Date` maupun string `YYYY-MM` secara defensif dan selalu mengembalikan nama bulan serta tahun.
• **`apps/web/src/components/dashboard/HolidayCalendar2026.tsx`**:
  - `formatShortDate(dateStr?: string | Date | null)`: Menerima masukan bertipe `string | Date | null | undefined`, menangani `Date` langsung atau memecah format tanggal tanpa risiko TypeError, dan mengembalikan string terformat aman.
• **`apps/web/src/routes/attendance.tsx`**:
  - `monthOptions(selected?: string | Date | null)`: Mengonversi masukan tanggal ke format `YYYY-MM` sebelum menghitung rentang 12 bulan pilihan.
• **`services/shifting/src/routes/attendance.ts`**:
  - Menambahkan pembantu `toIsoDateString` dan `toIsoTimestampString` pada pemetaan baris presensi (`listAttendanceRows`), memastikan data yang mengalir keluar dari gateway selalu bertipe teks string standar ISO (`YYYY-MM-DD` dan ISO 8601).

### 3. Hasil Verifikasi
• `npm --prefix apps/web run build` (`tsc -b && vite build`) lolos tanpa galat (704 modul tertransformasi, 0 tipe bermasalah).
• Pohon komponen React pada dasbor (`<ClockInCard />` dan `<HolidayCalendar2026 />`) serta rute `/attendance` aman dari rendering objek `Date` langsung.
