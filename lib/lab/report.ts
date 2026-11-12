import type { BadgeProps } from '@/components/ui/badge'
import { formatCount, formatPct } from '@/lib/utils/format'
import { MONTHS_ID, WEEKDAYS_ID, formatTime, toDate, wibParts } from '@/lib/utils/time'
import type {
  LedgerVerdictCode,
  NotificationType,
  ReportHook,
  ReportWeek,
  ReportWeeksResponse,
  WeeklyReport,
} from '@/lib/api/types/report'

/** Copy + badge tone per Signal Ledger verdict code (same meaning as the screener track record). */
export const VERDICT_COPY: Record<LedgerVerdictCode, { label: string; variant: NonNullable<BadgeProps['variant']> }> = {
  terbukti: { label: 'Terbukti', variant: 'bullish' },
  negatif: { label: 'Negatif', variant: 'bearish' },
  belum_terbukti: { label: 'Belum terbukti', variant: 'warn' },
  belum_cukup_data: { label: 'Belum cukup data', variant: 'muted' },
}

export const VERDICT_ORDER: LedgerVerdictCode[] = ['terbukti', 'negatif', 'belum_terbukti', 'belum_cukup_data']

/** Notification groups in the bell (one name per concept, glossary §4). */
export const NOTIF_TYPE_LABEL: Record<NotificationType, string> = {
  job: 'Lab',
  paper: 'Paper',
  ledger: 'Rekam jejak sinyal',
  deploy: 'Pembaruan sistem',
  report: 'Laporan',
}

export const NO_DATA = 'Tidak tersedia'

// ── WIB (the report week runs Monday 07:00 WIB → next Monday 07:00 WIB) ─────

const wib = (iso: string | null | undefined) => {
  const d = toDate(iso)
  return d ? wibParts(d) : null
}

const two = (n: number) => String(n).padStart(2, '0')

/** "12 Nov 08:00 WIB" ("—" when missing). */
export function wibTime(iso: string | null | undefined, opts: { year?: boolean } = {}): string {
  return formatTime(iso, { year: opts.year ?? false })
}

/** "Senin 9 Nov 07:00 WIB" */
export function wibDayTime(iso: string | null | undefined): string {
  const w = wib(iso)
  return w ? `${WEEKDAYS_ID[w.weekday]} ${w.day} ${MONTHS_ID[w.month]} ${two(w.hour)}:${two(w.minute)} WIB` : '—'
}

/** "9–16 Nov 2026": Monday to Monday in WIB (the same span the notification uses). */
export function weekLabel(w: Pick<ReportWeek, 'week' | 'start' | 'end'>): string {
  const a = wib(w.start)
  const b = wib(w.end)
  if (!a || !b) return w.week
  const range = a.month === b.month ? `${a.day}–${b.day} ${MONTHS_ID[b.month]}` : `${a.day} ${MONTHS_ID[a.month]} – ${b.day} ${MONTHS_ID[b.month]}`
  return `${range} ${b.year}`
}

/** "Senin 9 Nov 07:00 WIB – Senin 16 Nov 07:00 WIB (00:00 UTC)" */
export function weekPeriod(w: Pick<ReportWeek, 'start' | 'end'>): string {
  return `${wibDayTime(w.start)} – ${wibDayTime(w.end)} (00:00 UTC)`
}

export type WeekKind = 'final' | 'sementara' | 'dihitung_ulang'

export const WEEK_KIND_COPY: Record<WeekKind, { label: string; hint: string }> = {
  final: { label: 'Final', hint: 'Dibekukan Senin 07:30 WIB; angkanya tidak berubah lagi.' },
  sementara: { label: 'Sementara', hint: 'Minggu berjalan: angka dihitung saat dibuka dan masih bisa berubah.' },
  dihitung_ulang: {
    label: 'Dihitung ulang',
    hint: 'Minggu ini tidak punya laporan final, jadi angkanya dihitung ulang dari data sekarang.',
  },
}

export function weekKind(w: Pick<ReportWeek, 'current' | 'snapshot'>): WeekKind {
  return w.snapshot ? 'final' : w.current ? 'sementara' : 'dihitung_ulang'
}

