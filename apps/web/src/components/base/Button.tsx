import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 rounded-control font-semibold button-press-feedback disabled:cursor-not-allowed disabled:opacity-55',
  {
    variants: {
      tone: {
        primary: 'bg-primary text-primary-on shadow-1 hover:bg-primary-deep',
        neutral: 'border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-2',
        quiet: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
        danger: 'border border-error-line bg-surface text-error hover:bg-error-subtle',
        destructive: 'bg-error text-error-on shadow-1 hover:brightness-110',
      },
      size: {
        md: 'h-10 px-4 text-[13px] sm:h-9 sm:px-3.5',
        sm: 'h-9 px-3 text-xs sm:h-8',
        icon: 'h-10 w-10 sm:h-9 sm:w-9',
        iconSm: 'h-9 w-9 sm:h-8 sm:w-8',
      },
      full: { true: 'w-full' },
    },
    defaultVariants: { tone: 'neutral', size: 'md' },
  }
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'primary' | 'neutral' | 'quiet' | 'danger' | 'destructive'
  size?: 'md' | 'sm' | 'icon' | 'iconSm'
  full?: boolean
  loading?: boolean
  icon?: ReactNode
}

export function Button({
  tone = 'neutral',
  size = 'md',
  full,
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ tone, size, full }), className)}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  )
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 shrink-0 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
