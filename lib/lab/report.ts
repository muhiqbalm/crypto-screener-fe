import type { BadgeProps } from '@/components/ui/badge'
import type { LedgerVerdictCode, NotificationType, ReportWeek } from '@/lib/api/types/report'

/** Copy + badge tone per Signal Ledger verdict code (same meaning as the screener track record). */
export const VERDICT_COPY: Record<LedgerVerdictCode, { label: string; variant: NonNullable<BadgeProps['variant']> }> = {
  terbukti: { label: 'Terbukti', variant: 'bullish' },
  negatif: { label: 'Negatif', variant: 'bearish' },
  belum_terbukti: { label: 'Belum terbukti', variant: 'warn' },
  belum_cukup_data: { label: 'Belum cukup data', variant: 'muted' },
}

export const VERDICT_ORDER: LedgerVerdictCode[] = ['terbukti', 'negatif', 'belum_terbukti', 'belum_cukup_data']

export const NOTIF_TYPE_LABEL: Record<NotificationType, string> = {
  job: 'Lab',
  paper: 'Paper',
  ledger: 'Catatan Sinyal',
  deploy: 'Deploy',
  report: 'Laporan',
}

export const NO_DATA = 'Belum ada data'

/** "2026-W46" + bounds → "2026-W46 · 9–15 Nov 2026" (UTC dates, end is exclusive). */
export function weekLabel(w: Pick<ReportWeek, 'week' | 'start' | 'end'>): string {
  const a = new Date(w.start)
  const b = new Date(Date.parse(w.end) - 86_400_000)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return w.week
  const m = (d: Date) => d.toLocaleDateString('id-ID', { month: 'short', timeZone: 'UTC' })
  const range =
    a.getUTCMonth() === b.getUTCMonth()
      ? `${a.getUTCDate()}–${b.getUTCDate()} ${m(b)}`
      : `${a.getUTCDate()} ${m(a)} – ${b.getUTCDate()} ${m(b)}`
  return `${w.week} · ${range} ${b.getUTCFullYear()}`
}

/** Badge text for the unread count: hidden at 0, capped at 99+. */
export function unreadBadge(n: number | null | undefined): string | null {
  if (!n || n <= 0) return null
  return n > 99 ? '99+' : String(n)
}

export function directionLabel(d: number): string {
  return d > 0 ? 'Long' : 'Short'
}

/** Only in-app paths are followed from a notification (backend also drops other links). */
export function safeNotificationLink(link: string | null | undefined): string | null {
  if (!link || !link.startsWith('/') || link.startsWith('//')) return null
  return link
}
