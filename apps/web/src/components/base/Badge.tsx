import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const toneClass: Record<BadgeTone, string> = {
  neutral: 'border-line bg-surface-2 text-ink-2',
  accent: 'border-primary-line bg-primary-subtle text-primary',
  success: 'border-success-line bg-success-subtle text-success',
  warning: 'border-warning-line bg-warning-subtle text-warning',
  danger: 'border-error-line bg-error-subtle text-error',
}

interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-2xs font-medium leading-5',
        toneClass[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

/** Titik status gambar (bukan glif teks) supaya konsisten di semua font. */
export function StatusDot({ tone = 'success', className }: { tone?: BadgeTone; className?: string }) {
  const color =
    tone === 'success'
      ? 'bg-success'
      : tone === 'danger'
        ? 'bg-error'
        : tone === 'warning'
          ? 'bg-warning'
          : tone === 'accent'
            ? 'bg-primary'
            : 'bg-ink-3'
  return <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', color, className)} />
}

interface StatusProps {
  label: string
  tone?: BadgeTone
  className?: string
}

export function Status({ label, tone = 'success', className }: StatusProps) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm font-medium text-ink', className)}>
      <StatusDot tone={tone} />
      {label}
    </span>
  )
}

const STATUS_LABEL: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: 'Aktif', tone: 'success' },
  suspended: { label: 'Ditangguhkan', tone: 'warning' },
  inactive: { label: 'Nonaktif', tone: 'neutral' },
}

/** Terjemahkan kolom status dari basis data apa adanya, tanpa mengarang. */
export function StatusFromValue({ value }: { value?: string | null }) {
  const mapped = STATUS_LABEL[value ?? ''] ?? { label: value || 'Belum disetel', tone: 'neutral' as BadgeTone }
  return <Status label={mapped.label} tone={mapped.tone} />
}
