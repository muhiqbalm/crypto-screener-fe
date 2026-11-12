import Link from 'next/link'
import { ArrowRight, Loader2, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

export interface NextStepAction {
  label: string
  /** Navigate. Use either href or onClick. */
  href?: string
  onClick?: () => void
  icon?: LucideIcon
  disabled?: boolean
  /** Shows a spinner and disables the button. */
  loading?: boolean
}

export interface NextStepProps {
  /** Default "Langkah berikutnya". */
  title?: React.ReactNode
  /** One sentence: why this step. */
  description?: React.ReactNode
  /** The one primary action. */
  action: NextStepAction
  /** Optional quieter second action. */
  secondary?: NextStepAction
  className?: string
}

function ActionButton({ a, primary }: { a: NextStepAction; primary: boolean }) {
  const Icon = a.loading ? Loader2 : (a.icon ?? (primary ? ArrowRight : undefined))
  const body = (
    <>
      {a.label}
      {Icon && <Icon className={cn(a.loading && 'animate-spin')} aria-hidden="true" />}
    </>
  )
  const variant = primary ? 'default' : 'outline'
  if (a.href && !a.disabled && !a.loading) {
    return (
      <Button asChild size="sm" variant={variant}>
        <Link href={a.href}>{body}</Link>
      </Button>
    )
  }
  return (
    <Button size="sm" variant={variant} onClick={a.onClick} disabled={a.disabled || a.loading} aria-busy={a.loading || undefined}>
      {body}
    </Button>
  )
}

/**
 * "Langkah berikutnya" card with ONE primary button (plus an optional quiet
 * second one). Use after a result (run detail, preset) and in empty states so
 * the user always knows what to do next. Client-safe and server-safe when no
 * onClick is passed.
 */
export function NextStep({ title = 'Langkah berikutnya', description, action, secondary, className }: NextStepProps) {
  return (
    <section
      aria-label="Langkah berikutnya"
      className={cn('flex flex-col gap-3 rounded-xl border border-dashed bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between', className)}
    >
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {secondary && <ActionButton a={secondary} primary={false} />}
        <ActionButton a={action} primary />
      </div>
    </section>
  )
}
