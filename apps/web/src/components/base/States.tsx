import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

/** State kosong: bentuk geometris gambar, bukan ilustrasi atau emoji. */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-start gap-4 px-5 py-12 sm:px-8', className)}>
      <svg
        className="h-10 w-10 text-line-strong"
        viewBox="0 0 40 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <rect x="4" y="9" width="32" height="22" rx="3" />
        <path d="M4 16h32" />
        <path d="M11 23h10" strokeLinecap="round" />
        <circle cx="29.5" cy="23.5" r="2.5" />
      </svg>
      <div className="max-w-md">
        <h3 className="text-[15px] font-bold text-ink">{title}</h3>
        {description ? (
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{description}</p>
        ) : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <span className={cn('skeleton block', className)} aria-hidden="true" />
}

interface ListSkeletonProps {
  rows?: number
  className?: string
}

/** Kerangka yang meniru ritme baris data asli. */
export function ListSkeleton({ rows = 3, className }: ListSkeletonProps) {
  return (
    <ul
      className={cn('divide-y divide-line', className)}
      role="status"
      aria-label="Memuat data"
    >
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex items-center gap-4 px-4 py-4 sm:px-5">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
          <Skeleton className="hidden h-2.5 w-24 sm:block" />
        </li>
      ))}
    </ul>
  )
}

export function TableSkeleton({
  rows = 4,
  columns = 5,
  className,
}: {
  rows?: number
  columns?: number
  className?: string
}) {
  return (
    <div
      className={cn('divide-y divide-line', className)}
      role="status"
      aria-label="Memuat data"
    >
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
          {Array.from({ length: columns }, (_, cellIndex) => (
            <Skeleton
              key={cellIndex}
              className={cn('h-2.5', cellIndex === 0 ? 'w-1/5' : 'flex-1')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function InlineLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-8 text-[13px] text-ink-2" role="status">
      <svg className="h-4 w-4 animate-spin text-primary" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {label}
    </div>
  )
}
