/**
 * Skor kualitas sinyal: pure helpers for the letter A–D on Peluang koin, the coin page and
 * "Rekam jejak skor". The letter itself is computed by the backend (src/lab/outlook/quality.py);
 * this file only names, orders, filters and explains it.
 */
import { formatCount, formatR } from '@/lib/utils/format'
import type { Tone } from '@/lib/lab/outlook'
import type { OutlookRow } from '@/lib/api/types/outlook'
import type { QualityCheck, QualityEvidence, QualityGrade, ScoreGroup, StoredGrade } from '@/lib/api/types/quality'

export const GRADES: QualityGrade[] = ['A', 'B', 'C', 'D']
export const GRADE_LABEL: Record<QualityGrade, string> = {
  A: 'Bukti kuat',
  B: 'Bukti cukup',
  C: 'Belum jelas',
  D: 'Tanpa keunggulan',
}
/** One short line per letter (filter chips, legend). */
export const GRADE_HINT: Record<QualityGrade, string> = {
  A: 'Batas bawah kasus serupa ≥ +0.05R dari ≥ 100 posisi.',
  B: 'Kasus serupa untung, rentangnya di atas nol.',
  C: 'Rata-rata positif, tapi rentangnya masih mencakup nol.',
  D: 'Kasus serupa rata-rata rugi atau impas.',
}
export const GRADE_TONE: Record<QualityGrade, Tone> = { A: 'bullish', B: 'info', C: 'warn', D: 'bearish' }
const RANK: Record<QualityGrade, number> = { A: 4, B: 3, C: 2, D: 1 }

export function isGrade(g: unknown): g is QualityGrade {
  return g === 'A' || g === 'B' || g === 'C' || g === 'D'
}

export function gradeOf(r: Pick<OutlookRow, 'kualitas'> | null | undefined): QualityGrade | null {
  const g = r?.kualitas?.grade
  return isGrade(g) ? g : null
}

export function gradeRank(g: StoredGrade | undefined): number {
  return isGrade(g) ? RANK[g] : 0
}

/**
 * "Peluang terbaik" = calls whose evidence supports acting: letter A or B. On a backend
 * without the letter (older deploy) it falls back to the peluang label, as before.
 */
export function isBestCall(r: OutlookRow): boolean {
  if (r.kualitas !== undefined) {
    const g = gradeOf(r)
    return g === 'A' || g === 'B'
  }
  return r.peluang?.label === 'positif'
}

export function agreeWord(c: Pick<QualityCheck, 'agree' | 'available'>): string {
  if (!c.available) return 'tidak tersedia'
  return c.agree > 0 ? 'searah' : c.agree < 0 ? 'berlawanan' : 'netral'
}

/** "dihitung" (proven, counts) vs "tidak dihitung" (unproven: shown, never moves the letter). */
export function checkStatus(c: QualityCheck): { counted: boolean; text: string } {
  if (c.proven) {
    return { counted: true, text: c.effect < 0 ? `terbukti (${c.source}) · menurunkan skor` : `terbukti (${c.source})` }
  }
  return { counted: false, text: 'belum terbukti · tidak dihitung' }
}

/** Range of the average: "+0.08R s/d +0.20R" (95%). */
export function rangeText(ev: Pick<QualityEvidence, 'lo95_r' | 'hi95_r'> | null | undefined): string | null {
  if (!ev || ev.lo95_r === null || ev.hi95_r === null || ev.lo95_r === undefined || ev.hi95_r === undefined) return null
  return `${formatR(ev.lo95_r)} s/d ${formatR(ev.hi95_r)}`
}

/** Short evidence line for cards: "3,435 kasus serupa · +0.14R ±0.06R". */
export function evidenceShort(ev: QualityEvidence | null | undefined): string | null {
  if (!ev || !ev.n_cases) return null
  const half = ev.half_r !== null && ev.half_r !== undefined ? ` ±${Math.abs(ev.half_r).toFixed(2)}R` : ''
  return `${formatCount(ev.n_cases)} kasus serupa · ${formatR(ev.mean_r)}${half}`
}

/**
 * Where a range sits on a fixed −0.5R … +0.5R axis, for the small range bar (0..100%).
 * Values beyond the axis are clamped so a wide range still draws.
 */
export function rangeBar(ev: Pick<QualityEvidence, 'lo95_r' | 'hi95_r' | 'mean_r'> | null | undefined, span = 0.5) {
  if (!ev || ev.mean_r === null || ev.mean_r === undefined) return null
  const pos = (v: number) => Math.max(0, Math.min(100, ((v + span) / (2 * span)) * 100))
  const lo = ev.lo95_r ?? ev.mean_r
  const hi = ev.hi95_r ?? ev.mean_r
  return { lo: pos(lo), hi: pos(hi), mean: pos(ev.mean_r), zero: pos(0) }
}

/** Plain verdict for one letter's live record. */
export function scoreVerdictText(g: ScoreGroup, need: number): string {
  if (!g.n_calls) return 'Belum ada panggilan dengan skor ini.'
  if (!g.n_done) return `${formatCount(g.n_calls)} panggilan, belum ada yang selesai.`
  if (!g.enough) return `Belum cukup data: ${formatCount(g.n_pos)} dari ${formatCount(need)} posisi selesai.`
  if (g.verdict === 'positif') return 'Terbukti untung di data live.'
  if (g.verdict === 'negatif') return 'Rugi di data live: skor ini perlu ditinjau.'
  return 'Belum berbeda nyata dari nol.'
}

/** Sort helper: letter first (A → D, none last), then the server's Peluang rank. */
export function qualitySortValue(r: OutlookRow): number | null {
  if (r.unavailable) return null
  const g = gradeOf(r)
  if (!g) return null
  const rank = r.peluang?.rank ?? 999
  return RANK[g] * 1000 - rank
}
