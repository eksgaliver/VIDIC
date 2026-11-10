/** Pembantu tampilan presensi: kontras chip, jam lokal, dan durasi. */

const HEX_PATTERN = /^#([0-9a-fA-F]{6})$/

function channel(value: number): number {
  const normalized = value / 255
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4
}

/**
 * Warna chip datang dari basis data, jadi kontras teks dihitung di sini.
 * Tanpa ini, status kuning pucat akan memakai teks putih dan sulit dibaca.
 */
export function readableInk(color: string): string {
  const match = HEX_PATTERN.exec(color.trim())
  if (!match) return '#ffffff'

  const hex = match[1]
  const red = parseInt(hex.slice(0, 2), 16)
  const green = parseInt(hex.slice(2, 4), 16)
  const blue = parseInt(hex.slice(4, 6), 16)
  const luminance = 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)

  return luminance > 0.45 ? '#0f172a' : '#ffffff'
}

/** Jam dinding pada zona waktu perusahaan, bukan zona waktu peramban. */
export function formatClock(
  value: string | Date | null | undefined,
  timezone = 'Asia/Jakarta'
): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)

  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00'
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00'
  return `${hour}:${minute}`
}

/** Tanggal kerja 'YYYY-MM-DD' menjadi label pendek berbahasa Indonesia. */
export function formatDateLabel(value: string): string {
  const date = new Date(`${value}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

export function formatDayName(value: string): string {
  const date = new Date(`${value}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC', weekday: 'long' }).format(date)
}

/** Menit menjadi 'X jam Y mnt'; kosong tampil sebagai tanda pisah. */
export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—'
  if (minutes <= 0) return '0 mnt'

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} mnt`
  if (rest === 0) return `${hours} jam`
  return `${hours} jam ${rest} mnt`
}

/** Bulan berjalan 'YYYY-MM' pada zona waktu tertentu. */
export function currentLocalMonth(timezone = 'Asia/Jakarta'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  return `${year}-${month}`
}

export function monthLabel(month: string): string {
  const date = new Date(`${month}-01T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return month
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric'
  }).format(date)
}

/** Sumber baris presensi, ditampilkan apa adanya tanpa istilah karangan. */
export const ATTENDANCE_SOURCE_LABEL: Record<string, string> = {
  auto: 'Generate',
  clock_in: 'Presensi mandiri',
  manual: 'Ditimpa HRD'
}

export const ATTENDANCE_COLOR_PRESETS = [
  '#059669',
  '#0ea5e9',
  '#8b5cf6',
  '#f59e0b',
  '#0891b2',
  '#e11d48',
  '#64748b',
  '#94a3b8'
] as const
