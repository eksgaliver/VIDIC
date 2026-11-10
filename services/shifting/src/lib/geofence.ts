// Helper geofence & waktu bersama untuk layanan shifting.
// Dipakai oleh verifikasi presensi shift dan modul absensi agar rumus
// jarak tidak pernah tersimpan dalam dua salinan.

export interface GeofenceCandidate {
  latitude: string | number
  longitude: string | number
  radiusMeters: number
  coordinatesType?: string | null
  polygonCoordinates?: [number, number][] | null
}

export interface GeofenceMatch<T extends GeofenceCandidate> {
  matched: boolean
  location: T | null
  distanceMeters: number | null
}

// Rumus Haversine: jarak meter antara koordinat pengguna dan pusat geofence.
export function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

// Algoritma Ray Casting: apakah koordinat berada di dalam poligon geofence.
export function isInsidePolygon(point: [number, number], polygon: [number, number][]): boolean {
  if (!polygon || polygon.length < 3) return false
  const [x, y] = point
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0]
    const yi = polygon[i][1]
    const xj = polygon[j][0]
    const yj = polygon[j][1]

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }

  return inside
}

/**
 * Cocokkan koordinat pengguna dengan daftar titik presensi.
 * Titik pertama yang cocok langsung dipakai; bila tidak ada yang cocok,
 * titik terdekat dikembalikan sebagai bukti jarak untuk ditampilkan.
 */
export function matchAttendanceLocation<T extends GeofenceCandidate>(
  locations: T[],
  latitude: number,
  longitude: number
): GeofenceMatch<T> {
  let nearest: { location: T; distanceMeters: number } | null = null

  for (const location of locations) {
    const polygon = location.polygonCoordinates
    if (location.coordinatesType === 'polygon' && polygon && polygon.length >= 3) {
      if (isInsidePolygon([latitude, longitude], polygon)) {
        return { matched: true, location, distanceMeters: 0 }
      }
      continue
    }

    const distance = haversineDistanceMeters(
      latitude,
      longitude,
      Number(location.latitude),
      Number(location.longitude)
    )

    if (distance <= (location.radiusMeters ?? 100)) {
      return { matched: true, location, distanceMeters: Math.round(distance) }
    }

    if (!nearest || distance < nearest.distanceMeters) {
      nearest = { location, distanceMeters: Math.round(distance) }
    }
  }

  return {
    matched: false,
    location: nearest?.location ?? null,
    distanceMeters: nearest?.distanceMeters ?? null
  }
}

/** Tanggal kerja lokal perusahaan dalam format YYYY-MM-DD. */
export function resolveLocalDate(value: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(value)

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

/** Hari dalam sepekan dari tanggal lokal. Senin = 1, Minggu = 7. */
export function getLocalDayOfWeek(date: string): number {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
  return weekday === 0 ? 7 : weekday
}

/** Jam dan menit lokal dari sebuah timestamp pada zona waktu tertentu. */
export function localTimeParts(value: Date, timezone: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone || 'Asia/Jakarta',
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit'
  }).formatToParts(value)

  return {
    hour: Number(parts.find((part) => part.type === 'hour')?.value ?? '0'),
    minute: Number(parts.find((part) => part.type === 'minute')?.value ?? '0')
  }
}

function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(':')
  return Number(hour) * 60 + Number(minute)
}

/**
 * Menit keterlambatan terhadap jam mulai jadwal hari tersebut.
 * Shift lintas hari (misal 22:00) dihitung dengan menambah 24 jam bila
 * presensi dilakukan setelah tengah malam.
 */
export function computeLateMinutes(
  startTime: string | null | undefined,
  checkInAt: Date,
  timezone: string
): number {
  if (!startTime) return 0

  const scheduled = timeToMinutes(startTime)
  const local = localTimeParts(checkInAt, timezone)
  let diff = local.hour * 60 + local.minute - scheduled

  if (diff < 0 && scheduled > 12 * 60 && local.hour * 60 + local.minute < 12 * 60) {
    diff += 24 * 60
  }

  return Math.max(0, diff)
}

/** Durasi kerja dalam menit, dengan penanganan shift yang melewati tengah malam. */
export function computeWorkMinutes(
  checkInAt: Date,
  checkOutAt: Date,
  isOvernight: boolean
): number {
  let diff = Math.round((checkOutAt.getTime() - checkInAt.getTime()) / 60000)
  if (isOvernight && diff < 0) diff += 24 * 60
  return Math.max(0, diff)
}

/** Apakah jam selesai lebih awal dari jam mulai (shift melewati tengah malam). */
export function isOvernightShift(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): boolean {
  if (!startTime || !endTime) return false
  return timeToMinutes(endTime) <= timeToMinutes(startTime)
}
