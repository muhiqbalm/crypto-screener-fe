/**
 * Fear & Greed (alternative.me) as an honest 5-zone scale (pure, no React).
 *
 * The index is context, not direction, so the zones never use the up/down colours:
 * the two extremes are "worth a look" (warn), fear / greed are plain info, neutral is muted.
 * The zone label prefers the source's own classification; the numeric bands are only a
 * fallback when the classification is missing.
 */

export type FngZoneKey = 'sangat_takut' | 'takut' | 'netral' | 'serakah' | 'sangat_serakah'
export type FngTone = 'warn' | 'info' | 'muted'

export interface FngZone {
  key: FngZoneKey
  label: string
  /** Inclusive band used only when the source gives no classification. */
  from: number
  to: number
  tone: FngTone
}

export const FNG_ZONES: readonly FngZone[] = [
  { key: 'sangat_takut', label: 'Sangat takut', from: 0, to: 24, tone: 'warn' },
  { key: 'takut', label: 'Takut', from: 25, to: 46, tone: 'info' },
  { key: 'netral', label: 'Netral', from: 47, to: 54, tone: 'muted' },
  { key: 'serakah', label: 'Serakah', from: 55, to: 75, tone: 'info' },
  { key: 'sangat_serakah', label: 'Sangat serakah', from: 76, to: 100, tone: 'warn' },
]

const BY_CLASS: Record<string, FngZoneKey> = {
  'extreme fear': 'sangat_takut',
  fear: 'takut',
  neutral: 'netral',
  greed: 'serakah',
  'extreme greed': 'sangat_serakah',
}

export function clampFng(v: number): number {
  return Math.min(100, Math.max(0, v))
}

/** Zone of a reading: the source classification first, the numeric band as fallback. */
export function fngZone(value: number | null | undefined, classification?: string | null): FngZone | null {
  const byClass = classification ? BY_CLASS[classification.trim().toLowerCase()] : undefined
  if (byClass) return FNG_ZONES.find((z) => z.key === byClass) ?? null
  if (value === null || value === undefined || !Number.isFinite(value)) return null
  const v = Math.round(clampFng(value))
  return FNG_ZONES.find((z) => v >= z.from && v <= z.to) ?? null
}

/** "takut (38 dari 100)" — lower-case zone for use inside a sentence. */
export function fngPhrase(value: number | null | undefined, classification?: string | null): string | null {
  const z = fngZone(value, classification)
  if (!z || value === null || value === undefined || !Number.isFinite(value)) return null
  return `${z.label.toLowerCase()} (${Math.round(clampFng(value))} dari 100)`
}
