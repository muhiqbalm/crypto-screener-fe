import { Wallet } from 'lucide-react'
import { BalanceCard } from '@/components/balance/BalanceCard'
import { PositionsTable } from '@/components/balance/PositionsTable'
import { PageContainer, PageHeader } from '@/components/shell/page'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Saldo & Posisi',
  description: 'Saldo dan posisi live dari exchange yang terhubung.',
}

export default function BalancePage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Trading live"
        eyebrowIcon={Wallet}
        title="Saldo & posisi"
        description="Ringkasan portofolio dan posisi live di semua exchange yang terhubung. Data dibaca langsung dari akun exchange."
        actions={<Badge variant="bearish" size="sm">AKUN LIVE</Badge>}
      />
      <BalanceCard />
      <PositionsTable />
    </PageContainer>
  )
}
