import * as React from 'react'
import {
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
} from 'react-icons/hi'
import { Panel, PanelHeader } from '@/components/base'

// Ambil base URL gateway dari environment (sama dengan lib/api.ts)
const getBaseUrl = (): string => {
  const configured = import.meta.env.VITE_API_URL
  if (configured) {
    try { return new URL(configured).origin } catch { /* ignore */ }
  }
  return window.location.origin
}

export interface HolidayItem {
  date: string // "YYYY-MM-DD"
  day: string // "Kamis", "Jumat", etc.
  name: string
  type: 'holiday' | 'leave' // holiday = Libur Nasional, leave = Cuti Bersama
}

// Data Bawaan / Cadangan Resmi 2026 (SKB 3 Menteri RI) untuk Keandalan Maksimal
const FALLBACK_HOLIDAYS_2026: HolidayItem[] = [
  { date: '2026-01-01', day: 'Kamis', name: 'Tahun Baru 2026 Masehi', type: 'holiday' },
  { date: '2026-01-16', day: 'Jumat', name: "Isra Mi'raj Nabi Muhammad SAW", type: 'holiday' },
  { date: '2026-02-16', day: 'Senin', name: 'Tahun Baru Imlek 2577 Kongzili', type: 'leave' },
  { date: '2026-02-17', day: 'Selasa', name: 'Tahun Baru Imlek 2577 Kongzili', type: 'holiday' },
  { date: '2026-03-18', day: 'Rabu', name: 'Hari Suci Nyepi Tahun Baru Saka 1948', type: 'leave' },
  { date: '2026-03-19', day: 'Kamis', name: 'Hari Suci Nyepi Tahun Baru Saka 1948', type: 'holiday' },
  { date: '2026-03-20', day: 'Jumat', name: 'Hari Raya Idul Fitri 1447 Hijriyah', type: 'leave' },
  { date: '2026-03-21', day: 'Sabtu', name: 'Hari Raya Idul Fitri 1447 Hijriyah', type: 'holiday' },
  { date: '2026-03-22', day: 'Minggu', name: 'Hari Raya Idul Fitri 1447 Hijriyah', type: 'holiday' },
  { date: '2026-03-23', day: 'Senin', name: 'Hari Raya Idul Fitri 1447 Hijriyah', type: 'leave' },
  { date: '2026-03-24', day: 'Selasa', name: 'Hari Raya Idul Fitri 1447 Hijriyah', type: 'leave' },
  { date: '2026-04-03', day: 'Jumat', name: 'Wafat Yesus Kristus / Jumat Agung', type: 'holiday' },
  { date: '2026-04-05', day: 'Minggu', name: 'Kebangkitan Yesus Kristus (Paskah)', type: 'holiday' },
  { date: '2026-05-01', day: 'Jumat', name: 'Hari Buruh Internasional', type: 'holiday' },
  { date: '2026-05-14', day: 'Kamis', name: 'Kenaikan Yesus Kristus', type: 'holiday' },
  { date: '2026-05-15', day: 'Jumat', name: 'Kenaikan Yesus Kristus', type: 'leave' },
  { date: '2026-05-27', day: 'Rabu', name: 'Hari Raya Idul Adha 1447 Hijriyah', type: 'holiday' },
  { date: '2026-05-28', day: 'Kamis', name: 'Hari Raya Idul Adha 1447 Hijriyah', type: 'leave' },
  { date: '2026-05-31', day: 'Minggu', name: 'Hari Raya Waisak 2570 BE', type: 'holiday' },
  { date: '2026-06-01', day: 'Senin', name: 'Hari Lahir Pancasila', type: 'holiday' },
  { date: '2026-06-16', day: 'Selasa', name: 'Tahun Baru Islam 1448 Hijriyah', type: 'holiday' },
  { date: '2026-08-17', day: 'Senin', name: 'Hari Kemerdekaan Republik Indonesia', type: 'holiday' },
  { date: '2026-08-25', day: 'Selasa', name: 'Maulid Nabi Muhammad SAW', type: 'holiday' },
  { date: '2026-12-24', day: 'Kamis', name: 'Hari Raya Natal', type: 'leave' },
  { date: '2026-12-25', day: 'Jumat', name: 'Hari Raya Natal', type: 'holiday' },
]

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const

const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as const

function formatShortDate(dateStr?: string | Date | null): string {
  if (!dateStr) return '—'
  let d: Date
  if (dateStr instanceof Date) {
    d = dateStr
  } else if (typeof dateStr === 'string') {
    const parts = dateStr.split('-').map(Number)
    if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
      d = new Date(parts[0], parts[1] - 1, parts[2])
    } else {
      d = new Date(dateStr)
    }
  } else {
    return '—'
  }

  if (Number.isNaN(d.getTime())) {
    return typeof dateStr === 'string' ? dateStr : '—'
  }

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

