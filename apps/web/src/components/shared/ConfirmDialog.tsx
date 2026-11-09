import type { ReactNode } from 'react'
import Dialog from '@/components/ui/Dialog'
import { Button, DialogFooter } from '@/components/base'
import type { ButtonProps } from '@/components/base'
import { cn } from '@/lib/utils'
import type { DialogProps } from '@/components/ui/Dialog'

type StatusType = 'info' | 'success' | 'warning' | 'danger'

interface ConfirmDialogProps extends DialogProps {
    cancelText?: ReactNode | string
    confirmText?: ReactNode | string
    confirmButtonProps?: ButtonProps
    cancelButtonProps?: ButtonProps
    type?: StatusType
    title?: ReactNode | string
    onCancel?: () => void
    onConfirm?: () => void
}

const TONE = {
    info: { ring: 'border-primary-line bg-primary-subtle text-primary', path: 'M12 8h.01M11 12h1v4h1' },
    success: { ring: 'border-success-line bg-success-subtle text-success', path: 'M8.5 12.5l2.5 2.5 5-5.5' },
    warning: { ring: 'border-warning-line bg-warning-subtle text-warning', path: 'M12 8v5m0 3h.01' },
    danger: { ring: 'border-error-line bg-error-subtle text-error', path: 'M12 8v5m0 3h.01' },
} as const

function StatusIcon({ status }: { status: StatusType }) {
    const tone = TONE[status]
    return (
        <span
            className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
                tone.ring
            )}
            aria-hidden="true"
        >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d={tone.path} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </span>
    )
}

const ConfirmDialog = (props: ConfirmDialogProps) => {
    const {
        type = 'info',
        title,
        children,
        onCancel,
        onConfirm,
        cancelText = 'Batal',
        confirmText = 'Konfirmasi',
        confirmButtonProps,
        cancelButtonProps,
        ...rest
    } = props

    return (
        <Dialog {...rest}>
            <div className="flex min-h-0 flex-1 gap-4 px-4 py-5 sm:px-5">
                <StatusIcon status={type} />
                <div className="min-w-0">
                    <h2 className="text-[15px] font-bold tracking-tight text-ink">{title}</h2>
                    <div className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{children}</div>
                </div>
            </div>
            <DialogFooter>
                <Button size="sm" onClick={onCancel} {...cancelButtonProps}>
                    {cancelText}
                </Button>
                <Button
                    size="sm"
                    tone={type === 'danger' ? 'destructive' : 'primary'}
                    onClick={onConfirm}
                    {...confirmButtonProps}
                >
                    {confirmText}
                </Button>
            </DialogFooter>
        </Dialog>
    )
}

export default ConfirmDialog
