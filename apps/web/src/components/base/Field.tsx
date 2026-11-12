import { useId } from 'react'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/utils'
import { Select } from './Select'

const controlBase =
  'w-full rounded-control border border-line bg-surface px-3 text-sm text-ink transition-[border-color,background-color] duration-150 hover:border-line-strong focus:border-primary disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-3'

const labelBase = 'block text-xs font-medium text-ink-2'

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
      {hint ? <p className="text-xs leading-snug text-ink-3">{hint}</p> : null}
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
        <label htmlFor={inputId} className="cursor-pointer text-sm font-medium text-ink">
          {label}
        </label>
      </div>
      {hint ? <p className="pl-[26px] text-xs leading-snug text-ink-3">{hint}</p> : null}
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

export function SelectField(props: SelectFieldProps) {
  const id = useId()
  const { label, hint, required, className, selectClassName, children, value, defaultValue, onChange, disabled, name } = props

  return (
    <FieldShell label={label} htmlFor={id} required={required} hint={hint} className={className}>
      <Select
        id={id}
        name={name}
        value={value as string | number | undefined}
        defaultValue={defaultValue as string | number | undefined}
        onChange={onChange}
        disabled={disabled}
        className={selectClassName}
      >
        {children}
      </Select>
    </FieldShell>
  )
}
