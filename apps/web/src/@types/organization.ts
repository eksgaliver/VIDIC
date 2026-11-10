/** Bentuk data organisasi persis seperti yang dikirim layanan auth lewat gateway. */

export interface CompanyLocation {
  id: string
  companyId: string
  name: string
  address: string
  city: string
  province?: string | null
  postalCode?: string | null
  latitude: string | number
  longitude: string | number
  radiusMeters: number
  coordinatesType?: 'point' | 'polygon'
  polygonCoordinates?: [number, number][] | null
  timezone: string
  isPrimary: boolean
  status: string
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface CompanyOperationalArea {
  id: string
  companyId: string
  province: string
  city: string
  status: string
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface Department {
  id: string
  companyId: string
  code: string
  name: string
  description?: string | null
  isMandatory: boolean
  status: string
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface Company {
  id: string
  code: string
  name: string
  brandName?: string | null
  email: string
  phone?: string | null
  industry?: string | null
  website?: string | null
  logoUrl?: string | null
  status: string
  locations?: CompanyLocation[]
  departments?: Department[]
  operationalAreas?: CompanyOperationalArea[]
  createdAt?: string | Date
  updatedAt?: string | Date
}

export type CompanyWithRelations = Company

export interface Employee {
  id: string
  companyId: string | null
  departmentId: string | null
  supervisorId: string | null
  shiftId?: string | null
  name: string
  email: string
  position: string | null
  avatarUrl?: string | null
  status: string
  role: string
  department: Pick<Department, 'id' | 'name' | 'code'> | null
  supervisor: { id: string; name: string; email: string } | null
  shift?: {
    id: string
    name: string
    code: string
    startTime: string
    endTime: string
  } | null
  biodataCompleted?: boolean
  biodata?: Biodata | null
  mails?: Mail[]
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface Biodata {
  id?: string
  userId: string
  companyId?: string | null
  nik?: string | null
  kkNumber?: string | null
  npwp?: string | null
  bpjsKetenagakerjaan?: string | null
  bpjsKesehatan?: string | null
  gender?: string | null
  placeOfBirth?: string | null
  dateOfBirth?: string | null
  religion?: string | null
  bloodType?: string | null
  maritalStatus?: string | null
  phone?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  emergencyContactRelation?: string | null
  addressKtp?: string | null
  addressCurrent?: string | null
  postalCode?: string | null
  city?: string | null
  province?: string | null
  lastEducation?: string | null
  major?: string | null
  institution?: string | null
  bankName?: string | null
  bankAccountNumber?: string | null
  bankAccountHolder?: string | null
  isCompleted: boolean
  completedAt?: string | Date | null
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface Mail {
  id: string
  userId: string
  companyId?: string | null
  senderEmail: string
  senderName?: string | null
  recipientEmail: string
  recipientName?: string | null
  subject: string
  body: string
  category: string
  isRead: boolean
  isStarred: boolean
  metadata?: Record<string, unknown> | null
  sentAt: string | Date
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface ShiftLocation {
  id: string
  name: string
  address: string
  city: string
  province?: string | null
  latitude: string | number
  longitude: string | number
  radiusMeters: number
  coordinatesType?: 'point' | 'polygon'
  polygonCoordinates?: [number, number][] | null
  timezone: string
}

export interface ShiftDailySchedule {
  id?: string
  shiftId?: string
  dayOfWeek: number // 1: Senin, 2: Selasa, 3: Rabu, 4: Kamis, 5: Jumat, 6: Sabtu, 7: Minggu
  dayName: string
  startTime: string | null
  endTime: string | null
  isOff: boolean
}

export interface Shift {
  id: string
  companyId: string
  name: string
  code: string
  description?: string | null
  employeeId?: string | null
  position?: string | null
  supervisorId?: string | null
  startTime: string
  endTime: string
  workLocationId?: string | null
  status: string
  assignedCount: number
  assignedEmployees: {
    id: string
    name: string
    email: string
    position?: string | null
    status: string
  }[]
  schedules?: ShiftDailySchedule[]
  employee?: { id: string; name: string; email: string } | null
  department?: Pick<Department, 'id' | 'name' | 'code'> | null
  supervisor?: { id: string; name: string; email: string } | null
  workLocation?: ShiftLocation | null
  attendanceLocations: ShiftLocation[]
  createdAt?: string | Date
  updatedAt?: string | Date
}
