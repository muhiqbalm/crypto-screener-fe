'use client'

import { useState } from 'react'
import { Eye, EyeOff, Copy, Loader2, PlusCircle, Trash2, RefreshCw } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useWebhookConfig, useAutomationToggle } from '@/lib/queries/webhook'
import { maskPassphrase } from '@/lib/utils/mask'
import { notify } from '@/lib/utils/toast'
import { ApiError } from '@/lib/api/errors'
import { generatePassphrase } from '@/lib/utils/random'
import { api } from '@/lib/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { webhookKeys } from '@/lib/queries/webhook'

const WEBHOOK_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000') +
  '/webhook/tradingview'

function copyToClipboard(text: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => notify.success('Copied to clipboard'))
    .catch((err: Error) => notify.error('Copy failed: ' + err.message))
}

export function WebhookConfigSettings() {
  const { data, isPending, error, refetch } = useWebhookConfig()
  const automationToggle = useAutomationToggle()
  const queryClient = useQueryClient()

  const [isPassphraseVisible, setIsPassphraseVisible] = useState(false)
  const [isEditingPassphrase, setIsEditingPassphrase] = useState(false)
  const [newPassphrase, setNewPassphrase] = useState('')
  const [passphraseError, setPassphraseError] = useState('')
  const [isSavingPassphrase, setIsSavingPassphrase] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // ── Pending ──────────────────────────────────────────────────────────────
  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    )
  }

  // ── No config yet ─────────────────────────────────────────────────────────
  const noConfig = error instanceof ApiError && error.kind === 'not_found'
  if (noConfig) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
          <CardDescription>
            Create a webhook config to receive TradingView signals.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">No webhook configuration yet.</p>
          <Button
            onClick={() => automationToggle.mutate({ nextEnabled: true, hasExisting: false })}
            disabled={automationToggle.isPending}
            className="cursor-pointer gap-1.5"
          >
            {automationToggle.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
            )}
            Create webhook config
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ── Other error ───────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <Card>
        <CardHeader><CardTitle>Webhook Configuration</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Failed to load webhook config.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="mt-3 cursor-pointer">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ── Data ──────────────────────────────────────────────────────────────────
  const passphrase = data.passphrase
  const displayedPassphrase = isPassphraseVisible ? passphrase : maskPassphrase(passphrase)

  async function handleSavePassphrase() {
    if (newPassphrase.length < 8) {
      setPassphraseError('Passphrase must be at least 8 characters')
      return
    }
    setIsSavingPassphrase(true)
    try {
      await api.patchWebhookConfig({ passphrase: newPassphrase })
      queryClient.invalidateQueries({ queryKey: webhookKeys.config() })
      notify.success('Passphrase updated')
      setIsEditingPassphrase(false)
      setNewPassphrase('')
    } catch (err) {
      const msg = err instanceof ApiError
        ? err.status === 409 ? 'Passphrase already in use' : err.message
        : 'Failed to update passphrase'
      notify.error(msg)
    } finally {
      setIsSavingPassphrase(false)
    }
  }

  function handleDeactivate() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    automationToggle.mutate(
      { nextEnabled: false, hasExisting: true },
      {
        onSuccess: () => { notify.success('Webhook deactivated'); setConfirmDelete(false) },
        onError: (err) => {
          notify.error(err instanceof ApiError ? err.message : 'Failed to deactivate')
          setConfirmDelete(false)
        },
      }
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Webhook Configuration</CardTitle>
          <Badge
            variant="outline"
            className={data.is_active
              ? 'border-bullish/40 bg-bullish/10 text-bullish'
              : 'text-muted-foreground'}
          >
            {data.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Created {new Date(data.created_at).toLocaleDateString()}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Webhook URL */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Webhook URL
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-md border border-input bg-muted/40 px-3 py-2 text-xs font-mono break-all select-all">
              {WEBHOOK_URL}
            </div>
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(WEBHOOK_URL)}
              className="shrink-0 cursor-pointer" aria-label="Copy webhook URL">
              <Copy className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Passphrase */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Passphrase
            </label>
            <button
              type="button"
              onClick={() => {
                setIsEditingPassphrase((v) => !v)
                setNewPassphrase('')
                setPassphraseError('')
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              Change passphrase
            </button>
          </div>

          {isEditingPassphrase ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="New passphrase (min. 8 chars)"
                  value={newPassphrase}
                  onChange={(e) => { setNewPassphrase(e.target.value); setPassphraseError('') }}
                  className="font-mono text-sm"
                  disabled={isSavingPassphrase}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewPassphrase(generatePassphrase())}
                  className="shrink-0 cursor-pointer text-xs"
                  disabled={isSavingPassphrase}
                >
                  Generate
                </Button>
              </div>
              {passphraseError && (
                <p className="text-xs text-bearish" role="alert">{passphraseError}</p>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSavePassphrase} disabled={isSavingPassphrase}
                  className="cursor-pointer">
                  {isSavingPassphrase && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingPassphrase(false)}
                  disabled={isSavingPassphrase} className="cursor-pointer">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm font-mono tracking-widest select-all">
                {displayedPassphrase}
              </div>
              <Button variant="outline" size="icon"
                onClick={() => setIsPassphraseVisible((v) => !v)}
                aria-label={isPassphraseVisible ? 'Hide passphrase' : 'Show passphrase'}
                aria-pressed={isPassphraseVisible}
                className="shrink-0 cursor-pointer">
                {isPassphraseVisible
                  ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                  : <Eye className="h-4 w-4" aria-hidden="true" />}
              </Button>
              <Button variant="outline" size="icon"
                onClick={() => copyToClipboard(passphrase)}
                aria-label="Copy passphrase"
                className="shrink-0 cursor-pointer">
                <Copy className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>

        {/* Deactivate */}
        {data.is_active && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDeactivate}
              disabled={automationToggle.isPending}
              className={`cursor-pointer gap-1.5 transition-colors duration-200 ${
                confirmDelete
                  ? 'border border-bearish/40 bg-bearish/10 text-bearish hover:bg-bearish/20'
                  : 'text-muted-foreground hover:text-bearish'
              }`}
            >
              {automationToggle.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
              {confirmDelete ? 'Confirm deactivate' : 'Deactivate webhook'}
            </Button>
            {confirmDelete && (
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}
                className="cursor-pointer text-muted-foreground">
                Cancel
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
