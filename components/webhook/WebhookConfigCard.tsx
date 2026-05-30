'use client'

import { useState } from 'react'
import { Eye, EyeOff, Copy } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { useWebhookConfig, useAutomationToggle } from '@/lib/queries/webhook'
import { maskPassphrase } from '@/lib/utils/mask'
import { notify } from '@/lib/utils/toast'
import { ApiError } from '@/lib/api/errors'

// Requirement 8.1 — webhook URL is computed from the env var
const WEBHOOK_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000') +
  '/webhook/tradingview'

function copyToClipboard(text: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => notify.success('Copied to clipboard'))
    .catch((err: Error) => notify.error('Copy failed: ' + err.message))
}

export function WebhookConfigCard() {
  const { data, isPending, error, refetch } = useWebhookConfig()
  const automationToggle = useAutomationToggle()

  // Requirement 8.3 — passphrase masked by default
  const [isPassphraseVisible, setIsPassphraseVisible] = useState(false)

  // ── Pending state (Req 8.9) ──────────────────────────────────────────────
  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL row skeleton */}
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-9" />
            </div>
          </div>
          {/* Passphrase row skeleton */}
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-9" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Error states ─────────────────────────────────────────────────────────
  if (error) {
    const apiError = error instanceof ApiError ? error : null

    // Requirement 8.10 — not_found → empty state with "Create webhook config"
    if (apiError?.kind === 'not_found') {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Webhook Configuration</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No webhook configuration yet
            </p>
            <Button
              onClick={() =>
                automationToggle.mutate({ nextEnabled: true, hasExisting: false })
              }
              disabled={automationToggle.isPending}
              className="transition-colors duration-200"
            >
              Create webhook config
            </Button>
          </CardContent>
        </Card>
      )
    }

    // Requirement 8.11 — other errors → ErrorPanel
    return (
      <Card>
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorPanel
            kind={apiError?.kind ?? 'server'}
            onRetry={() => refetch()}
          />
        </CardContent>
      </Card>
    )
  }

  // ── Data state ───────────────────────────────────────────────────────────
  const passphrase = data?.passphrase ?? ''
  const displayedPassphrase = isPassphraseVisible
    ? passphrase
    : maskPassphrase(passphrase)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Webhook URL row (Req 8.1, 8.5) */}
        <div className="space-y-1.5">
          <label
            htmlFor="webhook-url"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Webhook URL
          </label>
          <div className="flex items-center gap-2">
            <div
              id="webhook-url"
              className="flex-1 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm font-mono break-all select-all"
              aria-label="Webhook URL"
            >
              {WEBHOOK_URL}
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label="Copy webhook URL"
              onClick={() => copyToClipboard(WEBHOOK_URL)}
              className="shrink-0 transition-colors duration-200"
            >
              <Copy aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Passphrase row (Req 8.2, 8.3, 8.4, 8.6) */}
        <div className="space-y-1.5">
          <label
            htmlFor="webhook-passphrase"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Passphrase
          </label>
          <div className="flex items-center gap-2">
            <div
              id="webhook-passphrase"
              className="flex-1 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm font-mono tracking-widest select-all"
              aria-label={
                isPassphraseVisible ? 'Passphrase (visible)' : 'Passphrase (masked)'
              }
            >
              {displayedPassphrase}
            </div>
            {/* Visibility toggle (Req 8.4) */}
            <Button
              variant="outline"
              size="icon"
              aria-label={isPassphraseVisible ? 'Hide passphrase' : 'Show passphrase'}
              aria-pressed={isPassphraseVisible}
              onClick={() => setIsPassphraseVisible((v) => !v)}
              className="shrink-0 transition-colors duration-200"
            >
              {isPassphraseVisible ? (
                <EyeOff aria-hidden="true" />
              ) : (
                <Eye aria-hidden="true" />
              )}
            </Button>
            {/* Copy passphrase (Req 8.6) — always copies the unmasked value */}
            <Button
              variant="outline"
              size="icon"
              aria-label="Copy passphrase"
              onClick={() => copyToClipboard(passphrase)}
              className="shrink-0 transition-colors duration-200"
            >
              <Copy aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
