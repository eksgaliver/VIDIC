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
  name: string
  email: string
  position: string | null
  avatarUrl?: string | null
  status: string
  role: string
  department: Pick<Department, 'id' | 'name' | 'code'> | null
  supervisor: { id: string; name: string; email: string } | null
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

export interface Shift {
  id: string
  companyId: string
  employeeId: string
  position: string
  supervisorId: string | null
  startTime: string
  endTime: string
  workLocationId: string
  status: string
  employee: { id: string; name: string; email: string }
  department: Pick<Department, 'id' | 'name' | 'code'> | null
  supervisor: { id: string; name: string; email: string } | null
  workLocation: ShiftLocation
  attendanceLocations: ShiftLocation[]
  createdAt?: string | Date
  updatedAt?: string | Date
}
