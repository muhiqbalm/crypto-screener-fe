/**
 * Pure Beranda logic (unit-tested in logic.test.ts): which coins to watch,
 * what needs attention, the paper/report summary and the automatic assistant
 * summary. No data is invented: missing inputs produce fewer items or an
 * explicit "tidak tersedia".
 */
import type { OutlookResponse, OutlookRow, Keyakinan } from '@/lib/api/types/outlook'
import type { ArenaReport } from '@/lib/api/types/arena'
import type { LabNotification, ReportWeek, WeeklyReport } from '@/lib/api/types/report'
import type { AssetSummary, ScreenerResponse } from '@/lib/api/types/screener'
import { coinHref } from '@/lib/nav'
import { coinOf, formatPct, formatPrice, formatRR } from '@/lib/utils/format'
import { formatTime } from '@/lib/utils/time'

// ── Outlook v2 fields (optional: v1 responses work too) ─────────────────────

/** Subset of the Outlook v2 additions Beranda reads (feat/outlook-v2). */
interface PlanV2 {
  action?: 'masuk' | 'menyusul' | 'tunggu' | 'jangan_masuk'
  text?: string
  sl?: number | null
  tp?: number | null
  rr?: number | null
  fase?: 'baru' | 'berjalan'
  target_typical?: number | null
}
interface PeluangV2 {
  eligible?: boolean
  label?: string
  reason?: string
  rank?: number
}
type RowV2 = OutlookRow & { plan?: PlanV2; peluang?: PeluangV2 }
type ResponseV2 = OutlookResponse & { ranking?: string[] }

export const PELUANG_LABEL: Record<string, string> = {
  positif: 'Terbukti positif',
  negatif: 'Tanpa keunggulan',
  belum_jelas: 'Belum jelas',
  belum_terukur: 'Belum terukur',
  tidak_valid: 'Tidak valid',
  basi: 'Data terlambat',
}

const KEYAKINAN_RANK: Record<Keyakinan, number> = { rendah: 1, sedang: 2, tinggi: 3 }

export interface WatchCoin {
  symbol: string
  coin: string
  href: string
  direction: 'LONG' | 'SHORT'
  keyakinan: Keyakinan | null
  /** Strategy entered on the last 4H close. */
  fresh: boolean
  /** "11 Nov 19:00 WIB" or null. */
  since: string | null
  sl: number | null
  tp: number | null
  rr: number | null
  /** "Batal jika $2,274.00 · Target $1,860.00 · R:R 1.8 : 1" (only the parts that exist). */
  planLine: string | null
  /** One-sentence reason from the backend explanation. */
  reason: string | null
  /** v2 "peluang" label in words, e.g. "Terbukti positif". */
  peluang: string | null
  peluangPositive: boolean
}

export interface WatchList {
  coins: WatchCoin[]
  /** Coins with a direction that did not fit in the list. */
  moreWithDirection: number
  netral: number
  /** Time of the 4H close the outlook is based on. */
  dataAt: string | null
  computedAt: string | null
  /** v2 ranking available. */
  ranked: boolean
}

function sinceOf(r: OutlookRow, now?: number): string | null {
  const t = r.strategy?.entry_time ?? r.strategy?.entry_at ?? null
  return t ? formatTime(t, { now }) : null
}

export function planLine(sl: number | null, tp: number | null, rr: number | null): string | null {
  const parts: string[] = []
  if (sl !== null) parts.push(`Batal jika ${formatPrice(sl)}`)
  if (tp !== null) parts.push(`Target ${formatPrice(tp)}`)
  if (rr !== null) parts.push(`R:R ${formatRR(rr)}`)
  return parts.length ? parts.join(' · ') : null
}

