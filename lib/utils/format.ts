/**
 * Number formatting for the whole app (CEO decision K5): exchange style
 * `1,234.56` everywhere (comma thousands, dot decimals), negative numbers with
 * the real minus sign "−" (U+2212), zero never gets a "+".
 * Never use `toLocaleString('id-ID')` or bare `toFixed` in JSX for numbers.
 *
 * All formatters return "—" (em dash) for null, undefined, NaN or ±Infinity.
 * Times live in ./time.ts (WIB, Indonesian months).
 */
import { formatDateTime } from './time'

const DASH = '—'

/** The minus sign used for every negative number in the UI. */
export const MINUS = '−'

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

/** Replaces a leading ASCII hyphen produced by Intl / toFixed with "−". */
function withMinus(s: string): string {
  return s.startsWith('-') ? `${MINUS}${s.slice(1)}` : s
}

/**
 * Returns "—" for null, undefined, or NaN; otherwise String(v).
 */
export function valueOrDash(v: unknown): string {
  if (v === null || v === undefined) return DASH
  if (typeof v === 'number' && isNaN(v)) return DASH
  return String(v)
}

const _nfCache = new Map<string, Intl.NumberFormat>()
function nf(minFrac: number, maxFrac: number, currency = false): Intl.NumberFormat {
  const key = `${minFrac}:${maxFrac}:${currency ? 'usd' : 'n'}`
  let f = _nfCache.get(key)
  if (!f) {
    f = new Intl.NumberFormat('en-US', {
      ...(currency ? { style: 'currency' as const, currency: 'USD' } : {}),
      minimumFractionDigits: minFrac,
      maximumFractionDigits: maxFrac,
    })
    _nfCache.set(key, f)
  }
  return f
}

/** Rounds to `digits` decimals and drops "-0". */
function roundTo(v: number, digits: number): number {
  const f = 10 ** digits
  const r = Math.round(v * f) / f
  return Object.is(r, -0) ? 0 : r
}

function signPrefix(rounded: number, signed: boolean): string {
  if (rounded < 0) return MINUS
  return signed && rounded > 0 ? '+' : ''
}

export interface NumberFormatOptions {
  /** Fixed number of decimals (sets min and max). Default 2. */
  digits?: number
  /** Minimum decimals (overrides `digits`). */
  minDigits?: number
  /** Maximum decimals (overrides `digits`). */
  maxDigits?: number
  /** Prefix positive values with "+". Zero never gets a sign. */
  signed?: boolean
}

/**
 * Plain number in exchange style: 1234.5 → "1,234.50", −3 → "−3.00".
 * `formatNumber(12500, { digits: 0 })` → "12,500".
 */
export function formatNumber(v: number | null | undefined, opts: NumberFormatOptions = {}): string {
  if (!isNum(v)) return DASH
  const digits = opts.digits ?? 2
  const min = opts.minDigits ?? (opts.maxDigits !== undefined ? 0 : digits)
  const max = Math.max(min, opts.maxDigits ?? digits)
  const r = roundTo(v, max)
  return `${signPrefix(r, Boolean(opts.signed))}${nf(min, max).format(Math.abs(r))}`
}

/** Integer count with thousands separators: 1234 → "1,234". */
export function formatCount(v: number | null | undefined): string {
  return formatNumber(v, { digits: 0 })
}

/**
 * Percentage of a value already in percent units (56.2 → "56.2%").
 * `signed: true` for changes/returns: "+1.2%", "−0.5%", zero "0.0%".
 * Default 1 decimal.
 */
export function formatPct(v: number | null | undefined, opts: { digits?: number; signed?: boolean } = {}): string {
  if (!isNum(v)) return DASH
  return `${formatNumber(v, { digits: opts.digits ?? 1, signed: opts.signed })}%`
}

