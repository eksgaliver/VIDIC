import { HiOutlinePencil } from 'react-icons/hi'
import { Button, EmptyState, Panel, PanelHeader, TableSkeleton } from '@/components/base'
import { AttendanceStatusBadge } from './AttendanceStatusBadge'
import {
  ATTENDANCE_SOURCE_LABEL,
  formatClock,
  formatDateLabel,
  formatMinutes
} from '@/utils/attendance'
import type { AttendanceRow } from '@/@types/attendance'

interface AttendanceRecapTableProps {
  rows: AttendanceRow[]
  isLoading: boolean
  canManage: boolean
  onOverride: (row: AttendanceRow) => void
  emptyDescription?: string
  meta?: string
}

export function AttendanceRecapTable({
  rows,
  isLoading,
  canManage,
  onOverride,
  emptyDescription = 'Jalankan generate untuk bulan ini, lalu karyawan melakukan presensi mandiri.',
  meta
}: AttendanceRecapTableProps) {
  return (
    <Panel>
      <PanelHeader
        title="Rekap presensi"
        description="Satu baris mewakili satu karyawan per tanggal kerja. Status dapat ditimpa HRD dengan catatan alasan."
        meta={isLoading ? undefined : meta ?? `${rows.length} baris`}
      />

      {isLoading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : rows.length === 0 ? (
        <EmptyState title="Belum ada baris presensi" description={emptyDescription} />
      ) : (
        <div className="overflow-x-auto rounded-b-panel">
          <table className="w-full min-w-[1080px] border-collapse text-left text-[13px] 2xl:text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-3 2xl:text-xs">
                <th className="px-4 py-2.5 font-semibold sm:px-5 2xl:px-7 2xl:py-3.5">Tanggal</th>
                <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Karyawan</th>
                <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Shift</th>
                <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Masuk</th>
                <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Pulang</th>
                <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Durasi</th>
                <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Status</th>
                <th className="px-4 py-2.5 font-semibold 2xl:py-3.5">Catatan</th>
                <th className="px-4 py-2.5 text-right font-semibold sm:px-5 2xl:px-7 2xl:py-3.5">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-surface-2">
                  <td className="whitespace-nowrap px-4 py-3.5 align-top sm:px-5 2xl:px-7 2xl:py-4">
                    <p className="font-medium text-ink">{formatDateLabel(row.attendanceDate)}</p>
                    <p className="mt-0.5 text-[11px] text-ink-3">
                      {ATTENDANCE_SOURCE_LABEL[row.source] ?? row.source}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 align-top 2xl:py-4">
                    <p className="font-semibold text-ink">{row.employee.name}</p>
                    <p className="mt-0.5 text-xs text-ink-3">
                      {row.employee.position || row.employee.departmentName || row.employee.email}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 align-top 2xl:py-4">
                    {row.shift ? (
                      <>
                        <p className="font-medium text-ink">{row.shift.name}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-ink-3">{row.shift.code}</p>
                      </>
                    ) : (
                      <span className="text-xs text-ink-3">Tanpa shift</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 align-top tabular 2xl:py-4">
                    <span className="font-medium text-ink">{formatClock(row.checkInAt, row.timezone)}</span>
                    {row.lateMinutes > 0 ? (
                      <p className="mt-0.5 text-[11px] font-medium text-warning">
                        +{formatMinutes(row.lateMinutes)}
                      </p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 align-top tabular 2xl:py-4">
                    <span className="font-medium text-ink">{formatClock(row.checkOutAt, row.timezone)}</span>
                    {row.checkInDistanceMeters !== null ? (
                      <p className="mt-0.5 text-[11px] text-ink-3">{row.checkInDistanceMeters} m</p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 align-top 2xl:py-4">
                    <span className="text-ink-2">{formatMinutes(row.workMinutes)}</span>
                  </td>
                  <td className="px-4 py-3.5 align-top 2xl:py-4">
                    <AttendanceStatusBadge status={row.status} />
                  </td>
                  <td className="max-w-[220px] px-4 py-3.5 align-top 2xl:py-4">
                    {row.note ? (
                      <p className="line-clamp-2 text-xs text-ink-2">{row.note}</p>
                    ) : (
                      <span className="text-xs text-ink-3">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right align-top sm:px-5 2xl:px-7 2xl:py-4">
                    <Button
                      size="iconSm"
                      tone="quiet"
                      disabled={!canManage}
                      onClick={() => onOverride(row)}
                      aria-label={`Ubah status presensi ${row.employee.name}`}
                      title={canManage ? 'Timpa status' : 'Hanya HRD yang dapat menimpa status'}
                    >
                      <HiOutlinePencil className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
