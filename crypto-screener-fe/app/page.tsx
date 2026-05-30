import { DashboardHeader } from '@/components/shell/DashboardHeader'
import { TabNavigation } from '@/components/shell/TabNavigation'
import { MarketScreenerTab } from '@/components/screener/MarketScreenerTab'
import { WebhookTab } from '@/components/webhook/WebhookTab'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <TabNavigation
          screenerContent={<MarketScreenerTab />}
          webhookContent={<WebhookTab />}
        />
      </main>
    </div>
  )
}
