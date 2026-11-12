import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { TONE_SOFT, type Tone } from '@/components/ui/tone'

/** Tinted rounded square with a lucide icon (like the deck's `.ico`). */
export function IconChip({ icon: Icon, tone = 'brand', size = 'md', className }: { icon: LucideIcon; tone?: Tone; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-xl',
        TONE_SOFT[tone],
        size === 'sm' ? 'h-8 w-8 [&_svg]:h-4 [&_svg]:w-4' : size === 'lg' ? 'h-12 w-12 [&_svg]:h-6 [&_svg]:w-6' : 'h-10 w-10 [&_svg]:h-5 [&_svg]:w-5',
        className,
      )}
    >
      <Icon strokeWidth={2} />
    </span>
  )
}

/**
 * Card header: icon chip + short title (17–18px) + optional one-line
 * subtitle + right-aligned action ("Lihat …" link or a pill).
 */
export function IconTitle({
  icon,
  title,
  tone = 'brand',
  subtitle,
  action,
  as: Tag = 'h2',
  className,
}: {
  icon: LucideIcon
  title: React.ReactNode
  tone?: Tone
  subtitle?: React.ReactNode
  action?: React.ReactNode
  as?: 'h2' | 'h3'
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-3">
        <IconChip icon={icon} tone={tone} />
        <div className="min-w-0">
          <Tag className="break-words text-lg font-bold leading-tight tracking-tight">{title}</Tag>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}
