'use client'

import { useState } from 'react'
import { Copy, Eye, EyeOff, Loader2, Power, PowerOff, Webhook } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmLive } from '@/components/ui/confirm-live'
import { StatusPill } from '@/components/ui/status-pill'
import { Term } from '@/components/ui/term'
import { ErrorState } from '@/components/shell/states'
import { describeError } from '@/components/shell/error-copy'
import { useWebhookConfig, useAutomationToggle } from '@/lib/queries/webhook'
import { maskPassphrase } from '@/lib/utils/mask'
import { notify } from '@/lib/utils/toast'
import { formatTime } from '@/lib/utils/time'
import { ApiError } from '@/lib/api/errors'

const WEBHOOK_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000') +
  '/webhook/tradingview'

/** Same wording wherever the webhook can be switched on (here and in Akun & koneksi). */
export const ACTIVATE_COPY = {
  title: 'Aktifkan webhook?',
  description:
    'Setelah aktif, setiap alert TradingView ke akun ini langsung diproses menjadi order sungguhan di exchange. Kalau webhook pernah dibuat, kata sandi lamanya dipakai lagi. Kalau belum pernah, server membuat kata sandi baru dan alert TradingView harus diperbarui.',
  confirmLabel: 'Ya, aktifkan',
}

export const DEACTIVATE_COPY = {
  title: 'Nonaktifkan webhook?',
  description:
    'Semua alert TradingView ke akun ini (buka maupun tutup posisi) akan ditolak sampai webhook diaktifkan lagi. Posisi yang sedang terbuka tidak ditutup otomatis. Kata sandi webhook tetap disimpan.',
  confirmLabel: 'Ya, nonaktifkan',
}

function copyToClipboard(text: string, what: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => notify.success(`${what} disalin`))
    .catch(() => notify.error(`Gagal menyalin ${what.toLowerCase()}`))
}

function FieldRow({
  label,
  value,
  masked = false,
  actions,
}: {
  label: React.ReactNode
  value: string
  masked?: boolean
  actions: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <div
          className={`min-w-0 flex-1 break-all rounded-lg border border-input bg-muted/30 px-3 py-2 font-mono text-sm select-all ${
            masked ? 'tracking-widest' : ''
          }`}
        >
          {value}
        </div>
        {actions}
      </div>
    </div>
  )
}

function Header({ status, action }: { status: React.ReactNode; action?: React.ReactNode }) {
  return (
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Webhook className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <CardTitle className="text-base">
          <Term k="webhook" />
        </CardTitle>
        {status}
      </div>
      {action}
    </CardHeader>
  )
}

/**
 * Webhook URL, passphrase and the on/off switch for the logged-in account.
 * Hooks, mutation arguments and endpoints are unchanged; the switch now asks first
 * (ConfirmLive) in both directions, and the inactive state says what it really is.
 */
