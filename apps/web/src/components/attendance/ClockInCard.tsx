import * as React from 'react'
import { HiOutlineClock, HiOutlineLocationMarker } from 'react-icons/hi'
import { Badge, Button, Notice, Panel, PanelHeader, Skeleton } from '@/components/base'
import { AttendanceStatusBadge } from './AttendanceStatusBadge'
import { api } from '@/lib/api'
import { errorText } from '@/utils/apiError'
import { formatClock, formatDateLabel, formatMinutes } from '@/utils/attendance'
import type { AttendanceTodayInfo } from '@/@types/attendance'

interface ClockInCardProps {
  /** Dipanggil setelah presensi masuk/pulang tercatat agar rekap ikut disegarkan. */
  onChanged?: () => void
}

interface Feedback {
  tone: 'success' | 'danger' | 'info'
  title: string
  message: string
}

type ClockAction = 'in' | 'out' | null

function positionErrorText(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Izin lokasi ditolak. Aktifkan izin lokasi peramban untuk mencatat presensi.'
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return 'Koordinat GPS tidak tersedia. Coba di tempat terbuka lalu ulangi.'
  }
  if (error.code === error.TIMEOUT) {
    return 'Permintaan lokasi melebihi batas waktu. Coba lagi.'
  }
  return 'Lokasi perangkat tidak dapat dibaca.'
}

function readPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Peramban ini tidak menyediakan geolokasi.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, (error) => reject(new Error(positionErrorText(error))), {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    })
  })
}

function clockWithSeconds(timezone: string, now: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now)

  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? '00'
  return `${read('hour')}:${read('minute')}:${read('second')}`
}