export function HolidayCalendar2026() {
  const currentYear = 2026

  // Tanggal hari ini
  const todayStr = React.useMemo(() => {
    const now = new Date()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `2026-${m}-${d}`
  }, [])

  // Bulan aktif awal (November = index 10)
  const [activeMonthIndex, setActiveMonthIndex] = React.useState<number>(() => {
    const now = new Date()
    return now.getFullYear() === 2026 ? now.getMonth() : 10
  })

  const [selectedDate, setSelectedDate] = React.useState<string>(todayStr)

  // Data Hari Libur
  const [holidays, setHolidays] = React.useState<HolidayItem[]>(FALLBACK_HOLIDAYS_2026)

  // Sinkronisasi data API
  const fetchHolidayData = React.useCallback(async () => {
    try {
      const response = await fetch(`${getBaseUrl()}/api/utilities/holidays?year=2026`)
      if (!response.ok) throw new Error(`HTTP error ${response.status}`)
      const json = await response.json()
      if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
        setHolidays(json.data as HolidayItem[])
      } else {
        setHolidays(FALLBACK_HOLIDAYS_2026)
      }
    } catch {
      setHolidays(FALLBACK_HOLIDAYS_2026)
    }
  }, [])

  React.useEffect(() => {
    fetchHolidayData()
  }, [fetchHolidayData])

  // Peta tanggal ke hari libur
  const holidayMap = React.useMemo(() => {
    const map = new Map<string, HolidayItem>()
    for (const h of holidays) {
      map.set(h.date, h)
    }
    return map
  }, [holidays])

  // Matriks hari dalam bulan aktif
  const calendarCells = React.useMemo(() => {
    const firstDay = new Date(currentYear, activeMonthIndex, 1)
    const daysInMonth = new Date(currentYear, activeMonthIndex + 1, 0).getDate()
    const daysInPrevMonth = new Date(currentYear, activeMonthIndex, 0).getDate()
    const startDayOfWeek = (firstDay.getDay() + 6) % 7 // Senin = 0, Minggu = 6

    const cells: Array<{
      dateStr: string
      dayNum: number
      isCurrentMonth: boolean
      isSunday: boolean
      isSaturday: boolean
      holiday?: HolidayItem
    }> = []

    // Hari dari bulan sebelumnya
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i
      const prevM = activeMonthIndex === 0 ? 11 : activeMonthIndex - 1
      const prevY = activeMonthIndex === 0 ? currentYear - 1 : currentYear
      const dStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`
      const dayOfWeek = (new Date(prevY, prevM, dNum).getDay() + 6) % 7

      cells.push({
        dateStr: dStr,
        dayNum: dNum,
        isCurrentMonth: false,
        isSunday: dayOfWeek === 6,
        isSaturday: dayOfWeek === 5,
        holiday: holidayMap.get(dStr),
      })
    }

    // Hari dari bulan aktif
    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${currentYear}-${String(activeMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayOfWeek = (new Date(currentYear, activeMonthIndex, day).getDay() + 6) % 7

      cells.push({
        dateStr: dStr,
        dayNum: day,
        isCurrentMonth: true,
        isSunday: dayOfWeek === 6,
        isSaturday: dayOfWeek === 5,
        holiday: holidayMap.get(dStr),
      })
    }

    // Hari sisa untuk baris genap
    const remaining = 7 - (cells.length % 7)
    if (remaining < 7) {
      for (let day = 1; day <= remaining; day++) {
        const nextM = activeMonthIndex === 11 ? 0 : activeMonthIndex + 1
        const nextY = activeMonthIndex === 11 ? currentYear + 1 : currentYear
        const dStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const dayOfWeek = (new Date(nextY, nextM, day).getDay() + 6) % 7

        cells.push({
          dateStr: dStr,
          dayNum: day,
          isCurrentMonth: false,
          isSunday: dayOfWeek === 6,
          isSaturday: dayOfWeek === 5,
          holiday: holidayMap.get(dStr),
        })
      }
    }

    return cells
  }, [currentYear, activeMonthIndex, holidayMap])

  // Hari Libur di Bulan Aktif
  const activeMonthHolidays = React.useMemo(() => {
    const monthPrefix = `${currentYear}-${String(activeMonthIndex + 1).padStart(2, '0')}`
    return holidays.filter((h) => h.date.startsWith(monthPrefix))
  }, [holidays, currentYear, activeMonthIndex])

  // Detail item yang dipilih
  const selectedHoliday = holidayMap.get(selectedDate)

  return (
    <Panel>
      <PanelHeader
        title="Kalender 2026"
        description="Hari libur nasional & cuti bersama resmi RI."
      />

      <div className="p-4 sm:p-5 space-y-4">
        {/* Navigasi Bulan Minimalis */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-ink">
              {MONTH_NAMES[activeMonthIndex]} {currentYear}
            </h4>
            {activeMonthHolidays.length > 0 ? (
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-2xs font-semibold text-rose-600 dark:text-rose-400">
                {activeMonthHolidays.length} libur
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const now = new Date()
                const m = now.getFullYear() === 2026 ? now.getMonth() : 10
                setActiveMonthIndex(m)
                setSelectedDate(todayStr)
              }}
              className="rounded px-2 py-1 text-2xs font-medium text-ink-2 hover:bg-surface-2 transition-colors cursor-pointer"
            >
              Hari ini
            </button>
            <button
              type="button"
              onClick={() => setActiveMonthIndex((p) => (p === 0 ? 11 : p - 1))}
              className="rounded p-1 text-ink-2 hover:bg-surface-2 transition-colors cursor-pointer"
              title="Bulan sebelumnya"
            >
              <HiOutlineChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveMonthIndex((p) => (p === 11 ? 0 : p + 1))}
              className="rounded p-1 text-ink-2 hover:bg-surface-2 transition-colors cursor-pointer"
              title="Bulan berikutnya"
            >
              <HiOutlineChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Matriks Kalender Minimalis */}
        <div className="space-y-1">
          {/* Header Hari */}
          <div className="grid grid-cols-7 text-center text-2xs font-medium text-ink-3">
            {DAY_LABELS.map((label, idx) => (
              <div
                key={label}
                className={`py-1 ${idx === 6 ? 'text-rose-500/80 font-semibold' : ''}`}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Grid Tanggal */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell) => {
              const isSelected = cell.dateStr === selectedDate
              const isToday = cell.dateStr === todayStr
              const isHoliday = cell.holiday?.type === 'holiday'
              const isLeave = cell.holiday?.type === 'leave'

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => {
                    setSelectedDate(cell.dateStr)
                    if (!cell.isCurrentMonth) {
                      const m = Number(cell.dateStr.split('-')[1]) - 1
                      setActiveMonthIndex(m)
                    }
                  }}
                  title={cell.holiday ? `${cell.holiday.name} (${cell.holiday.type === 'holiday' ? 'Libur Nasional' : 'Cuti Bersama'})` : cell.dateStr}
                  className={`group relative flex h-9 sm:h-10 flex-col items-center justify-center rounded-lg text-xs transition-colors cursor-pointer select-none ${
                    !cell.isCurrentMonth
                      ? 'text-ink-4 opacity-30'
                      : isSelected
                        ? 'bg-ink text-surface font-bold shadow-xs'
                        : isToday
                          ? 'border border-primary text-primary font-bold bg-primary-subtle/30'
                          : isHoliday
                            ? 'text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-500/15'
                            : isLeave
                              ? 'text-amber-600 dark:text-amber-400 font-semibold hover:bg-amber-500/15'
                              : cell.isSunday
                                ? 'text-rose-500 hover:bg-surface-2'
                                : 'text-ink hover:bg-surface-2'
                  }`}
                >
                  <span className="leading-none">{cell.dayNum}</span>

                  {/* Indikator Dot Hari Libur / Cuti */}
                  {cell.holiday && cell.isCurrentMonth ? (
                    <span
                      className={`mt-0.5 h-1 w-1 rounded-full ${
                        isSelected
                          ? 'bg-surface'
                          : isHoliday
                            ? 'bg-rose-500'
                            : 'bg-amber-500'
                      }`}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        {/* Bar Keterangan Tanggal Terpilih & Legenda Minimalis */}
        <div className="border-t border-line/60 pt-3 space-y-2">
          {/* Status Tanggal Terpilih */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-ink">
              {formatShortDate(selectedDate)}
            </span>

            {selectedHoliday ? (
              <span
                className={`inline-flex items-center gap-1 font-semibold ${
                  selectedHoliday.type === 'holiday'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    selectedHoliday.type === 'holiday' ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                />
                {selectedHoliday.name}
              </span>
            ) : (
              <span className="text-ink-3">Hari Kerja Efektif</span>
            )}
          </div>

          {/* Daftar Ringkas Libur Bulan Ini */}
          {activeMonthHolidays.length > 0 ? (
            <div className="rounded-lg bg-surface-2/60 p-2.5 space-y-1.5">
              <p className="text-2xs font-semibold text-ink-2">
                Hari libur di bulan {MONTH_NAMES[activeMonthIndex]}:
              </p>
              <div className="space-y-1">
                {activeMonthHolidays.map((h) => (
                  <div
                    key={h.date}
                    onClick={() => setSelectedDate(h.date)}
                    className="flex items-center justify-between text-2xs hover:text-primary cursor-pointer transition-colors"
                  >
                    <span className="truncate text-ink-2 font-medium">
                      • {h.date.slice(8, 10)} {MONTH_NAMES[activeMonthIndex].slice(0, 3)}: {h.name}
                    </span>
                    <span
                      className={`ml-2 shrink-0 rounded px-1 text-2xs font-bold ${
                        h.type === 'holiday'
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {h.type === 'holiday' ? 'Libur' : 'Cuti'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-2xs text-ink-3">
              Tidak ada hari libur nasional atau cuti bersama di bulan {MONTH_NAMES[activeMonthIndex]}.
            </p>
          )}

          {/* Legenda Titik Minimalis */}
          <div className="flex items-center gap-3 text-2xs text-ink-3 pt-1">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Libur Nasional
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Cuti Bersama
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Hari Ini
            </span>
          </div>
        </div>
      </div>
    </Panel>
  )
}
