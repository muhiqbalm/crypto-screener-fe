import Link from 'next/link'
import { ArrowRight, Wallet } from 'lucide-react'
import { StatusPill } from '@/components/ui/status-pill'
import { DeckCard, IconBadge } from './kit/Tiles'

/**
 * Link to Saldo & posisi. Deliberately no balance numbers here: those come straight from the
 * exchange, and this page should not poll the exchange (audit §3.5 rule for overview pages).
 */
export function BalanceLinkCard({ className }: { className?: string }) {
  return (
    <DeckCard className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className ?? ''}`}>
      <div className="flex items-center gap-3">
        <IconBadge icon={Wallet} tone="info" />
        <div>
          <p className="flex items-center gap-2 text-[17px] font-semibold">
            Saldo & posisi <StatusPill kind="live" size="sm" />
          </p>
          <p className="text-[14px] text-muted-foreground">Uang asli dan posisi terbuka, langsung dari exchange.</p>
        </div>
      </div>
      <Link
        href="/balance"
        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-muted/40 px-5 py-2.5 text-[15px] font-semibold transition hover:bg-muted"
      >
        Buka Saldo & posisi <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </DeckCard>
  )
}
