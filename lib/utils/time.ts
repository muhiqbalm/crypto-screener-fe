/**
 * Time formatting for the whole app. One rule (CEO decision K5): every time a
 * user reads is in WIB (UTC+7, no DST) with Indonesian month names, e.g.
 * "12 Nov 08:00 WIB". Never show a bare local time without a zone.
 *
 * All functions are pure and timezone-independent (they never read the
 * machine's TZ), so they render the same on the server, in the browser and in
 * tests. Inputs may be an ISO string, epoch seconds, epoch milliseconds or a
 * Date. ISO strings without an offset are treated as UTC (backend convention).
 *
 * Durations and timeframes are always written out: "4 jam", "1 hari".
 * "1h" is never used to mean a day.
 */

export const DASH = '—'
export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000
export const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] as const
export const WEEKDAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const

export type TimeInput = string | number | Date | null | undefined

const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Parses any supported time input into a Date, or null when missing/invalid.
 * Numbers below 1e12 are epoch seconds, otherwise epoch milliseconds.
 */
export function toDate(v: TimeInput): Date | null {
  if (v === null || v === undefined || v === '') return null
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return null
    return new Date(Math.abs(v) < 1e12 ? v * 1000 : v)
  }
  let s = v.trim()
  if (DATE_ONLY.test(s)) s = `${s}T00:00:00Z`
  else if (!HAS_ZONE.test(s)) s = `${s.replace(' ', 'T')}Z`
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

export interface WibParts {
  year: number
  /** 0-based month. */
  month: number
  day: number
  hour: number
  minute: number
  second: number
  /** 0 = Minggu. */
  weekday: number
}

