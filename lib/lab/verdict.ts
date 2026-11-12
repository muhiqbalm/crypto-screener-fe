/**
 * Honest headline verdict for a signal group (audit 2026-11-13 P3).
 *
 * "Terbukti" only when BOTH the raw 95 % interval of the mean move and the BTC-relative one
 * lie above zero. Raw above zero but BTC-relative not (or not available) means the move most
 * likely came from the market itself (e.g. shorts in a falling month): "searah pasar".
 * Accepts the Signal Ledger codes (positive / negative / inconclusive / insufficient), the
 * screener / report codes (terbukti / negatif / belum_terbukti / belum_cukup_data) and the
 * backend's own 'searah_pasar'. Negative stays negative: it is a warning, not a claim.
 */
import { formatTime } from '@/lib/utils/time'

export type HonestVerdict = 'terbukti' | 'searah_pasar' | 'negatif' | 'belum_terbukti' | 'belum_cukup_data'

const NORMAL: Readonly<Record<string, HonestVerdict>> = {
  positive: 'terbukti',
  terbukti: 'terbukti',
  negative: 'negatif',
  negatif: 'negatif',
  inconclusive: 'belum_terbukti',
  belum_terbukti: 'belum_terbukti',
  insufficient: 'belum_cukup_data',
  belum_cukup_data: 'belum_cukup_data',
  searah_pasar: 'searah_pasar',
}

/** Any verdict code (ledger, screener, report) → its Indonesian state; unknown → belum cukup data. */
export function normalizeVerdict(code: string | null | undefined): HonestVerdict {
  return NORMAL[code ?? ''] ?? 'belum_cukup_data'
}

/** Raw verdict + BTC-relative verdict → the one verdict the UI may show. */
export function honestVerdict(raw: string | null | undefined, relBtc: string | null | undefined): HonestVerdict {
  const r = normalizeVerdict(raw)
  if (r !== 'terbukti') return r
  return normalizeVerdict(relBtc) === 'terbukti' ? 'terbukti' : 'searah_pasar'
}

/**
 * Verdict of a row whose backend MAY already send the honest code plus the BTC-relative one
 * (weekly report): apply the rule when the BTC-relative verdict is present, otherwise trust
 * the code as sent (an older payload without the field cannot be judged here).
 */
export function rowVerdict(s: { verdict: string; verdict_raw?: string | null; verdict_rel_btc?: string | null }): HonestVerdict {
  if (s.verdict_rel_btc === undefined || s.verdict_rel_btc === null) return normalizeVerdict(s.verdict)
  return honestVerdict(s.verdict_raw ?? s.verdict, s.verdict_rel_btc)
}

export type VerdictTone = 'bullish' | 'bearish' | 'warn' | 'muted'

export const HONEST_VERDICT_COPY: Readonly<Record<HonestVerdict, { label: string; tone: VerdictTone; hint: string }>> = {
  terbukti: {
    label: 'Terbukti',
    tone: 'bullish',
    hint: 'Rentang ketidakpastian di atas nol, baik gerak mentah maupun dibanding BTC, sebelum biaya. Petunjuk, bukan jaminan.',
  },
  searah_pasar: {
    label: 'Searah pasar',
    tone: 'warn',
    hint: 'Rata-rata gerak searah sinyal positif, tapi dibanding BTC rentangnya mencakup nol: kemungkinan ikut arah pasar (sampel dari satu rezim pasar).',
  },
  negatif: {
    label: 'Negatif',
    tone: 'bearish',
    hint: 'Rentang ketidakpastian seluruhnya di bawah nol: sinyal ini cenderung salah arah (sebelum biaya).',
  },
  belum_terbukti: {
    label: 'Belum terbukti',
    tone: 'warn',
    hint: 'Rentang ketidakpastian masih mencakup nol: belum bisa dibedakan dari kebetulan.',
  },
  belum_cukup_data: {
    label: 'Belum cukup data',
    tone: 'muted',
    hint: 'Butuh minimal 10 sinyal yang sudah dinilai, tersebar di minimal 5 hari berbeda.',
  },
}

/** Order for counts and lists: strongest claim first. */
export const HONEST_VERDICT_ORDER: readonly HonestVerdict[] = ['terbukti', 'searah_pasar', 'negatif', 'belum_terbukti', 'belum_cukup_data']

/**
 * The plain caveat for "searah pasar": which market it has not been tested in.
 * direction 1 = long signals, -1 = short signals (0 / null = both or unknown).
 */
export function untestedMarket(direction: number | null | undefined): string {
  if (direction === -1) return 'belum teruji di pasar naik'
  if (direction === 1) return 'belum teruji di pasar turun'
  return 'belum teruji di kondisi pasar lain'
}

/** Full sentence for a "searah pasar" group, e.g. under a card or in a panel. */
export function searahPasarText(direction: number | null | undefined): string {
  return (
    'Rata-rata gerak searah sinyal positif, tapi dibanding BTC rentangnya mencakup nol: kemungkinan ikut arah pasar ' +
    `(sampel dari satu rezim pasar), ${untestedMarket(direction)}.`
  )
}

/** "15 Okt – 11 Nov" (WIB dates; year only when not the current year). null when unknown. */
export function samplePeriod(firstIso: string | null | undefined, lastIso: string | null | undefined): string | null {
  if (!firstIso || !lastIso) return null
  const a = formatTime(firstIso, { time: false })
  const b = formatTime(lastIso, { time: false })
  if (a === '—' || b === '—') return null
  return a === b ? a : `${a} – ${b}`
}

/** "96% rekonstruksi" (share of the sample rebuilt from history); null when unknown or none. */
export function rekonShare(nRekon: number | null | undefined, nSignals: number | null | undefined): string | null {
  if (typeof nRekon !== 'number' || typeof nSignals !== 'number' || nSignals <= 0 || nRekon <= 0) return null
  return `${Math.round((Math.min(nRekon, nSignals) / nSignals) * 100)}% rekonstruksi`
}
