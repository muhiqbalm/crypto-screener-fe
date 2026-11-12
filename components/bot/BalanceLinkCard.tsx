import Link from 'next/link'
import { ArrowRight, Wallet } from 'lucide-react'
import { Panel } from '@/components/ui/hero-card'
import { IconChip } from '@/components/ui/icon-title'
import { StatusPill } from '@/components/ui/status-pill'
import { cn } from '@/lib/utils/cn'

/**
 * Link to Saldo & posisi. Deliberately no balance numbers here: those come straight from the
 * exchange, and this page should not poll the exchange (audit §3.5 rule for overview pages).
 */
export function BalanceLinkCard({ className }: { className?: string }) {
  return (
    <Panel as="div" className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex items-center gap-3">
        <IconChip icon={Wallet} tone="info" />
        <div>
          <p className="flex items-center gap-2 text-lg font-bold">
            Saldo & posisi <StatusPill kind="live" size="xs" />
          </p>
          <p className="text-xs text-muted-foreground">Uang asli dan posisi terbuka, langsung dari exchange.</p>
        </div>
      </div>
      <Link
        href="/balance"
        className="lift inline-flex items-center justify-center gap-1.5 rounded-full border bg-muted/40 px-5 py-2.5 text-sm font-semibold hover:bg-muted"
      >
        Buka Saldo & posisi <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </Panel>
  )
}
