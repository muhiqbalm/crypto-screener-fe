/**
 * Formatting utilities for the Crypto Screener Dashboard.
 * All numeric formatters return "—" (em dash) for null, undefined, or NaN.
 */

const DASH = "—";

/**
 * Returns "—" for null, undefined, or NaN; otherwise String(v).
 */
export function valueOrDash(v: unknown): string {
  if (v === null || v === undefined) return DASH;
  if (typeof v === "number" && isNaN(v)) return DASH;
  return String(v);
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
  if (v === null || v === undefined || isNaN(v)) return DASH;

  const abs = Math.abs(v);
  if (abs >= 1000 || v === 0) {
    return usd(2, 2).format(v);
  }
  if (abs >= 1) {
    const intDigits = Math.floor(Math.log10(abs)) + 1; // 1..3
    const maxDecimals = Math.min(4, Math.max(2, 6 - intDigits));
    return usd(2, maxDecimals).format(v);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumSignificantDigits: 2,
    maximumSignificantDigits: 4,
  }).format(v);
}

const _usdCache = new Map<string, Intl.NumberFormat>();
function usd(minFrac: number, maxFrac: number): Intl.NumberFormat {
  const key = `${minFrac}:${maxFrac}`;
  let f = _usdCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: minFrac,
      maximumFractionDigits: maxFrac,
    });
    _usdCache.set(key, f);
  }
  return f;
}

/**
 * Formats a MONEY amount (balance, equity, PnL, notional) in USD with exactly
 * 2 decimals. e.g. 1234.5 → "$1,234.50", -3.2 → "-$3.20".
 */
export function formatUsd(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) return DASH;
  return usd(2, 2).format(v);
}

/** Like formatUsd but always signed: +$12.30 / -$4.00 / $0.00. */
export function formatUsdSigned(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) return DASH;
  const body = usd(2, 2).format(Math.abs(v));
  return `${v > 0 ? "+" : v < 0 ? "-" : ""}${body}`;
}

/**
 * Formats a quantity / contract size without float noise
 * (0.30000000000000004 → "0.3"), up to 8 decimals, grouped thousands.
 */
export function formatQty(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) return DASH;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 }).format(v);
}

/**
 * Display form of an exchange symbol: "BTC/USDT:USDT" → "BTC/USDT",
 * "ETHUSDT" stays "ETHUSDT".
 */
export function displaySymbol(sym: string | null | undefined): string {
  if (!sym) return DASH;
  return sym.replace(/:USDT$/, "");
}

/** Base asset of a USDT-M symbol: "BTC/USDT:USDT" → "BTC". */
export function baseAsset(sym: string): string {
  return sym.replace("/USDT:USDT", "").replace(":USDT", "");
}

/** Tailwind text colour for a signed value (green / red / neutral). */
export function signClass(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v) || v === 0) return "text-foreground";
  return v > 0 ? "text-bullish" : "text-bearish";
}

/**
 * Formats a number as a percentage with a leading "+" or "-" sign.
 * - Produces exactly `fractionDigits` decimal places.
 * - Example: formatPercent(1.234) → "+1.23%"
 * - Example: formatPercent(-0.5) → "-0.50%"
 * - Returns "—" for null/undefined/NaN.
 */
export function formatPercent(
  v: number | null | undefined,
  fractionDigits = 2
): string {
  if (v === null || v === undefined || isNaN(v)) return DASH;

  const formatted = Math.abs(v).toFixed(fractionDigits);
  const sign = v > 0 ? "+" : v < 0 ? "-" : "+";
  return `${sign}${formatted}%`;
}

/**
 * Formats a large number with K/M/B suffixes.
 * - e.g. 1_500_000 → "$1.50M"
 * - Returns "—" for null/undefined/NaN.
 */
export function formatVolume(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) return DASH;

  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(2)}K`;
  }
  return `${sign}$${abs.toFixed(2)}`;
}

/**
 * Formats a funding rate with 4 decimal places and a sign.
 * The backend (src/data/fetcher.py fetch_funding_rate) already returns the
 * rate in PERCENT units (Binance 0.0001 -> 0.01), so no scaling is applied.
 * - Example: formatFunding(0.01) → "+0.0100%"
 * - Returns "—" for null/undefined/NaN.
 */
export function formatFunding(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) return DASH;

  const sign = v > 0 ? "+" : v < 0 ? "-" : "+";
  return `${sign}${Math.abs(v).toFixed(4)}%`;
}

/**
 * Formats a composite score as a fixed-decimal number (default 2 places).
 * - Example: formatScore(7.5) → "7.50"
 * - Returns "—" for null/undefined/NaN.
 */
export function formatScore(
  v: number | null | undefined,
  fractionDigits = 2
): string {
  if (v === null || v === undefined || isNaN(v)) return DASH;
  return v.toFixed(fractionDigits);
}

/**
 * Formats an ISO 8601 timestamp string as "YYYY-MM-DD HH:mm:ss" in the
 * user's local timezone using Intl.DateTimeFormat.
 * - Returns "—" for null/undefined/empty string.
 */
export function formatTimestamp(v: string | null | undefined): string {
  if (!v) return DASH;

  const date = new Date(v);
  if (isNaN(date.getTime())) return DASH;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Extract individual parts and assemble into YYYY-MM-DD HH:mm:ss
  const parts = formatter.formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  const second = get("second");

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}