export function WebhookConfigCard() {
  const { data, isPending, error, refetch } = useWebhookConfig()
  const automationToggle = useAutomationToggle()
  const [isPassphraseVisible, setIsPassphraseVisible] = useState(false)

  // ── Pending ──────────────────────────────────────────────────────────────
  if (isPending) {
    return (
      <Card className="overflow-hidden">
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
          {[0, 1].map((i) => (
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

  // ── 404: the backend answers 404 both for "never created" and "paused" ───
  if (error) {
    const apiError = error instanceof ApiError ? error : null

    if (apiError?.kind === 'not_found') {
      return (
        <Card className="overflow-hidden">
          <Header status={<StatusPill kind="menunggu" label="Tidak aktif" />} />
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Webhook tidak aktif (belum dibuat atau sedang dijeda)</p>
              <p className="text-xs text-muted-foreground">
                Server tidak membedakan keduanya. Selama tidak aktif, semua alert TradingView ke akun ini ditolak dan tidak ada order
                yang dibuat.
              </p>
            </div>
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
                <Button size="sm" className="gap-1.5" disabled={automationToggle.isPending}>
                  {automationToggle.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Power className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Aktifkan webhook (LIVE)
                </Button>
              }
            />
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className="overflow-hidden">
        <Header status={null} />
        <CardContent>
          <ErrorState compact error={error} onRetry={() => refetch()} message="Status webhook belum bisa dimuat." />
        </CardContent>
      </Card>
    )
  }

  // ── Data ──────────────────────────────────────────────────────────────────
  const passphrase = data?.passphrase ?? ''
  const displayedPassphrase = isPassphraseVisible ? passphrase : maskPassphrase(passphrase)
  const isActive = data?.is_active ?? false

  /** Same mutation and arguments as before; only asked through ConfirmLive first. */
  function runToggle(nextEnabled: boolean) {
    const hasExisting = !!data && data.is_active
    if (nextEnabled && !hasExisting) {
      notify.info('Kalau webhook belum pernah dibuat, server membuat kata sandi baru. Perbarui alert TradingView setelah mengaktifkan.')
    }
    return automationToggle.mutateAsync({ nextEnabled, hasExisting }).then(
      () => notify.success(nextEnabled ? 'Webhook aktif' : 'Webhook dinonaktifkan'),
      (err) => {
        notify.error(describeError(err).message)
        throw err
      },
    )
  }

  const copy = isActive ? DEACTIVATE_COPY : ACTIVATE_COPY

  return (
    <Card className="overflow-hidden">
      <div className={`h-0.5 w-full ${isActive ? 'bg-bullish' : 'bg-muted'}`} aria-hidden="true" />
      <Header
        status={isActive ? <StatusPill kind="sehat" label="Otomasi aktif" /> : <StatusPill kind="menunggu" label="Tidak aktif" />}
        action={
          <ConfirmLive
            title={copy.title}
            description={copy.description}
            confirmLabel={copy.confirmLabel}
            destructive={isActive}
            pending={automationToggle.isPending}
            onConfirm={() => runToggle(!isActive)}
            trigger={
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5" disabled={automationToggle.isPending}>
                {automationToggle.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : isActive ? (
                  <PowerOff className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Power className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {isActive ? 'Nonaktifkan' : 'Aktifkan (LIVE)'}
              </Button>
            }
          />
        }
      />

      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {isActive
            ? 'Alert TradingView yang membawa kata sandi ini diproses menjadi order sungguhan di exchange.'
            : 'Selama tidak aktif, semua alert TradingView ke akun ini ditolak.'}
          {data?.created_at && <> Dibuat {formatTime(data.created_at)}.</>}
        </p>

        <FieldRow
          label="Alamat webhook (URL)"
          value={WEBHOOK_URL}
          actions={
            <Button
              variant="outline"
              size="icon"
              aria-label="Salin alamat webhook"
              onClick={() => copyToClipboard(WEBHOOK_URL, 'Alamat webhook')}
              className="shrink-0 rounded-lg"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          }
        />

        <FieldRow
          label={<Term k="webhook_passphrase" />}
          value={displayedPassphrase}
          masked={!isPassphraseVisible}
          actions={
            <>
              <Button
                variant="outline"
                size="icon"
                aria-label={isPassphraseVisible ? 'Sembunyikan kata sandi webhook' : 'Tampilkan kata sandi webhook'}
                aria-pressed={isPassphraseVisible}
                onClick={() => setIsPassphraseVisible((v) => !v)}
                className="shrink-0 rounded-lg"
              >
                {isPassphraseVisible ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Salin kata sandi webhook"
                onClick={() => copyToClipboard(passphrase, 'Kata sandi webhook')}
                className="shrink-0 rounded-lg"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </>
          }
        />
        <p className="text-2xs text-muted-foreground">Ganti kata sandi webhook di Akun & koneksi.</p>
      </CardContent>
    </Card>
  )
}
