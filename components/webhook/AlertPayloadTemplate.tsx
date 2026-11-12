'use client'

import { useState } from 'react'
import { Copy, Eye, EyeOff, FileCode2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { Term } from '@/components/ui/term'
import { useWebhookConfig } from '@/lib/queries/webhook'
import { maskPassphrase } from '@/lib/utils/mask'
import { notify } from '@/lib/utils/toast'

export type AlertAction = 'open' | 'close'
export type AlertSide = 'long' | 'short'

/** Example sizes = the defaults of the team's Pine script (50% of balance, leverage 4). */
export const EXAMPLE_SIZE_PERCENT = 50
export const EXAMPLE_LEVERAGE = 4
const PASSPHRASE_PLACEHOLDER = '<kata-sandi-webhook>'

/**
 * Alert message in the exact format the bot accepts (src/trading/models.py WebhookPayload):
 * action "open" | "close", side "long" | "short", size_type "percent" | "fixed",
 * size_value > 0 (percent ≤ 100), optional leverage 1–125, exchange "binance" | "okx",
 * passphrase. Same shape as the team's Pine script: a close sends 100% and no leverage.
 */
export function alertTemplate(action: AlertAction, side: AlertSide, passphrase: string) {
  return action === 'open'
    ? {
        action: 'open',
        symbol: '{{ticker}}',
        side,
        size_type: 'percent',
        size_value: EXAMPLE_SIZE_PERCENT,
        leverage: EXAMPLE_LEVERAGE,
        exchange: 'binance',
        passphrase,
      }
    : {
        action: 'close',
        symbol: '{{ticker}}',
        side,
        size_type: 'percent',
        size_value: 100,
        exchange: 'binance',
        passphrase,
      }
}

function renderHighlighted(json: string) {
  return json.split('\n').map((line, i) => {
    const keyMatch = line.match(/^(\s*)("[\w]+")(\s*:\s*)(.+)$/)
    if (!keyMatch) return <div key={i}>{line}</div>
    const [, indent, key, colon, value] = keyMatch
    const isString = value.startsWith('"')
    const isTvVar = value.includes('{{')
    return (
      <div key={i}>
        <span>{indent}</span>
        <span className="text-info">{key}</span>
        <span className="text-muted-foreground">{colon}</span>
        <span className={isTvVar ? 'text-warn' : isString ? 'text-foreground' : 'text-lab'}>{value}</span>
      </div>
    )
  })
}

export function AlertPayloadTemplate() {
  const { data } = useWebhookConfig()
  const [action, setAction] = useState<AlertAction>('open')
  const [side, setSide] = useState<AlertSide>('long')
  const [showPassphrase, setShowPassphrase] = useState(false)

  const real = data?.passphrase ?? null
  const shown = real ? (showPassphrase ? real : maskPassphrase(real)) : PASSPHRASE_PLACEHOLDER
  const display = JSON.stringify(alertTemplate(action, side, shown), null, 2)
  // Copy carries the real passphrase (as before), so the text is ready to paste.
  const toCopy = JSON.stringify(alertTemplate(action, side, real ?? PASSPHRASE_PLACEHOLDER), null, 2)

  function handleCopy() {
    navigator.clipboard
      .writeText(toCopy)
      .then(() => notify.success(real ? 'Isi alert disalin (dengan kata sandi webhook)' : 'Isi alert disalin'))
      .catch(() => notify.error('Gagal menyalin isi alert'))
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <FileCode2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-base">
            <Term k="alert_payload" />
          </CardTitle>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 rounded-lg" aria-label="Salin isi alert">
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          Salin
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            aria-label="Aksi alert"
            size="xs"
            value={action}
            onChange={setAction}
            options={[
              { value: 'open', label: 'Buka posisi' },
              { value: 'close', label: 'Tutup posisi' },
            ]}
          />
          <Segmented
            aria-label="Arah posisi"
            size="xs"
            value={side}
            onChange={setSide}
            options={[
              { value: 'long', label: 'Long' },
              { value: 'short', label: 'Short' },
            ]}
          />
          {real && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-2xs"
              aria-pressed={showPassphrase}
              onClick={() => setShowPassphrase((v) => !v)}
            >
              {showPassphrase ? <EyeOff className="h-3 w-3" aria-hidden="true" /> : <Eye className="h-3 w-3" aria-hidden="true" />}
              {showPassphrase ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            </Button>
          )}
        </div>
        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <pre className="overflow-x-auto font-mono text-xs leading-relaxed">
            <code>{renderHighlighted(display)}</code>
          </pre>
        </div>
        <ul className="list-disc space-y-1 pl-4 text-2xs text-muted-foreground">
          <li>
            Satu alert untuk satu aksi: buat alert terpisah untuk buka dan tutup posisi. Skrip Pine tim sudah mengirim format ini
            sendiri.
          </li>
          <li>
            <span className="font-mono text-warn">{'{{ticker}}'}</span> diisi TradingView saat alert jalan. Tutup posisi selalu 100%
            dan hanya menutup jumlah yang dibuka bot.
          </li>
          <li>
            Ukuran {EXAMPLE_SIZE_PERCENT}% saldo dan leverage {EXAMPLE_LEVERAGE} hanya contoh (bawaan skrip Pine). Samakan dengan
            setelan akunmu; leverage di atas batas server ditolak.
          </li>
          <li>Tombol Salin menyertakan kata sandi webhook asli. Jangan bagikan isinya.</li>
        </ul>
      </CardContent>
    </Card>
  )
}
