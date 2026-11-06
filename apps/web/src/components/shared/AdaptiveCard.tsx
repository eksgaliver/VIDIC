import classNames from '@/components/ui/utils/classNames'
import Card from '@/components/ui/Card'
import type { CardProps } from '@/components/ui/Card'

type AdaptableCardProps = CardProps & {
    adaptiveCardActive?: boolean
}

const AdaptiveCard = (props: AdaptableCardProps) => {
    const { className, bodyClass, adaptiveCardActive = false, ...rest } = props

    return (
        <Card
            className={classNames(
                className,
                adaptiveCardActive && 'border-none dark:bg-transparent',
            )}
            bodyClass={classNames(bodyClass, adaptiveCardActive && 'p-0')}
            {...rest}
        />
    )
}

export default AdaptiveCard
