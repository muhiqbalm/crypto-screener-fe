'use client'

import { useState } from 'react'
import { Copy, Eye, EyeOff, Loader2, Power, PowerOff, RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmLive } from '@/components/ui/confirm-live'
import { StatusPill } from '@/components/ui/status-pill'
import { Term } from '@/components/ui/term'
import { ErrorState } from '@/components/shell/states'
import { describeError } from '@/components/shell/error-copy'
import { ACTIVATE_COPY, DEACTIVATE_COPY } from '@/components/webhook/WebhookConfigCard'
import { useWebhookConfig, useAutomationToggle, webhookKeys } from '@/lib/queries/webhook'
import { maskPassphrase } from '@/lib/utils/mask'
import { notify } from '@/lib/utils/toast'
import { formatTime } from '@/lib/utils/time'
import { ApiError } from '@/lib/api/errors'
import { generatePassphrase } from '@/lib/utils/random'
import { api } from '@/lib/api/client'

const WEBHOOK_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000') +
  '/webhook/tradingview'

function copyToClipboard(text: string, what: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => notify.success(`${what} disalin`))
    .catch(() => notify.error(`Gagal menyalin ${what.toLowerCase()}`))
}

const Title = () => (
  <CardTitle className="text-[17px]">
    <Term k="webhook" />
  </CardTitle>
)

/**
 * Webhook settings in Akun & koneksi. Same hooks, the same PATCH call and the same toggle
 * arguments as before; every live action (activate, deactivate, change passphrase) now asks
 * first through ConfirmLive instead of acting on the first or second click.
 */
