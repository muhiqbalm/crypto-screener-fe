'use client'

import { Copy, FileCode2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useWebhookConfig } from '@/lib/queries/webhook'
import { notify } from '@/lib/utils/toast'

export function AlertPayloadTemplate() {
  const { data } = useWebhookConfig()

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

  // Syntax-highlight keys vs string values for readability
  function renderHighlighted(json: string) {
    return json.split('\n').map((line, i) => {
      const keyMatch = line.match(/^(\s*)("[\w]+")(\s*:\s*)(.+)$/)
      if (!keyMatch) {
        return <div key={i}>{line}</div>
      }
      const [, indent, key, colon, value] = keyMatch
      const isString = value.startsWith('"')
      const isTvVar = value.includes('{{')
      return (
        <div key={i}>
          <span>{indent}</span>
          <span className="text-blue-400">{key}</span>
          <span className="text-muted-foreground">{colon}</span>
          <span className={isTvVar ? 'text-yellow-400' : isString ? 'text-bullish/90' : 'text-orange-400'}>
            {value}
          </span>
        </div>
      )
    })
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-0.5 w-full bg-muted" />
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <FileCode2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-base">Alert Payload Template</CardTitle>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="gap-1.5 rounded-lg transition-colors duration-200"
          aria-label="Copy template"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          Copy
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="rounded-lg bg-muted/50 border border-border/50 p-4">
          <pre className="text-xs font-mono overflow-x-auto leading-relaxed">
            <code>{renderHighlighted(templateStr)}</code>
          </pre>
        </div>
        <p className="mt-2.5 text-[11px] text-muted-foreground">
          Paste this into your TradingView alert message.{' '}
          <span className="text-yellow-500/80">{'{{variables}}'}</span> are replaced by TradingView at runtime.
        </p>
      </CardContent>
    </Card>
  )
}
