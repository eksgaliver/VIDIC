import type { Company, CompanyLocation } from '@/@types/organization'

const TIMEZONE_LABEL: Record<string, string> = {
  'Asia/Jakarta': 'WIB',
  'Asia/Makassar': 'WITA',
  'Asia/Jayapura': 'WIT',
}

export function timezoneLabel(timezone: string): string {
  return TIMEZONE_LABEL[timezone] ?? timezone
}

/** Lokasi primer: flag isPrimary, jatuh ke entri pertama bila belum ditandai. */
export function primaryLocation(company: Company): CompanyLocation | undefined {
  const locations = company.locations ?? []
  return locations.find((item) => item.isPrimary) ?? locations[0]
}

export function locationCount(company: Company): number {
  return (company.locations ?? []).length
}

export function departmentCount(company: Company): number {
  return (company.departments ?? []).length
}

export function totalLocations(companies: Company[]): number {
  return companies.reduce((sum, item) => sum + locationCount(item), 0)
}

export function totalDepartments(companies: Company[]): number {
  return companies.reduce((sum, item) => sum + departmentCount(item), 0)
}

export function coordinateText(location: CompanyLocation, digits = 5): string {
  const toNumber = (value: string | number) => {
    const parsed = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(parsed) ? parsed.toFixed(digits) : String(value)
  }
  return `${toNumber(location.latitude)}, ${toNumber(location.longitude)}`
}

export function fullAddress(location: CompanyLocation): string {
  return [location.address, location.city, location.province, location.postalCode]
    .filter(Boolean)
    .join(', ')
}
