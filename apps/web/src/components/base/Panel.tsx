import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PanelProps {
  className?: string
  children: ReactNode
}

/** Wadah permukaan satu lapis. Jangan menumpuk Panel di dalam Panel. */
export function Panel({ className, children }: PanelProps) {
  return (
    <section className={cn('rounded-panel border border-line bg-surface shadow-1', className)}>
      {children}
    </section>
  )
}

interface PanelHeaderProps {
  title: ReactNode
  description?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PanelHeader({
  title,
  description,
  meta,
  actions,
  className,
}: PanelHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5',
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold tracking-tight text-ink">{title}</h2>
        {description ? <p className="mt-1 text-[13px] text-ink-2">{description}</p> : null}
      </div>
      {actions || meta ? (
        <div className="flex shrink-0 items-center gap-3">
          {meta ? <span className="text-xs tabular text-ink-3">{meta}</span> : null}
          {actions}
        </div>
      ) : null}
    </header>
  )
}

interface PageHeaderProps {
  title: string
  description?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <h1 className="text-xl font-bold tracking-tightest text-ink sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

interface FormSectionProps {
  title: string
  description?: ReactNode
  children: ReactNode
  className?: string
}

/** Kelompok field dalam form panjang: garis halus, bukan kartu bersarang. */
export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={cn('space-y-4 border-t border-line pt-5 first:border-0 first:pt-0', className)}>
      <div>
        <h3 className="text-[13px] font-bold text-ink">{title}</h3>
        {description ? <p className="mt-1 text-xs leading-relaxed text-ink-2">{description}</p> : null}
      </div>
      {children}
    </div>
  )
}

interface DialogHeadingProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

/** Kepala isi dialog. Ruang kanan dikosongkan untuk tombol tutup bawaan Dialog. */
export function DialogHeading({ title, description, actions, className }: DialogHeadingProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5',
        className
      )}
    >
      <div className="min-w-0 pr-10">
        <h2 className="text-[15px] font-bold tracking-tight text-ink">{title}</h2>
        {description ? (
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

interface DialogBodyProps {
  children: ReactNode
  className?: string
}

/** Area gulir isi dialog; judul dan footer tetap di luar agar tidak ikut tergulir. */
export function DialogBody({ children, className }: DialogBodyProps) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto', className)}>{children}</div>
}

interface DialogFooterProps {
  children: ReactNode
  className?: string
}

export function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2 px-4 py-3.5 sm:px-5',
        className
      )}
    >
      {children}
    </div>
  )
}
