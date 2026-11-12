import { cn } from '@/lib/utils/cn'

const LEVEL: Record<string, number> = { rendah: 1, sedang: 2, tinggi: 3 }

/**
 * Keyakinan as 1–3 filled dots + the word (never dots alone).
 *   <ConfidenceDots level="sedang" />  → ●●○ sedang
 */
export function ConfidenceDots({
  level,
  showLabel = true,
  className,
}: {
  level: 'rendah' | 'sedang' | 'tinggi' | 1 | 2 | 3 | null | undefined
  showLabel?: boolean
  className?: string
}) {
  const n = typeof level === 'number' ? level : level ? (LEVEL[level] ?? 0) : 0
  const word = typeof level === 'string' ? level : ['', 'rendah', 'sedang', 'tinggi'][n] ?? ''
  if (!n) return null
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)} title={`Keyakinan ${word}`}>
      <span className="inline-flex gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn('h-2 w-2 rounded-full', i <= n ? 'bg-brand' : 'bg-muted-foreground/25')} />
        ))}
      </span>
      {showLabel ? <span>{word}</span> : <span className="sr-only">Keyakinan {word}</span>}
    </span>
  )
}
