import * as React from 'react'
import ReactSelect, { type GroupBase, type StylesConfig } from 'react-select'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: React.ReactNode
  isDisabled?: boolean
}

/** Ubah deretan <option> menjadi opsi react-select, termasuk hasil .map() dan fragment. */
function collectOptions(children: React.ReactNode): SelectOption[] {
  const options: SelectOption[] = []

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return

    if (child.type === 'option') {
      const props = child.props as {
        value?: string | number
        disabled?: boolean
        children?: React.ReactNode
      }

      options.push({
        value: String(props.value ?? ''),
        label: props.children ?? String(props.value ?? ''),
        isDisabled: props.disabled
      })
      return
    }

    const nested = (child.props as { children?: React.ReactNode }).children
    if (nested) options.push(...collectOptions(nested))
  })

  return options
}

/**
 * Nilai react-select diterjemahkan menjadi event `change` milik <select> lama,
 * sehingga pemanggil yang sudah memakai `event.target.value` tidak perlu diubah.
 */
function toChangeEvent(value: string) {
  return {
    target: { value },
    currentTarget: { value }
  } as unknown as React.ChangeEvent<HTMLSelectElement>
}

const selectStyles: StylesConfig<SelectOption, false, GroupBase<SelectOption>> = {
  control: (base, state) => ({
    ...base,
    minHeight: 40,
    borderRadius: 'var(--radius-control)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: state.isFocused ? 'var(--primary)' : 'var(--line)',
    backgroundColor: state.isDisabled ? 'var(--surface-2)' : 'var(--surface)',
    boxShadow: state.isFocused ? '0 0 0 3px color-mix(in srgb, var(--primary) 22%, transparent)' : 'none',
    fontSize: 14,
    cursor: state.isDisabled ? 'not-allowed' : 'pointer',
    transition: 'border-color 150ms var(--ease-out)'
  }),
  valueContainer: (base) => ({ ...base, padding: '2px 10px', gap: 4 }),
  singleValue: (base) => ({ ...base, color: 'var(--ink)', margin: 0 }),
  placeholder: (base) => ({ ...base, color: 'var(--ink-3)', margin: 0 }),
  input: (base) => ({ ...base, color: 'var(--ink)', margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, paddingRight: 6 }),
  dropdownIndicator: (base) => ({ ...base, padding: 4, color: 'var(--ink-3)' }),
  clearIndicator: (base) => ({ ...base, padding: 4, color: 'var(--ink-3)' }),
  indicatorSeparator: () => ({ display: 'none' }),
  menuPortal: (base) => ({ ...base, zIndex: 200 }),
  menu: (base) => ({
    ...base,
    marginTop: 4,
    borderRadius: 10,
    border: '1px solid var(--line)',
    backgroundColor: 'var(--surface)',
    boxShadow: 'var(--shadow-md)',
    overflow: 'hidden'
  }),
  menuList: (base) => ({ ...base, padding: 4, maxHeight: 240 }),
  option: (base, state) => ({
    ...base,
    borderRadius: 6,
    padding: '8px 10px',
    fontSize: 14,
    cursor: state.isDisabled ? 'not-allowed' : 'pointer',
    color: state.isSelected ? 'var(--primary)' : state.isDisabled ? 'var(--ink-3)' : 'var(--ink)',
    backgroundColor: state.isSelected
      ? 'var(--primary-subtle)'
      : state.isFocused && !state.isDisabled
        ? 'var(--surface-2)'
        : 'transparent',
    fontWeight: state.isSelected ? 500 : 400,
    ':active': { backgroundColor: 'var(--surface-3)' }
  }),
  noOptionsMessage: (base) => ({ ...base, padding: '8px 10px', fontSize: 12, color: 'var(--ink-3)' }),
  loadingMessage: (base) => ({ ...base, padding: '8px 10px', fontSize: 12, color: 'var(--ink-3)' })
}

export interface SelectProps {
  value?: string | number | null
  defaultValue?: string | number
  onChange?: React.ChangeEventHandler<HTMLSelectElement>
  children?: React.ReactNode
  options?: SelectOption[]
  placeholder?: string
  disabled?: boolean
  name?: string
  id?: string
  className?: string
  menuPlacement?: 'auto' | 'bottom' | 'top'
  isSearchable?: boolean
  ariaLabel?: string
}

/** Dropdown berbasis react-select yang meniru API <select> milik formulir lama. */
export function Select({
  value,
  defaultValue,
  onChange,
  children,
  options,
  placeholder = 'Pilih...',
  disabled,
  name,
  id,
  className,
  menuPlacement = 'auto',
  isSearchable,
  ariaLabel
}: SelectProps) {
  const items = React.useMemo(
    () => options ?? collectOptions(children),
    [options, children]
  )

  const currentValue = String(value ?? defaultValue ?? '')
  const selected = items.find((item) => item.value === currentValue) ?? null
  const searchable = isSearchable ?? items.length > 7

  return (
    <ReactSelect<SelectOption, false, GroupBase<SelectOption>>
      inputId={id}
      instanceId={id}
      name={name}
      aria-label={ariaLabel}
      className={cn('w-full text-sm', className)}
      classNamePrefix="srikaya-select"
      value={selected}
      options={items}
      isDisabled={disabled}
      isSearchable={searchable}
      placeholder={placeholder}
      menuPlacement={menuPlacement}
      menuPortalTarget={typeof document === 'undefined' ? undefined : document.body}
      menuPosition={typeof document === 'undefined' ? 'absolute' : 'fixed'}
      styles={selectStyles}
      onChange={(option) => onChange?.(toChangeEvent(option?.value ?? ''))}
      noOptionsMessage={() => 'Tidak ada pilihan'}
    />
  )
}