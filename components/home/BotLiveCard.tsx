'use client'

import Link from 'next/link'
import { ArrowRight, CircleOff, Webhook } from 'lucide-react'
import { Section } from '@/components/lab/Section'
import { StatusPill, type StatusKind } from '@/components/ui/status-pill'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/shell/states'

export interface BotVerdictView {
  tone: Extract<StatusKind, 'sehat' | 'perlu_dicek' | 'bermasalah' | 'menunggu'>
  /** One sentence: "Bot live aman?" */
  sentence: string
  /** Optional small lines under it (last alert, window). */
  details?: string[]
}

export interface WebhookView {
  /** "Webhook kamu" (own account) or "Webhook bot ETH" (bot status). */
  label: string
  state: 'aktif' | 'tidak_aktif'
}

function LinkRow({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-info hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  )
}

/**
 * Bot live [LIVE]. Admins: the one-sentence "bot aman?" verdict (same words
 * as /bot) + webhook state per bot account. Everyone else: only their own
 * webhook on/off. Never shows a passphrase, never polls exchange positions
 * (balances and positions are one link away).
 */
export function BotLiveCard({
  admin,
  verdict,
  loading,
  error,
  onRetry,
  webhooks,
  webhookLoading,
  webhookError,
}: {
  admin: boolean
  verdict?: BotVerdictView | null
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  webhooks: WebhookView[]
  webhookLoading?: boolean
  webhookError?: boolean
}) {
  return (
    <Section
      title={
        <>
          Bot live <StatusPill kind="live" size="xs" />
        </>
      }
      action={admin ? <LinkRow href="/bot">Status bot</LinkRow> : undefined}>
      <div className="space-y-3">
        {admin &&
          (loading ? (
            <Skeleton className="h-12 w-full" />
          ) : error ? (
            <ErrorState error={error} onRetry={onRetry} compact className="py-3" />
          ) : verdict ? (
            <div className="space-y-1.5">
              <StatusPill kind={verdict.tone} />
              <p className="text-sm font-medium leading-snug">{verdict.sentence}</p>
              {verdict.details?.map((d) => (
                <p key={d} className="text-2xs text-muted-foreground">
                  {d}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Status bot live tidak tersedia.</p>
          ))}

        <div className="space-y-1.5">
          {webhookLoading ? (
            <Skeleton className="h-5 w-48" />
          ) : webhookError ? (
            <p className="text-xs text-muted-foreground">Status webhook tidak bisa dimuat.</p>
          ) : (
            webhooks.map((w) => (
              <p key={w.label} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                {w.state === 'aktif' ? (
                  <Webhook className="h-4 w-4 text-bullish" aria-hidden="true" />
                ) : (
                  <CircleOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="text-muted-foreground">{w.label}:</span>
                <span className="font-semibold">{w.state === 'aktif' ? 'aktif' : 'tidak aktif'}</span>
                <span className="w-full pl-6 text-2xs text-muted-foreground">
                  {w.state === 'aktif' ? 'Alert TradingView diteruskan ke bot.' : 'Semua alert (buka maupun tutup posisi) diabaikan.'}
                </span>
              </p>
            ))
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-2.5">
          <LinkRow href="/balance">Saldo &amp; posisi</LinkRow>
          <LinkRow href="/webhook">Webhook</LinkRow>
        </div>
      </div>
    </Section>
  )
}
