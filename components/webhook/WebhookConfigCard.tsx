'use client'

import { useState } from 'react'
import { Eye, EyeOff, Copy, Loader2, Webhook, PlusCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { useWebhookConfig, useAutomationToggle } from '@/lib/queries/webhook'
import { maskPassphrase } from '@/lib/utils/mask'
import { notify } from '@/lib/utils/toast'
import { ApiError } from '@/lib/api/errors'

const WEBHOOK_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000') +
  '/webhook/tradingview'

function copyToClipboard(text: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => notify.success('Copied to clipboard'))
    .catch((err: Error) => notify.error('Copy failed: ' + err.message))
}

// ---------------------------------------------------------------------------
// Field row — label + read-only value + action buttons
// ---------------------------------------------------------------------------
function FieldRow({
  label,
  value,
  mono = true,
  masked = false,
  actions,
}: {
  label: string
  value: string
  mono?: boolean
  masked?: boolean
  actions: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-2">
        <div
          className={`flex-1 rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm break-all select-all ${
            mono ? 'font-mono' : ''
          } ${masked ? 'tracking-widest' : ''}`}
        >
          {value}
        </div>
        {actions}
      </div>
    </div>
  )
}

export function WebhookConfigCard() {
  const { data, isPending, error, refetch } = useWebhookConfig()
  const automationToggle = useAutomationToggle()
  const [isPassphraseVisible, setIsPassphraseVisible] = useState(false)
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false)

  // ── Pending ──────────────────────────────────────────────────────────────
  if (isPending) {
    return (
      <Card className="overflow-hidden">
        <div className="h-0.5 w-full bg-muted" />
        <CardHeader className="pb-3 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-5 w-40" />
            </div>
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[0, 1].map(i => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <div className="flex gap-2">
                <Skeleton className="h-9 flex-1 rounded-lg" />
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // ── Error: not found ──────────────────────────────────────────────────────
  if (error) {
    const apiError = error instanceof ApiError ? error : null

    if (apiError?.kind === 'not_found') {
      return (
        <Card className="overflow-hidden">
          <div className="h-0.5 w-full bg-muted" />
          <CardHeader className="pb-3 pt-4">
            <div className="flex items-center gap-2">
              <Webhook className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <CardTitle className="text-base">Webhook Configuration</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Webhook className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium">No webhook configured</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Create a config to start receiving TradingView signals
              </p>
            </div>
            <Button
              onClick={() => automationToggle.mutate({ nextEnabled: true, hasExisting: false })}
              disabled={automationToggle.isPending}
              size="sm"
              className="gap-1.5 transition-colors duration-200"
            >
              {automationToggle.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                : <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
              }
              Create webhook config
            </Button>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className="overflow-hidden">
        <div className="h-0.5 w-full bg-muted" />
        <CardHeader className="pb-3 pt-4">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-base">Webhook Configuration</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ErrorPanel kind={apiError?.kind ?? 'server'} onRetry={() => refetch()} />
        </CardContent>
      </Card>
    )
  }

  // ── Data ──────────────────────────────────────────────────────────────────
  const passphrase = data?.passphrase ?? ''
  const displayedPassphrase = isPassphraseVisible ? passphrase : maskPassphrase(passphrase)
  const isActive = data?.is_active ?? false

  function executeToggle(nextEnabled: boolean) {
    const hasExisting = !!data && data.is_active
    if (nextEnabled && !hasExisting) {
      notify.info('A new passphrase will be generated. Update your TradingView alert after enabling.')
    }
    automationToggle.mutate(
      { nextEnabled, hasExisting },
      {
        onSuccess: () => notify.success(nextEnabled ? 'Automation enabled' : 'Automation paused'),
        onError: (err) => notify.error(err instanceof ApiError ? err.message : 'An error occurred'),
      }
    )
  }

  function handleAutomationToggle() {
    if (isActive) { setIsDeactivateDialogOpen(true); return }
    executeToggle(true)
  }

  return (
    <>
      <AlertDialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan Automation?</AlertDialogTitle>
            <AlertDialogDescription>
              Webhook tidak akan memproses sinyal masuk dari TradingView selama automation dinonaktifkan.
              Anda dapat mengaktifkannya kembali kapan saja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => executeToggle(false)}
            >
              Nonaktifkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="overflow-hidden">
        {/* Status accent bar */}
        <div className={`h-0.5 w-full transition-colors duration-300 ${isActive ? 'bg-bullish' : 'bg-muted'}`} />

        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3 pt-4">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-base">Webhook Configuration</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutomationToggle}
            disabled={automationToggle.isPending}
            aria-label={isActive ? 'Disable automation' : 'Enable automation'}
            className={`shrink-0 gap-1.5 rounded-full px-3 transition-all duration-200 ${
              isActive
                ? 'border-bullish/40 bg-bullish/10 text-bullish hover:bg-bullish/20'
                : 'text-muted-foreground'
            }`}
          >
            {automationToggle.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            ) : (
              <span
                className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-bullish' : 'bg-muted-foreground/50'}`}
                aria-hidden="true"
              />
            )}
            {isActive ? 'Active' : 'Inactive'}
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Webhook URL */}
          <FieldRow
            label="Webhook URL"
            value={WEBHOOK_URL}
            actions={
              <Button
                variant="outline"
                size="icon"
                aria-label="Copy webhook URL"
                onClick={() => copyToClipboard(WEBHOOK_URL)}
                className="shrink-0 rounded-lg transition-colors duration-200"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            }
          />

          {/* Passphrase */}
          <FieldRow
            label="Passphrase"
            value={displayedPassphrase}
            masked={!isPassphraseVisible}
            actions={
              <>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={isPassphraseVisible ? 'Hide passphrase' : 'Show passphrase'}
                  aria-pressed={isPassphraseVisible}
                  onClick={() => setIsPassphraseVisible(v => !v)}
                  className="shrink-0 rounded-lg transition-colors duration-200"
                >
                  {isPassphraseVisible
                    ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                    : <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  }
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Copy passphrase"
                  onClick={() => copyToClipboard(passphrase)}
                  className="shrink-0 rounded-lg transition-colors duration-200"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </>
            }
          />
        </CardContent>
      </Card>
    </>
  )
}
