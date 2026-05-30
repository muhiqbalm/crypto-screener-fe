'use client'

import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useWebhookConfig } from '@/lib/queries/webhook'
import { notify } from '@/lib/utils/toast'

/**
 * Renders the TradingView alert payload template as a formatted JSON code block.
 *
 * - Substitutes `passphrase` with the resolved value when `useWebhookConfig()`
 *   succeeds, otherwise falls back to `<your-passphrase>` (Req 9.4, 9.5).
 * - Serialises with `JSON.stringify(template, null, 2)` for 2-space indentation
 *   (Req 9.6) ensuring `JSON.parse` round-trip always succeeds (Req 9.9).
 * - "Copy template" button writes the rendered string to the clipboard and
 *   emits `notify.success("Template copied")` (Req 9.7, 9.8).
 *
 * Requirements: 9.1–9.9, 14.5
 */
export function AlertPayloadTemplate() {
  const { data } = useWebhookConfig()

  // Build the template object with all required keys (Req 9.1–9.3)
  const template = {
    action: '{{strategy.order.action}}',
    symbol: '{{ticker}}',
    side: '{{strategy.order.alert_message}}',
    size_type: 'percent',
    size_value: 100,
    leverage: 5,
    exchange: 'binance',
    passphrase: data?.passphrase ?? '<your-passphrase>',
  }

  const templateStr = JSON.stringify(template, null, 2)

  function handleCopy() {
    navigator.clipboard
      .writeText(templateStr)
      .then(() => notify.success('Template copied'))
      .catch((err: Error) => notify.error('Copy failed: ' + err.message))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Alert Payload Template</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className="cursor-pointer h-7 w-7"
          aria-label="Copy template"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent>
        <pre className="rounded-md bg-muted p-3 text-xs font-mono overflow-x-auto">
          <code>{templateStr}</code>
        </pre>
      </CardContent>
    </Card>
  )
}
