import { Webhook } from 'lucide-react'
import { WebhookTab } from '@/components/webhook/WebhookTab'
import { PageContainer, PageHeader } from '@/components/shell/page'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Webhook & Otomasi',
  description: 'Atur webhook TradingView dan otomasi trading.',
}

export default function WebhookPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Trading live"
        eyebrowIcon={Webhook}
        title="Webhook & otomasi"
        description="Hubungkan alert TradingView ke eksekusi order di exchange, lalu pantau sinyal yang masuk."
        actions={<Badge variant="bearish" size="sm">AKUN LIVE</Badge>}
      />
      <WebhookTab />
    </PageContainer>
  )
}
