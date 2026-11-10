/** Bentuk data presensi seperti yang dikirim layanan shifting lewat gateway. */

export interface AttendanceStatusItem {
  id: string
  companyId: string
  code: string
  name: string
  description?: string | null
  color: string
  isPresent: boolean
  isPaid: boolean
  isAbsent: boolean
  isSystem: boolean
  sortOrder: number
  status: string
  usageCount?: number
  createdAt?: string | null
  updatedAt?: string | null
}

export interface AttendanceStatusSnapshot {
  id: string
  name: string
  code: string
  color: string
  isPresent: boolean
  isPaid: boolean
  isAbsent: boolean
  isSystem: boolean
}

export interface AttendanceRow {
  id: string
  companyId: string
  attendanceDate: string
  checkInAt: string | null
  checkOutAt: string | null
  checkInDistanceMeters: number | null
  lateMinutes: number
  workMinutes: number | null
  source: string
  note: string | null
  timezone: string
  createdAt?: string | null
  updatedAt?: string | null
  employee: {
    id: string
    name: string
    email: string
    position: string | null
    departmentName: string | null
  }
  shift: { id: string; name: string; code: string } | null
  status: AttendanceStatusSnapshot
}

export interface AttendanceScheduleInfo {
  dayOfWeek: number
  dayName: string
  startTime: string | null
  endTime: string | null
  isOff: boolean
}

export interface AttendanceLocationSummary {
  id: string
  name: string
  city: string
  radiusMeters: number
  coordinatesType: string
}

export interface AttendanceTodayInfo {
  date: string
  timezone: string
  shift: { id: string; name: string; code: string } | null
  schedule: AttendanceScheduleInfo | null
  row: AttendanceRow | null
  locations: AttendanceLocationSummary[]
  canClockIn: boolean
  canClockOut: boolean
  statuses: AttendanceStatusItem[]
  message: string | null
}

export interface AttendanceSummaryItem {
  employeeId: string
  employeeName: string
  departmentName: string | null
  totalDays: number
  presentDays: number
  paidDays: number
  absentDays: number
  lateMinutes: number
  workMinutes: number
  perStatus: { statusId: string; name: string; color: string; total: number }[]
}
