import * as React from 'react'
import { Link, createRoute } from '@tanstack/react-router'
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineCheck,
  HiOutlineClock,
  HiOutlineLocationMarker,
  HiOutlineMap,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineUserGroup,
} from 'react-icons/hi'
import { authenticatedRoute } from './_authenticated'
import { api } from '@/lib/api'
import Dialog from '@/components/ui/Dialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { LeafletMapPicker } from '@/components/shared/LeafletMapPicker'
import {
  Badge,
  Button,
  CheckboxField,
  DialogBody,
  DialogFooter,
  DialogHeading,
  EmptyState,
  Notice,
  PageHeader,
  Panel,
  PanelHeader,
  SelectField,
  StatusFromValue,
  TableSkeleton,
  TextAreaField,
  TextField,
} from '@/components/base'
import { errorText } from '@/utils/apiError'
import type {
  Company,
  CompanyLocation,
  Employee,
  Shift,
  ShiftDailySchedule,
  ShiftLocation,
} from '@/@types/organization'
import {
  COMPANIES_PATH,
  EMPLOYEES_PATH,
  SHIFTS_PATH,
} from '@/constants/route.constant'

export const shiftsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: SHIFTS_PATH,
  component: ShiftsPage,
})

export const DAYS_OF_WEEK = [
  { dayOfWeek: 1, dayName: 'Senin', shortName: 'Sen' },
  { dayOfWeek: 2, dayName: 'Selasa', shortName: 'Sel' },
  { dayOfWeek: 3, dayName: 'Rabu', shortName: 'Rab' },
  { dayOfWeek: 4, dayName: 'Kamis', shortName: 'Kam' },
  { dayOfWeek: 5, dayName: 'Jumat', shortName: 'Jum' },
  { dayOfWeek: 6, dayName: 'Sabtu', shortName: 'Sab' },
  { dayOfWeek: 7, dayName: 'Minggu', shortName: 'Min' },
] as const

export function createDefaultSchedules(defaultStart = '08:00', defaultEnd = '17:00'): ShiftDailySchedule[] {
  return DAYS_OF_WEEK.map((d) => ({
    dayOfWeek: d.dayOfWeek,
    dayName: d.dayName,
    startTime: d.dayOfWeek <= 5 ? defaultStart : null,
    endTime: d.dayOfWeek <= 5 ? defaultEnd : null,
    isOff: d.dayOfWeek > 5,
  }))
}

export function generateAutoShiftCode(name: string): string {
  const cleaned = name.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '')
  if (!cleaned) return 'SHF'
  const words = cleaned.split(/\s+/).filter(Boolean)
  if (words.length === 1) {
    return `SHF-${words[0].slice(0, 8)}`
  }
  if (words[0] === 'SHIFT' && words.length > 1) {
    const remainder = words.slice(1).join('')
    return `SHF-${remainder.slice(0, 8)}`
  }
  const acronym = words.map((w) => w[0]).join('')
  return `SHF-${acronym.slice(0, 6)}`
}

const SHIFT_STATUSES = [
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
]

const TIMEZONES = [
  { value: 'Asia/Jakarta', label: 'WIB (Jakarta)' },
  { value: 'Asia/Makassar', label: 'WITA (Makassar)' },
  { value: 'Asia/Jayapura', label: 'WIT (Jayapura)' },
]

export interface AttendancePointDraft {
  id?: string
  name: string
  address: string
  city: string
  province: string
  latitude: number
  longitude: number
  radiusMeters: number
  coordinatesType: 'point' | 'polygon'
  polygonCoordinates: [number, number][]
  timezone: string
  locationId?: string
}

export interface ShiftFormState {
  name: string
  code: string
  description: string
  startTime: string
  endTime: string
  workLocationId?: string
  attendanceLocations: AttendancePointDraft[]
  status: string
  assignedEmployeeIds: string[]
  schedules: ShiftDailySchedule[]
}

const INITIAL_FORM: ShiftFormState = {
  name: '',
  code: '',
  description: '',
  startTime: '08:00',
  endTime: '17:00',
  workLocationId: '',
  attendanceLocations: [],
  status: 'active',
  assignedEmployeeIds: [],
  schedules: createDefaultSchedules('08:00', '17:00'),
}

function displayTime(value: string | null | undefined) {
  return value ? value.slice(0, 5) : '—'
}

function isOvernight(startTime: string | null | undefined, endTime: string | null | undefined) {
  if (!startTime || !endTime) return false
  return endTime <= startTime
}

function calculateDuration(start: string | null | undefined, end: string | null | undefined): string {
  if (!start || !end) return '—'
  const [sH, sM] = start.split(':').map(Number)
  const [eH, eM] = end.split(':').map(Number)
  if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return '—'
  let diffMinutes = (eH * 60 + eM) - (sH * 60 + sM)
  if (diffMinutes <= 0) {
    diffMinutes += 24 * 60
  }
  const hours = Math.floor(diffMinutes / 60)
  const mins = diffMinutes % 60
  return mins > 0 ? `${hours} jam ${mins} menit` : `${hours} jam`
}

function calculateDailyMinutes(start: string | null | undefined, end: string | null | undefined): number {
  if (!start || !end) return 0
  const [sH, sM] = start.split(':').map(Number)
  const [eH, eM] = end.split(':').map(Number)
  if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return 0
  let diffMinutes = (eH * 60 + eM) - (sH * 60 + sM)
  if (diffMinutes <= 0) diffMinutes += 24 * 60
  return diffMinutes
}

function formatMinutesToHours(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0 && mins === 0) return '0 jam'
  return mins > 0 ? `${hours} jam ${mins} mnt` : `${hours} jam`
}

function calculateWeeklySummary(schedules: ShiftDailySchedule[]) {
  let totalMinutes = 0
  let workingDaysCount = 0
  let offDaysCount = 0

  for (const s of schedules) {
    if (s.isOff) {
      offDaysCount++
    } else {
      workingDaysCount++
      totalMinutes += calculateDailyMinutes(s.startTime, s.endTime)
    }
  }

  return {
    totalMinutes,
    totalFormatted: formatMinutesToHours(totalMinutes),
    workingDaysCount,
    offDaysCount,
  }
}

function createInitialPoint(baseLocation?: CompanyLocation, index = 1): AttendancePointDraft {
  const lat =
    baseLocation?.latitude && Number(baseLocation.latitude) !== 0
      ? Number(baseLocation.latitude)
      : -6.2088
  const lng =
    baseLocation?.longitude && Number(baseLocation.longitude) !== 0
      ? Number(baseLocation.longitude)
      : 106.8456
  return {
    name: baseLocation?.name ? `${baseLocation.name} (Titik ${index})` : `Titik Presensi ${index}`,
    address: baseLocation?.address || 'Jl. Jenderal Sudirman, Senayan',
    city: baseLocation?.city || 'Jakarta Selatan',
    province: baseLocation?.province || 'DKI Jakarta',
    latitude: lat,
    longitude: lng,
    radiusMeters: 50,
    coordinatesType: 'point',
    polygonCoordinates: [],
    timezone: baseLocation?.timezone || 'Asia/Jakarta',
    locationId: baseLocation?.id,
  }
}

function locationLine(location: ShiftLocation | CompanyLocation) {
  return `${location.name} · ${location.city}`
}

