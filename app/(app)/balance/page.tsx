import { Wallet } from 'lucide-react'
import { BalanceCard } from '@/components/balance/BalanceCard'
import { PositionsTable } from '@/components/balance/PositionsTable'
import { PageContainer, PageHeader } from '@/components/shell/page'
import { StatusPill } from '@/components/ui/status-pill'

export const metadata = {
  title: 'Saldo & posisi',
  description: 'Saldo dan posisi terbuka dari exchange, plus riwayat posisi dari catatan bot.',
}

export default function BalancePage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Bot live · uang asli"
        eyebrowIcon={Wallet}
        title="Saldo & posisi"
        status={<StatusPill kind="live" />}
        description="Saldo dan posisi langsung dari exchange; riwayat dari catatan bot."
        help={{
          apaIni:
            'Uang asli di exchange yang terhubung ke akunmu: saldo per exchange, posisi yang sedang terbuka, dan posisi yang sudah ditutup bot. Halaman ini hanya membaca; tidak ada tombol yang membuka atau menutup posisi.',
          caraPakai: [
            'Total di atas hanya menjumlah stablecoin (USDT, USDC, …), bukan nilai seluruh akun.',
            'Posisi terbuka diperbarui otomatis tiap 15 detik.',
            'Untung/rugi di riwayat adalah perkiraan, belum termasuk fee dan funding.',
          ],
          istilah: ['stablecoin_total', 'balance_parts', 'upnl', 'realized_pnl', 'mark_price', 'liq_price'],
        }}
      />
      <BalanceCard />
      <PositionsTable />
    </PageContainer>
  )
}
