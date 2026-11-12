import Link from 'next/link'
import { BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

/** BMTM logo mark + wordmark. `compact` hides the wordmark subtitle. */
export function Brand({
  href = '/beranda',
  size = 'md',
  className,
}: {
  href?: string
  size?: 'md' | 'lg'
  className?: string
}) {
  const lg = size === 'lg'
  return (
    <Link
      href={href}
      className={cn('flex items-center gap-2.5 rounded-md tracking-tight transition-opacity hover:opacity-85', className)}
      aria-label="BMTM MoonTrade — beranda"
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-lg border border-brand/25 bg-brand/10 text-brand',
          lg ? 'h-9 w-9' : 'h-8 w-8',
        )}
      >
        <BarChart2 className={lg ? 'h-5 w-5' : 'h-4 w-4'} aria-hidden="true" />
      </span>
      <span className="flex items-baseline gap-1.5 leading-none">
        <span className={cn('font-extrabold tracking-wider text-brand', lg ? 'text-xl' : 'text-base')}>BMTM</span>
        <span className={cn('font-semibold text-foreground', lg ? 'text-xl' : 'text-sm')}>MoonTrade</span>
      </span>
    </Link>
  )
}