function renderDailyScheduleEditor(
  form: ShiftFormState,
  onUpdateDay: (dayOfWeek: number, patch: Partial<ShiftDailySchedule>) => void,
  onApplyPreset: (type: 'standard5' | 'standard6' | 'all7' | 'syncHours') => void
) {
  const summary = calculateWeeklySummary(form.schedules)

  return (
    <div className="space-y-3 rounded-control border border-line bg-surface p-3.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-ink-3">
              Jadwal Operasional Harian (Senin – Minggu)
            </h5>
            <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-ink-2 border border-line">
              7 Hari
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-ink-3">
            Atur jam kerja mandiri per hari atau tentukan hari libur operasional (Day Off).
          </p>
        </div>

        {/* Toolbar Preset */}
        <div className="flex flex-wrap items-center gap-1 text-[11px]">
          <span className="text-ink-3 text-[10px] mr-1">Preset:</span>
          <button
            type="button"
            onClick={() => onApplyPreset('standard5')}
            className="rounded border border-line bg-surface-2 px-2 py-1 font-medium text-ink-2 hover:bg-surface-3 hover:text-ink transition-colors cursor-pointer"
          >
            Sen–Jum
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('standard6')}
            className="rounded border border-line bg-surface-2 px-2 py-1 font-medium text-ink-2 hover:bg-surface-3 hover:text-ink transition-colors cursor-pointer"
          >
            Sen–Sab
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('all7')}
            className="rounded border border-line bg-surface-2 px-2 py-1 font-medium text-ink-2 hover:bg-surface-3 hover:text-ink transition-colors cursor-pointer"
          >
            7 Hari
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('syncHours')}
            title="Samakan jam kerja seluruh hari aktif dengan jam hari aktif pertama"
            className="rounded border border-primary-line bg-primary-subtle px-2 py-1 font-medium text-primary hover:bg-primary/15 transition-colors cursor-pointer"
          >
            Samakan Jam
          </button>
        </div>
      </div>

      {/* Daftar 7 Hari */}
      <div className="divide-y divide-line/60">
        {DAYS_OF_WEEK.map((d) => {
          const schedule = form.schedules.find((s) => s.dayOfWeek === d.dayOfWeek) || {
            dayOfWeek: d.dayOfWeek,
            dayName: d.dayName,
            startTime: '08:00',
            endTime: '17:00',
            isOff: d.dayOfWeek > 5,
          }
          const isOff = schedule.isOff
          const duration = !isOff ? calculateDuration(schedule.startTime, schedule.endTime) : 'Libur'
          const overnight = !isOff && isOvernight(schedule.startTime, schedule.endTime)

          return (
            <div
              key={d.dayOfWeek}
              className={`flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between transition-colors ${
                isOff ? 'opacity-70 bg-surface-2/30 px-2 rounded' : ''
              }`}
            >
              {/* Kolom Hari & Status Badge */}
              <div className="flex items-center gap-2 min-w-[130px]">
                <span className="font-mono text-xs font-bold rounded bg-surface-2 px-1.5 py-0.5 border border-line text-ink">
                  {d.shortName}
                </span>
                <span className="text-xs font-semibold text-ink">{d.dayName}</span>
                {isOff ? (
                  <span className="text-[10px] font-bold rounded bg-surface-2 text-ink-3 px-1.5 py-0.5 border border-line">
                    Libur
                  </span>
                ) : (
                  <span className="text-[10px] font-bold rounded bg-success-subtle text-success px-1.5 py-0.5 border border-success-line">
                    Kerja
                  </span>
                )}
              </div>

              {/* Kolom Kontrol: Toggle Masuk/Libur & Jam Kerja */}
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {/* Switch Masuk/Libur */}
                <div className="inline-flex rounded-control border border-line bg-surface-2 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => onUpdateDay(d.dayOfWeek, { isOff: false })}
                    className={`rounded px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                      !isOff
                        ? 'bg-white font-bold text-primary shadow-xs'
                        : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateDay(d.dayOfWeek, { isOff: true })}
                    className={`rounded px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                      isOff
                        ? 'bg-white font-bold text-error shadow-xs'
                        : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    Libur
                  </button>
                </div>

                {!isOff ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="time"
                      value={schedule.startTime || '08:00'}
                      onChange={(e) =>
                        onUpdateDay(d.dayOfWeek, { startTime: e.target.value })
                      }
                      className="rounded border border-line bg-surface px-2 py-1 text-xs font-mono font-medium text-ink focus:border-primary focus:outline-hidden"
                    />
                    <span className="text-ink-3 text-xs">—</span>
                    <input
                      type="time"
                      value={schedule.endTime || '17:00'}
                      onChange={(e) =>
                        onUpdateDay(d.dayOfWeek, { endTime: e.target.value })
                      }
                      className="rounded border border-line bg-surface px-2 py-1 text-xs font-mono font-medium text-ink focus:border-primary focus:outline-hidden"
                    />
                    <span className="min-w-[80px] text-right text-[11px] font-medium text-ink-2 tabular">
                      {duration}
                    </span>
                    {overnight ? (
                      <span className="text-[10px] font-semibold text-warning" title="Melewati tengah malam">
                        • Lintas Hari
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-xs text-ink-3 italic py-1">
                    Hari libur operasional (Day Off)
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Ringkasan Beban Kerja Mingguan */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-line bg-surface-2 px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5 text-ink-2">
          <HiOutlineClock className="h-4 w-4 text-primary shrink-0" />
          <span>
            Total Jam Kerja Mingguan:{' '}
            <strong className="text-ink">{summary.totalFormatted}</strong>
          </span>
        </div>
        <div className="text-[11px] text-ink-3">
          <span className="font-semibold text-success">{summary.workingDaysCount} hari aktif</span>
          {' · '}
          <span className="font-semibold text-ink-3">{summary.offDaysCount} hari libur</span>
        </div>
      </div>
    </div>
  )
}

function renderDailyScheduleSummary(schedules: ShiftDailySchedule[]) {
  const summary = calculateWeeklySummary(schedules)

  return (
    <div className="rounded-control border border-line bg-surface p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-bold uppercase tracking-wider text-ink-3">
          Rincian Jam Kerja Mingguan ({summary.workingDaysCount} Hari Aktif · {summary.offDaysCount} Libur)
        </h5>
        <span className="font-mono text-xs font-bold text-primary">
          Total: {summary.totalFormatted} / minggu
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
        {DAYS_OF_WEEK.map((d) => {
          const s = schedules.find((item) => item.dayOfWeek === d.dayOfWeek)
          const isOff = s ? s.isOff : d.dayOfWeek > 5
          const duration = !isOff ? calculateDuration(s?.startTime, s?.endTime) : 'Libur'

          return (
            <div
              key={d.dayOfWeek}
              className={`rounded border p-2 text-xs space-y-1 ${
                isOff
                  ? 'border-line/60 bg-surface-2/40 text-ink-3/70'
                  : 'border-line bg-surface shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">{d.dayName}</span>
                <span
                  className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded ${
                    isOff
                      ? 'bg-surface-2 text-ink-3'
                      : 'bg-primary-subtle text-primary border border-primary-line/40'
                  }`}
                >
                  {isOff ? 'Libur' : 'Kerja'}
                </span>
              </div>
              {!isOff ? (
                <>
                  <p className="font-mono text-[11px] text-ink font-medium">
                    {displayTime(s?.startTime)} — {displayTime(s?.endTime)}
                  </p>
                  <p className="text-[10px] text-ink-3">{duration}</p>
                </>
              ) : (
                <p className="text-[11px] text-ink-3 italic pt-1">Day Off</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ShiftsPage() {
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = React.useState('')
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [shifts, setShifts] = React.useState<Shift[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  // Multi-step Wizard Create State (1: Jadwal & Info, 2: Peta & Titik Presensi, 3: Konfirmasi)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [createStep, setCreateStep] = React.useState(1)
  const [createActivePointIndex, setCreateActivePointIndex] = React.useState(0)
  const [createForm, setCreateForm] = React.useState<ShiftFormState>(INITIAL_FORM)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Multi-step Wizard Edit State
  const [editItem, setEditItem] = React.useState<Shift | null>(null)
  const [editStep, setEditStep] = React.useState(1)
  const [editActivePointIndex, setEditActivePointIndex] = React.useState(0)
  const [editForm, setEditForm] = React.useState<ShiftFormState>(INITIAL_FORM)

  const [deleteItem, setDeleteItem] = React.useState<Shift | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const selectedCompany = companies.find((item) => item.id === selectedCompanyId)
  const locations = (selectedCompany?.locations ?? []).filter(
    (location) => location.status === 'active'
  )
  const primaryLocation = locations.find((location) => location.isPrimary) ?? locations[0]
  const activeEmployees = employees.filter((employee) => employee.status === 'active')

  // Mengelompokkan lokasi kantor berdasarkan kota untuk kemudahan referensi
  const locationsByCity = React.useMemo(() => {
    const map = new Map<string, CompanyLocation[]>()
    for (const loc of locations) {
      const key = loc.city || 'Lainnya'
      const list = map.get(key) ?? []
      list.push(loc)
      map.set(key, list)
    }
    return map
  }, [locations])

  const fetchCompanies = React.useCallback(async () => {
    try {
      const res = await api.companies.get()
      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal memuat daftar perusahaan.'))
        return
      }
      if (Array.isArray(res.data)) {
        const list = res.data as unknown as Company[]
        setCompanies(list)
        setSelectedCompanyId((current) => current || list[0]?.id || '')
      }
    } catch {
      setErrorMsg('Gagal memuat daftar perusahaan.')
    }
  }, [])

  const fetchShiftData = React.useCallback(async (companyId: string) => {
    if (!companyId) return
    setIsLoading(true)
    setErrorMsg(null)

    try {
      const [employeesRes, shiftsRes] = await Promise.all([
        api.employees.get({ query: { companyId } }),
        api.shifting.shifts.get({ query: { companyId } }),
      ])

      if (employeesRes.error) {
        setEmployees([])
      } else {
        setEmployees(
          Array.isArray(employeesRes.data)
            ? (employeesRes.data as unknown as Employee[])
            : []
        )
      }

      if (shiftsRes.error) {
        setErrorMsg(errorText(shiftsRes, 'Gagal memuat data shift.'))
        setShifts([])
        return
      }

      setShifts(
        Array.isArray(shiftsRes.data) ? (shiftsRes.data as unknown as Shift[]) : []
      )
    } catch {
      setShifts([])
      setErrorMsg('Gagal memuat data shift dari layanan shifting.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  React.useEffect(() => {
    if (selectedCompanyId) {
      fetchShiftData(selectedCompanyId)
    }
  }, [selectedCompanyId, fetchShiftData])

  // Buka Dialog Tambah Shift
  const openCreate = () => {
    setErrorMsg(null)
    setSuccessMsg(null)
    setCreateStep(1)
    setCreateActivePointIndex(0)

    const baseLoc = primaryLocation || locations[0]
    setCreateForm({
      name: '',
      code: '',
      description: '',
      startTime: '08:00',
      endTime: '17:00',
      workLocationId: baseLoc?.id || '',
      attendanceLocations: [createInitialPoint(baseLoc, 1)],
      status: 'active',
      assignedEmployeeIds: [],
      schedules: createDefaultSchedules('08:00', '17:00'),
    })
    setIsCreateOpen(true)
  }

  // Operasi Jadwal Harian
  const handleUpdateSchedule = (
    isEdit: boolean,
    dayOfWeek: number,
    patch: Partial<ShiftDailySchedule>
  ) => {
    const updater = isEdit ? setEditForm : setCreateForm
    updater((prev) => {
      const updated = prev.schedules.map((s) => {
        if (s.dayOfWeek !== dayOfWeek) return s
        const next = { ...s, ...patch }
        if (patch.isOff === false && (!next.startTime || !next.endTime)) {
          next.startTime = prev.startTime || '08:00'
          next.endTime = prev.endTime || '17:00'
        }
        return next
      })
      const firstActive = updated.find((s) => !s.isOff)
      return {
        ...prev,
        schedules: updated,
        startTime: firstActive?.startTime || prev.startTime,
        endTime: firstActive?.endTime || prev.endTime,
      }
    })
  }

  const applySchedulePreset = (
    isEdit: boolean,
    type: 'standard5' | 'standard6' | 'all7' | 'syncHours'
  ) => {
    const updater = isEdit ? setEditForm : setCreateForm
    updater((prev) => {
      let updated: ShiftDailySchedule[]
      const baseStart =
        prev.schedules.find((s) => !s.isOff)?.startTime || prev.startTime || '08:00'
      const baseEnd =
        prev.schedules.find((s) => !s.isOff)?.endTime || prev.endTime || '17:00'

      if (type === 'standard5') {
        updated = prev.schedules.map((s) => ({
          ...s,
          isOff: s.dayOfWeek > 5,
          startTime: s.dayOfWeek <= 5 ? (s.startTime || baseStart) : null,
          endTime: s.dayOfWeek <= 5 ? (s.endTime || baseEnd) : null,
        }))
      } else if (type === 'standard6') {
        updated = prev.schedules.map((s) => ({
          ...s,
          isOff: s.dayOfWeek === 7,
          startTime: s.dayOfWeek < 7 ? (s.startTime || baseStart) : null,
          endTime: s.dayOfWeek < 7 ? (s.endTime || baseEnd) : null,
        }))
      } else if (type === 'all7') {
        updated = prev.schedules.map((s) => ({
          ...s,
          isOff: false,
          startTime: s.startTime || baseStart,
          endTime: s.endTime || baseEnd,
        }))
      } else {
        // syncHours
        updated = prev.schedules.map((s) => {
          if (s.isOff) return s
          return {
            ...s,
            startTime: baseStart,
            endTime: baseEnd,
          }
        })
      }

      const firstActive = updated.find((s) => !s.isOff)
      return {
        ...prev,
        schedules: updated,
        startTime: firstActive?.startTime || prev.startTime,
        endTime: firstActive?.endTime || prev.endTime,
      }
    })
  }

  // Operasi Titik Presensi pada Formulir Buat
  const handleAddCreatePoint = () => {
    const baseLoc = locations.find((l) => l.id === createForm.workLocationId) || primaryLocation || locations[0]
    const nextIdx = createForm.attendanceLocations.length + 1
    const newPoint = createInitialPoint(baseLoc, nextIdx)
    setCreateForm((prev) => ({
      ...prev,
      attendanceLocations: [...prev.attendanceLocations, newPoint],
    }))
    setCreateActivePointIndex(createForm.attendanceLocations.length)
  }

  const handleRemoveCreatePoint = (idxToRemove: number) => {
    if (createForm.attendanceLocations.length <= 1) {
      setErrorMsg('Minimal harus ada 1 titik lokasi absensi.')
      return
    }
    setCreateForm((prev) => ({
      ...prev,
      attendanceLocations: prev.attendanceLocations.filter((_, idx) => idx !== idxToRemove),
    }))
    setCreateActivePointIndex((prev) => Math.max(0, Math.min(prev, createForm.attendanceLocations.length - 2)))
  }

  const handleUpdateCreatePoint = (patch: Partial<AttendancePointDraft>) => {
    setCreateForm((prev) => {
      const updated = [...prev.attendanceLocations]
      if (updated[createActivePointIndex]) {
        updated[createActivePointIndex] = { ...updated[createActivePointIndex], ...patch }
      }
      return { ...prev, attendanceLocations: updated }
    })
  }

  const toggleCreateEmployee = (employeeId: string, checked: boolean) => {
    setCreateForm((current) => ({
      ...current,
      assignedEmployeeIds: checked
        ? [...new Set([...current.assignedEmployeeIds, employeeId])]
        : current.assignedEmployeeIds.filter((id) => id !== employeeId),
    }))
  }

  // Navigasi Langkah Formulir Buat
  const handleNextCreateStep = () => {
    setErrorMsg(null)
    if (createStep === 1) {
      if (!createForm.name.trim() || createForm.name.trim().length < 2) {
        setErrorMsg('Nama shift wajib diisi minimal 2 karakter.')
        return
      }
      const activeDays = createForm.schedules.filter((s) => !s.isOff)
      if (activeDays.length === 0) {
        setErrorMsg('Tentukan minimal satu hari kerja aktif dalam sepekan.')
        return
      }
      for (const day of activeDays) {
        if (!day.startTime || !day.endTime) {
          setErrorMsg(`Jam kerja untuk hari ${day.dayName} wajib diisi.`)
          return
        }
        if (day.startTime === day.endTime) {
          setErrorMsg(`Jam mulai dan jam selesai untuk hari ${day.dayName} tidak boleh sama.`)
          return
        }
      }
      setCreateStep(2)
      return
    }

    if (createStep === 2) {
      if (createForm.attendanceLocations.length === 0) {
        setErrorMsg('Tandai minimal satu titik lokasi absensi pada peta.')
        return
      }
      for (let i = 0; i < createForm.attendanceLocations.length; i++) {
        const pt = createForm.attendanceLocations[i]
        if (!pt.name.trim() || pt.name.trim().length < 2) {
          setErrorMsg(`Titik lokasi #${i + 1} memerlukan nama minimal 2 karakter.`)
          setCreateActivePointIndex(i)
          return
        }
        if (!pt.address.trim()) {
          setErrorMsg(`Titik lokasi #${i + 1} memerlukan alamat fisik. Klik pada peta untuk mengisi otomatis.`)
          setCreateActivePointIndex(i)
          return
        }
      }
      setCreateStep(3)
      return
    }

    // Step 3 -> Eksekusi Simpan
    handleCreateSubmit()
  }

  const handleCreateSubmit = async () => {
    setIsSubmitting(true)
    setErrorMsg(null)

    const autoCode = createForm.code.trim() || generateAutoShiftCode(createForm.name)

    try {
      const res = await api.shifting.shifts.post({
        companyId: selectedCompanyId,
        name: createForm.name.trim(),
        code: autoCode.toUpperCase(),
        description: createForm.description.trim() || undefined,
        startTime: createForm.startTime,
        endTime: createForm.endTime,
        workLocationId: createForm.workLocationId || undefined,
        schedules: createForm.schedules.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          dayName: s.dayName,
          startTime: s.isOff ? null : s.startTime,
          endTime: s.isOff ? null : s.endTime,
          isOff: s.isOff,
        })),
        attendanceLocations: createForm.attendanceLocations.map((loc) => ({
          name: loc.name.trim(),
          address: loc.address.trim(),
          city: loc.city.trim(),
          province: loc.province?.trim() || undefined,
          latitude: Number(loc.latitude),
          longitude: Number(loc.longitude),
          radiusMeters: Number(loc.radiusMeters),
          coordinatesType: loc.coordinatesType,
          polygonCoordinates:
            loc.polygonCoordinates && loc.polygonCoordinates.length > 0
              ? loc.polygonCoordinates
              : undefined,
          timezone: loc.timezone,
          locationId: loc.locationId || undefined,
        })),
        status: createForm.status,
        assignedEmployeeIds:
          createForm.assignedEmployeeIds.length > 0
            ? createForm.assignedEmployeeIds
            : undefined,
      })

      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal membuat shift.'))
        return
      }

      setSuccessMsg(
        `Master shift '${createForm.name}' berhasil dibuat dengan ${createForm.attendanceLocations.length} titik geofence presensi.`
      )
      setIsCreateOpen(false)
      fetchShiftData(selectedCompanyId)
    } catch {
      setErrorMsg('Terjadi kesalahan saat menghubungi layanan shifting.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Buka Dialog Ubah Shift
  const openEdit = (shift: Shift) => {
    setErrorMsg(null)
    setSuccessMsg(null)
    setEditItem(shift)
    setEditStep(1)
    setEditActivePointIndex(0)

    const baseLoc =
      locations.find((l) => l.id === shift.workLocationId) || primaryLocation || locations[0]

    const mappedPoints: AttendancePointDraft[] = (shift.attendanceLocations || []).map((loc, idx) => ({
      id: loc.id,
      name: loc.name || `Titik Presensi ${idx + 1}`,
      address: loc.address || baseLoc?.address || 'Lokasi Presensi',
      city: loc.city || baseLoc?.city || 'Jakarta',
      province: loc.province || baseLoc?.province || '',
      latitude: Number(loc.latitude) || -6.2088,
      longitude: Number(loc.longitude) || 106.8456,
      radiusMeters: Number(loc.radiusMeters) || 50,
      coordinatesType: (loc.coordinatesType as 'point' | 'polygon') || 'point',
      polygonCoordinates: loc.polygonCoordinates || [],
      timezone: loc.timezone || 'Asia/Jakarta',
      locationId: loc.id,
    }))

    const existingSchedules = shift.schedules ?? []
    const mappedSchedules: ShiftDailySchedule[] = DAYS_OF_WEEK.map((d) => {
      const match = existingSchedules.find((s) => s.dayOfWeek === d.dayOfWeek)
      if (match) {
        return {
          id: match.id,
          shiftId: match.shiftId,
          dayOfWeek: d.dayOfWeek,
          dayName: d.dayName,
          startTime: match.startTime ? displayTime(match.startTime) : null,
          endTime: match.endTime ? displayTime(match.endTime) : null,
          isOff: match.isOff,
        }
      }
      return {
        dayOfWeek: d.dayOfWeek,
        dayName: d.dayName,
        startTime: d.dayOfWeek <= 5 ? displayTime(shift.startTime) : null,
        endTime: d.dayOfWeek <= 5 ? displayTime(shift.endTime) : null,
        isOff: d.dayOfWeek > 5,
      }
    })

    setEditForm({
      name: shift.name,
      code: shift.code,
      description: shift.description ?? '',
      startTime: displayTime(shift.startTime),
      endTime: displayTime(shift.endTime),
      workLocationId: shift.workLocationId || '',
      attendanceLocations:
        mappedPoints.length > 0 ? mappedPoints : [createInitialPoint(baseLoc, 1)],
      status: shift.status,
      assignedEmployeeIds: shift.assignedEmployees?.map((emp) => emp.id) ?? [],
      schedules: mappedSchedules,
    })
  }

  // Operasi Titik Presensi pada Formulir Ubah
  const handleAddEditPoint = () => {
    const baseLoc =
      locations.find((l) => l.id === editForm.workLocationId) || primaryLocation || locations[0]
    const nextIdx = editForm.attendanceLocations.length + 1
    const newPoint = createInitialPoint(baseLoc, nextIdx)
    setEditForm((prev) => ({
      ...prev,
      attendanceLocations: [...prev.attendanceLocations, newPoint],
    }))
    setEditActivePointIndex(editForm.attendanceLocations.length)
  }

  const handleRemoveEditPoint = (idxToRemove: number) => {
    if (editForm.attendanceLocations.length <= 1) {
      setErrorMsg('Minimal harus ada 1 titik lokasi absensi.')
      return
    }
    setEditForm((prev) => ({
      ...prev,
      attendanceLocations: prev.attendanceLocations.filter((_, idx) => idx !== idxToRemove),
    }))
    setEditActivePointIndex((prev) => Math.max(0, Math.min(prev, editForm.attendanceLocations.length - 2)))
  }

  const handleUpdateEditPoint = (patch: Partial<AttendancePointDraft>) => {
    setEditForm((prev) => {
      const updated = [...prev.attendanceLocations]
      if (updated[editActivePointIndex]) {
        updated[editActivePointIndex] = { ...updated[editActivePointIndex], ...patch }
      }
      return { ...prev, attendanceLocations: updated }
    })
  }

  const toggleEditEmployee = (employeeId: string, checked: boolean) => {
    setEditForm((current) => ({
      ...current,
      assignedEmployeeIds: checked
        ? [...new Set([...current.assignedEmployeeIds, employeeId])]
        : current.assignedEmployeeIds.filter((id) => id !== employeeId),
    }))
  }

  // Navigasi Langkah Formulir Ubah
  const handleNextEditStep = () => {
    setErrorMsg(null)
    if (editStep === 1) {
      if (!editForm.name.trim() || editForm.name.trim().length < 2) {
        setErrorMsg('Nama shift wajib diisi minimal 2 karakter.')
        return
      }
      const activeDays = editForm.schedules.filter((s) => !s.isOff)
      if (activeDays.length === 0) {
        setErrorMsg('Tentukan minimal satu hari kerja aktif dalam sepekan.')
        return
      }
      for (const day of activeDays) {
        if (!day.startTime || !day.endTime) {
          setErrorMsg(`Jam kerja untuk hari ${day.dayName} wajib diisi.`)
          return
        }
        if (day.startTime === day.endTime) {
          setErrorMsg(`Jam mulai dan jam selesai untuk hari ${day.dayName} tidak boleh sama.`)
          return
        }
      }
      setEditStep(2)
      return
    }

    if (editStep === 2) {
      if (editForm.attendanceLocations.length === 0) {
        setErrorMsg('Tandai minimal satu titik lokasi absensi pada peta.')
        return
      }
      for (let i = 0; i < editForm.attendanceLocations.length; i++) {
        const pt = editForm.attendanceLocations[i]
        if (!pt.name.trim() || pt.name.trim().length < 2) {
          setErrorMsg(`Titik lokasi #${i + 1} memerlukan nama minimal 2 karakter.`)
          setEditActivePointIndex(i)
          return
        }
        if (!pt.address.trim()) {
          setErrorMsg(`Titik lokasi #${i + 1} memerlukan alamat fisik. Klik pada peta untuk mengisi otomatis.`)
          setEditActivePointIndex(i)
          return
        }
      }
      setEditStep(3)
      return
    }

    // Step 3 -> Eksekusi Simpan Perubahan
    handleEditSubmit()
  }

  const handleEditSubmit = async () => {
    if (!editItem) return
    setIsSubmitting(true)
    setErrorMsg(null)

    const autoCode = editForm.code.trim() || generateAutoShiftCode(editForm.name)

    try {
      const res = await api.shifting.shifts({ id: editItem.id }).put({
        companyId: selectedCompanyId,
        name: editForm.name.trim(),
        code: autoCode.toUpperCase(),
        description: editForm.description.trim() || undefined,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        workLocationId: editForm.workLocationId || undefined,
        schedules: editForm.schedules.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          dayName: s.dayName,
          startTime: s.isOff ? null : s.startTime,
          endTime: s.isOff ? null : s.endTime,
          isOff: s.isOff,
        })),
        attendanceLocations: editForm.attendanceLocations.map((loc) => ({
          name: loc.name.trim(),
          address: loc.address.trim(),
          city: loc.city.trim(),
          province: loc.province?.trim() || undefined,
          latitude: Number(loc.latitude),
          longitude: Number(loc.longitude),
          radiusMeters: Number(loc.radiusMeters),
          coordinatesType: loc.coordinatesType,
          polygonCoordinates:
            loc.polygonCoordinates && loc.polygonCoordinates.length > 0
              ? loc.polygonCoordinates
              : undefined,
          timezone: loc.timezone,
          locationId: loc.locationId || undefined,
        })),
        status: editForm.status,
        assignedEmployeeIds: editForm.assignedEmployeeIds,
      })

      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal memperbarui shift.'))
        return
      }

      setSuccessMsg(
        `Master shift '${editForm.name}' berhasil diperbarui (${editForm.attendanceLocations.length} titik geofence presensi).`
      )
      setEditItem(null)
      fetchShiftData(selectedCompanyId)
    } catch {
      setErrorMsg('Terjadi kesalahan saat memperbarui shift.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteItem) return

    setIsDeleting(true)
    setErrorMsg(null)

    try {
      const res = await api.shifting.shifts({ id: deleteItem.id }).delete()
      if (res.error) {
        setErrorMsg(errorText(res, 'Gagal menghapus shift.'))
        return
      }

      setSuccessMsg('Shift berhasil dihapus.')
      setDeleteItem(null)
      fetchShiftData(selectedCompanyId)
    } catch {
      setErrorMsg('Gagal menghapus shift.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Shift dapat dibuat secara mandiri tanpa harus ada karyawan atau kantor acuan terlebih dahulu
  const canCreate = Boolean(selectedCompanyId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Shift Operasional"
        description="Kelola shift kerja perusahaan (jam mulai, jam selesai, lokasi kerja, dan geofence absensi). Shift dapat dibuat sebelum karyawan didaftarkan."
        actions={
          <Button
            tone="primary"
            disabled={!canCreate}
            onClick={openCreate}
            icon={<HiOutlinePlus className="h-4 w-4" />}
          >
            Buat Shift
          </Button>
        }
      />

      {errorMsg && (
        <Notice tone="danger" title="Permintaan gagal" onDismiss={() => setErrorMsg(null)}>
          {errorMsg}
        </Notice>
      )}

      {successMsg && (
        <Notice tone="success" title="Perubahan tersimpan" onDismiss={() => setSuccessMsg(null)}>
          {successMsg}
        </Notice>
      )}

      {companies.length === 0 && !isLoading ? (
        <Panel>
          <EmptyState
            title="Belum ada badan usaha"
            description="Shift membutuhkan entitas perusahaan. Daftarkan perusahaan terlebih dahulu."
            action={
              <Link to={COMPANIES_PATH} className="inline-flex">
                <Button tone="primary" icon={<HiOutlineArrowRight className="h-4 w-4" />}>
                  Ke halaman perusahaan
                </Button>
              </Link>
            }
          />
        </Panel>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <SelectField
              label="Perusahaan"
              value={selectedCompanyId}
              onChange={(event) => setSelectedCompanyId(event.target.value)}
              className="w-full sm:max-w-sm 2xl:max-w-md"
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name} ({company.code})
                </option>
              ))}
            </SelectField>

            {selectedCompany ? (
              <p className="pb-1 text-xs text-ink-2 sm:pb-2 sm:text-[13px] 2xl:text-sm">
                <span className="font-mono font-bold text-ink">{selectedCompany.code}</span>
                {' · '}
                {isLoading ? 'memuat' : `${shifts.length} shift terdaftar`}
                {' · '}
                {activeEmployees.length} karyawan aktif
                {' · '}
                {locations.length} titik geofence
              </p>
            ) : null}
          </div>

          {activeEmployees.length === 0 && !isLoading ? (
            <Notice tone="info" title="Master Shift Mandiri">
              Perusahaan ini belum memiliki karyawan. Anda dapat membuat master shift terlebih dahulu agar langsung siap dipilih saat pendaftaran karyawan.{' '}
              <Link
                to={EMPLOYEES_PATH}
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Buka menu karyawan
              </Link>
              .
            </Notice>
          ) : null}

          <Panel>
            <PanelHeader
              title="Daftar Master Shift"
              description="Shift mengikat jadwal jam kerja operasional dan titik geofence presensi yang diizinkan."
              meta={isLoading ? undefined : `${shifts.length} shift`}
            />

            {isLoading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : shifts.length === 0 ? (
              <EmptyState
                title="Belum ada shift"
                description={
                  canCreate
                    ? `Buat master shift pertama untuk ${selectedCompany?.name ?? 'perusahaan ini'}.`
                    : 'Lengkapi lokasi kantor perusahaan untuk mulai membuat shift.'
                }
                action={
                  canCreate ? (
                    <Button
                      tone="primary"
                      onClick={openCreate}
                      icon={<HiOutlinePlus className="h-4 w-4" />}
                    >
                      Buat Shift
                    </Button>
                  ) : null
                }
              />
            ) : (
              <div className="overflow-x-auto rounded-b-panel">
                <table className="w-full min-w-[1040px] border-collapse text-left text-[13px] 2xl:text-sm">
                  <thead>
                    <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-3 2xl:text-xs">
                      <th className="px-4 py-2.5 font-semibold sm:px-5 2xl:px-7 2xl:py-3.5">Nama & Kode Shift</th>
                      <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Jam kerja</th>
                      <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Area operasional</th>
                      <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Titik absensi (Geofence)</th>
                      <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Karyawan bertugas</th>
                      <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Status</th>
                      <th className="px-4 py-2.5 text-right font-semibold sm:px-5 2xl:px-7 2xl:py-3.5">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {shifts.map((shift) => (
                      <tr key={shift.id} className="transition-colors hover:bg-surface-2">
                        <td className="px-4 py-3.5 align-top sm:px-5 2xl:px-7 2xl:py-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-ink">{shift.name}</p>
                              <Badge tone="accent">{shift.code}</Badge>
                            </div>
                            {shift.description ? (
                              <p className="mt-0.5 text-xs text-ink-3 truncate max-w-xs">{shift.description}</p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-top 2xl:py-4">
                          <div className="flex items-center gap-2 text-ink">
                            <HiOutlineClock className="h-4 w-4 shrink-0 text-ink-3" />
                            <span className="font-medium tabular">
                              {displayTime(shift.startTime)} — {displayTime(shift.endTime)}
                            </span>
                          </div>
                          {isOvernight(shift.startTime, shift.endTime) ? (
                            <p className="mt-0.5 text-[11px] font-medium text-amber-600">Melewati tengah malam</p>
                          ) : null}

                          {/* Chips Jadwal Harian (Sen - Min) */}
                          {shift.schedules && shift.schedules.length > 0 ? (
                            <div className="mt-2">
                              <div className="flex flex-wrap items-center gap-1">
                                {DAYS_OF_WEEK.map((d) => {
                                  const daySched = shift.schedules?.find((s) => s.dayOfWeek === d.dayOfWeek)
                                  const isOff = daySched ? daySched.isOff : d.dayOfWeek > 5
                                  const title = isOff
                                    ? `${d.dayName}: Libur (Day Off)`
                                    : `${d.dayName}: ${displayTime(daySched?.startTime)} — ${displayTime(daySched?.endTime)}`
                                  return (
                                    <span
                                      key={d.dayOfWeek}
                                      title={title}
                                      className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                        isOff
                                          ? 'bg-surface-2 text-ink-3/50 line-through decoration-ink-3/40'
                                          : 'bg-primary-subtle text-primary border border-primary-line/40'
                                      }`}
                                    >
                                      {d.shortName}
                                    </span>
                                  )
                                })}
                              </div>
                              {(() => {
                                const activeScheds = (shift.schedules || []).filter((s) => !s.isOff)
                                const hasVaryingHours = activeScheds.some(
                                  (s) =>
                                    displayTime(s.startTime) !== displayTime(activeScheds[0]?.startTime) ||
                                    displayTime(s.endTime) !== displayTime(activeScheds[0]?.endTime)
                                )
                                if (hasVaryingHours) {
                                  return (
                                    <p className="mt-1 text-[10px] text-ink-3 font-medium">
                                      • Jam berbeda per hari
                                    </p>
                                  )
                                }
                                return null
                              })()}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3.5 align-top 2xl:py-4">
                          <div className="flex items-start gap-2">
                            <HiOutlineLocationMarker className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
                            <div>
                              <p className="font-medium text-ink">
                                {shift.workLocation?.name || shift.attendanceLocations[0]?.city || 'Operasional Perusahaan'}
                              </p>
                              <p className="text-xs text-ink-3">
                                {shift.workLocation?.city || (shift.attendanceLocations.length > 0 ? `${shift.attendanceLocations.length} titik presensi` : 'Geofence mandiri')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="max-w-[320px] px-4 py-3.5 align-top 2xl:py-4">
                          <p className="text-xs font-semibold text-ink">
                            {shift.attendanceLocations.length} titik geofence
                          </p>
                          <div className="mt-1.5 space-y-1.5">
                            {shift.attendanceLocations.map((loc) => {
                              const isPolygon = loc.coordinatesType === 'polygon'
                              const polygonPoints = loc.polygonCoordinates?.length ?? 0
                              return (
                                <div
                                  key={loc.id}
                                  className="rounded border border-line bg-surface-1 px-2.5 py-1.5 text-xs shadow-xs"
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-medium text-ink truncate">{loc.name}</span>
                                    <span className="shrink-0 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-surface-2 border border-line text-ink-2">
                                      {isPolygon ? `Polygon (${polygonPoints} t)` : `Point (${loc.radiusMeters}m)`}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-ink-3 truncate mt-0.5">
                                    {loc.city} · {loc.address}
                                  </p>
                                </div>
                              )
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-top text-ink-2 2xl:py-4">
                          <div className="flex items-center gap-1.5">
                            <HiOutlineUserGroup className="h-4 w-4 text-ink-3 shrink-0" />
                            <span className="text-xs font-medium text-ink">
                              {shift.assignedCount ?? shift.assignedEmployees?.length ?? 0} karyawan
                            </span>
                          </div>
                          {shift.assignedEmployees && shift.assignedEmployees.length > 0 ? (
                            <p className="mt-1 text-xs text-ink-3 truncate max-w-[200px]">
                              {shift.assignedEmployees.map((e) => e.name).join(', ')}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-ink-3 italic">Belum ada penugasan</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 align-top 2xl:py-4">
                          <StatusFromValue value={shift.status} />
                        </td>
                        <td className="px-4 py-3.5 text-right align-top sm:px-5 2xl:px-7 2xl:py-4">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              size="iconSm"
                              tone="quiet"
                              onClick={() => openEdit(shift)}
                              aria-label={`Ubah shift ${shift.name}`}
                              title="Ubah shift"
                            >
                              <HiOutlinePencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="iconSm"
                              tone="quiet"
                              className="text-error hover:bg-error-subtle hover:text-error"
                              onClick={() => {
                                setErrorMsg(null)
                                setSuccessMsg(null)
                                setDeleteItem(shift)
                              }}
                              aria-label={`Hapus shift ${shift.name}`}
                              title="Hapus shift"
                            >
                              <HiOutlineTrash className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}

      {/* Dialog Buat Shift — Multi-Step Wizard (3 Langkah) */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onRequestClose={() => setIsCreateOpen(false)}
        width={880}
      >
        <DialogHeading
          title="Buat Master Shift & Titik Geofence Absensi"
          description={`Langkah ${createStep} dari 3 · ${
            createStep === 1
              ? 'Informasi & Jadwal Kerja'
              : createStep === 2
                ? 'Peta & Penandaan Titik Absensi Geofence'
                : 'Rekapitulasi & Konfirmasi Shift'
          }`}
        />

        {/* Stepper Header Navigation */}
        <div className="border-b border-line bg-surface-2/60 px-4 py-2.5 sm:px-6">
          <div className="grid grid-cols-3 gap-2">
            {[
              { num: 1, label: 'Jadwal & Info' },
              { num: 2, label: 'Peta Presensi' },
              { num: 3, label: 'Konfirmasi' },
            ].map((s) => {
              const isPassed = createStep > s.num
              const isCurrent = createStep === s.num
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < createStep) setCreateStep(s.num)
                  }}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors ${
                    isCurrent
                      ? 'bg-surface font-bold text-primary shadow-sm border border-line'
                      : isPassed
                        ? 'text-ink-2 hover:bg-surface-2/80 cursor-pointer font-medium'
                        : 'text-ink-3/60 cursor-default'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-primary text-primary-on'
                        : isPassed
                          ? 'bg-success text-white'
                          : 'bg-line-strong/60 text-ink-3'
                    }`}
                  >
                    {isPassed ? '✓' : s.num}
                  </span>
                  <span className="truncate">{s.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="px-4 py-5 sm:px-6 max-h-[75vh] overflow-y-auto">
            {errorMsg ? (
              <Notice tone="danger" title="Perhatian" onDismiss={() => setErrorMsg(null)} className="mb-4">
                {errorMsg}
              </Notice>
            ) : null}

            {/* LANGKAH 1: DETAIL JADWAL SHIFT */}
            {createStep === 1 && (
              <div className="space-y-4">
                <div className="rounded-control border border-line/80 bg-surface-2/40 p-3 text-xs text-ink-2">
                  Tentukan identitas shift dan jam kerja operasional. Shift ini dapat langsung dibuat sebelum karyawan didaftarkan.
                </div>

                <div className="space-y-1.5">
                  <TextField
                    label="Nama master shift"
                    value={createForm.name}
                    onChange={(event) => {
                      const newName = event.target.value
                      setCreateForm((current) => ({
                        ...current,
                        name: newName,
                        code: generateAutoShiftCode(newName),
                      }))
                    }}
                    placeholder="Misal: Shift Pagi, Shift Siang, Shift Malam, Shift Reguler"
                    required
                  />
                  {createForm.name.trim() ? (
                    <div className="flex items-center gap-1.5 text-xs text-ink-3">
                      <span>Kode shift:</span>
                      <span className="font-mono font-bold text-ink rounded bg-surface-2 px-1.5 py-0.5 border border-line text-[11px]">
                        {createForm.code || generateAutoShiftCode(createForm.name)}
                      </span>
                      <span className="text-[11px] text-ink-3">· Dibuat otomatis</span>
                    </div>
                  ) : null}
                </div>

                {/* Editor Jadwal Kerja Harian (7 Hari) */}
                {renderDailyScheduleEditor(
                  createForm,
                  (dayOfWeek, patch) => handleUpdateSchedule(false, dayOfWeek, patch),
                  (type) => applySchedulePreset(false, type)
                )}

                <TextField
                  label="Keterangan / Catatan operasional (opsional)"
                  value={createForm.description}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Catatan penugasan, instruksi serah-terima tugas, atau toleransi presensi"
                />

                {activeEmployees.length > 0 ? (
                  <div className="space-y-2 border-t border-line/60 pt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-ink">
                        Tugaskan ke karyawan aktif (opsional)
                      </p>
                      <span className="text-[11px] text-ink-3">
                        {createForm.assignedEmployeeIds.length} karyawan dipilih
                      </span>
                    </div>
                    <div className="grid max-h-40 gap-2 overflow-y-auto rounded-control border border-line bg-surface p-2.5 sm:grid-cols-2">
                      {activeEmployees.map((employee) => (
                        <CheckboxField
                          key={employee.id}
                          label={employee.name}
                          checked={createForm.assignedEmployeeIds.includes(employee.id)}
                          onChange={(event) =>
                            toggleCreateEmployee(employee.id, event.target.checked)
                          }
                          hint={`${employee.position || 'Staf'} ${employee.department ? `· ${employee.department.name}` : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* LANGKAH 2: PETA & TITIK PRESENSI GEOFENCE */}
            {createStep === 2 && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line/80 bg-surface-2/40 p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-ink">
                        Titik Presensi Geofence ({createForm.attendanceLocations.length} Titik Terdaftar)
                      </span>
                      <Badge tone="accent">Peta Interaktif</Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-ink-3">
                      Tandai posisi pointer pada peta. Alamat fisik dan koordinat GPS akan otomatis tersinkronisasi. Minimal 1 titik dan bisa lebih dari 1 lokasi.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    tone="primary"
                    onClick={handleAddCreatePoint}
                    icon={<HiOutlinePlus className="h-4 w-4" />}
                  >
                    Tambah Titik Presensi
                  </Button>
                </div>

                {/* Tab Bar Pemilih Titik */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-line">
                  {createForm.attendanceLocations.map((loc, idx) => {
                    const isSelected = createActivePointIndex === idx
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCreateActivePointIndex(idx)}
                        className={`shrink-0 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-primary text-primary-on shadow-xs font-semibold'
                            : 'bg-surface-2 text-ink-2 hover:bg-surface border border-line'
                        }`}
                      >
                        <HiOutlineLocationMarker className="h-3.5 w-3.5 shrink-0" />
                        <span className="max-w-[150px] truncate">{loc.name || `Titik #${idx + 1}`}</span>
                        <span className={`text-[10px] px-1 rounded ${isSelected ? 'bg-white/25 text-white' : 'bg-surface text-ink-3'}`}>
                          {loc.radiusMeters}m
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Editor Titik Aktif */}
                {createForm.attendanceLocations[createActivePointIndex] && (
                  <div className="grid gap-4 lg:grid-cols-12">
                    {/* Kolom Peta (7 kolom) */}
                    <div className="space-y-2 lg:col-span-7">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-ink">
                          Peta Titik #{createActivePointIndex + 1}: {createForm.attendanceLocations[createActivePointIndex].name}
                        </span>
                        <span className="text-[11px] text-ink-3">
                          Klik peta untuk memindahkan pin & isi alamat
                        </span>
                      </div>
                      <LeafletMapPicker
                        key={`create-map-${createActivePointIndex}`}
                        latitude={createForm.attendanceLocations[createActivePointIndex].latitude}
                        longitude={createForm.attendanceLocations[createActivePointIndex].longitude}
                        radiusMeters={createForm.attendanceLocations[createActivePointIndex].radiusMeters}
                        polygon={createForm.attendanceLocations[createActivePointIndex].polygonCoordinates}
                        mode={createForm.attendanceLocations[createActivePointIndex].coordinatesType}
                        cityName={createForm.attendanceLocations[createActivePointIndex].city}
                        provinceName={createForm.attendanceLocations[createActivePointIndex].province}
                        onChange={({ latitude, longitude, radiusMeters, coordinatesType, polygonCoordinates }) => {
                          handleUpdateCreatePoint({
                            latitude,
                            longitude,
                            radiusMeters,
                            coordinatesType,
                            polygonCoordinates: coordinatesType === 'point' ? [] : polygonCoordinates,
                          })
                        }}
                        onAddressSelect={(resolved) => {
                          handleUpdateCreatePoint({
                            address: resolved.fullAddress || createForm.attendanceLocations[createActivePointIndex].address,
                            city: resolved.city || createForm.attendanceLocations[createActivePointIndex].city,
                            province: resolved.province || createForm.attendanceLocations[createActivePointIndex].province,
                          })
                        }}
                        height={340}
                      />
                    </div>

                    {/* Kolom Form Atribut Titik (5 kolom) */}
                    <div className="space-y-3 rounded-control border border-line bg-surface p-3.5 lg:col-span-5">
                      <div className="flex items-center justify-between border-b border-line pb-2">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-ink-3">
                          Konfigurasi Titik #{createActivePointIndex + 1}
                        </h5>
                        {createForm.attendanceLocations.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveCreatePoint(createActivePointIndex)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-error hover:underline"
                            title="Hapus titik lokasi ini"
                          >
                            <HiOutlineTrash className="h-3.5 w-3.5" />
                            Hapus Titik
                          </button>
                        ) : (
                          <span className="text-[10px] text-ink-3 italic">
                            Minimal 1 titik wajib
                          </span>
                        )}
                      </div>

                      {/* Pemilih Tipe Geofence Presensi (Pointer vs Poligon) */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-ink">
                          Tipe Geofence Presensi
                        </label>
                        <div className="grid grid-cols-2 gap-1 rounded-control border border-line bg-surface-2 p-1 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateCreatePoint({
                                coordinatesType: 'point',
                                polygonCoordinates: [],
                              })
                            }
                            className={`rounded px-2.5 py-1.5 font-medium transition-colors ${
                              createForm.attendanceLocations[createActivePointIndex].coordinatesType === 'point'
                                ? 'bg-white font-bold text-primary shadow-xs'
                                : 'text-ink-2 hover:text-ink'
                            }`}
                          >
                            Pointer (Titik & Radius)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const currentPt = createForm.attendanceLocations[createActivePointIndex]
                              let poly = currentPt.polygonCoordinates
                              if (!poly || poly.length < 3) {
                                const lat = currentPt.latitude
                                const lng = currentPt.longitude
                                const rad = currentPt.radiusMeters || 50
                                const latDelta = (rad / 111320) * 0.9
                                const lngDelta = (rad / (111320 * Math.cos((lat * Math.PI) / 180))) * 0.9
                                poly = [
                                  [Number((lat + latDelta).toFixed(7)), Number((lng - lngDelta).toFixed(7))],
                                  [Number((lat + latDelta).toFixed(7)), Number((lng + lngDelta).toFixed(7))],
                                  [Number((lat - latDelta).toFixed(7)), Number((lng + lngDelta).toFixed(7))],
                                  [Number((lat - latDelta).toFixed(7)), Number((lng - lngDelta).toFixed(7))],
                                ]
                              }
                              handleUpdateCreatePoint({
                                coordinatesType: 'polygon',
                                polygonCoordinates: poly,
                              })
                            }}
                            className={`rounded px-2.5 py-1.5 font-medium transition-colors ${
                              createForm.attendanceLocations[createActivePointIndex].coordinatesType === 'polygon'
                                ? 'bg-white font-bold text-primary shadow-xs'
                                : 'text-ink-2 hover:text-ink'
                            }`}
                          >
                            Poligon (Area Bidang)
                          </button>
                        </div>
                      </div>

                      <TextField
                        label="Nama titik presensi"
                        value={createForm.attendanceLocations[createActivePointIndex].name}
                        onChange={(e) => handleUpdateCreatePoint({ name: e.target.value })}
                        placeholder="Pintu Gerbang Utama / Lobby Depan"
                        required
                      />

                      <TextAreaField
                        label="Alamat lengkap (otomatis terisi saat peta diklik)"
                        value={createForm.attendanceLocations[createActivePointIndex].address}
                        onChange={(e) => handleUpdateCreatePoint({ address: e.target.value })}
                        placeholder="Gedung, jalan, nomor (otomatis dari peta)"
                        rows={2}
                        required
                      />

                      <div className="grid gap-2 sm:grid-cols-2">
                        <TextField
                          label="Kota / Wilayah"
                          value={createForm.attendanceLocations[createActivePointIndex].city}
                          onChange={(e) => handleUpdateCreatePoint({ city: e.target.value })}
                          placeholder="Jakarta Selatan"
                          required
                        />
                        <TextField
                          label="Provinsi"
                          value={createForm.attendanceLocations[createActivePointIndex].province || ''}
                          onChange={(e) => handleUpdateCreatePoint({ province: e.target.value })}
                          placeholder="DKI Jakarta"
                        />
                      </div>

                      {createForm.attendanceLocations[createActivePointIndex].coordinatesType === 'point' ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <TextField
                            label="Radius presensi (meter)"
                            type="number"
                            value={createForm.attendanceLocations[createActivePointIndex].radiusMeters}
                            onChange={(e) =>
                              handleUpdateCreatePoint({ radiusMeters: Number(e.target.value) || 50 })
                            }
                            min={10}
                            max={5000}
                            required
                            hint="Toleransi lingkaran dari pin"
                          />
                          <SelectField
                            label="Zona waktu"
                            value={createForm.attendanceLocations[createActivePointIndex].timezone}
                            onChange={(e) => handleUpdateCreatePoint({ timezone: e.target.value })}
                          >
                            {TIMEZONES.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </SelectField>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="rounded border border-line bg-surface-2 p-2.5 text-xs space-y-1.5">
                            <div className="flex items-center justify-between font-semibold text-primary">
                              <span>Mode Poligon Aktif</span>
                              <span className="font-mono text-[11px] text-ink-3">
                                {createForm.attendanceLocations[createActivePointIndex].polygonCoordinates?.length || 0} sudut
                              </span>
                            </div>
                            <p className="text-[11px] text-ink-3">
                              Batas presensi ditentukan oleh bidang poligon di peta.
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateCreatePoint({
                                  coordinatesType: 'point',
                                  polygonCoordinates: [],
                                })
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                            >
                              ← Kembali ke Pointer (Titik & Radius)
                            </button>
                          </div>
                          <SelectField
                            label="Zona waktu"
                            value={createForm.attendanceLocations[createActivePointIndex].timezone}
                            onChange={(e) => handleUpdateCreatePoint({ timezone: e.target.value })}
                          >
                            {TIMEZONES.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </SelectField>
                        </div>
                      )}

                      <div className="rounded border border-line bg-surface-2 px-2.5 py-1.5 text-[11px] text-ink-3">
                        Koordinat GPS:{' '}
                        <span className="font-mono text-ink font-semibold">
                          {createForm.attendanceLocations[createActivePointIndex].latitude.toFixed(6)},{' '}
                          {createForm.attendanceLocations[createActivePointIndex].longitude.toFixed(6)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* LANGKAH 3: REKAPITULASI & KONFIRMASI */}
            {createStep === 3 && (
              <div className="space-y-4">
                <div className="rounded-control border border-primary-line bg-primary-subtle p-3 text-xs text-primary">
                  Periksa ringkasan konfigurasi master shift di bawah ini sebelum disimpan ke dalam klaster.
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-control border border-line bg-surface p-3.5 space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-ink-3">
                      Informasi & Jadwal Shift
                    </h5>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold rounded bg-surface-2 px-1.5 py-0.5 border border-line text-ink">
                        {createForm.code}
                      </span>
                      <span className="font-bold text-sm text-ink">{createForm.name}</span>
                    </div>
                    <div className="text-xs text-ink-2 space-y-1 pt-1 border-t border-line/60">
                      <p className="flex items-center gap-1.5">
                        <HiOutlineClock className="h-4 w-4 text-primary shrink-0" />
                        <span>
                          Jam Kerja: <strong>{createForm.startTime} — {createForm.endTime}</strong> ({calculateDuration(createForm.startTime, createForm.endTime)})
                        </span>
                      </p>
                      {isOvernight(createForm.startTime, createForm.endTime) ? (
                        <p className="text-warning font-semibold text-[11px]">
                          • Shift Lintas Hari (Melewati tengah malam)
                        </p>
                      ) : null}
                      <p>
                        Status: <span className="font-semibold text-ink">{createForm.status === 'active' ? 'Aktif' : 'Nonaktif'}</span>
                      </p>
                      {createForm.description ? (
                        <p className="text-ink-3 italic">{createForm.description}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-control border border-line bg-surface p-3.5 space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-ink-3">
                      Penugasan & Geofence
                    </h5>
                    <p className="text-xs text-ink-2">
                      Karyawan Ditugaskan: <strong className="text-ink">{createForm.assignedEmployeeIds.length} orang</strong>
                    </p>
                    <p className="text-xs text-ink-2">
                      Cakupan Titik Presensi: <strong className="text-ink">{createForm.attendanceLocations.length} titik geofence</strong>
                    </p>
                  </div>
                </div>

                {/* Ringkasan Jadwal Harian */}
                {renderDailyScheduleSummary(createForm.schedules)}

                {/* Ringkasan Titik Geofence Presensi */}
                <div className="rounded-control border border-line bg-surface p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-ink-3">
                      Daftar Titik Geofence Presensi ({createForm.attendanceLocations.length} Titik Terdaftar)
                    </h5>
                    <button
                      type="button"
                      onClick={() => setCreateStep(2)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Ubah di Peta
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {createForm.attendanceLocations.map((loc, idx) => (
                      <div key={idx} className="rounded border border-line bg-surface-2 p-2.5 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-ink truncate">{loc.name}</span>
                          <span className="shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-surface border border-line text-primary">
                            Radius {loc.radiusMeters}m
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-3 truncate">{loc.address}</p>
                        <div className="flex items-center justify-between text-[10px] text-ink-3 pt-0.5">
                          <span className="font-mono">
                            {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                          </span>
                          <span>
                            {loc.city} · {loc.timezone}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogBody>

          <DialogFooter className="justify-between px-4 py-3 sm:px-6">
            {createStep > 1 ? (
              <Button
                type="button"
                onClick={() => setCreateStep((s) => Math.max(s - 1, 1))}
                icon={<HiOutlineArrowLeft className="h-4 w-4" />}
              >
                Sebelumnya
              </Button>
            ) : (
              <Button type="button" onClick={() => setIsCreateOpen(false)}>
                Batal
              </Button>
            )}

            {createStep < 3 ? (
              <Button type="button" tone="primary" onClick={handleNextCreateStep}>
                Lanjutkan Langkah {createStep + 1}
                <HiOutlineArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                tone="primary"
                loading={isSubmitting}
                onClick={handleCreateSubmit}
              >
                {isSubmitting ? 'Menyimpan Shift...' : 'Daftarkan Master Shift'}
              </Button>
            )}
          </DialogFooter>
        </div>
      </Dialog>

      {/* Dialog Ubah Shift — Multi-Step Wizard (3 Langkah) */}
      <Dialog
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        onRequestClose={() => setEditItem(null)}
        width={880}
      >
        <DialogHeading
          title={`Ubah Master Shift — ${editItem?.name ?? ''}`}
          description={`Langkah ${editStep} dari 3 · ${
            editStep === 1
              ? 'Informasi & Jadwal Kerja'
              : editStep === 2
                ? 'Peta & Penandaan Titik Absensi Geofence'
                : 'Rekapitulasi & Konfirmasi Perubahan'
          }`}
        />

        {/* Stepper Header Navigation */}
        <div className="border-b border-line bg-surface-2/60 px-4 py-2.5 sm:px-6">
          <div className="grid grid-cols-3 gap-2">
            {[
              { num: 1, label: 'Jadwal & Info' },
              { num: 2, label: 'Peta Presensi' },
              { num: 3, label: 'Konfirmasi' },
            ].map((s) => {
              const isPassed = editStep > s.num
              const isCurrent = editStep === s.num
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < editStep) setEditStep(s.num)
                  }}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors ${
                    isCurrent
                      ? 'bg-surface font-bold text-primary shadow-sm border border-line'
                      : isPassed
                        ? 'text-ink-2 hover:bg-surface-2/80 cursor-pointer font-medium'
                        : 'text-ink-3/60 cursor-default'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-primary text-primary-on'
                        : isPassed
                          ? 'bg-success text-white'
                          : 'bg-line-strong/60 text-ink-3'
                    }`}
                  >
                    {isPassed ? '✓' : s.num}
                  </span>
                  <span className="truncate">{s.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="px-4 py-5 sm:px-6 max-h-[75vh] overflow-y-auto">
            {errorMsg ? (
              <Notice tone="danger" title="Perhatian" onDismiss={() => setErrorMsg(null)} className="mb-4">
                {errorMsg}
              </Notice>
            ) : null}

            {/* LANGKAH 1: DETAIL JADWAL SHIFT (Ubah) */}
            {editStep === 1 && (
              <div className="space-y-4">
                <div className="rounded-control border border-line/80 bg-surface-2/40 p-3 text-xs text-ink-2">
                  Sesuaikan nama shift, kode identifikasi, dan jam kerja operasional.
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <TextField
                      label="Nama master shift"
                      value={editForm.name}
                      onChange={(event) => {
                        const newName = event.target.value
                        setEditForm((current) => ({
                          ...current,
                          name: newName,
                          code: current.code || generateAutoShiftCode(newName),
                        }))
                      }}
                      required
                    />
                    <div className="flex items-center gap-1.5 text-xs text-ink-3">
                      <span>Kode shift:</span>
                      <span className="font-mono font-bold text-ink rounded bg-surface-2 px-1.5 py-0.5 border border-line text-[11px]">
                        {editForm.code || generateAutoShiftCode(editForm.name)}
                      </span>
                      <span className="text-[11px] text-ink-3">· Otomatis</span>
                    </div>
                  </div>

                  <SelectField
                    label="Status shift"
                    value={editForm.status}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, status: event.target.value }))
                    }
                  >
                    {SHIFT_STATUSES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </div>

                {/* Editor Jadwal Kerja Harian (7 Hari) */}
                {renderDailyScheduleEditor(
                  editForm,
                  (dayOfWeek, patch) => handleUpdateSchedule(true, dayOfWeek, patch),
                  (type) => applySchedulePreset(true, type)
                )}

                <TextField
                  label="Keterangan / Catatan operasional (opsional)"
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, description: event.target.value }))
                  }
                />

                {activeEmployees.length > 0 ? (
                  <div className="space-y-2 border-t border-line/60 pt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-ink">
                        Karyawan yang ditugaskan pada shift ini
                      </p>
                      <span className="text-[11px] text-ink-3">
                        {editForm.assignedEmployeeIds.length} karyawan dipilih
                      </span>
                    </div>
                    <div className="grid max-h-40 gap-2 overflow-y-auto rounded-control border border-line bg-surface p-2.5 sm:grid-cols-2">
                      {activeEmployees.map((employee) => (
                        <CheckboxField
                          key={employee.id}
                          label={employee.name}
                          checked={editForm.assignedEmployeeIds.includes(employee.id)}
                          onChange={(event) =>
                            toggleEditEmployee(employee.id, event.target.checked)
                          }
                          hint={`${employee.position || 'Staf'} ${employee.department ? `· ${employee.department.name}` : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* LANGKAH 2: PETA & TITIK PRESENSI GEOFENCE (Ubah) */}
            {editStep === 2 && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line/80 bg-surface-2/40 p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-ink">
                        Titik Presensi Geofence ({editForm.attendanceLocations.length} Titik Terdaftar)
                      </span>
                      <Badge tone="accent">Peta Interaktif</Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-ink-3">
                      Tandai posisi pointer pada peta. Alamat fisik dan koordinat GPS akan otomatis tersinkronisasi. Minimal 1 titik dan bisa lebih dari 1 lokasi.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    tone="primary"
                    onClick={handleAddEditPoint}
                    icon={<HiOutlinePlus className="h-4 w-4" />}
                  >
                    Tambah Titik Presensi
                  </Button>
                </div>

                {/* Tab Bar Pemilih Titik */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-line">
                  {editForm.attendanceLocations.map((loc, idx) => {
                    const isSelected = editActivePointIndex === idx
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditActivePointIndex(idx)}
                        className={`shrink-0 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-primary text-primary-on shadow-xs font-semibold'
                            : 'bg-surface-2 text-ink-2 hover:bg-surface border border-line'
                        }`}
                      >
                        <HiOutlineLocationMarker className="h-3.5 w-3.5 shrink-0" />
                        <span className="max-w-[150px] truncate">{loc.name || `Titik #${idx + 1}`}</span>
                        <span className={`text-[10px] px-1 rounded ${isSelected ? 'bg-white/25 text-white' : 'bg-surface text-ink-3'}`}>
                          {loc.radiusMeters}m
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Editor Titik Aktif */}
                {editForm.attendanceLocations[editActivePointIndex] && (
                  <div className="grid gap-4 lg:grid-cols-12">
                    {/* Kolom Peta (7 kolom) */}
                    <div className="space-y-2 lg:col-span-7">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-ink">
                          Peta Titik #{editActivePointIndex + 1}: {editForm.attendanceLocations[editActivePointIndex].name}
                        </span>
                        <span className="text-[11px] text-ink-3">
                          Klik peta untuk memindahkan pin & isi alamat
                        </span>
                      </div>
                      <LeafletMapPicker
                        key={`edit-map-${editActivePointIndex}`}
                        latitude={editForm.attendanceLocations[editActivePointIndex].latitude}
                        longitude={editForm.attendanceLocations[editActivePointIndex].longitude}
                        radiusMeters={editForm.attendanceLocations[editActivePointIndex].radiusMeters}
                        polygon={editForm.attendanceLocations[editActivePointIndex].polygonCoordinates}
                        mode={editForm.attendanceLocations[editActivePointIndex].coordinatesType}
                        cityName={editForm.attendanceLocations[editActivePointIndex].city}
                        provinceName={editForm.attendanceLocations[editActivePointIndex].province}
                        onChange={({ latitude, longitude, radiusMeters, coordinatesType, polygonCoordinates }) => {
                          handleUpdateEditPoint({
                            latitude,
                            longitude,
                            radiusMeters,
                            coordinatesType,
                            polygonCoordinates: coordinatesType === 'point' ? [] : polygonCoordinates,
                          })
                        }}
                        onAddressSelect={(resolved) => {
                          handleUpdateEditPoint({
                            address: resolved.fullAddress || editForm.attendanceLocations[editActivePointIndex].address,
                            city: resolved.city || editForm.attendanceLocations[editActivePointIndex].city,
                            province: resolved.province || editForm.attendanceLocations[editActivePointIndex].province,
                          })
                        }}
                        height={340}
                      />
                    </div>

                    {/* Kolom Form Atribut Titik (5 kolom) */}
                    <div className="space-y-3 rounded-control border border-line bg-surface p-3.5 lg:col-span-5">
                      <div className="flex items-center justify-between border-b border-line pb-2">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-ink-3">
                          Konfigurasi Titik #{editActivePointIndex + 1}
                        </h5>
                        {editForm.attendanceLocations.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveEditPoint(editActivePointIndex)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-error hover:underline"
                            title="Hapus titik lokasi ini"
                          >
                            <HiOutlineTrash className="h-3.5 w-3.5" />
                            Hapus Titik
                          </button>
                        ) : (
                          <span className="text-[10px] text-ink-3 italic">
                            Minimal 1 titik wajib
                          </span>
                        )}
                      </div>

                      {/* Pemilih Tipe Geofence Presensi (Pointer vs Poligon) */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-ink">
                          Tipe Geofence Presensi
                        </label>
                        <div className="grid grid-cols-2 gap-1 rounded-control border border-line bg-surface-2 p-1 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateEditPoint({
                                coordinatesType: 'point',
                                polygonCoordinates: [],
                              })
                            }
                            className={`rounded px-2.5 py-1.5 font-medium transition-colors ${
                              editForm.attendanceLocations[editActivePointIndex].coordinatesType === 'point'
                                ? 'bg-white font-bold text-primary shadow-xs'
                                : 'text-ink-2 hover:text-ink'
                            }`}
                          >
                            Pointer (Titik & Radius)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const currentPt = editForm.attendanceLocations[editActivePointIndex]
                              let poly = currentPt.polygonCoordinates
                              if (!poly || poly.length < 3) {
                                const lat = currentPt.latitude
                                const lng = currentPt.longitude
                                const rad = currentPt.radiusMeters || 50
                                const latDelta = (rad / 111320) * 0.9
                                const lngDelta = (rad / (111320 * Math.cos((lat * Math.PI) / 180))) * 0.9
                                poly = [
                                  [Number((lat + latDelta).toFixed(7)), Number((lng - lngDelta).toFixed(7))],
                                  [Number((lat + latDelta).toFixed(7)), Number((lng + lngDelta).toFixed(7))],
                                  [Number((lat - latDelta).toFixed(7)), Number((lng + lngDelta).toFixed(7))],
                                  [Number((lat - latDelta).toFixed(7)), Number((lng - lngDelta).toFixed(7))],
                                ]
                              }
                              handleUpdateEditPoint({
                                coordinatesType: 'polygon',
                                polygonCoordinates: poly,
                              })
                            }}
                            className={`rounded px-2.5 py-1.5 font-medium transition-colors ${
                              editForm.attendanceLocations[editActivePointIndex].coordinatesType === 'polygon'
                                ? 'bg-white font-bold text-primary shadow-xs'
                                : 'text-ink-2 hover:text-ink'
                            }`}
                          >
                            Poligon (Area Bidang)
                          </button>
                        </div>
                      </div>

                      <TextField
                        label="Nama titik presensi"
                        value={editForm.attendanceLocations[editActivePointIndex].name}
                        onChange={(e) => handleUpdateEditPoint({ name: e.target.value })}
                        placeholder="Pintu Gerbang Utama / Lobby Depan"
                        required
                      />

                      <TextAreaField
                        label="Alamat lengkap (otomatis terisi saat peta diklik)"
                        value={editForm.attendanceLocations[editActivePointIndex].address}
                        onChange={(e) => handleUpdateEditPoint({ address: e.target.value })}
                        placeholder="Gedung, jalan, nomor (otomatis dari peta)"
                        rows={2}
                        required
                      />

                      <div className="grid gap-2 sm:grid-cols-2">
                        <TextField
                          label="Kota / Wilayah"
                          value={editForm.attendanceLocations[editActivePointIndex].city}
                          onChange={(e) => handleUpdateEditPoint({ city: e.target.value })}
                          placeholder="Jakarta Selatan"
                          required
                        />
                        <TextField
                          label="Provinsi"
                          value={editForm.attendanceLocations[editActivePointIndex].province || ''}
                          onChange={(e) => handleUpdateEditPoint({ province: e.target.value })}
                          placeholder="DKI Jakarta"
                        />
                      </div>

                      {editForm.attendanceLocations[editActivePointIndex].coordinatesType === 'point' ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <TextField
                            label="Radius presensi (meter)"
                            type="number"
                            value={editForm.attendanceLocations[editActivePointIndex].radiusMeters}
                            onChange={(e) =>
                              handleUpdateEditPoint({ radiusMeters: Number(e.target.value) || 50 })
                            }
                            min={10}
                            max={5000}
                            required
                            hint="Toleransi lingkaran dari pin"
                          />
                          <SelectField
                            label="Zona waktu"
                            value={editForm.attendanceLocations[editActivePointIndex].timezone}
                            onChange={(e) => handleUpdateEditPoint({ timezone: e.target.value })}
                          >
                            {TIMEZONES.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </SelectField>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="rounded border border-line bg-surface-2 p-2.5 text-xs space-y-1.5">
                            <div className="flex items-center justify-between font-semibold text-primary">
                              <span>Mode Poligon Aktif</span>
                              <span className="font-mono text-[11px] text-ink-3">
                                {editForm.attendanceLocations[editActivePointIndex].polygonCoordinates?.length || 0} sudut
                              </span>
                            </div>
                            <p className="text-[11px] text-ink-3">
                              Batas presensi ditentukan oleh bidang poligon di peta.
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateEditPoint({
                                  coordinatesType: 'point',
                                  polygonCoordinates: [],
                                })
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                            >
                              ← Kembali ke Pointer (Titik & Radius)
                            </button>
                          </div>
                          <SelectField
                            label="Zona waktu"
                            value={editForm.attendanceLocations[editActivePointIndex].timezone}
                            onChange={(e) => handleUpdateEditPoint({ timezone: e.target.value })}
                          >
                            {TIMEZONES.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </SelectField>
                        </div>
                      )}

                      <div className="rounded border border-line bg-surface-2 px-2.5 py-1.5 text-[11px] text-ink-3">
                        Koordinat GPS:{' '}
                        <span className="font-mono text-ink font-semibold">
                          {editForm.attendanceLocations[editActivePointIndex].latitude.toFixed(6)},{' '}
                          {editForm.attendanceLocations[editActivePointIndex].longitude.toFixed(6)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* LANGKAH 3: REKAPITULASI & KONFIRMASI (Ubah) */}
            {editStep === 3 && (
              <div className="space-y-4">
                <div className="rounded-control border border-primary-line bg-primary-subtle p-3 text-xs text-primary">
                  Periksa ringkasan perubahan shift di bawah ini sebelum disimpan.
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-control border border-line bg-surface p-3.5 space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-ink-3">
                      Informasi & Jadwal Shift
                    </h5>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold rounded bg-surface-2 px-1.5 py-0.5 border border-line text-ink">
                        {editForm.code}
                      </span>
                      <span className="font-bold text-sm text-ink">{editForm.name}</span>
                    </div>
                    <div className="text-xs text-ink-2 space-y-1 pt-1 border-t border-line/60">
                      <p className="flex items-center gap-1.5">
                        <HiOutlineClock className="h-4 w-4 text-primary shrink-0" />
                        <span>
                          Jam Kerja: <strong>{editForm.startTime} — {editForm.endTime}</strong> ({calculateDuration(editForm.startTime, editForm.endTime)})
                        </span>
                      </p>
                      {isOvernight(editForm.startTime, editForm.endTime) ? (
                        <p className="text-warning font-semibold text-[11px]">
                          • Shift Lintas Hari (Melewati tengah malam)
                        </p>
                      ) : null}
                      <p>
                        Status: <span className="font-semibold text-ink">{editForm.status === 'active' ? 'Aktif' : 'Nonaktif'}</span>
                      </p>
                      {editForm.description ? (
                        <p className="text-ink-3 italic">{editForm.description}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-control border border-line bg-surface p-3.5 space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-ink-3">
                      Penugasan & Geofence
                    </h5>
                    <p className="text-xs text-ink-2">
                      Karyawan Ditugaskan: <strong className="text-ink">{editForm.assignedEmployeeIds.length} orang</strong>
                    </p>
                    <p className="text-xs text-ink-2">
                      Cakupan Titik Presensi: <strong className="text-ink">{editForm.attendanceLocations.length} titik geofence</strong>
                    </p>
                  </div>
                </div>

                {/* Ringkasan Jadwal Harian */}
                {renderDailyScheduleSummary(editForm.schedules)}

                {/* Ringkasan Titik Geofence Presensi */}
                <div className="rounded-control border border-line bg-surface p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-ink-3">
                      Daftar Titik Geofence Presensi ({editForm.attendanceLocations.length} Titik Terdaftar)
                    </h5>
                    <button
                      type="button"
                      onClick={() => setEditStep(2)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Ubah di Peta
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {editForm.attendanceLocations.map((loc, idx) => (
                      <div key={idx} className="rounded border border-line bg-surface-2 p-2.5 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-ink truncate">{loc.name}</span>
                          <span className="shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-surface border border-line text-primary">
                            Radius {loc.radiusMeters}m
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-3 truncate">{loc.address}</p>
                        <div className="flex items-center justify-between text-[10px] text-ink-3 pt-0.5">
                          <span className="font-mono">
                            {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                          </span>
                          <span>
                            {loc.city} · {loc.timezone}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogBody>

          <DialogFooter className="justify-between px-4 py-3 sm:px-6">
            {editStep > 1 ? (
              <Button
                type="button"
                onClick={() => setEditStep((s) => Math.max(s - 1, 1))}
                icon={<HiOutlineArrowLeft className="h-4 w-4" />}
              >
                Sebelumnya
              </Button>
            ) : (
              <Button type="button" onClick={() => setEditItem(null)}>
                Batal
              </Button>
            )}

            {editStep < 3 ? (
              <Button type="button" tone="primary" onClick={handleNextEditStep}>
                Lanjutkan Langkah {editStep + 1}
                <HiOutlineArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                tone="primary"
                loading={isSubmitting}
                onClick={handleEditSubmit}
              >
                {isSubmitting ? 'Memperbarui...' : 'Simpan Perubahan Shift'}
              </Button>
            )}
          </DialogFooter>
        </div>
      </Dialog>

      {/* Konfirmasi Hapus */}
      <ConfirmDialog
        isOpen={!!deleteItem}
        type="danger"
        title="Hapus Master Shift"
        confirmText={isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
        cancelText="Batal"
        onClose={() => setDeleteItem(null)}
        onCancel={() => setDeleteItem(null)}
        onConfirm={handleConfirmDelete}
      >
        <p>
          Hapus master shift <strong className="font-semibold text-ink">{deleteItem?.name}</strong>{' '}
          ({displayTime(deleteItem?.startTime ?? '')} — {displayTime(deleteItem?.endTime ?? '')})?
          Penugasan shift pada karyawan terkait akan diatur ulang.
        </p>
      </ConfirmDialog>
    </div>
  )
}
