'use client'

import Link from 'next/link'
import { ArrowRight, Bot } from 'lucide-react'
import { HeroCard } from '@/components/ui/hero-card'
import { IconTitle } from '@/components/ui/icon-title'
import { StatusPill, type StatusKind } from '@/components/ui/status-pill'
import { Donut } from '@/components/ui/donut'
import { LiveDot } from '@/components/ui/live-dot'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/shell/states'
import type { Tone } from '@/components/ui/tone'

export interface BotVerdictView {
  tone: Extract<StatusKind, 'sehat' | 'perlu_dicek' | 'bermasalah' | 'menunggu'>
  /** One sentence: "Bot live aman?" */
  sentence: string
  /** Key facts (signals 7 days, webhook, last alert) as label / value / hint. */
  facts?: { label: string; value: string; hint?: string }[]
}

export interface WebhookView {
  /** "Webhook kamu" (own account) or "Webhook bot ETH" (bot status). */
  label: string
  state: 'aktif' | 'tidak_aktif'
}

const GLOW: Record<BotVerdictView['tone'], Tone> = {
  sehat: 'bullish',
  perlu_dicek: 'warn',
  bermasalah: 'bearish',
  menunggu: 'muted',
}

function LinkRow({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full text-sm font-semibold text-info hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  )
}

/**
 * Bot live [LIVE] hero. Admins: status pill + donut of the 7-day signals
 * (same judging and words as /bot) + up to 3 facts. Everyone else: only
 * their own webhook on/off. Never a passphrase, never polls exchange positions.
 */
export function BotLiveCard({
  admin,
  verdict,
  donut,
  loading,
  error,
  onRetry,
  webhooks,
  webhookLoading,
  webhookError,
}: {
  admin: boolean
  verdict?: BotVerdictView | null
  donut?: { ok: number; warn: number; bad: number; judged: number } | null
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  webhooks: WebhookView[]
  webhookLoading?: boolean
  webhookError?: boolean
}) {
  const glow = admin ? (verdict ? GLOW[verdict.tone] : 'muted') : webhooks[0]?.state === 'aktif' ? 'bullish' : 'muted'
  return (
    <HeroCard glow={glow} aria-labelledby="bot-live-title" className="flex flex-col gap-5 xl:col-span-2">
      <IconTitle
        icon={Bot}
        tone="brand"
        title={<span id="bot-live-title">Bot live</span>}
        action={<StatusPill kind="live" size="xs" />}
      />

      {admin ? (
        loading ? (
          <Skeleton className="h-32 w-full" />
        ) : error ? (
          <ErrorState error={error} onRetry={onRetry} compact className="py-2" />
        ) : verdict ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            {donut && donut.judged > 0 ? (
              <Donut
                size={112}
                thickness={13}
                label={`${donut.ok} dari ${donut.judged} sinyal 7 hari sesuai strategi`}
                segments={[
                  { value: donut.ok, tone: 'bullish', label: 'sesuai' },
                  { value: donut.warn, tone: 'warn', label: 'perlu dicek' },
                  { value: donut.bad, tone: 'bearish', label: 'gagal' },
                ]}
                center={
                  <div>
                    <p className="num display text-2xl font-extrabold leading-none">
                      {donut.ok}/{donut.judged}
                    </p>
                    <p className="mt-1 text-2xs text-muted-foreground">sesuai</p>
                  </div>
                }
              />
            ) : null}
            <StatusPill kind={verdict.tone} size="md" />
            <p className="line-clamp-3 w-full text-base font-semibold leading-snug">{verdict.sentence}</p>
          </div>
        ) : (
          <p className="text-base text-muted-foreground">Status bot live tidak tersedia.</p>
        )
      ) : null}

      {admin && verdict?.facts && verdict.facts.length > 0 && (
        <dl className="space-y-2 border-t pt-4">
          {verdict.facts.slice(0, 3).map((f) => (
            <div key={f.label} className="flex items-baseline justify-between gap-3 text-sm">
              <dt className="shrink-0 text-muted-foreground">{f.label}</dt>
              <dd className="num min-w-0 truncate text-right font-semibold">
                {f.value}
                {f.hint && <span className="font-normal text-muted-foreground"> · {f.hint}</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {!admin &&
        (webhookLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : webhookError ? (
          <p className="text-base text-muted-foreground">Status webhook tidak bisa dimuat.</p>
        ) : (
          webhooks.map((w) => (
            <div key={w.label} className="space-y-1.5">
              <p className="eyebrow">{w.label}</p>
              <p className="flex items-center gap-3">
                <LiveDot tone={w.state === 'aktif' ? 'bullish' : 'muted'} pulse={w.state === 'aktif'} size="lg" />
                <span className="display text-3xl font-extrabold">{w.state === 'aktif' ? 'Aktif' : 'Tidak aktif'}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {w.state === 'aktif' ? 'Alert TradingView diteruskan ke bot.' : 'Semua alert diabaikan.'}
              </p>
            </div>
          ))
        ))}

      <div className="mt-auto flex flex-wrap gap-x-5 gap-y-1">
        {admin && <LinkRow href="/bot">Status bot</LinkRow>}
        <LinkRow href="/balance">Saldo &amp; posisi</LinkRow>
        {!admin && <LinkRow href="/webhook">Webhook</LinkRow>}
      </div>
    </HeroCard>
  )
}
