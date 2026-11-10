// Status absensi bawaan yang disemai otomatis untuk setiap perusahaan baru.
// `unfilled` wajib ada: baris hasil generate tidak boleh menebak Alpa, karena
// tebakan itu bisa memotong gaji karyawan yang sebenarnya masuk.

export interface DefaultAttendanceStatus {
  code: string
  name: string
  description: string
  color: string
  isPresent: boolean
  isPaid: boolean
  isAbsent: boolean
  isSystem: boolean
  sortOrder: number
}

export const DEFAULT_ATTENDANCE_STATUSES: DefaultAttendanceStatus[] = [
  {
    code: 'unfilled',
    name: 'Belum Diisi',
    description: 'Baris presensi hasil generate yang belum ditetapkan HRD',
    color: '#94a3b8',
    isPresent: false,
    isPaid: false,
    isAbsent: false,
    isSystem: true,
    sortOrder: 0
  },
  {
    code: 'hadir',
    name: 'Hadir',
    description: 'Karyawan masuk kerja sesuai shift',
    color: '#059669',
    isPresent: true,
    isPaid: true,
    isAbsent: false,
    isSystem: true,
    sortOrder: 10
  },
  {
    code: 'dinas',
    name: 'Dinas Luar',
    description: 'Bekerja di luar titik presensi resmi atas penugasan',
    color: '#0891b2',
    isPresent: true,
    isPaid: true,
    isAbsent: false,
    isSystem: false,
    sortOrder: 20
  },
  {
    code: 'izin',
    name: 'Izin',
    description: 'Izin yang disetujui atasan langsung',
    color: '#0ea5e9',
    isPresent: false,
    isPaid: true,
    isAbsent: false,
    isSystem: false,
    sortOrder: 30
  },
  {
    code: 'sakit',
    name: 'Sakit',
    description: 'Sakit dengan atau tanpa surat keterangan dokter',
    color: '#8b5cf6',
    isPresent: false,
    isPaid: true,
    isAbsent: false,
    isSystem: false,
    sortOrder: 40
  },
  {
    code: 'cuti',
    name: 'Cuti',
    description: 'Cuti tahunan atau cuti bersama yang disetujui',
    color: '#f59e0b',
    isPresent: false,
    isPaid: true,
    isAbsent: false,
    isSystem: false,
    sortOrder: 50
  },
  {
    code: 'alpa',
    name: 'Alpa',
    description: 'Tidak masuk tanpa keterangan',
    color: '#e11d48',
    isPresent: false,
    isPaid: false,
    isAbsent: true,
    isSystem: true,
    sortOrder: 90
  }
]

/** Kode status dari nama bebas yang diketik HRD. */
export function attendanceStatusCodeFromName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  if (!slug) return `status_${Date.now().toString().slice(-5)}`
  return slug.slice(0, 40)
}