/** Kind of a loaded report (snapshot = final; partial = current week). */
export function reportKind(r: Pick<WeeklyReport, 'source' | 'partial'>): WeekKind {
  return r.source === 'snapshot' ? 'final' : r.partial ? 'sementara' : 'dihitung_ulang'
}

/**
 * Week to open when the URL has none: the newest frozen snapshot (cheap, final numbers);
 * the running week only when no snapshot exists yet.
 */
export function defaultWeek(resp: ReportWeeksResponse | null | undefined): string | null {
  if (!resp) return null
  const snap = resp.weeks.find((w) => w.snapshot && !w.current)
  return snap?.week ?? resp.current
}

// ── labels used in the report blocks ───────────────────────────────────────

export const RUN_MODE_LABEL: Record<string, string> = {
  backtest: 'Uji historis cepat',
  validate: 'Uji jujur',
  optimize: 'Cari setting terbaik',
}

/** Pages the report links to. Old snapshots keep old hook titles/hrefs, so map by id. */
export const HOOK_COPY: Record<string, { title: string; href: string; note: string; adminOnly: boolean }> = {
  arena: { title: 'Paper berjalan', href: '/lab/arena', note: 'Semua preset simulasi berdampingan.', adminOnly: true },
  live_check: { title: 'Status bot', href: '/bot', note: 'Apakah bot live mengikuti strategi acuannya.', adminOnly: true },
  outlook: { title: 'Peluang koin', href: '/koin', note: 'Arah dan rencana trade per koin.', adminOnly: false },
}

export function reportHooks(hooks: readonly ReportHook[] | null | undefined, isAdmin: boolean): ReportHook[] {
  return (hooks ?? [])
    .map((h) => (HOOK_COPY[h.id] ? { id: h.id, title: HOOK_COPY[h.id].title, href: HOOK_COPY[h.id].href, note: HOOK_COPY[h.id].note } : h))
    .filter((h) => isAdmin || !(HOOK_COPY[h.id]?.adminOnly ?? true))
}

/** Signed percent, exchange style (+1.20% / −0.40% / 0.00%); "tidak tersedia" when missing. */
export function signedPct(v: number | null | undefined, digits = 2): string {
  return v === null || v === undefined || !Number.isFinite(v) ? 'tidak tersedia' : formatPct(v, { digits, signed: true })
}

const count = (n: number | null | undefined) => formatCount(n ?? 0)

// ── "Ringkasan minggu ini": the 3 most important findings ──────────────────

export type FindingTone = 'baik' | 'perlu_dicek' | 'buruk' | 'info'

export interface Finding {
  key: string
  tone: FindingTone
  text: string
  /** Detail page; dropped for readers without access to it. */
  href?: string
  linkLabel?: string
  /** Higher = shown first. Problems outrank good news, good news outranks activity. */
  weight: number
}

const ADMIN_PREFIXES = ['/lab', '/journal', '/bot']
export const isAdminHref = (href: string) => ADMIN_PREFIXES.some((p) => href === p || href.startsWith(`${p}/`) || href.startsWith(`${p}?`) || href.startsWith(`${p}#`))

/**
 * Top findings of a weekly report, problems first. Everything comes from the report JSON
 * (no extra request); a section without data adds nothing rather than a zero.
 */
