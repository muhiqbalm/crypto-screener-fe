/**
 * Semantic tones shared by the v2 building blocks. One meaning per colour:
 * bullish/bearish = direction or result, warn = look at this, brand/info =
 * accent / information, lab = simulation, muted = neutral.
 */
export type Tone = 'brand' | 'bullish' | 'bearish' | 'warn' | 'info' | 'lab' | 'muted'

export const TONE_TEXT: Record<Tone, string> = {
  brand: 'text-brand',
  bullish: 'text-bullish',
  bearish: 'text-bearish',
  warn: 'text-warn',
  info: 'text-info',
  lab: 'text-lab',
  muted: 'text-muted-foreground',
}

/** Soft tinted background + matching text (icon chips, pills). */
export const TONE_SOFT: Record<Tone, string> = {
  brand: 'bg-brand/15 text-brand',
  bullish: 'bg-bullish/15 text-bullish',
  bearish: 'bg-bearish/15 text-bearish',
  warn: 'bg-warn/15 text-warn',
  info: 'bg-info/15 text-info',
  lab: 'bg-lab/15 text-lab',
  muted: 'bg-muted text-muted-foreground',
}

/** Solid fill (bars, dots). */
export const TONE_BG: Record<Tone, string> = {
  brand: 'bg-brand',
  bullish: 'bg-bullish',
  bearish: 'bg-bearish',
  warn: 'bg-warn',
  info: 'bg-info',
  lab: 'bg-lab',
  muted: 'bg-muted-foreground/50',
}

/** CSS colour value for SVG strokes/fills. */
export const TONE_VAR: Record<Tone, string> = {
  brand: 'var(--color-brand)',
  bullish: 'var(--color-bullish)',
  bearish: 'var(--color-bearish)',
  warn: 'var(--color-warn)',
  info: 'var(--color-info)',
  lab: 'var(--color-lab)',
  muted: 'var(--color-muted-foreground)',
}

/** Tone of a signed number: up = bullish, down = bearish, zero/missing = muted. */
export function signTone(v: number | null | undefined): Tone {
  if (v === null || v === undefined || !Number.isFinite(v) || v === 0) return 'muted'
  return v > 0 ? 'bullish' : 'bearish'
}
