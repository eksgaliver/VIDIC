import { useState, useEffect, type DetailedHTMLProps, type ImgHTMLAttributes } from 'react'

interface DoubleSidedImageProps
    extends DetailedHTMLProps<
        ImgHTMLAttributes<HTMLImageElement>,
        HTMLImageElement
    > {
    darkModeSrc: string
}

const DoubleSidedImage = ({
    src,
    darkModeSrc,
    alt = '',
    ...rest
}: DoubleSidedImageProps) => {
    const [isDark, setIsDark] = useState(false)

    useEffect(() => {
        const checkDark = () => {
            setIsDark(document.documentElement.classList.contains('dark'))
        }
        checkDark()
        const observer = new MutationObserver(checkDark)
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        })
        return () => observer.disconnect()
    }, [])

    return (
        <img src={isDark ? darkModeSrc : src} alt={alt} {...rest} />
    )
}

export default DoubleSidedImage
