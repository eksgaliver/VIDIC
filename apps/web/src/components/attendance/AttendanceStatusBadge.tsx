import type { AttendanceStatusItem } from '@/@types/attendance'
import { cn } from '@/lib/utils'
import { readableInk } from '@/utils/attendance'

interface AttendanceStatusBadgeProps {
  status: Pick<AttendanceStatusItem, 'name' | 'color'>
  className?: string
  title?: string
}

/** Chip status: warna latar datang dari basis data, bukan kelas Tailwind. */
export function AttendanceStatusBadge({ status, className, title }: AttendanceStatusBadgeProps) {
  return (
    <span
      title={title ?? status.name}
      className={cn(
        'inline-flex max-w-full items-center rounded-md px-2 py-0.5 text-2xs font-medium leading-5',
        className
      )}
      style={{ backgroundColor: status.color, color: readableInk(status.color) }}
    >
      <span className="truncate">{status.name}</span>
    </span>
  )
}
