import { formatScore } from '@/lib/utils/format'
import type { LabMetrics, LabParamValue } from '@/lib/api/types/lab'

export function num(m: LabMetrics | null | undefined, k: string): number | null {
  const v = m?.[k]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export function fmtDd(v: number | null): string {
  return v === null ? '—' : `−${formatScore(Math.abs(v), 1)}%`
}

export function fmtPf(v: number | null): string {
  return v === null ? '—' : formatScore(v)
}

export function fmtVal(v: LabParamValue | undefined): string {
  if (v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'on' : 'off'
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000)
  return v
}
