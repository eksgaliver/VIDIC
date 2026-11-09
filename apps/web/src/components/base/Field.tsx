import { useId } from 'react'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { HiOutlineChevronDown } from 'react-icons/hi'
import { cn } from '@/lib/utils'

const controlBase =
  'w-full rounded-control border border-line bg-surface px-3 text-[13px] text-ink transition-[border-color,background-color] duration-150 hover:border-line-strong focus:border-primary disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-3'

const labelBase = 'block text-xs font-semibold text-ink-2'

function RequiredMark({ shown }: { shown: boolean }) {
  if (!shown) return null
  return (
    <span className="ml-1 text-error" aria-hidden="true">
      *
    </span>
  )
}

interface ShellProps {
  label: string
  htmlFor: string
  required?: boolean
  hint?: ReactNode
  className?: string
  children: ReactNode
}

function FieldShell({ label, htmlFor, required, hint, className, children }: ShellProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className={labelBase}>
        {label}
        <RequiredMark shown={!!required} />
      </label>
      {children}
      {hint ? <p className="text-[11px] leading-snug text-ink-3">{hint}</p> : null}
    </div>
  )
}

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: ReactNode
  mono?: boolean
  className?: string
  inputClassName?: string
}

export function TextField({
  label,
  hint,
  mono,
  required,
  className,
  inputClassName,
  ...rest
}: TextFieldProps) {
  const id = useId()
  return (
    <FieldShell
      label={label}
      htmlFor={id}
      required={required}
      hint={hint}
      className={className}
    >
      <input
        id={id}
        required={required}
        className={cn(controlBase, 'h-10 sm:h-9', mono && 'font-mono tabular', inputClassName)}
        {...rest}
      />
    </FieldShell>
  )
}

export interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: ReactNode
  className?: string
  inputClassName?: string
}

export function TextAreaField({
  label,
  hint,
  required,
  className,
  inputClassName,
  rows = 3,
  ...rest
}: TextAreaFieldProps) {
  const id = useId()
  return (
    <FieldShell label={label} htmlFor={id} required={required} hint={hint} className={className}>
      <textarea
        id={id}
        rows={rows}
        required={required}
        className={cn(controlBase, 'resize-y py-2.5 leading-relaxed', inputClassName)}
        {...rest}
      />
    </FieldShell>
  )
}

export interface CheckboxFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: ReactNode
  className?: string
}

/** Kotak centang: kontrol nyata berlabel, bukan area teks yang bisa diklik sembarangan. */
export function CheckboxField({ label, hint, id, className, ...rest }: CheckboxFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-2.5">
        <input
          id={inputId}
          type="checkbox"
          className="h-4 w-4 shrink-0 cursor-pointer rounded-sm border border-line-strong bg-surface accent-[var(--primary)]"
          {...rest}
        />
        <label htmlFor={inputId} className="cursor-pointer text-[13px] font-medium text-ink">
          {label}
        </label>
      </div>
      {hint ? <p className="pl-[26px] text-[11px] leading-snug text-ink-3">{hint}</p> : null}
    </div>
  )
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: ReactNode
  className?: string
  selectClassName?: string
  children: ReactNode
}

export function SelectField({
  label,
  hint,
  required,
  className,
  selectClassName,
  children,
  ...rest
}: SelectFieldProps) {
  const id = useId()
  return (
    <FieldShell label={label} htmlFor={id} required={required} hint={hint} className={className}>
      <div className="relative">
        <select
          id={id}
          required={required}
          className={cn(
            controlBase,
            'h-10 cursor-pointer appearance-none pr-9 sm:h-9',
            selectClassName
          )}
          {...rest}
        >
          {children}
        </select>
        <HiOutlineChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
      </div>
    </FieldShell>
  )
}