/** Calendar fields of a moment as seen in WIB. */
export function wibParts(d: Date): WibParts {
  const w = new Date(d.getTime() + WIB_OFFSET_MS)
  return {
    year: w.getUTCFullYear(),
    month: w.getUTCMonth(),
    day: w.getUTCDate(),
    hour: w.getUTCHours(),
    minute: w.getUTCMinutes(),
    second: w.getUTCSeconds(),
    weekday: w.getUTCDay(),
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

export interface FormatTimeOptions {
  /** Show the date part ("12 Nov"). Default true. */
  date?: boolean
  /** Show the clock part ("08:00"). Default true. */
  time?: boolean
  /** Add seconds to the clock. Default false. */
  seconds?: boolean
  /** true = always, false = never, 'auto' (default) = only when not the current WIB year. */
  year?: boolean | 'auto'
  /** Append " WIB" when a clock is shown. Default true. */
  zone?: boolean
  /** Reference "now" (epoch ms) for year 'auto'. Default Date.now(). */
  now?: number
}

/**
 * "12 Nov 08:00 WIB" (default), "12 Nov 2025 08:00 WIB" (other year),
 * "12 Nov" (time: false), "08:00 WIB" (date: false). "—" when missing.
 */
export function formatTime(v: TimeInput, opts: FormatTimeOptions = {}): string {
  const d = toDate(v)
  if (!d) return DASH
  const { date = true, time = true, seconds = false, year = 'auto', zone = true, now } = opts
  const p = wibParts(d)
  const parts: string[] = []
  if (date) {
    const showYear = year === true || (year === 'auto' && p.year !== wibParts(new Date(now ?? Date.now())).year)
    parts.push(`${p.day} ${MONTHS_ID[p.month]}${showYear ? ` ${p.year}` : ''}`)
  }
  if (time) {
    parts.push(`${pad(p.hour)}:${pad(p.minute)}${seconds ? `:${pad(p.second)}` : ''}${zone ? ' WIB' : ''}`)
  }
  return parts.join(' ')
}

/** "12 Nov 2026" (year shown by default). */
export function formatDate(v: TimeInput, opts: { year?: boolean | 'auto'; now?: number } = {}): string {
  return formatTime(v, { time: false, year: opts.year ?? true, now: opts.now })
}

/** "08:00 WIB". */
export function formatClock(v: TimeInput, opts: { seconds?: boolean } = {}): string {
  return formatTime(v, { date: false, seconds: opts.seconds })
}

/** "12 Nov 2026 08:00:15 WIB": full timestamp for logs and audit trails. */
export function formatDateTime(v: TimeInput, opts: { seconds?: boolean; year?: boolean | 'auto'; now?: number } = {}): string {
  return formatTime(v, { seconds: opts.seconds ?? true, year: opts.year ?? true, now: opts.now })
}

/**
 * Relative age in Indonesian: "baru saja", "3 dtk lalu" (only with
 * `seconds`), "5 mnt lalu", "2 jam lalu", "3 hari lalu". Future times read
 * "dalam 5 mnt". Older than `absoluteAfterDays` (default 7) falls back to the
 * date ("12 Nov").
 */
export function formatAge(
  v: TimeInput,
  opts: { now?: number; seconds?: boolean; absoluteAfterDays?: number } = {},
): string {
  const d = toDate(v)
  if (!d) return DASH
  const now = opts.now ?? Date.now()
  const diff = now - d.getTime()
  const future = diff < 0
  const s = Math.abs(diff) / 1000
  const wrap = (txt: string) => (future ? `dalam ${txt}` : `${txt} lalu`)
  // Up to a minute "in the future" is clock skew / a stale `now`, not a future event.
  if (future && s < 60) return 'baru saja'
  if (s < 45) return opts.seconds && s >= 1 ? wrap(`${Math.round(s)} dtk`) : 'baru saja'
  const m = s / 60
  if (m < 60) return wrap(`${Math.max(1, Math.round(m))} mnt`)
  const h = m / 60
  if (h < 24) return wrap(`${Math.round(h)} jam`)
  const days = h / 24
  if (days >= (opts.absoluteAfterDays ?? 7)) return formatTime(d, { time: false, now })
  return wrap(`${Math.round(days)} hari`)
}

const UNIT_ID: Record<string, string> = {
  s: 'detik',
  m: 'menit',
  h: 'jam',
  d: 'hari',
  w: 'minggu',
  M: 'bulan',
}

/**
 * Splits "15m" / "4h" / "1d" / "1w" / "1M" into amount + unit. Lower-case
 * "m" is minutes and capital "M" is months (exchange convention); "H"/"D"/"W"
 * are accepted as hours/days/weeks.
 */
export function parseTimeframe(tf: string | null | undefined): { n: number; unit: 's' | 'm' | 'h' | 'd' | 'w' | 'M' } | null {
  if (!tf) return null
  const m = /^\s*(\d+)\s*([smhdwMHDW])\s*$/.exec(tf)
  if (!m) return null
  const raw = m[2]
  const unit = (raw === 'M' ? 'M' : raw.toLowerCase()) as 's' | 'm' | 'h' | 'd' | 'w' | 'M'
  return { n: Number(m[1]), unit }
}

/** "4h" → "4 jam", "15m" → "15 menit", "1d" → "1 hari", "1w" → "1 minggu". Unknown input is returned as-is. */
export function formatTimeframe(tf: string | null | undefined): string {
  if (!tf) return DASH
  const p = parseTimeframe(tf)
  return p ? `${p.n} ${UNIT_ID[p.unit]}` : tf
}

/**
 * Horizon of a check / projection: "4h" → "4 jam", "1d" → "1 hari",
 * "7d" → "7 hari". A number is read as hours (24 → "1 hari", 6 → "6 jam").
 */
export function formatHorizon(h: string | number | null | undefined): string {
  if (h === null || h === undefined || h === '') return DASH
  if (typeof h === 'number') return formatDuration(h * 3600_000)
  return formatTimeframe(h)
}

/**
 * Duration in ms → "45 dtk", "12 mnt", "3 jam", "3 jam 20 mnt", "2 hari",
 * "2 hari 4 jam". At most two units.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return DASH
  const s = Math.round(Math.abs(ms) / 1000)
  if (s < 60) return `${s} dtk`
  const totalMin = Math.round(s / 60)
  if (totalMin < 60) return `${totalMin} mnt`
  const hours = Math.floor(totalMin / 60)
  const restMin = totalMin % 60
  if (hours < 24) return restMin ? `${hours} jam ${restMin} mnt` : `${hours} jam`
  const totalHours = Math.round(s / 3600)
  const days = Math.floor(totalHours / 24)
  const restH = totalHours % 24
  return restH ? `${days} hari ${restH} jam` : `${days} hari`
}

/** Length of one candle in ms ("4h" → 14_400_000), or null when unknown. */
export function timeframeMs(tf: string | null | undefined): number | null {
  const p = parseTimeframe(tf)
  if (!p) return null
  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 7 * 86_400_000,
  }
  if (p.unit === 'M') return null // calendar months are not fixed-length
  return p.n * unitMs[p.unit]
}

/**
 * Next candle close after `from` for a timeframe whose candles are aligned
 * to UTC midnight (Binance convention: 4H closes at 00/04/08/12/16/20 UTC =
 * 07/11/15/19/23/03 WIB). Weekly candles close Monday 00:00 UTC.
 */
export function nextCandleClose(tf: string, from: TimeInput = Date.now()): Date | null {
  const ms = timeframeMs(tf)
  const d = toDate(from)
  if (!ms || !d) return null
  const t = d.getTime()
  if (parseTimeframe(tf)?.unit === 'w') {
    const MONDAY_EPOCH_OFFSET = 4 * 86_400_000 // 1970-01-01 was a Thursday
    return new Date(Math.floor((t - MONDAY_EPOCH_OFFSET) / ms) * ms + MONDAY_EPOCH_OFFSET + ms)
  }
  return new Date(Math.floor(t / ms) * ms + ms)
}
