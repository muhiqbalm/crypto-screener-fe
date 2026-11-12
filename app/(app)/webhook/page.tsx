import { Webhook } from 'lucide-react'
import { WebhookTab } from '@/components/webhook/WebhookTab'
import { PageContainer, PageHeader } from '@/components/shell/page'
import { StatusPill } from '@/components/ui/status-pill'

export const metadata = {
  title: 'Webhook',
  description: 'Jalur alert TradingView ke bot live: alamat, kata sandi, contoh isi alert dan log alert.',
}

export default function WebhookPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Bot live · uang asli"
        eyebrowIcon={Webhook}
        title="Webhook"
        status={<StatusPill kind="live" />}
        description="Jalur alert TradingView ke bot di akunmu."
        help={{
          apaIni:
            'Webhook adalah alamat yang menerima alert TradingView dan meneruskannya menjadi order sungguhan di exchange akunmu. Halaman ini mengatur webhook milik akun yang sedang login.',
          caraPakai: [
            'Pastikan status webhook "Aktif" kalau bot memang harus berjalan; nonaktifkan kalau tidak.',
            'Salin alamat webhook dan isi alert (JSON) ke alert TradingView. Satu alert untuk satu aksi.',
            'Cek Log alert: baris yang gagal atau ditolak bisa diketuk untuk melihat alasannya.',
          ],
          istilah: ['webhook', 'webhook_passphrase', 'automation', 'alert_payload', 'signal_logs'],
        }}
      />
      <WebhookTab />
    </PageContainer>
  )
}
