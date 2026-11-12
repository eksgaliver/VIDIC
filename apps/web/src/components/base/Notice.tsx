import type { ReactNode } from 'react'
import { HiCheckCircle, HiInformationCircle, HiXCircle } from 'react-icons/hi'
import { cn } from '@/lib/utils'

type NoticeTone = 'danger' | 'success' | 'info'

const toneStyle: Record<NoticeTone, { box: string; title: string; icon: ReactNode }> = {
  danger: {
    box: 'border-error-line bg-error-subtle',
    title: 'text-error',
    icon: <HiXCircle />,
  },
  success: {
    box: 'border-success-line bg-success-subtle',
    title: 'text-success',
    icon: <HiCheckCircle />,
  },
  info: {
    box: 'border-primary-line bg-primary-subtle',
    title: 'text-primary',
    icon: <HiInformationCircle />,
  },
}

interface NoticeProps {
  tone: NoticeTone
  title: string
  children: ReactNode
  onDismiss?: () => void
  className?: string
}

/** Umpan balik yang menetap sampai ditutup, tidak hilang sendiri. */
export function Notice({ tone, title, children, onDismiss, className }: NoticeProps) {
  const style = toneStyle[tone]

  return (
    <div
      role={tone === 'success' ? 'status' : 'alert'}
      className={cn(
        'route-enter flex items-start gap-3 rounded-panel border px-4 py-3.5 shadow-1',
        style.box,
        className
      )}
    >
      <span className={cn('mt-px shrink-0 text-lg leading-none', style.title)} aria-hidden="true">
        {style.icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-semibold leading-snug', style.title)}>{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink">{children}</p>
      </div>

      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="-mr-1 -mt-1 shrink-0 rounded-control p-1.5 text-ink-2 transition-colors hover:bg-black/5 hover:text-ink dark:hover:bg-white/5 button-press-feedback"
          aria-label={`Tutup pesan ${title}`}
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  )
}
