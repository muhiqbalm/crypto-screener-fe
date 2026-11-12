import Link from 'next/link'
import { ArrowRight, Wallet } from 'lucide-react'
import { Section } from '@/components/lab/Section'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/ui/status-pill'

/**
 * Link to Saldo & posisi. Deliberately no balance numbers here: those come straight from the
 * exchange, and this page should not poll the exchange (audit §3.5 rule for overview pages).
 */
export function BalanceLinkCard({ className }: { className?: string }) {
  return (
    <Section
      className={className}
      icon={<Wallet className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
      title="Saldo & posisi"
      description="Uang asli di exchange."
      action={<StatusPill kind="live" size="xs" />}
    >
      <div className="flex h-full flex-col justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Saldo, posisi terbuka, dan riwayat posisi dibaca langsung dari akun exchange di halaman tersendiri, supaya halaman ini
          tidak memanggil exchange terus-menerus.
        </p>
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
          <Link href="/balance">
            Buka Saldo & posisi <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </Section>
  )
}
