import * as React from 'react'
import {
  HiOutlineCalendar,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineX,
} from 'react-icons/hi'
import { Badge, Button, Panel, PanelHeader } from '@/components/base'

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

function formatFullDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  if (Number.isNaN(d.getTime())) return dateStr

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export function HolidayCalendar2026() {
  const currentYear = 2026

  // Ambil tanggal hari ini (default tahun 2026)
  const todayStr = React.useMemo(() => {
    const now = new Date()
    const y = now.getFullYear() === 2026 ? 2026 : 2026
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [])

  // Bulan aktif kalender (0 = Januari, 10 = November)
  const initialMonth = React.useMemo(() => {
    const now = new Date()
    return now.getFullYear() === 2026 ? now.getMonth() : 10 // November jika tahun lain
  }, [])

  const [activeMonthIndex, setActiveMonthIndex] = React.useState<number>(initialMonth)
  const [selectedDate, setSelectedDate] = React.useState<string>(todayStr)

  // Data Hari Libur
  const [holidays, setHolidays] = React.useState<HolidayItem[]>(FALLBACK_HOLIDAYS_2026)
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [isLiveConnected, setIsLiveConnected] = React.useState<boolean>(true)
  const [holidayTab, setHolidayTab] = React.useState<'month' | 'all' | 'holiday' | 'leave'>('month')
  const [holidaySearch, setHolidaySearch] = React.useState<string>('')

  // Sinkronisasi data dari API tanggalmerah.upset.dev
  const fetchHolidayData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('https://tanggalmerah.upset.dev/api/holidays?year=2026')
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`)
      }
      const json = await response.json()
      if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
        setHolidays(json.data as HolidayItem[])
        setIsLiveConnected(true)
      } else {
        setHolidays(FALLBACK_HOLIDAYS_2026)
      }
    } catch {
      // Jika jaringan gagal, gunakan data cadangan resmi 2026
      setHolidays(FALLBACK_HOLIDAYS_2026)
      setIsLiveConnected(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchHolidayData()
  }, [fetchHolidayData])

  // Peta tanggal ke hari libur untuk lookup O(1)
  const holidayMap = React.useMemo(() => {
    const map = new Map<string, HolidayItem>()
    for (const h of holidays) {
      map.set(h.date, h)
    }
    return map
  }, [holidays])

  // Hitung matriks hari dalam bulan aktif
  const calendarCells = React.useMemo(() => {
    const firstDay = new Date(currentYear, activeMonthIndex, 1)
    const daysInMonth = new Date(currentYear, activeMonthIndex + 1, 0).getDate()
    const daysInPrevMonth = new Date(currentYear, activeMonthIndex, 0).getDate()

    // Hari dalam sepekan (Senin = 0, Minggu = 6)
    const startDayOfWeek = (firstDay.getDay() + 6) % 7

    const cells: Array<{
      dateStr: string
      dayNum: number
      isCurrentMonth: boolean
      isSunday: boolean
      isSaturday: boolean
      holiday?: HolidayItem
    }> = []

    // 1. Hari-hari bulan sebelumnya
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

    // 2. Hari-hari bulan ini
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

    // 3. Hari-hari bulan berikutnya untuk menggenapkan baris (kelipatan 7)
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

  // Filter Daftar Hari Libur
  const filteredHolidays = React.useMemo(() => {
    const search = holidaySearch.trim().toLowerCase()
    return holidays.filter((h) => {
      if (holidayTab === 'month') {
        const monthPrefix = `${currentYear}-${String(activeMonthIndex + 1).padStart(2, '0')}`
        if (!h.date.startsWith(monthPrefix)) return false
      } else if (holidayTab === 'holiday') {
        if (h.type !== 'holiday') return false
      } else if (holidayTab === 'leave') {
        if (h.type !== 'leave') return false
      }

      if (!search) return true
      return (
        h.name.toLowerCase().includes(search) ||
        h.date.includes(search) ||
        h.day.toLowerCase().includes(search)
      )
    })
  }, [holidays, holidayTab, holidaySearch, currentYear, activeMonthIndex])

  // Statistik Total Hari Libur
  const holidayStats = React.useMemo(() => {
    const nationalHolidays = holidays.filter((h) => h.type === 'holiday').length
    const leaveHolidays = holidays.filter((h) => h.type === 'leave').length
    return {
      total: holidays.length,
      national: nationalHolidays,
      leave: leaveHolidays,
      inMonth: activeMonthHolidays.length,
    }
  }, [holidays, activeMonthHolidays])

  // Info Tanggal yang Dipilih
  const selectedHoliday = holidayMap.get(selectedDate)
  const selectedDateObj = React.useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    return new Date(y, m - 1, d)
  }, [selectedDate])
  const selectedDayOfWeek = (selectedDateObj.getDay() + 6) % 7 // 0=Senin, 6=Minggu

  const handlePrevMonth = () => {
    setActiveMonthIndex((prev) => (prev === 0 ? 11 : prev - 1))
  }

  const handleNextMonth = () => {
    setActiveMonthIndex((prev) => (prev === 11 ? 0 : prev + 1))
  }

  const handleJumpToToday = () => {
    setActiveMonthIndex(initialMonth)
    setSelectedDate(todayStr)
  }

  return (
    <Panel>
      <PanelHeader
        title="Kalender Kerja & Hari Libur Nasional 2026"
        description="Sinkronisasi tanggal merah, hari libur nasional, dan cuti bersama resmi RI tahun 2026."
        meta={
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                isLiveConnected
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-surface-3 text-ink-3'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-ink-4'
                }`}
              />
              {isLiveConnected ? 'API Terhubung ✓' : 'Data Bawaan (Offline)'}
            </span>
            <button
              type="button"
              onClick={fetchHolidayData}
              disabled={isLoading}
              title="Sinkronisasi ulang dari API"
              className="rounded-md border border-line bg-surface p-1 text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
            >
              <HiOutlineRefresh className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
            </button>
          </div>
        }
      />

      <div className="p-4 sm:p-5 space-y-5">
        {/* Ringkasan Statistik Kartu Atas */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-line bg-surface p-3">
            <dt className="text-[11px] font-medium uppercase tracking-wider text-ink-3">Bulan Ini</dt>
            <dd className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold tabular text-ink">{holidayStats.inMonth}</span>
              <span className="text-xs text-ink-3">Hari Libur</span>
            </dd>
          </div>

          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
            <dt className="text-[11px] font-medium uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Libur Nasional
            </dt>
            <dd className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold tabular text-rose-600 dark:text-rose-400">
                {holidayStats.national}
              </span>
              <span className="text-xs text-rose-600/70 dark:text-rose-400/70">Hari</span>
            </dd>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <dt className="text-[11px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Cuti Bersama
            </dt>
            <dd className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold tabular text-amber-600 dark:text-amber-400">
                {holidayStats.leave}
              </span>
              <span className="text-xs text-amber-600/70 dark:text-amber-400/70">Hari</span>
            </dd>
          </div>

          <div className="rounded-xl border border-line bg-surface p-3">
            <dt className="text-[11px] font-medium uppercase tracking-wider text-ink-3">Total 2026</dt>
            <dd className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold tabular text-primary">{holidayStats.total}</span>
              <span className="text-xs text-ink-3">Hari Kalender</span>
            </dd>
          </div>
        </div>

        {/* Kontrol Navigasi Bulan */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-ink sm:text-lg">
              {MONTH_NAMES[activeMonthIndex]} {currentYear}
            </h3>
            <span className="rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-2">
              Bulan {activeMonthIndex + 1}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleJumpToToday}
              className="rounded-control border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
            >
              Hari Ini
            </button>
            <div className="flex items-center rounded-control border border-line bg-surface overflow-hidden">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="px-2 py-1 text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
                title="Bulan Sebelumnya"
              >
                <HiOutlineChevronLeft className="h-4 w-4" />
              </button>
              <span className="h-4 w-px bg-line" />
              <button
                type="button"
                onClick={handleNextMonth}
                className="px-2 py-1 text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
                title="Bulan Berikutnya"
              >
                <HiOutlineChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Pemilih Cepat Bulan (Pills) */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          {MONTH_NAMES.map((mName, idx) => {
            const isActive = idx === activeMonthIndex
            const mPrefix = `${currentYear}-${String(idx + 1).padStart(2, '0')}`
            const mHolidays = holidays.filter((h) => h.date.startsWith(mPrefix)).length

            return (
              <button
                key={mName}
                type="button"
                onClick={() => setActiveMonthIndex(idx)}
                className={`relative shrink-0 rounded-control px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-ink text-surface font-semibold shadow-xs'
                    : 'bg-surface border border-line text-ink-2 hover:bg-surface-2'
                }`}
              >
                {mName.slice(0, 3)}
                {mHolidays > 0 ? (
                  <span
                    className={`ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                      isActive ? 'bg-rose-500 text-white' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {mHolidays}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        {/* Layout Utama: Kalender Grid & Detail Info */}
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* Kolom Kiri: Grid Kalender */}
          <div className="space-y-2">
            {/* Header Nama Hari */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wider text-ink-3">
              {DAY_LABELS.map((dLabel, i) => (
                <div
                  key={dLabel}
                  className={`py-1.5 ${i === 6 ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}`}
                >
                  {dLabel}
                </div>
              ))}
            </div>

            {/* Grid Kotak Tanggal */}
            <div className="grid grid-cols-7 gap-1.5">
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
                    className={`group relative flex min-h-[58px] flex-col justify-between rounded-xl border p-1.5 text-left transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-primary border-primary shadow-xs'
                        : 'border-line/70 hover:border-line-strong'
                    } ${
                      !cell.isCurrentMonth
                        ? 'bg-surface-2/40 text-ink-4 opacity-40'
                        : isHoliday
                          ? 'bg-rose-500/10 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 border-rose-500/30'
                          : isLeave
                            ? 'bg-amber-500/10 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                            : cell.isSunday
                              ? 'bg-surface text-rose-600 dark:text-rose-400'
                              : 'bg-surface text-ink hover:bg-surface-2/60'
                    }`}
                  >
                    {/* Baris Atas Kotak: Angka Tanggal & Tag Hari Ini */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold tabular ${
                          isToday
                            ? 'bg-primary text-primary-on font-bold'
                            : isHoliday
                              ? 'text-rose-600 dark:text-rose-400 font-bold'
                              : isLeave
                                ? 'text-amber-600 dark:text-amber-400 font-bold'
                                : cell.isSunday
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-ink'
                        }`}
                      >
                        {cell.dayNum}
                      </span>

                      {isToday ? (
                        <span className="hidden sm:inline-block rounded bg-primary-subtle px-1 text-[9px] font-bold text-primary">
                          Hari ini
                        </span>
                      ) : null}
                    </div>

                    {/* Baris Bawah Kotak: Indikator Hari Libur */}
                    {cell.holiday ? (
                      <div className="mt-1">
                        <div
                          className={`truncate rounded px-1 py-0.5 text-[9px] font-semibold leading-tight ${
                            isHoliday
                              ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                              : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {cell.holiday.name}
                        </div>
                      </div>
                    ) : (
                      <div className="h-2" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legenda Warna Kalender */}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ink-3 pt-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span>Libur Nasional Resmi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span>Cuti Bersama Resmi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                <span>Hari Ini</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border border-line-strong bg-surface" />
                <span>Hari Kerja Aktif</span>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Rincian Tanggal & Daftar Hari Libur */}
          <div className="space-y-4">
            {/* Kartu Rincian Tanggal Terpilih */}
            <div className="rounded-xl border border-line bg-surface-2/40 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-line/60 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                  <HiOutlineCalendar className="h-4 w-4 text-primary" />
                  <span>Rincian Tanggal</span>
                </div>
                {selectedDate === todayStr ? (
                  <Badge tone="accent">Hari Ini</Badge>
                ) : (
                  <span className="text-[11px] font-mono text-ink-3">{selectedDate}</span>
                )}
              </div>

              <div>
                <h4 className="text-sm font-bold text-ink">{formatFullDate(selectedDate)}</h4>

                {selectedHoliday ? (
                  <div
                    className={`mt-2.5 rounded-xl border p-3 ${
                      selectedHoliday.type === 'holiday'
                        ? 'border-rose-500/30 bg-rose-500/10 dark:bg-rose-950/20'
                        : 'border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold ${
                          selectedHoliday.type === 'holiday'
                            ? 'bg-rose-500 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {selectedHoliday.type === 'holiday' ? 'Libur Nasional ✓' : 'Cuti Bersama ✓'}
                      </span>
                      <span className="text-xs font-medium text-ink-2">{selectedHoliday.day}</span>
                    </div>

                    <h5
                      className={`mt-1.5 text-sm font-bold ${
                        selectedHoliday.type === 'holiday'
                          ? 'text-rose-700 dark:text-rose-300'
                          : 'text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {selectedHoliday.name}
                    </h5>

                    <p className="mt-1 text-[11px] text-ink-3 leading-relaxed">
                      Tanggal merah resmi Pemerintah RI (SKB 3 Menteri) tersinkronisasi via
                      tanggalmerah.upset.dev.
                    </p>
                  </div>
                ) : (
                  <div className="mt-2.5 rounded-xl border border-line bg-surface p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      {selectedDayOfWeek === 6 ? (
                        <span className="rounded bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                          Akhir Pekan (Minggu)
                        </span>
                      ) : selectedDayOfWeek === 5 ? (
                        <span className="rounded bg-surface-3 px-2 py-0.5 text-xs font-medium text-ink-2">
                          Akhir Pekan (Sabtu)
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          Hari Kerja Efektif ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-2 pt-1">
                      {selectedDayOfWeek === 6 || selectedDayOfWeek === 5
                        ? 'Jadwal operasional akhir pekan bagi regu shift kerja.'
                        : 'Hari kerja reguler perusahaan. Penugasan shift dan presensi berlaku normal.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Tab & Daftar Hari Libur */}
            <div className="rounded-xl border border-line bg-surface p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink">Daftar Hari Libur</span>
                <span className="text-[11px] text-ink-3">{filteredHolidays.length} terdaftar</span>
              </div>

              {/* Tab Filter */}
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setHolidayTab('month')}
                  className={`rounded-control px-2 py-0.5 font-medium transition-colors cursor-pointer ${
                    holidayTab === 'month'
                      ? 'bg-ink text-surface font-semibold shadow-xs'
                      : 'bg-surface-2 text-ink-2 hover:bg-surface-3'
                  }`}
                >
                  Bulan Ini ({holidayStats.inMonth})
                </button>
                <button
                  type="button"
                  onClick={() => setHolidayTab('all')}
                  className={`rounded-control px-2 py-0.5 font-medium transition-colors cursor-pointer ${
                    holidayTab === 'all'
                      ? 'bg-ink text-surface font-semibold shadow-xs'
                      : 'bg-surface-2 text-ink-2 hover:bg-surface-3'
                  }`}
                >
                  Semua ({holidayStats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setHolidayTab('holiday')}
                  className={`rounded-control px-2 py-0.5 font-medium transition-colors cursor-pointer ${
                    holidayTab === 'holiday'
                      ? 'bg-rose-600 text-white font-semibold shadow-xs'
                      : 'bg-surface-2 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
                  }`}
                >
                  Nasional
                </button>
                <button
                  type="button"
                  onClick={() => setHolidayTab('leave')}
                  className={`rounded-control px-2 py-0.5 font-medium transition-colors cursor-pointer ${
                    holidayTab === 'leave'
                      ? 'bg-amber-600 text-white font-semibold shadow-xs'
                      : 'bg-surface-2 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                  }`}
                >
                  Cuti
                </button>
              </div>

              {/* Search Box untuk Libur */}
              <div className="relative">
                <HiOutlineSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
                <input
                  type="text"
                  value={holidaySearch}
                  onChange={(e) => setHolidaySearch(e.target.value)}
                  placeholder="Cari hari libur 2026..."
                  className="w-full rounded-control border border-line bg-surface py-1 pl-8 pr-7 text-xs text-ink placeholder:text-ink-3 focus:border-primary focus:outline-hidden"
                />
                {holidaySearch ? (
                  <button
                    type="button"
                    onClick={() => setHolidaySearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink cursor-pointer"
                  >
                    <HiOutlineX className="h-3 w-3" />
                  </button>
                ) : null}
              </div>

              {/* List Scrollable */}
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5 text-xs">
                {filteredHolidays.length === 0 ? (
                  <p className="py-4 text-center text-[11px] text-ink-3 italic">
                    Tidak ada hari libur pada pilihan ini.
                  </p>
                ) : (
                  filteredHolidays.map((h) => {
                    const isSelected = h.date === selectedDate
                    return (
                      <button
                        key={h.date}
                        type="button"
                        onClick={() => {
                          setSelectedDate(h.date)
                          const mIndex = Number(h.date.split('-')[1]) - 1
                          setActiveMonthIndex(mIndex)
                        }}
                        className={`w-full rounded-lg border p-2 text-left transition-colors cursor-pointer flex items-start justify-between gap-2 ${
                          isSelected
                            ? 'border-primary bg-primary-subtle/50'
                            : 'border-line/60 bg-surface hover:bg-surface-2'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-ink">{h.name}</p>
                          <p className="text-[11px] text-ink-3">
                            {h.day}, {formatFullDate(h.date)}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            h.type === 'holiday'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {h.type === 'holiday' ? 'Nasional' : 'Cuti'}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  )
}