export function topFindings(r: WeeklyReport, opts: { isAdmin: boolean; max?: number }): Finding[] {
  const out: Finding[] = []
  const s = r.sections

  const bot = s.live_bot
  if (bot?.available && (bot.orders ?? 0) > 0) {
    if ((bot.rejected ?? 0) > 0) {
      out.push({
        key: 'bot', tone: 'buruk', weight: 100, href: '/bot', linkLabel: 'Status bot',
        text: `Bot live: ${count(bot.rejected)} dari ${count(bot.orders)} order ditolak atau gagal (${count(bot.signals)} sinyal).`,
      })
    } else {
      out.push({
        key: 'bot', tone: 'baik', weight: 45, href: '/bot', linkLabel: 'Status bot',
        text: `Bot live: ${count(bot.executed)} dari ${count(bot.orders)} order tereksekusi, tidak ada yang ditolak.`,
      })
    }
  }

  const sys = s.system
  const down = (sys?.processes ?? []).filter((p) => p.status !== 'online')
  if (down.length) {
    out.push({ key: 'proc', tone: 'buruk', weight: 95, text: `Proses server tidak berjalan: ${down.map((p) => p.name).join(', ')}.` })
  }
  if ((sys?.deploys?.failed ?? 0) > 0) {
    out.push({ key: 'deploy', tone: 'buruk', weight: 90, text: `${count(sys.deploys.failed)} pembaruan sistem gagal minggu ini.` })
  }
  if ((sys?.backups?.failed ?? 0) > 0) {
    out.push({ key: 'backup', tone: 'buruk', weight: 85, text: `${count(sys.backups.failed)} cadangan harian gagal minggu ini.` })
  }

  const ex = s.execution
  const slip = ex?.week?.mean_slippage_bps
  if (ex?.available && slip !== null && slip !== undefined) {
    const high = slip > 10
    out.push({
      key: 'exec', tone: high ? 'perlu_dicek' : 'info', weight: high ? 70 : 30, href: '/bot#eksekusi', linkLabel: 'Kualitas eksekusi',
      text: `Slippage bot live rata-rata ${slip.toFixed(1)} bps dari ${count(ex.week?.n_with_fill)} sinyal dengan fill${high ? ', lebih mahal dari biasanya' : ''}.`,
    })
  }

  const lab = s.lab
  if (lab?.available && (lab.snooping_warnings ?? []).length > 0) {
    const n = lab.snooping_warnings!.length
    out.push({
      key: 'snoop', tone: 'perlu_dicek', weight: 65,
      text: `Lab: ${n} kombinasi koin × strategi sudah terlalu banyak dicoba; hasil terbaiknya bisa cuma kebetulan.`,
    })
  }

  const paper = s.paper
  if (paper?.available && (paper.presets ?? []).length > 0) {
    const rows = paper.presets!
    const target = paper.target_trades ?? 30
    const most = rows.reduce((a, p) => Math.max(a, p.trades_total), 0)
    const reached = rows.filter((p) => p.trades_total >= target).length
    const bw = [
      paper.best ? `terbaik ${paper.best.preset} ${signedPct(paper.best.week_return_pct, 1)}` : '',
      paper.worst ? `terburuk ${paper.worst.preset} ${signedPct(paper.worst.week_return_pct, 1)}` : '',
    ].filter(Boolean)
    const progress = reached
      ? `${reached} preset sudah mencapai ${target} transaksi.`
      : `Belum ada yang mencapai ${target} transaksi (terbanyak ${most}/${target}).`
    out.push({
      key: 'paper', tone: 'info', weight: 60, href: '/lab/arena', linkLabel: 'Paper berjalan',
      text: `Paper: ${count(paper.trades_week)} transaksi minggu ini${bw.length ? `; ${bw.join(', ')}` : ''}. ${progress}`,
    })
  }

  const led = s.ledger
  if (led?.available) {
    const t = led.counts_week?.terbukti ?? 0
    const neg = led.counts_week?.negatif ?? 0
    if (t > 0 || neg > 0) {
      out.push({
        key: 'ledger', tone: t > 0 ? 'baik' : 'perlu_dicek', weight: t > 0 ? 55 : 58, href: '/lab/signals', linkLabel: 'Rekam jejak sinyal',
        text: `Rekam jejak sinyal: ${t} jenis sinyal terbukti dan ${neg} negatif minggu ini (dicek setelah 1 hari).`,
      })
    } else {
      out.push({
        key: 'ledger', tone: 'info', weight: 20, href: '/lab/signals', linkLabel: 'Rekam jejak sinyal',
        text: `Rekam jejak sinyal: belum ada jenis sinyal yang terbukti minggu ini (${count(led.signals_week)} sinyal tercatat).`,
      })
    }
  }

  if (lab?.available && (lab.runs ?? 0) > 0) {
    out.push({
      key: 'lab', tone: 'info', weight: 25,
      text: `Lab: ${count(lab.runs)} uji, ${count(lab.pass)} lolos dan ${count(lab.fail)} gagal.`,
    })
  }

  return out
    .sort((a, b) => b.weight - a.weight)
    .slice(0, opts.max ?? 3)
    .map((f) => (f.href && !opts.isAdmin && isAdminHref(f.href) ? { ...f, href: undefined, linkLabel: undefined } : f))
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
