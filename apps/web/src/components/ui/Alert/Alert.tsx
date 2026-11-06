import { useState } from 'react'
import classNames from '../utils/classNames'
import useTimeout from '../hooks/useTimeout'
import {
    HiCheckCircle,
    HiInformationCircle,
    HiExclamation,
    HiXCircle,
} from 'react-icons/hi'
import { motion } from 'framer-motion'
import CloseButton from '../CloseButton'
import StatusIcon from '../StatusIcon'
import type { TypeAttributes, CommonProps } from '../@types/common'
import type { ReactNode, MouseEvent, Ref } from 'react'

export interface AlertProps extends CommonProps {
    closable?: boolean
    customClose?: ReactNode | string
    customIcon?: ReactNode | string
    duration?: number
    title?: ReactNode | string
    onClose?: (e?: MouseEvent<HTMLDivElement>) => void
    showIcon?: boolean
    triggerByToast?: boolean
    type?: TypeAttributes.Status
    ref?: Ref<HTMLDivElement>
}

const DEFAULT_TYPE = 'warning'

const TYPE_MAP = {
    success: {
        backgroundColor: 'bg-success-subtle border border-success/20 dark:border-success/30',
        titleColor: 'text-success font-semibold',
        textColor: 'text-neutral-800 dark:text-neutral-200',
        iconColor: 'text-success',
        icon: <HiCheckCircle />,
    },
    info: {
        backgroundColor: 'bg-info-subtle border border-info/20 dark:border-info/30',
        titleColor: 'text-info font-semibold',
        textColor: 'text-neutral-800 dark:text-neutral-200',
        iconColor: 'text-info',
        icon: <HiInformationCircle />,
    },
    warning: {
        backgroundColor: 'bg-warning-subtle border border-warning/20 dark:border-warning/30',
        titleColor: 'text-warning font-semibold',
        textColor: 'text-neutral-800 dark:text-neutral-200',
        iconColor: 'text-warning',
        icon: <HiExclamation />,
    },
    danger: {
        backgroundColor: 'bg-error-subtle border border-error/25 dark:border-error/40',
        titleColor: 'text-error font-semibold',
        textColor: 'text-neutral-800 dark:text-neutral-200',
        iconColor: 'text-error',
        icon: <HiXCircle />,
    },
}

const TYPE_ARRAY: TypeAttributes.Status[] = [
    'success',
    'danger',
    'info',
    'warning',
]

const Alert = (props: AlertProps) => {
    const {
        children,
        className,
        closable = false,
        customClose,
        customIcon,
        duration = 3000,
        title = null,
        onClose,
        ref,
        showIcon = false,
        triggerByToast = false,
        ...rest
    } = props

    const getType = () => {
        const { type = DEFAULT_TYPE } = props
        if (TYPE_ARRAY.includes(type)) {
            return type
        }
        return DEFAULT_TYPE
    }

    const type = getType()
    const typeMap = TYPE_MAP[type]

    const [display, setDisplay] = useState('show')

    const { clear } = useTimeout(
        onClose as () => void,
        duration,
        (duration as number) > 0,
    )

    const handleClose = (e: MouseEvent<HTMLDivElement>) => {
        setDisplay('hiding')
        onClose?.(e)
        clear()
        if (!triggerByToast) {
            setTimeout(() => {
                setDisplay('hide')
            }, 400)
        }
    }

    const renderClose = () => {
        return (
            <div
                className="cursor-pointer"
                role="presentation"
                onClick={(e) => handleClose(e)}
            >
                {customClose || (
                    <CloseButton
                        resetDefaultClass
                        className="text-lg outline-hidden"
                    />
                )}
            </div>
        )
    }

    const alertClass = classNames(
        'alert',
        typeMap.backgroundColor,
        typeMap.textColor,
        !title ? 'font-semibold' : '',
        closable ? 'justify-between' : '',
        closable && !title ? 'items-center' : '',
        !triggerByToast && 'rounded-xl',

        className,
    )

    if (display === 'hide') {
        return null
    }

    return (
        <motion.div
            ref={ref}
            role="alert"
            className={alertClass}
            initial={{ opacity: 1 }}
            animate={display === 'hiding' ? 'exit' : 'animate'}
            transition={{ duration: 0.25, type: 'tween' }}
            variants={{
                animate: {
                    opacity: 1,
                },
                exit: {
                    opacity: 0,
                },
            }}
            {...rest}
        >
            <div
                className={classNames(
                    'flex flex-1 gap-3',
                    !title && children ? 'items-center' : 'items-start',
                )}
            >
                {showIcon && (
                    <div className="shrink-0 mt-0.5">
                        <StatusIcon
                            iconColor={typeMap.iconColor}
                            custom={customIcon}
                            type={type}
                        />
                    </div>
                )}
                <div className="flex-1 min-w-0 text-xs">
                    {title ? (
                        <div
                            className={classNames(
                                'font-semibold text-sm mb-1 leading-snug',
                                typeMap.titleColor,
                            )}
                        >
                            {title}
                        </div>
                    ) : null}
                    <div className={classNames('leading-relaxed', typeMap.textColor)}>
                        {children}
                    </div>
                </div>
            </div>
            {closable ? renderClose() : null}
        </motion.div>
    )
}

export default Alert
