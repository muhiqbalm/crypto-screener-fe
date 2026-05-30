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
 * Formats a price as USD.
 * - Values >= 1: 2 decimal places (e.g. "$1,234.56")
 * - Values < 1: up to 6 significant decimal places (e.g. "$0.000123")
 * - Returns "—" for null/undefined/NaN.
 */
export function formatPrice(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) return DASH;

  if (Math.abs(v) >= 1) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);
  }

  // For values < 1, use up to 6 decimal places
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(v);
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
 * Formats a funding rate as a percentage with 4 decimal places and a sign.
 * - Example: formatFunding(0.0001) → "+0.0100%"
 * - Returns "—" for null/undefined/NaN.
 */
export function formatFunding(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) return DASH;

  // Funding rate is typically expressed as a decimal (e.g. 0.0001 = 0.01%)
  // Multiply by 100 to get percentage value
  const pct = v * 100;
  const sign = pct > 0 ? "+" : pct < 0 ? "-" : "+";
  return `${sign}${Math.abs(pct).toFixed(4)}%`;
}

/**
 * Formats a composite score as a fixed 2 decimal places number.
 * - Example: formatScore(7.5) → "7.50"
 * - Returns "—" for null/undefined/NaN.
 */
export function formatScore(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) return DASH;
  return v.toFixed(2);
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
