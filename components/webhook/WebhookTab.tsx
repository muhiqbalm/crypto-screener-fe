import { WebhookConfigCard } from './WebhookConfigCard'
import { AlertPayloadTemplate } from './AlertPayloadTemplate'
import { TestWebhookCard } from './TestWebhookCard'
import { SignalLogsTable } from './SignalLogsTable'

/**
 * Webhook page layout: status + switch and the alert template side by side on lg+, stacked
 * on phones; the local preview (never sent) below; the alert log last.
 */
export function WebhookTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <WebhookConfigCard />
        <AlertPayloadTemplate />
      </div>
      <SignalLogsTable />
      <TestWebhookCard />
    </div>
  )
}