export function ClockInCard({ onChanged }: ClockInCardProps) {
  const [info, setInfo] = React.useState<AttendanceTodayInfo | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isBusy, setIsBusy] = React.useState<ClockAction>(null)
  const [feedback, setFeedback] = React.useState<Feedback | null>(null)
  const [now, setNow] = React.useState(() => new Date())

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const load = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await api.shifting.attendance.today.get()
      if (res.error) {
        setFeedback({
          tone: 'danger',
          title: 'Presensi tidak dapat dimuat',
          message: errorText(res, 'Layanan presensi tidak merespons.')
        })
        return
      }
      const payload = res.data as unknown as { success: boolean; data: AttendanceTodayInfo }
      setInfo(payload.data)
    } catch {
      setFeedback({
        tone: 'danger',
        title: 'Gateway tidak terjangkau',
        message: 'Pastikan layanan backend berjalan, lalu muat ulang halaman.'
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const submit = async (action: Exclude<ClockAction, null>) => {
    setIsBusy(action)
    setFeedback(null)

    try {
      const position = await readPosition()
      const body = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }

      const res =
        action === 'in'
          ? await api.shifting.attendance['clock-in'].post(body)
          : await api.shifting.attendance['clock-out'].post(body)

      if (res.error) {
        setFeedback({
          tone: 'danger',
          title: action === 'in' ? 'Presensi masuk gagal' : 'Presensi pulang gagal',
          message: errorText(res, 'Permintaan presensi ditolak.')
        })
        return
      }

      const payload = res.data as unknown as {
        success: boolean
        verified?: boolean
        distanceMeters?: number
        lateMinutes?: number
        workMinutes?: number
        message?: string
      }

      if (payload.verified === false) {
        setFeedback({
          tone: 'info',
          title: 'Di luar geofence',
          message: `${payload.message ?? 'Koordinat Anda di luar area presensi.'} Deviasi ${Math.round(
            payload.distanceMeters ?? 0
          )} meter dari titik terdekat.`
        })
        return
      }

      setFeedback({
        tone: 'success',
        title: action === 'in' ? 'Presensi masuk tercatat' : 'Presensi pulang tercatat',
        message: payload.message ?? 'Presensi tersimpan.'
      })
      await load()
      onChanged?.()
    } catch (error) {
      setFeedback({
        tone: 'danger',
        title: 'Lokasi tidak terbaca',
        message: error instanceof Error ? error.message : 'Lokasi perangkat tidak dapat dibaca.'
      })
    } finally {
      setIsBusy(null)
    }
  }

  const timezone = info?.timezone || 'Asia/Jakarta'
  const row = info?.row ?? null
  const schedule = info?.schedule ?? null
  const shiftHint = info?.message ?? null
  const isFinished = !!row?.checkInAt && !!row?.checkOutAt

  return (
    <Panel>
      <PanelHeader
        title="Presensi hari ini"
        description="Geofence shift diverifikasi di server. Koordinat hanya dibaca saat Anda menekan tombol presensi."
        meta={info ? formatDateLabel(info.date) : undefined}
      />

      <div className="space-y-4 px-4 py-4 sm:px-5 2xl:px-6 2xl:py-5">
        {feedback ? (
          <Notice tone={feedback.tone} title={feedback.title} onDismiss={() => setFeedback(null)}>
            {feedback.message}
          </Notice>
        ) : null}

        {isLoading ? (
          <div className="space-y-2.5">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-3 w-56" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="tabular text-2xl font-semibold tracking-tightest text-ink">
                  {clockWithSeconds(timezone, now)}
                </p>
                <p className="mt-0.5 text-xs text-ink-3">
                  Zona waktu {timezone}
                  {shiftHint ? ` · ${shiftHint}` : ''}
                </p>
              </div>
              {row ? <AttendanceStatusBadge status={row.status} /> : <Badge>Belum ada baris</Badge>}
            </div>

            {info?.shift ? (
              <dl className="grid grid-cols-2 gap-3 rounded-control border border-line bg-surface-2 px-3.5 py-3 text-sm">
                <div>
                  <dt className="text-2xs text-ink-3">Shift</dt>
                  <dd className="mt-0.5 font-semibold text-ink">{info.shift.name}</dd>
                </div>
                <div>
                  <dt className="text-2xs text-ink-3">Jadwal</dt>
                  <dd className="mt-0.5 font-medium tabular text-ink">
                    {schedule && !schedule.isOff
                      ? `${schedule.startTime?.slice(0, 5) ?? '—'} — ${schedule.endTime?.slice(0, 5) ?? '—'}`
                      : schedule
                        ? `Libur (${schedule.dayName})`
                        : 'Jadwal belum diatur'}
                  </dd>
                </div>
                <div>
                  <dt className="text-2xs text-ink-3">Masuk</dt>
                  <dd className="mt-0.5 font-medium tabular text-ink">
                    {formatClock(row?.checkInAt, timezone)}
                  </dd>
                </div>
                <div>
                  <dt className="text-2xs text-ink-3">Pulang</dt>
                  <dd className="mt-0.5 font-medium tabular text-ink">
                    {formatClock(row?.checkOutAt, timezone)}
                  </dd>
                </div>
                {row?.lateMinutes ? (
                  <div>
                    <dt className="text-2xs text-ink-3">Terlambat</dt>
                    <dd className="mt-0.5 font-medium text-warning">{formatMinutes(row.lateMinutes)}</dd>
                  </div>
                ) : null}
                {row?.workMinutes !== null && row?.workMinutes !== undefined ? (
                  <div>
                    <dt className="text-2xs text-ink-3">Durasi kerja</dt>
                    <dd className="mt-0.5 font-medium text-ink">{formatMinutes(row.workMinutes)}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            {info?.locations && info.locations.length > 0 ? (
              <div className="flex items-start gap-2 text-xs text-ink-2">
                <HiOutlineLocationMarker className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
                <p>
                  Titik presensi sah:{' '}
                  <span className="font-medium text-ink">
                    {info.locations.map((location) => location.name).join(', ')}
                  </span>
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                tone="primary"
                className="flex-1 sm:flex-none"
                loading={isBusy === 'in'}
                disabled={!info?.canClockIn || isBusy !== null}
                onClick={() => submit('in')}
                icon={<HiOutlineClock className="h-4 w-4" />}
              >
                Presensi masuk
              </Button>
              <Button
                className="flex-1 sm:flex-none"
                loading={isBusy === 'out'}
                disabled={!info?.canClockOut || isBusy !== null}
                onClick={() => submit('out')}
                icon={<HiOutlineClock className="h-4 w-4" />}
              >
                Presensi pulang
              </Button>
            </div>

            {isFinished ? (
              <p className="text-xs text-ink-3">
                Presensi hari ini lengkap. Hubungi HRD bila ada kekeliruan, karena hanya mereka yang
                dapat menimpa status.
              </p>
            ) : null}
          </>
        )}
      </div>
    </Panel>
  )
}