/** R-multiple: 0.14 → "+0.14R", −0.02 → "−0.02R", 0 → "0.00R". */
export function formatR(v: number | null | undefined, digits = 2): string {
  if (!isNum(v)) return DASH
  return `${formatNumber(v, { digits, signed: true })}R`
}

/** Reward-to-risk ratio: 1.8 → "1.8 : 1". */
export function formatRR(v: number | null | undefined, digits = 1): string {
  if (!isNum(v)) return DASH
  return `${formatNumber(v, { digits })} : 1`
}

/** Basis points: 3.24 → "+3.2 bps" (signed by default). */
export function formatBps(v: number | null | undefined, opts: { digits?: number; signed?: boolean } = {}): string {
  if (!isNum(v)) return DASH
  return `${formatNumber(v, { digits: opts.digits ?? 1, signed: opts.signed ?? true })} bps`
}

/**
 * Formats a crypto PRICE as USD with enough precision to be useful for every
 * coin (crypto prices span 9 orders of magnitude):
 * - |v| >= 1000      → 2 decimals            ($67,420.50)
 * - 1 <= |v| < 1000  → 2–4 decimals, ~6 significant digits
 *                      ($2.3457, $12.3456, $145.123)
 * - |v| < 1          → 2–4 significant digits ($0.50, $0.1234, $0.00001234)
 * Trailing zeros are trimmed down to 2 decimals. Use `formatUsd` for money
 * amounts (balances, PnL, notional) which always have 2 decimals.
 * Returns "—" for null/undefined/NaN.
 */
export function formatPrice(v: number | null | undefined): string {
  if (!isNum(v)) return DASH

  const abs = Math.abs(v)
  if (abs >= 1000 || v === 0) {
    return withMinus(nf(2, 2, true).format(v))
  }
  if (abs >= 1) {
    const intDigits = Math.floor(Math.log10(abs)) + 1 // 1..3
    const maxDecimals = Math.min(4, Math.max(2, 6 - intDigits))
    return withMinus(nf(2, maxDecimals, true).format(v))
  }

  return withMinus(
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumSignificantDigits: 2,
      maximumSignificantDigits: 4,
    }).format(v),
  )
}

/**
 * Formats a MONEY amount (balance, equity, PnL, notional) in USD with exactly
 * 2 decimals. e.g. 1234.5 → "$1,234.50", -3.2 → "−$3.20".
 */
export function formatUsd(v: number | null | undefined): string {
  if (!isNum(v)) return DASH
  const r = roundTo(v, 2)
  return `${r < 0 ? MINUS : ''}${nf(2, 2, true).format(Math.abs(r))}`
}

/** Like formatUsd but always signed: +$12.30 / −$4.00 / $0.00. */
export function formatUsdSigned(v: number | null | undefined): string {
  if (!isNum(v)) return DASH
  const r = roundTo(v, 2)
  return `${signPrefix(r, true)}${nf(2, 2, true).format(Math.abs(r))}`
}

/**
 * Formats a quantity / contract size without float noise
 * (0.30000000000000004 → "0.3"), up to 8 decimals, grouped thousands.
 */
export function formatQty(v: number | null | undefined): string {
  if (!isNum(v)) return DASH
  return withMinus(new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 }).format(v))
}

/**
 * Display form of an exchange symbol: "BTC/USDT:USDT" → "BTC/USDT",
 * "ETHUSDT" stays "ETHUSDT".
 */
export function displaySymbol(sym: string | null | undefined): string {
  if (!sym) return DASH
  return sym.replace(/:USDT$/, '')
}

const USD_STABLES = new Set(['USDT', 'USDC', 'BUSD', 'FDUSD', 'TUSD', 'DAI', 'USD'])

/** True for USD-pegged currencies whose amount can be shown/summed as USD. */
export function isUsdStable(currency: string | null | undefined): boolean {
  return !!currency && USD_STABLES.has(currency.toUpperCase())
}

