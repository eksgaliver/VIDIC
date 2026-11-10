# Srikaya Mobile (Testing & Standalone Environment)

Folder aplikasi Flutter ini merupakan modul independen yang dibuat khusus untuk pengujian antarmuka mobile, alur autentikasi, serta validasi isolasi multi-tenant pada platform Srikaya (VIDIC).

Modul ini dirancang mandiri (*standalone*): dapat dijalankan langsung tanpa memerlukan backend server aktif, namun tetap menyediakan opsi beralih ke mode *live* yang terhubung ke API Gateway (Port 3000).

---

## 1. Fitur Utama

• **Tampilan Welcome (Sambutan & Onboarding)**:
  - Hero header dengan branding resmi Srikaya Platform.
  - Ringkasan fitur inti: Isolasi Multi-Tenant, Presensi Shift, dan Kalender Libur Nasional.
  - Akses cepat ke Formulir Login dan Sandbox Mode Tamu.

• **Tampilan Login (Autentikasi Mandiri & Live)**:
  - Preset akun pengujian instan (Admin Srikaya, HRD Nusantara, Staff Srikaya).
  - Validasi formulir email, password (dengan tombol tampilkan/sembunyikan kata sandi), dan ID Perusahaan (*Tenant ID*).
  - Sakelar *Mode Pengujian Independen*:
    - **Aktif (Default)**: Memproses autentikasi secara lokal dengan simulasi delay respons.
    - **Non-Aktif**: Mengirim permintaan HTTP POST langsung ke Gateway (`http://localhost:3000/api/auth/login`).

• **Dasbor Sambutan & Verifikasi**:
  - Profil sesi pengguna aktif beserta badge role dan tenant ID.
  - Simulasi pencatatan presensi masuk/batal shift kerja operasional.
  - Alat uji isolasi multi-tenant: Memverifikasi penolakan akses lintas-perusahaan secara langsung di antarmuka mobile.

---

## 2. Kredensial Akun Pengujian Bawaan

| Profil Akun | Alamat Email | Kata Sandi | Role | Perusahaan (Tenant ID) |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@srikaya.id` | `rahasia123` | `ADMIN` | PT Srikaya Mandiri (`cid-srikaya-01`) |
| **HR Manager** | `hrd@nusantara.id` | `rahasia123` | `HRD` | PT Nusantara Sakti (`cid-nusantara-02`) |
| **Staff Operasional** | `staff@srikaya.id` | `rahasia123` | `STAFF` | PT Srikaya Mandiri (`cid-srikaya-01`) |

*Catatan: Anda juga dapat memasukkan email pengujian lain dengan kata sandi minimal 6 karakter saat mode independen aktif.*

---

## 3. Panduan Menjalankan Aplikasi

Pastikan terminal berada di dalam direktori `flutter`:

```powershell
cd flutter
```

### A. Menjalankan di Peramban Web (Chrome / Edge)
```powershell
flutter run -d chrome
```

### B. Menjalankan di Desktop Windows
```powershell
flutter run -d windows
```

### C. Menjalankan di Emulator / Perangkat Android
```powershell
flutter run -d android
```
*(Catatan Android: Jika menghubungkan ke gateway lokal komputer host saat mode live aktif, gunakan URL `http://10.0.2.2:3000`)*.

---

## 4. Pengujian Otomatis (Unit & Widget Tests)

Seluruh alur antarmuka dan transisi navigasi telah terlindungi dengan pengujian otomatis:

```powershell
flutter test -r expanded
```

Hasil verifikasi:
• `✓ Welcome screen renders properly with branding and CTAs`
• `✓ Navigates to Login screen on tapping Masuk ke Akun`
• `✓ Performs mock authentication and enters Home Dashboard`
• `✓ Guest sandbox mode navigates directly to Home Dashboard`
