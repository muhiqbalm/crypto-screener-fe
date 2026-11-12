'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Eye, FlaskConical, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWebhookConfig } from '@/lib/queries/webhook'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'

interface PreviewPayload {
  action: 'open' | 'close'
  symbol: string
  side: 'long' | 'short'
  size_type: 'percent' | 'fixed'
  size_value: number
  leverage: number | null
  exchange: 'binance' | 'okx'
  passphrase: string
}

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
      <Label id={id} className="text-[14px]">
        {label}
      </Label>
      <div className="flex overflow-hidden rounded-lg border border-input" role="group" aria-labelledby={id}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            aria-pressed={value === opt.value}
            className={cn(
              'flex-1 cursor-pointer py-1.5 text-[14px] font-medium transition-colors duration-150',
              'disabled:pointer-events-none disabled:opacity-50',
              value === opt.value
                ? colorize
                  ? colorize(opt.value)
                  : 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted/60',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Builds and checks an alert payload locally. It NEVER sends anything: no `api` import, no
 * mutation, no fetch. The only data it reads is GET webhook-config (to know a config exists);
 * the passphrase is always replaced by a placeholder. (CEO decision 2026-11-10; tested.)
 */
export function TestWebhookCard() {
  const { data: webhookConfig } = useWebhookConfig()
  const [isExpanded, setIsExpanded] = useState(false)
  const [preview, setPreview] = useState<PreviewPayload | null>(null)

  const [form, setForm] = useState<Omit<PreviewPayload, 'passphrase'>>({
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
    setForm((prev) => ({ ...prev, [key]: value }))
    if (key === 'symbol') setSymbolError(null)
    if (key === 'size_value') setSizeError(null)
    setPreview(null)
  }

  function validate(): boolean {
    let valid = true
    if (!/^[A-Z0-9]+\/[A-Z0-9]+:[A-Z0-9]+$/.test(form.symbol)) {
      setSymbolError('Format: KOIN/QUOTE:SETTLE, misalnya BTC/USDT:USDT')
      valid = false
    }
    if (form.size_value <= 0) {
      setSizeError('Harus lebih dari 0')
      valid = false
    }
    if (form.size_type === 'percent' && form.size_value > 100) {
      setSizeError('Maksimal 100%')
      valid = false
    }
    return valid
  }

  // Deliberately does NOT call /webhook/tradingview: that endpoint places live orders.
  function handlePreview() {
    if (!validate()) return
    if (!webhookConfig?.passphrase) {
      notify.error('Aktifkan webhook dulu.')
      return
    }
    setPreview({ ...form, passphrase: '<PASSPHRASE>' })
    notify.success('Pratinjau dibuat. Tidak ada yang dikirim dan tidak ada order.')
  }

  const noConfig = !webhookConfig?.passphrase

  return (
    <Card className="overflow-hidden rounded-3xl">
      <CardHeader className="pb-3 pt-4">
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          aria-expanded={isExpanded}
          aria-controls="test-webhook-body"
          className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-[17px]">Pratinjau isi alert</CardTitle>
            <span className="rounded-full border border-info/35 bg-info/10 px-2 py-0.5 text-[13px] font-semibold text-info">tidak dikirim</span>
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
        </button>
      </CardHeader>

      {isExpanded && (
        <CardContent id="test-webhook-body" className="space-y-5 pt-0">
          <div role="note" className="flex gap-2.5 rounded-lg border border-info/40 bg-info/10 px-3 py-2.5 text-[14px] text-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
            <p>
              <span className="font-semibold">Hanya pratinjau.</span> Kartu ini menyusun dan mengecek isi alert di browser. Tidak ada yang
              dikirim ke webhook dan <span className="font-semibold">tidak ada order</span>.
            </p>
          </div>

          {noConfig && (
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-[14px] text-muted-foreground">
              Aktifkan webhook dulu untuk memakai pratinjau ini.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
            <SegmentControl
              id="test-action"
              label="Aksi"
              value={form.action}
              options={[
                { value: 'open', label: 'Buka' },
                { value: 'close', label: 'Tutup' },
              ]}
              onChange={(v) => setField('action', v)}
              disabled={noConfig}
            />
            <SegmentControl
              id="test-side"
              label="Arah"
              value={form.side}
              options={[
                { value: 'long', label: 'Long' },
                { value: 'short', label: 'Short' },
              ]}
              onChange={(v) => setField('side', v)}
              disabled={noConfig}
              colorize={(v) => (v === 'long' ? 'bg-bullish/20 text-bullish border-r border-input' : 'bg-bearish/20 text-bearish')}
            />
            <SegmentControl
              id="test-exchange"
              label="Exchange"
              value={form.exchange}
              options={[
                { value: 'binance', label: 'Binance' },
                { value: 'okx', label: 'OKX' },
              ]}
              onChange={(v) => setField('exchange', v)}
              disabled={noConfig}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="test-symbol" className="text-[14px]">
                Koin
              </Label>
              <Input
                id="test-symbol"
                value={form.symbol}
                onChange={(e) => setField('symbol', e.target.value.toUpperCase())}
                placeholder="BTC/USDT:USDT"
                className={cn('font-mono text-[14px]', symbolError && 'border-bearish focus-visible:ring-bearish/30')}
                disabled={noConfig}
                aria-invalid={!!symbolError}
              />
              {symbolError && (
                <p className="text-[13px] text-bearish" role="alert">
                  {symbolError}
                </p>
              )}
            </div>
            <SegmentControl
              id="test-size-type"
              label="Jenis ukuran"
              value={form.size_type}
              options={[
                { value: 'percent', label: '% saldo' },
                { value: 'fixed', label: 'USD' },
              ]}
              onChange={(v) => setField('size_type', v)}
              disabled={noConfig}
            />
            <div className="space-y-1.5">
              <Label htmlFor="test-size-value" className="text-[14px]">
                Ukuran {form.size_type === 'percent' ? '(%)' : '(USD)'}
              </Label>
              <Input
                id="test-size-value"
                type="number"
                min={0.01}
                max={form.size_type === 'percent' ? 100 : 10_000_000}
                step={form.size_type === 'percent' ? 1 : 0.01}
                value={form.size_value}
                onChange={(e) => setField('size_value', parseFloat(e.target.value) || 0)}
                className={cn('font-mono text-[14px]', sizeError && 'border-bearish')}
                disabled={noConfig}
                aria-invalid={!!sizeError}
              />
              {sizeError && (
                <p className="text-[13px] text-bearish" role="alert">
                  {sizeError}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="test-leverage" className="text-[14px]">
                Leverage
              </Label>
              <Input
                id="test-leverage"
                type="number"
                min={1}
                max={125}
                step={1}
                value={form.leverage ?? ''}
                onChange={(e) => {
                  const v = parseInt(e.target.value)
                  setField('leverage', isNaN(v) ? null : v)
                }}
                placeholder="opsional"
                className="font-mono text-[14px]"
                disabled={noConfig}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <span className="text-[13px] text-muted-foreground">Kata sandi webhook:</span>
            <span className="font-mono text-[14px] tracking-widest text-muted-foreground">
              {webhookConfig?.passphrase ? '••••••••••••' : <span className="italic tracking-normal">belum aktif</span>}
            </span>
            <span className="ml-auto text-[13px] text-muted-foreground">disamarkan di pratinjau</span>
          </div>

          <Button onClick={handlePreview} disabled={noConfig} className="w-full gap-2">
            <Eye className="h-4 w-4" aria-hidden="true" />
            Buat pratinjau isi alert
          </Button>

          {preview && (
            <div className="overflow-hidden rounded-lg border border-info/30">
              <p className="border-b border-info/20 bg-info/[0.06] px-4 py-2 text-[14px] font-medium text-info">
                Pratinjau, tidak dikirim. Server belum melihat isi ini.
              </p>
              <pre className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-relaxed">{JSON.stringify(preview, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
