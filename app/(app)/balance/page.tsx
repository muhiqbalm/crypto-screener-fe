import { BalanceCard } from '@/components/balance/BalanceCard'
import { PositionsTable } from '@/components/balance/PositionsTable'

export const metadata = {
  title: 'Balance — Crypto Screener',
  description: 'View balances and positions from your connected exchanges.',
}

export default function BalancePage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Balance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Portfolio overview and live positions across all connected exchanges.
        </p>
      </div>

      <div className="space-y-6">
        {/* Balance overview */}
        <BalanceCard />

        {/* Positions */}
        <PositionsTable />
      </div>
    </main>
  )
}
