import { forwardRef, type ElementType, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Container — wrapper standard de ancho controlado.
 *
 * Centraliza horizontal padding y max-width que ya viene replicado en
 * cada página (`max-w-6xl mx-auto px-4 sm:px-6`). Variantes alineadas
 * con los anchos que ya existen en el portfolio:
 *
 * - `prose` 768px / max-w-3xl → páginas legales (privacy, terms, licensing)
 * - `narrow` 1024px / max-w-5xl → playground
 * - `default` 1152px / max-w-6xl → sf01, chord-lab
 * - `wide` 1400px → galería landing
 * - `full` sin max-width
 *
 * `as` permite renderizar como cualquier tag (default `div`).
 */
type ContainerWidth = 'prose' | 'narrow' | 'default' | 'wide' | 'full'

const widthClass: Record<ContainerWidth, string> = {
  prose: 'max-w-3xl',
  narrow: 'max-w-5xl',
  default: 'max-w-6xl',
  wide: 'max-w-[1400px]',
  full: '',
}

interface ContainerProps extends HTMLAttributes<HTMLElement> {
  width?: ContainerWidth
  as?: ElementType
}

export const Container = forwardRef<HTMLElement, ContainerProps>(
  ({ width = 'default', as: Tag = 'div', className, ...rest }, ref) => {
    return (
      <Tag
        ref={ref as never}
        className={cn(
          'mx-auto px-4 sm:px-6',
          widthClass[width],
          className,
        )}
        {...rest}
      />
    )
  },
)
Container.displayName = 'Container'