function num(v: number | null | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function toWatchCoin(r: RowV2, now?: number): WatchCoin | null {
  const bias = r.bias?.bias
  if (bias !== 'LONG' && bias !== 'SHORT') return null
  if (r.unavailable || r.error) return null
  const sl = num(r.plan?.sl ?? r.strategy?.sl)
  const tp = num(r.plan?.tp ?? r.strategy?.tp)
  const rr = num(r.plan?.rr ?? r.projection?.rr)
  const fresh = r.plan?.fase ? r.plan.fase === 'baru' : Boolean(r.strategy?.fresh)
  const label = r.peluang?.label
  return {
    symbol: r.symbol,
    coin: r.coin || coinOf(r.symbol),
    href: coinHref(r.symbol),
    direction: bias,
    keyakinan: r.bias?.keyakinan ?? null,
    fresh,
    since: sinceOf(r, now),
    sl,
    tp,
    rr,
    planLine: planLine(sl, tp, rr),
    reason: r.explanation?.summary?.trim() || null,
    peluang: label ? (PELUANG_LABEL[label] ?? null) : null,
    peluangPositive: label === 'positif',
  }
}

/**
 * "Koin untuk dipantau" (max `limit`): coins whose strategy holds LONG/SHORT.
 * v2: backend ranking order (expected value of similar calls). v1: posisi
 * baru first, then keyakinan, then coin name.
 */
export function pickWatchCoins(data: OutlookResponse | undefined, opts: { limit?: number; now?: number } = {}): WatchList {
  const limit = opts.limit ?? 5
  const res = data as ResponseV2 | undefined
  const rows = (res?.rows ?? []) as RowV2[]
  const withDir = rows.map((r) => ({ r, c: toWatchCoin(r, opts.now) })).filter((x): x is { r: RowV2; c: WatchCoin } => x.c !== null)
  const ranking = Array.isArray(res?.ranking) ? res!.ranking : null
  let ordered: WatchCoin[]
  if (ranking && ranking.length > 0) {
    const pos = new Map(ranking.map((s, i) => [s, i]))
    ordered = withDir
      .slice()
      .sort((a, b) => (pos.get(a.r.symbol) ?? 1e6) - (pos.get(b.r.symbol) ?? 1e6) || a.c.coin.localeCompare(b.c.coin))
      .map((x) => x.c)
  } else {
    ordered = withDir
      .map((x) => x.c)
      .sort(
        (a, b) =>
          Number(b.fresh) - Number(a.fresh) ||
          (b.keyakinan ? KEYAKINAN_RANK[b.keyakinan] : 0) - (a.keyakinan ? KEYAKINAN_RANK[a.keyakinan] : 0) ||
          a.coin.localeCompare(b.coin),
      )
  }
  const netral = rows.filter((r) => r.bias?.bias === 'NETRAL').length
  return {
    coins: ordered.slice(0, limit),
    moreWithDirection: Math.max(0, ordered.length - limit),
    netral,
    dataAt: res?.meta?.last_bar ?? rows[0]?.last_bar_close ?? null,
    computedAt: res?.meta?.computed_at ?? null,
    ranked: Boolean(ranking && ranking.length),
  }
}

// ── Screener fallback (accounts without Outlook access) ────────────────────

export interface ScreenerCoin {
  symbol: string
  coin: string
  href: string
  signal: AssetSummary['signal']
  score: number | null
  rank: number | null
}

export function topScreenerCoins(data: ScreenerResponse | undefined, limit = 3): ScreenerCoin[] {
  return (data?.summary?.top_3_assets ?? []).slice(0, limit).map((a) => ({
    symbol: a.symbol,
    coin: coinOf(a.symbol),
    href: coinHref(a.symbol),
    signal: a.signal,
    score: a.composite_score,
    rank: a.rank,
  }))
}

// ── Perlu perhatian ─────────────────────────────────────────────────────────

export type AttentionLevel = 'kritis' | 'penting' | 'info'

export interface AttentionItem {
  id: string
  level: AttentionLevel
  text: string
  /** Small second line (e.g. the bot facts that are not OK). */
  detail?: string
  href: string
  linkLabel: string
}

/** A fact of the bot verdict (lib/bot/status.ts BotFact): value + optional hint. */
export interface FactLike {
  label: string
  value: string
  hint?: string
  tone?: string
}

/** "Alert terakhir: 12 Nov 11:00 WIB (gagal)". */
export function factText(f: FactLike): string {
  return `${f.label}: ${f.value}${f.hint ? ` (${f.hint})` : ''}`
}

/** The bot verdict's lead ("Belum aman: …", "Perlu dicek: …") is dropped: the row's level says it. */
export function stripVerdictLead(sentence: string): string {
  const t = sentence.replace(/^(Belum aman|Perlu dicek|Menunggu data|Ya, aman):\s*/, '')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/**
 * 0–3 rows, most serious first: the live bot (the same verdict as /bot and
 * the Bot live card), paper presets that drift from their test, strategies
 * that just entered a position. A bot status that cannot be loaded is a
 * "penting" row (botVerdict says so), never a silent "all good".
 */
export function attentionItems(
  input: {
    /** botVerdict(...) from lib/bot/status.ts. */
    bot?: { tone: 'ok' | 'warn' | 'bad' | 'wait'; sentence: string; facts?: FactLike[] } | null
    arena?: ArenaReport
    outlook?: OutlookResponse
  },
  opts: { limit?: number; now?: number } = {},
): AttentionItem[] {
  const limit = opts.limit ?? 3
  const out: AttentionItem[] = []

  if (input.bot && (input.bot.tone === 'bad' || input.bot.tone === 'warn')) {
    const off = (input.bot.facts ?? []).filter((f) => f.tone === 'bad' || f.tone === 'warn')
    out.push({
      id: 'bot',
      level: input.bot.tone === 'bad' ? 'kritis' : 'penting',
      text: stripVerdictLead(input.bot.sentence),
      detail: off.length ? off.map(factText).join(' · ') : undefined,
      href: '/bot',
      linkLabel: 'Status bot',
    })
  }

  const drifting = (input.arena?.rows ?? []).filter((r) => r.drift?.status === 'menyimpang')
  if (drifting.length === 1) {
    const r = drifting[0]
    out.push({
      id: 'drift',
      level: 'penting',
      text: `Preset ${r.preset.label || r.preset.name} menyimpang dari hasil ujinya.`,
      href: '/lab/arena',
      linkLabel: 'Paper berjalan',
    })
  } else if (drifting.length > 1) {
    out.push({
      id: 'drift',
      level: 'penting',
      text: `${drifting.length} preset paper menyimpang dari hasil ujinya.`,
      href: '/lab/arena',
      linkLabel: 'Paper berjalan',
    })
  }

  const fresh = ((input.outlook?.rows ?? []) as RowV2[])
    .map((r) => toWatchCoin(r, opts.now))
    .filter((c): c is WatchCoin => Boolean(c && c.fresh))
  for (const c of fresh) {
    out.push({
      id: `fresh-${c.symbol}`,
      level: 'info',
      text: `${c.coin}: strategi baru masuk ${c.direction}${c.keyakinan ? ` (keyakinan ${c.keyakinan})` : ''}.`,
      href: c.href,
      linkLabel: c.coin,
    })
  }

  const order: Record<AttentionLevel, number> = { kritis: 0, penting: 1, info: 2 }
  return out.sort((a, b) => order[a.level] - order[b.level]).slice(0, limit)
}

// ── Paper & laporan ─────────────────────────────────────────────────────────

export interface PaperSummary {
  presets: number
  ready: number
  drifting: number
  target: number
  /** Preset closest to the review target. */
  leader: { name: string; closed: number } | null
}

export function paperSummary(a: ArenaReport | undefined): PaperSummary | null {
  if (!a) return null
  const rows = a.rows ?? []
  const target = a.review_min_trades || 30
  const leader = rows.reduce<{ name: string; closed: number } | null>((best, r) => {
    const closed = r.stats?.n_closed ?? 0
    return !best || closed > best.closed ? { name: r.preset.label || r.preset.name, closed } : best
  }, null)
  return {
    presets: rows.length,
    ready: rows.filter((r) => (r.stats?.n_closed ?? 0) >= target).length,
    drifting: rows.filter((r) => r.drift?.status === 'menyimpang').length,
    target,
    leader,
  }
}

/** Latest frozen week that is not the running one, or null. */
export function lastSnapshotWeek(weeks: ReportWeek[] | undefined): ReportWeek | null {
  const frozen = (weeks ?? []).filter((w) => w.snapshot && !w.current)
  frozen.sort((a, b) => String(b.start).localeCompare(String(a.start)))
  return frozen[0] ?? null
}

/** One or two short lines from a frozen weekly report; only sections that are available. */
export function reportLines(r: WeeklyReport | undefined): string[] {
  if (!r) return []
  const lines: string[] = []
  const p = r.sections?.paper
  if (p?.available && p.best && p.best.week_return_pct !== null) {
    lines.push(`Paper terbaik: ${p.best.preset} ${formatPct(p.best.week_return_pct, { signed: true })}`)
  }
  const lb = r.sections?.live_bot
  if (lb?.available && typeof lb.signals === 'number') {
    lines.push(`Bot live: ${lb.executed ?? 0} dari ${lb.orders ?? 0} order tereksekusi (${lb.signals} alert)`)
  }
  const lg = r.sections?.ledger
  if (lg?.available && typeof lg.signals_week === 'number') {
    lines.push(`${lg.signals_week} sinyal tercatat di rekam jejak`)
  }
  return lines.slice(0, 3)
}

/** "3–10 Nov" style range of a report week. */
export function weekRange(w: Pick<ReportWeek, 'start' | 'end'> | null | undefined): string | null {
  if (!w) return null
  const a = formatTime(w.start, { time: false, year: false })
  const b = formatTime(w.end, { time: false, year: false })
  return `${a} – ${b}`
}

export function unreadNotifications(items: LabNotification[] | undefined, limit = 3): LabNotification[] {
  return (items ?? []).filter((n) => !n.read).slice(0, limit)
}

// ── Asisten (automatic summary until the AI exists) ─────────────────────────

export interface SummaryItem {
  text: string
  evidence?: string
  at?: string
  href?: string
}

export function assistantSummary(p: {
  market?: string | null
  watch?: WatchList | null
  /** The "bot aman?" sentence (botVerdict in lib/bot/status.ts, same words as /bot). */
  bot?: { sentence: string } | null
  paper?: PaperSummary | null
}): SummaryItem[] {
  const items: SummaryItem[] = []
  if (p.market) items.push({ text: p.market, href: '/news' })
  const top = p.watch?.coins[0]
  if (top) {
    items.push({
      text: `Koin teratas: ${top.coin} ${top.direction}${top.keyakinan ? `, keyakinan ${top.keyakinan}` : ''}${top.fresh ? ', posisi baru' : ''}.`,
      evidence: top.peluang ?? undefined,
      at: p.watch?.dataAt ? `close 4H ${formatTime(p.watch.dataAt)}` : undefined,
      href: top.href,
    })
  } else if (p.watch) {
    items.push({ text: 'Tidak ada koin dengan arah LONG/SHORT saat ini; strategi menunggu sinyal.', href: '/koin' })
  }
  if (p.bot) items.push({ text: p.bot.sentence, href: '/bot' })
  if (p.paper && p.paper.presets > 0) {
    items.push({
      text: `Paper: ${p.paper.presets} preset berjalan, ${p.paper.ready} siap dinilai, ${p.paper.drifting} menyimpang.`,
      href: '/lab/arena',
    })
  }
  return items
}
