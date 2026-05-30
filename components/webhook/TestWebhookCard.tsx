'use client'

import { useState } from 'react'
import { Send, ChevronDown, ChevronUp, CheckCircle2, XCircle, Loader2, FlaskConical } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useWebhookConfig } from '@/lib/queries/webhook'
import { getBaseUrl } from '@/lib/api/client'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'

interface TestPayload {
  action: 'open' | 'close'
  symbol: string
  side: 'long' | 'short'
  size_type: 'percent' | 'fixed'
  size_value: number
  leverage: number | null
  exchange: 'binance' | 'okx'
  passphrase: string
}

interface TestResult {
  ok: boolean
  status: number
  body: unknown
}

// ---------------------------------------------------------------------------
// Segment control — replaces plain buttons for action/side/exchange
// ---------------------------------------------------------------------------
function SegmentControl<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
  colorize,
}: {
  id: string
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  disabled?: boolean
  colorize?: (v: T) => string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <div className="flex rounded-lg border border-input overflow-hidden">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            className={cn(
              'flex-1 py-1.5 text-xs font-medium transition-colors duration-150 cursor-pointer',
              'disabled:pointer-events-none disabled:opacity-50',
              value === opt.value
                ? colorize
                  ? colorize(opt.value)
                  : 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted/60'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TestWebhookCard() {
  const { data: webhookConfig } = useWebhookConfig()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [isResultExpanded, setIsResultExpanded] = useState(false)

  const [form, setForm] = useState<Omit<TestPayload, 'passphrase'>>({
    action: 'open',
    symbol: 'BTC/USDT:USDT',
    side: 'long',
    size_type: 'percent',
    size_value: 10,
    leverage: 5,
    exchange: 'binance',
  })

  const [symbolError, setSymbolError] = useState<string | null>(null)
  const [sizeError, setSizeError] = useState<string | null>(null)

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (key === 'symbol') setSymbolError(null)
    if (key === 'size_value') setSizeError(null)
    setResult(null)
  }

  function validate(): boolean {
    let valid = true
    if (!/^[A-Z0-9]+\/[A-Z0-9]+:[A-Z0-9]+$/.test(form.symbol)) {
      setSymbolError('Format: BASE/QUOTE:SETTLE (e.g. BTC/USDT:USDT)')
      valid = false
    }
    if (form.size_value <= 0) { setSizeError('Must be > 0'); valid = false }
    if (form.size_type === 'percent' && form.size_value > 100) { setSizeError('Max 100%'); valid = false }
    return valid
  }

  async function handleSend() {
    if (!validate()) return
    const passphrase = webhookConfig?.passphrase
    if (!passphrase) { notify.error('No webhook config found. Create one first.'); return }

    const payload: TestPayload = { ...form, passphrase, leverage: form.leverage ?? undefined as unknown as null }
    setIsSending(true)
    setResult(null)

    try {
      const res = await fetch(`${getBaseUrl()}/webhook/tradingview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      let body: unknown
      try { body = await res.json() } catch { body = null }
      const testResult: TestResult = { ok: res.ok, status: res.status, body }
      setResult(testResult)
      setIsResultExpanded(true)
      if (res.ok) notify.success('Test payload sent successfully')
      else notify.error(`Webhook returned ${res.status}`)
    } catch (err) {
      const testResult: TestResult = {
        ok: false, status: 0,
        body: { error: 'Network error', detail: err instanceof Error ? err.message : String(err) },
      }
      setResult(testResult)
      setIsResultExpanded(true)
      notify.error('Network error — could not reach the webhook endpoint')
    } finally {
      setIsSending(false)
    }
  }

  const noConfig = !webhookConfig?.passphrase

  return (
    <Card className="overflow-hidden">
      <div className="h-0.5 w-full bg-muted" />

      {/* Collapsible header */}
      <CardHeader
        className="cursor-pointer select-none pb-3 pt-4"
        onClick={() => setIsExpanded(v => !v)}
        role="button"
        aria-expanded={isExpanded}
        aria-controls="test-webhook-body"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-base">Test Webhook</CardTitle>
            {result && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] px-1.5 py-0',
                  result.ok
                    ? 'border-bullish/30 bg-bullish/10 text-bullish'
                    : 'border-bearish/30 bg-bearish/10 text-bearish'
                )}
              >
                {result.ok
                  ? <><CheckCircle2 className="mr-1 h-2.5 w-2.5" />{result.status} OK</>
                  : <><XCircle className="mr-1 h-2.5 w-2.5" />{result.status || 'Error'}</>
                }
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isExpanded && (
              <span className="hidden sm:block text-xs text-muted-foreground">
                Send a test alert to your endpoint
              </span>
            )}
            {isExpanded
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            }
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent id="test-webhook-body" className="space-y-5 pt-0">
          {noConfig && (
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
              Create a webhook config first to use this feature.
            </div>
          )}

          {/* Row 1 — Action + Side + Exchange: 2 cols default, 3 cols at xl */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
            <SegmentControl
              id="test-action"
              label="Action"
              value={form.action}
              options={[{ value: 'open', label: 'Open' }, { value: 'close', label: 'Close' }]}
              onChange={v => setField('action', v)}
              disabled={noConfig}
            />
            <SegmentControl
              id="test-side"
              label="Side"
              value={form.side}
              options={[{ value: 'long', label: 'Long' }, { value: 'short', label: 'Short' }]}
              onChange={v => setField('side', v)}
              disabled={noConfig}
              colorize={v => v === 'long'
                ? 'bg-bullish/20 text-bullish border-r border-input'
                : 'bg-bearish/20 text-bearish'
              }
            />
            <SegmentControl
              id="test-exchange"
              label="Exchange"
              value={form.exchange}
              options={[{ value: 'binance', label: 'Binance' }, { value: 'okx', label: 'OKX' }]}
              onChange={v => setField('exchange', v)}
              disabled={noConfig}
            />
          </div>

          {/* Row 2 — Symbol + Size type + Size value + Leverage: 2 cols default, 4 cols at xl */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="test-symbol" className="text-xs">Symbol</Label>
              <Input
                id="test-symbol"
                value={form.symbol}
                onChange={e => setField('symbol', e.target.value.toUpperCase())}
                placeholder="BTC/USDT:USDT"
                className={cn('font-mono text-xs', symbolError && 'border-bearish focus-visible:ring-bearish/30')}
                disabled={noConfig}
                aria-invalid={!!symbolError}
              />
              {symbolError && <p className="text-[11px] text-bearish" role="alert">{symbolError}</p>}
            </div>
            <SegmentControl
              id="test-size-type"
              label="Size type"
              value={form.size_type}
              options={[{ value: 'percent', label: '%' }, { value: 'fixed', label: 'USD' }]}
              onChange={v => setField('size_type', v)}
              disabled={noConfig}
            />
            <div className="space-y-1.5">
              <Label htmlFor="test-size-value" className="text-xs">
                Size {form.size_type === 'percent' ? '(%)' : '(USD)'}
              </Label>
              <Input
                id="test-size-value"
                type="number"
                min={0.01}
                max={form.size_type === 'percent' ? 100 : 10_000_000}
                step={form.size_type === 'percent' ? 1 : 0.01}
                value={form.size_value}
                onChange={e => setField('size_value', parseFloat(e.target.value) || 0)}
                className={cn('font-mono text-xs', sizeError && 'border-bearish')}
                disabled={noConfig}
                aria-invalid={!!sizeError}
              />
              {sizeError && <p className="text-[11px] text-bearish" role="alert">{sizeError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="test-leverage" className="text-xs">Leverage</Label>
              <Input
                id="test-leverage"
                type="number"
                min={1}
                max={125}
                step={1}
                value={form.leverage ?? ''}
                onChange={e => { const v = parseInt(e.target.value); setField('leverage', isNaN(v) ? null : v) }}
                placeholder="optional"
                className="font-mono text-xs"
                disabled={noConfig}
              />
            </div>
          </div>

          {/* Passphrase indicator */}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <span className="text-[11px] text-muted-foreground">Passphrase:</span>
            <span className="font-mono text-xs tracking-widest text-muted-foreground">
              {webhookConfig?.passphrase ? '••••••••••••' : <span className="italic">no config</span>}
            </span>
            <span className="ml-auto text-[11px] text-muted-foreground">sent automatically</span>
          </div>

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={isSending || noConfig}
            className="w-full gap-2 transition-colors duration-200"
          >
            {isSending
              ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              : <Send className="h-4 w-4" aria-hidden="true" />
            }
            {isSending ? 'Sending…' : 'Send test payload'}
          </Button>

          {/* Response panel */}
          {result && (
            <div className={cn(
              'rounded-lg border overflow-hidden',
              result.ok ? 'border-bullish/25' : 'border-bearish/25'
            )}>
              <button
                type="button"
                onClick={() => setIsResultExpanded(v => !v)}
                className={cn(
                  'flex w-full items-center justify-between px-4 py-2.5 text-xs cursor-pointer transition-colors duration-150',
                  result.ok ? 'bg-bullish/8 hover:bg-bullish/12' : 'bg-bearish/8 hover:bg-bearish/12'
                )}
                aria-expanded={isResultExpanded}
              >
                <span className={cn('flex items-center gap-1.5 font-medium', result.ok ? 'text-bullish' : 'text-bearish')}>
                  {result.ok
                    ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    : <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  }
                  {result.ok ? `${result.status} Success` : `${result.status || 'Network'} Error`}
                </span>
                {isResultExpanded
                  ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                }
              </button>
              {isResultExpanded && (
                <pre className={cn(
                  'border-t px-4 py-3 font-mono text-[11px] overflow-x-auto leading-relaxed',
                  result.ok ? 'border-bullish/20 bg-bullish/5' : 'border-bearish/20 bg-bearish/5'
                )}>
                  {JSON.stringify(result.body, null, 2)}
                </pre>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
