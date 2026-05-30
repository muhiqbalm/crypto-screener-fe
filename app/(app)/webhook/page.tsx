import { WebhookTab } from '@/components/webhook/WebhookTab'

export const metadata = {
  title: 'Webhook & Automation — Crypto Screener',
  description: 'Configure TradingView webhook and manage trading automation.',
}

export default function WebhookPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Webhook &amp; Automation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your TradingView webhook and manage automated trading signals.
        </p>
      </div>
      <WebhookTab />
    </main>
  )
}
