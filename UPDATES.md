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

## § 15. Panduan Perintah Operasional

```powershell
# 1. Menjalankan seluruh ekosistem (AUTH, SHIFTING, STORAGE, GATEWAY, CLIENT):
bun run dev

# 2. Menjalankan mikroservis spesifik secara mandiri:
bun run --cwd services/auth src/index.ts       # Port 3001
bun run --cwd services/shifting src/index.ts   # Port 3003
bun run --cwd services/storage src/index.ts    # Port 3002
bun run --cwd services/gateway src/index.ts    # Port 3000

# 3. Kompilasi & validasi tipe frontend:
npm --prefix apps/web run build
```

