/**
 * Mock-only handlers for the Uji strategi pages (feat/ux-lab-uji). ONLY reachable when
 * NEXT_PUBLIC_USE_MOCK_DATA=true (lazy-imported via lib/mocks/lab.ts).
 *
 * lab-templates-families.json = backend public_schema() of donchian_breakout and
 * mean_reversion_range; lab-importance.json = backend src/lab/importance.py output per
 * template × timeframe (research snapshot 12 Nov, trimmed). Both generated from the backend code.
 */
import { ApiError } from '@/lib/api/errors'
import familiesJson from './lab-templates-families.json'
import importanceJson from './lab-importance.json'
import type { LabTemplate } from '@/lib/api/types/lab'

export const MOCK_FAMILY_TEMPLATES = familiesJson as unknown as LabTemplate[]
const IMPORTANCE = importanceJson as unknown as Record<string, unknown>

export function labUjiMock(method: string, seg: string[], qs: URLSearchParams): { hit: true; value: unknown } | null {
  if (method !== 'GET') return null
  if (seg[0] === 'templates' && seg[2] === 'importance') {
    const value = IMPORTANCE[`${seg[1]}|${qs.get('timeframe') ?? '4h'}`]
    if (!value) throw new ApiError('not_found', 404)
    return { hit: true, value }
  }
  if (seg[0] === 'holdout-lock') {
    const t = qs.get('template_id')
    const s = (qs.get('symbol') ?? '').toUpperCase()
    const tf = qs.get('timeframe')
    const locked = t === 'rosyade_family' && s === 'ETHUSDT' && tf === '4h'
    return {
      hit: true,
      value: {
        template_id: t, symbol: s, timeframe: tf, locked,
        holdout_start: locked ? '2025-07-15T00:00:00Z' : null, touches: locked ? 3 : 0,
        created_at: locked ? '2026-11-01T02:00:00Z' : null, last_touch_at: null, holdout_fraction: 0.2,
      },
    }
  }
  return null
}
