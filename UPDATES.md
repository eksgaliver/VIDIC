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
• **Halaman Karyawan (`employees.tsx`)**:
  - Formulir penambahan & pengubahan karyawan dilengkapi pemilih shift kerja (`SelectField` Shift kerja).
  - Tabel karyawan menampilkan kolom shift kerja aktif dengan nama shift, kode badge, dan jam kerja.

---

## § 8. Panduan Perintah Operasional

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

