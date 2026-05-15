import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Section — vertical rhythm primitive.
 *
 * Estandariza el padding vertical que se replica por toda la app.
 * Tres tamaños alineados con los patrones existentes:
 *
 * - `hero`   py-24 md:py-32 → hero de landing / heroes de detail pages
 * - `default` py-16 md:py-20 → sections de contenido (features, status)
 * - `tight`  py-10 md:py-12 → sections compactas dentro de un page
 *
 * Renderiza como `<section>` por default; usa `as="div"` cuando ya
 * estés dentro de un `<section>` y necesites solo el spacing.
 *
 * Estos tamaños cuadran con la escala spacing de Tailwind (8px-base):
 * py-24 = 96px, py-32 = 128px, py-16 = 64px, py-20 = 80px,
 * py-10 = 40px, py-12 = 48px.
 */
type SectionSize = 'hero' | 'default' | 'tight'

const sizeClass: Record<SectionSize, string> = {
  hero: 'py-24 md:py-32',
  default: 'py-16 md:py-20',
  tight: 'py-10 md:py-12',
}

interface SectionProps extends HTMLAttributes<HTMLElement> {
  size?: SectionSize
  as?: 'section' | 'div' | 'article' | 'aside' | 'header' | 'footer'
}

export const Section = forwardRef<HTMLElement, SectionProps>(
  ({ size = 'default', as: Tag = 'section', className, ...rest }, ref) => {
    return (
      <Tag
        ref={ref as never}
        className={cn(sizeClass[size], className)}
        {...rest}
      />
    )
  },
)
Section.displayName = 'Section'
