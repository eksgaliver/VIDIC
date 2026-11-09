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
  timezone: string
  isPrimary: boolean
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
  createdAt?: string | Date
  updatedAt?: string | Date
}

export type CompanyWithRelations = Company
