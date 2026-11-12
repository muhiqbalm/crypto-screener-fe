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
          'flex items-center justify-center rounded-xl bg-gradient-to-br from-brand to-lab text-white shadow-[0_8px_24px_-10px] shadow-brand/60',
          lg ? 'h-10 w-10' : 'h-9 w-9',
        )}
      >
        <BarChart2 className={lg ? 'h-5 w-5' : 'h-[18px] w-[18px]'} aria-hidden="true" />
      </span>
      <span className="flex items-baseline gap-1.5 leading-none">
        <span className={cn('display font-extrabold tracking-wide text-foreground', lg ? 'text-2xl' : 'text-lg')}>BMTM</span>
        <span className={cn('display font-semibold text-muted-foreground', lg ? 'text-xl' : 'text-base')}>MoonTrade</span>
      </span>
    </Link>
  )
}
