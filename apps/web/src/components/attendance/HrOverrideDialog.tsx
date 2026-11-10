import * as React from 'react'
import Dialog from '@/components/ui/Dialog'
import {
  Badge,
  Button,
  DialogBody,
  DialogFooter,
  DialogHeading,
  Notice,
  SelectField,
  TextAreaField
} from '@/components/base'
import { AttendanceStatusBadge } from './AttendanceStatusBadge'
import { formatClock, formatDateLabel } from '@/utils/attendance'
import type { AttendanceRow, AttendanceStatusItem } from '@/@types/attendance'

interface HrOverrideDialogProps {
  row: AttendanceRow | null
  statuses: AttendanceStatusItem[]
  onClose: () => void
  onSubmit: (
    row: AttendanceRow,
    payload: { statusId: string; note: string }
  ) => Promise<string | null>
}

export function HrOverrideDialog({ row, statuses, onClose, onSubmit }: HrOverrideDialogProps) {
  const [statusId, setStatusId] = React.useState('')
  const [note, setNote] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    setStatusId(row?.status.id ?? '')
    setNote(row?.note ?? '')
    setError(null)
    setIsSubmitting(false)
  }, [row])

  const selected = statuses.find((item) => item.id === statusId) ?? null
  const isChangingStatus = !!row && statusId !== row.status.id

  // Status nonaktif tetap ditampilkan bila sedang dipakai baris ini, agar riwayat
  // tidak tampak berubah hanya karena HRD menonaktifkan statusnya.
  const options = statuses.filter(
    (item) => item.status === 'active' || item.id === row?.status.id
  )

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!row) return

    if (isChangingStatus && !note.trim()) {
      setError('Catatan alasan wajib diisi saat mengubah status presensi.')
      return
    }

    setIsSubmitting(true)
    const message = await onSubmit(row, { statusId, note: note.trim() })
    setIsSubmitting(false)

    if (message) {
      setError(message)
      return
    }
    onClose()
  }

  return (
    <Dialog isOpen={!!row} onClose={onClose} onRequestClose={onClose} width={540}>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <DialogHeading
          title="Timpa status presensi"
          description={
            row
              ? `${row.employee.name} · ${formatDateLabel(row.attendanceDate)} · masuk ${formatClock(
                  row.checkInAt,
                  row.timezone
                )}`
              : undefined
          }
        />

        <DialogBody className="space-y-4 px-4 py-5 sm:px-5">
          {error ? (
            <Notice tone="danger" title="Perubahan ditolak" onDismiss={() => setError(null)}>
              {error}
            </Notice>
          ) : null}

          {row ? (
            <div className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-surface-2 px-3 py-2.5 text-xs text-ink-2">
              <span>Status sekarang:</span>
              <AttendanceStatusBadge status={row.status} />
              <span className="text-ink-3">
                · sumber {row.source === 'clock_in' ? 'presensi mandiri' : row.source === 'auto' ? 'generate' : 'HRD'}
              </span>
            </div>
          ) : null}

          <SelectField
            label="Status baru"
            value={statusId}
            onChange={(event) => setStatusId(event.target.value)}
            hint="Daftar ini berasal dari master status absensi milik perusahaan Anda."
            required
          >
            {options.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.status === 'inactive' ? ' (nonaktif)' : ''}
              </option>
            ))}
          </SelectField>

          {selected ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-ink-3">Pratinjau:</span>
              <AttendanceStatusBadge status={selected} />
              {selected.isAbsent ? <Badge tone="danger">Dihitung alpa</Badge> : null}
              {!selected.isPaid ? <Badge tone="warning">Tidak dibayar</Badge> : null}
            </div>
          ) : null}

          {selected?.isAbsent ? (
            <Notice tone="info" title="Status ketidakhadiran">
              Status ini menandai karyawan tidak masuk tanpa keterangan. Pastikan alasan pada catatan
              sudah benar sebelum menyimpan.
            </Notice>
          ) : null}

          <TextAreaField
            label="Catatan alasan"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Misal: tugas lapangan ke Bandung, atau surat dokter diterima 3 hari"
            hint={
              isChangingStatus
                ? 'Wajib diisi karena status berubah. Catatan tersimpan bersama baris presensi.'
                : 'Opsional bila status tidak berubah.'
            }
            required={isChangingStatus}
            rows={3}
          />
        </DialogBody>

        <DialogFooter>
          <Button type="button" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" tone="primary" loading={isSubmitting} disabled={!row}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan status'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
