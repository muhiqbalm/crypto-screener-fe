import { History } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { LIVE_HISTORY_NOTE } from '@/lib/bot/history'

/**
 * Honest note next to every list of live bot trades: the recorded history starts on
 * 6 Nov 2026 (trading database replaced; audit 2026-11-13 P2). Read-only, no data.
 */
export function LiveHistoryNote({ className }: { className?: string }) {
  return (
    <p
      role="note"
      className={cn(
        'flex items-start gap-2 rounded-xl border border-warn/30 bg-warn/[0.06] px-3 py-2 text-[13px] leading-snug text-muted-foreground',
        className,
      )}
    >
      <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" aria-hidden="true" />
      <span>{LIVE_HISTORY_NOTE}</span>
    </p>
  )
}
