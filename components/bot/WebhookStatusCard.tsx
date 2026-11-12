'use client'

import Link from 'next/link'
import type { UseQueryResult } from '@tanstack/react-query'
import { ArrowRight, KeyRound, Webhook } from 'lucide-react'
import { Section } from '@/components/lab/Section'
import { StatusPill } from '@/components/ui/status-pill'
import { Term } from '@/components/ui/term'
import { EmptyState, ErrorState, LoadingState } from '@/components/shell/states'
import { formatAge, formatTime } from '@/lib/utils/time'
import { alertStatusLabel, alertStatusTone } from '@/lib/bot/status'
import { cn } from '@/lib/utils/cn'
import type { BotAccount, BotAlert, BotStatus } from '@/lib/api/types/bot'

const ALERT_TONE_CLASS = { ok: 'text-bullish', warn: 'text-warn', bad: 'text-bearish', wait: 'text-muted-foreground' } as const

function alertText(a: BotAlert): string {
  const verb = a.action === 'open' ? 'Buka' : a.action === 'close' ? 'Tutup' : 'Alert'
  return `${verb} ${a.side ? a.side.toUpperCase() : ''} ${a.symbol.replace(/USDT$/, '')}`.replace(/\s+/g, ' ').trim()
}

function AccountRow({ a, windowDays }: { a: BotAccount; windowDays: number }) {
  const live = a.webhook_active && a.account_active
  return (
    <li className="space-y-1.5 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">{a.label}</span>
        {!a.account_active ? (
          <StatusPill kind="bermasalah" label="Akun nonaktif" />
        ) : a.webhook_active ? (
          <StatusPill kind="sehat" label="Webhook aktif" />
        ) : (
          <StatusPill kind="menunggu" label="Webhook tidak aktif" />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {!a.account_active
          ? 'Akun ini dinonaktifkan, jadi semua alert ke akun ini ditolak.'
          : a.webhook_active
            ? `Aktif sejak ${formatTime(a.webhook_since, { time: false })}.`
            : 'Alert TradingView ke akun ini ditolak sampai webhook diaktifkan lagi.'}{' '}
        <span className="inline-flex items-center gap-1">
          <KeyRound className="h-3 w-3" aria-hidden="true" />
          {a.exchanges.length ? `API key: ${a.exchanges.map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(', ')}` : 'API key exchange belum ada'}
        </span>
      </p>
      {a.last_alert ? (
        <p className="text-xs">
          <span className="text-muted-foreground">Alert terakhir diproses: </span>
          <span className="num">{formatTime(a.last_alert.at)}</span> · {alertText(a.last_alert)} ·{' '}
          <span className={cn('font-medium', ALERT_TONE_CLASS[alertStatusTone(a.last_alert.status)])}>
            {alertStatusLabel(a.last_alert.status)}
          </span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Belum ada alert yang diproses bot untuk akun ini.</p>
      )}
      {(a.alerts_window > 0 || live) && (
        <p className="num text-2xs text-muted-foreground">
          {windowDays} hari terakhir: {a.alerts_window} alert · {a.failed_window} gagal · {a.rejected_window} ditolak
        </p>
      )}
    </li>
  )
}

/**
 * Read-only webhook state per bot account (GET /lab/bot/status). Never shows, fetches or
 * copies the webhook passphrase; settings live on /webhook.
 */
export function WebhookStatusCard({ q, className }: { q: UseQueryResult<BotStatus>; className?: string }) {
  const s = q.data
  return (
    <Section
      className={className}
      icon={<Webhook className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
      title={<Term k="webhook" />}
      description={
        s?.generated_at ? <>Hanya baca · diperbarui {formatAge(s.generated_at)}</> : 'Hanya baca: status per akun bot.'
      }
      action={<StatusPill kind="live" size="xs" />}
    >
      {q.isPending ? (
        <LoadingState rows={2} />
      ) : q.isError || !s ? (
        <ErrorState compact error={q.error} message="Status webhook belum bisa dimuat." onRetry={() => q.refetch()} />
      ) : !s.available ? (
        <EmptyState
          title="Status webhook tidak tersedia"
          description={`Database bot tidak bisa dibaca (${s.reason ?? 'alasan tidak diketahui'}). Tidak ada angka yang ditebak.`}
        />
      ) : s.accounts.length === 0 ? (
        <EmptyState
          title="Belum ada akun dengan webhook"
          description="Tidak ada akun yang pernah membuat webhook, jadi alert TradingView belum bisa sampai ke bot."
        />
      ) : (
        <div className="space-y-3">
          <ul className="divide-y divide-border/60 text-sm">
            {s.accounts.map((a) => (
              <AccountRow key={a.label} a={a} windowDays={s.window_days} />
            ))}
          </ul>
          <div className="space-y-1 border-t pt-3 text-2xs text-muted-foreground">
            <p>
              Kata sandi webhook tidak ditampilkan di halaman ini.{' '}
              <Link href="/webhook" className="inline-flex items-center gap-0.5 font-medium text-info hover:underline">
                Atur webhook akunmu <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </p>
            <p>
              Dibaca dari catatan bot. Alert yang ditolak sebelum sampai ke bot (misalnya kata sandi salah) tidak tercatat di
              sini; lihat Cek bot live di bawah.
              {s.reason ? ` Catatan: ${s.reason}.` : ''}
            </p>
          </div>
        </div>
      )}
    </Section>
  )
}
