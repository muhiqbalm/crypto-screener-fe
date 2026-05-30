import { WebhookConfigCard } from './WebhookConfigCard'
import { AlertPayloadTemplate } from './AlertPayloadTemplate'
import { TestWebhookCard } from './TestWebhookCard'
import { SignalLogsTable } from './SignalLogsTable'

/**
 * Webhook & Automation tab layout.
 *
 * Top row  — WebhookConfigCard + AlertPayloadTemplate
 *   Mobile  : single-column vertical stack (Req 14.5)
 *   lg+     : 2-column grid, each card 50 % width (Req 14.6)
 *
 * Middle   — TestWebhookCard, full-width
 *
 * Below    — SignalLogsTable, full-width (Req 14.8)
 * Automation toggle is in the WebhookConfigCard header (top-right button).
 */
export function WebhookTab() {
  return (
    <div className="space-y-6">
      {/* Top row: WebhookConfigCard + AlertPayloadTemplate
          Mobile: vertical stack; lg+: 2-column grid (Req 14.5, 14.6) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WebhookConfigCard />
        <AlertPayloadTemplate />
      </div>

      {/* Test webhook — full width */}
      <TestWebhookCard />

      {/* Signal logs table — full width (Req 14.8) */}
      <SignalLogsTable />
    </div>
  )
}