export function WebhookConfigSettings() {
  const { data, isPending, error, refetch } = useWebhookConfig()
  const automationToggle = useAutomationToggle()
  const queryClient = useQueryClient()

  const [isPassphraseVisible, setIsPassphraseVisible] = useState(false)
  const [isEditingPassphrase, setIsEditingPassphrase] = useState(false)
  const [newPassphrase, setNewPassphrase] = useState('')
  const [passphraseError, setPassphraseError] = useState('')
  const [isSavingPassphrase, setIsSavingPassphrase] = useState(false)
  const [confirmPassphrase, setConfirmPassphrase] = useState(false)

  // ── Pending ──────────────────────────────────────────────────────────────
  if (isPending) {
    return (
      <Card className="rounded-3xl">
        <CardHeader>
          <Title />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    )
  }

  // ── 404: never created OR paused (the backend answers 404 for both) ──────
  const noConfig = error instanceof ApiError && error.kind === 'not_found'
  if (noConfig) {
    return (
      <Card className="rounded-3xl">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Title />
            <StatusPill kind="menunggu" label="Tidak aktif" />
          </div>
          <CardDescription>Webhook tidak aktif (belum dibuat atau sedang dijeda). Selama tidak aktif, semua alert TradingView ditolak.</CardDescription>
        </CardHeader>
        <CardContent>
          <ConfirmLive
            title={ACTIVATE_COPY.title}
            description={ACTIVATE_COPY.description}
            confirmLabel={ACTIVATE_COPY.confirmLabel}
            destructive={false}
            pending={automationToggle.isPending}
            onConfirm={() =>
              automationToggle.mutateAsync({ nextEnabled: true, hasExisting: false }).then(
                () => notify.success('Webhook aktif'),
                (err) => {
                  notify.error(describeError(err).message)
                  throw err
                },
              )
            }
            trigger={
              <Button className="gap-1.5" disabled={automationToggle.isPending}>
                {automationToggle.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Power className="h-4 w-4" aria-hidden="true" />}
                Aktifkan webhook (LIVE)
              </Button>
            }
          />
        </CardContent>
      </Card>
    )
  }

  // ── Other error ───────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <Card className="rounded-3xl">
        <CardHeader>
          <Title />
        </CardHeader>
        <CardContent>
          <ErrorState compact error={error ?? undefined} onRetry={() => refetch()} message="Pengaturan webhook belum bisa dimuat." />
        </CardContent>
      </Card>
    )
  }

  // ── Data ──────────────────────────────────────────────────────────────────
  const passphrase = data.passphrase
  const displayedPassphrase = isPassphraseVisible ? passphrase : maskPassphrase(passphrase)

  /** Step 1: check the new passphrase, then ask. */
  function requestSavePassphrase() {
    if (newPassphrase.length < 8) {
      setPassphraseError('Kata sandi webhook minimal 8 karakter')
      return
    }
    setConfirmPassphrase(true)
  }

  /** Step 2 (after "Ya"): the same PATCH call as before. */
  async function savePassphrase() {
    setIsSavingPassphrase(true)
    try {
      await api.patchWebhookConfig({ passphrase: newPassphrase })
      queryClient.invalidateQueries({ queryKey: webhookKeys.config() })
      notify.success('Kata sandi webhook diganti. Perbarui semua alert TradingView.')
      setIsEditingPassphrase(false)
      setNewPassphrase('')
    } catch (err) {
      const msg = err instanceof ApiError && err.status === 409 ? 'Kata sandi itu sudah dipakai. Pilih yang lain.' : describeError(err).message
      notify.error(msg)
      throw err
    } finally {
      setIsSavingPassphrase(false)
    }
  }

  function deactivate() {
    return automationToggle.mutateAsync({ nextEnabled: false, hasExisting: true }).then(
      () => notify.success('Webhook dinonaktifkan'),
      (err) => {
        notify.error(describeError(err).message)
        throw err
      },
    )
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Title />
          {data.is_active ? <StatusPill kind="sehat" label="Aktif" /> : <StatusPill kind="menunggu" label="Tidak aktif" />}
        </div>
        <CardDescription className="text-[14px]">Dibuat {formatTime(data.created_at)}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <p className="text-[14px] font-medium uppercase tracking-wide text-muted-foreground">Alamat webhook (URL)</p>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 break-all rounded-md border border-input bg-muted/40 px-3 py-2 font-mono text-[14px] select-all">{WEBHOOK_URL}</div>
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(WEBHOOK_URL, 'Alamat webhook')} className="shrink-0" aria-label="Salin alamat webhook">
              <Copy className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[14px] font-medium uppercase tracking-wide text-muted-foreground">
              <Term k="webhook_passphrase" />
            </p>
            <button
              type="button"
              onClick={() => {
                setIsEditingPassphrase((v) => !v)
                setNewPassphrase('')
                setPassphraseError('')
              }}
              className="flex cursor-pointer items-center gap-1 text-[14px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              Ganti kata sandi webhook
            </button>
          </div>

          {isEditingPassphrase ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="text"
                  aria-label="Kata sandi webhook baru"
                  placeholder="Kata sandi baru (min. 8 karakter)"
                  value={newPassphrase}
                  onChange={(e) => {
                    setNewPassphrase(e.target.value)
                    setPassphraseError('')
                  }}
                  className="font-mono text-sm"
                  disabled={isSavingPassphrase}
                  autoComplete="off"
                />
                <Button variant="outline" size="sm" onClick={() => setNewPassphrase(generatePassphrase())} className="shrink-0 text-[14px]" disabled={isSavingPassphrase}>
                  Buat acak
                </Button>
              </div>
              {passphraseError && (
                <p className="text-[14px] text-bearish" role="alert">
                  {passphraseError}
                </p>
              )}
              <p className="text-[13px] text-muted-foreground">Setelah diganti, semua alert TradingView yang memakai kata sandi lama langsung ditolak.</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={requestSavePassphrase} disabled={isSavingPassphrase}>
                  {isSavingPassphrase && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                  Simpan
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingPassphrase(false)} disabled={isSavingPassphrase}>
                  Batal
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 break-all rounded-md border border-input bg-muted/40 px-3 py-2 font-mono text-sm tracking-widest select-all">{displayedPassphrase}</div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsPassphraseVisible((v) => !v)}
                aria-label={isPassphraseVisible ? 'Sembunyikan kata sandi webhook' : 'Tampilkan kata sandi webhook'}
                aria-pressed={isPassphraseVisible}
                className="shrink-0"
              >
                {isPassphraseVisible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </Button>
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(passphrase, 'Kata sandi webhook')} aria-label="Salin kata sandi webhook" className="shrink-0">
                <Copy className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>

        {data.is_active && (
          <div className="border-t border-border pt-3">
            <ConfirmLive
              title={DEACTIVATE_COPY.title}
              description={DEACTIVATE_COPY.description}
              confirmLabel={DEACTIVATE_COPY.confirmLabel}
              pending={automationToggle.isPending}
              onConfirm={deactivate}
              trigger={
                <Button size="sm" variant="ghost" disabled={automationToggle.isPending} className="gap-1.5 text-muted-foreground hover:text-bearish">
                  {automationToggle.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <PowerOff className="h-3.5 w-3.5" aria-hidden="true" />}
                  Nonaktifkan webhook
                </Button>
              }
            />
          </div>
        )}
      </CardContent>

      <ConfirmLive
        open={confirmPassphrase}
        onOpenChange={setConfirmPassphrase}
        title="Ganti kata sandi webhook?"
        description="Semua alert TradingView yang masih memakai kata sandi lama langsung ditolak, termasuk alert tutup posisi. Perbarui setiap alert (atau input di skrip Pine) dengan kata sandi baru."
        confirmLabel="Ya, ganti kata sandi"
        typeToConfirm
        pending={isSavingPassphrase}
        onConfirm={savePassphrase}
      />
    </Card>
  )
}