/**
 * Formats a wallet AMOUNT in its own currency: stablecoins as "$1,234.50",
 * everything else as "0.0315 BTC" (never pretend a BTC amount is dollars).
 */
export function formatAmount(v: number | null | undefined, currency: string): string {
  if (!isNum(v)) return DASH
  return isUsdStable(currency) ? formatUsd(v) : `${formatQty(v)} ${currency.toUpperCase()}`
}

/** Base asset of a USDT-M symbol: "BTC/USDT:USDT" → "BTC". */
export function baseAsset(sym: string): string {
  return sym.replace('/USDT:USDT', '').replace(':USDT', '')
}

/**
 * Coin name for display from any symbol form: "ETHUSDT", "ETH/USDT",
 * "ETH/USDT:USDT" → "ETH". "1000PEPEUSDT" → "1000PEPE".
 */
export function coinOf(sym: string | null | undefined): string {
  if (!sym) return DASH
  return sym.replace(/:USDT$/, '').replace(/\/USDT$/, '').replace(/USDT$/, '') || sym
}

/** Tailwind text colour for a signed value (green / red / neutral). */
export function signClass(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v) || v === 0) return 'text-foreground'
  return v > 0 ? 'text-bullish' : 'text-bearish'
}

/**
 * Formats a number as a percentage with a leading "+" or "−" sign.
 * - Produces exactly `fractionDigits` decimal places.
 * - Example: formatPercent(1.234) → "+1.23%"
 * - Example: formatPercent(-0.5) → "−0.50%"
 * - Zero has no sign: "0.00%".
 * - Returns "—" for null/undefined/NaN.
 * Prefer `formatPct(v, { signed: true })` in new code.
 */
export function formatPercent(v: number | null | undefined, fractionDigits = 2): string {
  return formatPct(v, { digits: fractionDigits, signed: true })
}

/**
 * Formats a large number with K/M/B suffixes.
 * - e.g. 1_500_000 → "$1.50M", −2_000 → "−$2.00K"
 * - Returns "—" for null/undefined/NaN.
 */
export function formatVolume(v: number | null | undefined): string {
  if (!isNum(v)) return DASH

  const abs = Math.abs(v)
  const sign = v < 0 ? MINUS : ''

  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(2)}K`
  return `${sign}$${abs.toFixed(2)}`
}

/** Compact USD with a sign for flows: +$1.2M / −$350K / $0. 1 decimal. */
export function formatUsdCompact(v: number | null | undefined, opts: { signed?: boolean } = {}): string {
  if (!isNum(v)) return DASH
  const abs = Math.abs(v)
  const sign = v < 0 ? MINUS : opts.signed && v > 0 ? '+' : ''
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`
  return `${sign}$${abs.toFixed(0)}`
}

/**
 * Formats a funding rate with 4 decimal places and a sign.
 * The backend (src/data/fetcher.py fetch_funding_rate) already returns the
 * rate in PERCENT units (Binance 0.0001 -> 0.01), so no scaling is applied.
 * - Example: formatFunding(0.01) → "+0.0100%"
 * - Returns "—" for null/undefined/NaN.
 */
export function formatFunding(v: number | null | undefined): string {
  return formatPct(v, { digits: 4, signed: true })
}

/**
 * Formats a composite score as a fixed-decimal number (default 2 places).
 * - Example: formatScore(7.5) → "7.50"
 * - Returns "—" for null/undefined/NaN.
 */
export function formatScore(v: number | null | undefined, fractionDigits = 2): string {
  if (!isNum(v)) return DASH
  return withMinus(roundTo(v, fractionDigits).toFixed(fractionDigits))
}

/**
 * Full timestamp in WIB for logs and tables: "12 Nov 2026 08:00:15 WIB".
 * Kept for existing callers; new code uses `formatTime` from ./time.
 * Returns "—" for null/undefined/empty/invalid input.
 */
export function formatTimestamp(v: string | null | undefined): string {
  return formatDateTime(v)
}
