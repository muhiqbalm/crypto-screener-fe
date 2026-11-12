import type { ArenaRow } from '@/lib/api/types/arena'
import type {
  BasketCoin,
  BasketCoinStatus,
  BasketFidelity,
  BasketGate,
  BasketOutcome,
  BasketRow,
  BasketSizing,
} from '@/lib/api/types/basket'
import { formatCount, formatNumber, formatPct } from '@/lib/utils/format'
import { formatTime, timeframeMs } from '@/lib/utils/time'

/**
 * Basket paper strategies: one default strategy on a fixed, pre-registered coin list, one
 * simulated account (docs/riset-2026-11-12/08-praregistrasi-basket.md). Pure helpers for the
 * Paper berjalan klasemen, the basket sheet and the Preset page. Plain Indonesian, numbers
 * 1,234.56, times WIB; outcomes come from the backend (the rules are applied there).
 */

export type BasketTone = 'bullish' | 'bearish' | 'warn' | 'info' | 'lab' | 'muted'

/** `/lab/arena?basket=<id>` opens that basket's sheet (links from the bell and the Preset page). */
export const BASKET_PARAM = 'basket'

export function parseBasketParam(v: string | null | undefined): number | null {
  return v && /^\d{1,9}$/.test(v) && Number(v) > 0 ? Number(v) : null
}

export const basketHref = (id: number) => `/lab/arena?${BASKET_PARAM}=${encodeURIComponent(String(id))}`

export const OUTCOME_COPY: Record<BasketOutcome, { label: string; tone: BasketTone; hint: string }> = {
  BELUM: { label: 'Mengumpulkan data', tone: 'muted', hint: 'Belum waktunya dinilai: syarat checkpoint belum terpenuhi.' },
  LANJUT: { label: 'Lanjut ke 60 transaksi', tone: 'info', hint: 'PF antara 1.0 dan 1.2: belum terbukti, paper diteruskan sampai 60 transaksi.' },
  LULUS: { label: 'Lulus tahap ini', tone: 'bullish', hint: 'PF ≥ 1.2, turun terdalam dalam batas, dan paper cocok dengan engine. Lanjut paper, bukan izin live.' },
  GAGAL: { label: 'Gagal', tone: 'bearish', hint: 'Memenuhi syarat gagal di praregistrasi.' },
  TIDAK_SAH: { label: 'Tidak sah (proses)', tone: 'warn', hint: 'Paper tidak setia pada engine, jadi hasilnya belum bisa dipakai menilai strategi.' },
  TIDAK_CUKUP_DATA: { label: 'Tidak cukup data', tone: 'warn', hint: 'Checkpoint 1 tidak tercapai dalam 12 minggu.' },
}

export const COIN_STATUS_COPY: Record<BasketCoinStatus, { label: string; tone: BasketTone }> = {
  posisi_terbuka: { label: 'Posisi terbuka', tone: 'lab' },
  menunggu_sinyal_baru: { label: 'Menunggu sinyal baru', tone: 'info' },
  menunggu_sinyal: { label: 'Menunggu sinyal', tone: 'muted' },
  belum_dihitung: { label: 'Belum dihitung', tone: 'muted' },
  error: { label: 'Error', tone: 'warn' },
  paper_mati: { label: 'Paper mati', tone: 'warn' },
  watch_hilang: { label: 'Pantauan hilang', tone: 'bearish' },
}

const SIDE_WORD: Record<string, string> = { long: 'LONG', short: 'SHORT' }

/**
 * The strategy already held a position when paper started (it is not copied; paper waits for
 * the next signal). Shown wherever a watch has such a position, so 0 trades does not look broken.
 * The time is the fill: the close of the signal bar, in WIB.
 */
export function prePaperHint(
  sp: { side: string | null; entry_time: string | null; opened_before_paper: boolean; mirrored: boolean } | null | undefined,
  timeframe: string,
): string | null {
  if (!sp || !sp.opened_before_paper || sp.mirrored || !sp.entry_time) return null
  const start = Date.parse(sp.entry_time)
  if (!Number.isFinite(start)) return null
  const side = SIDE_WORD[sp.side ?? ''] ?? 'terbuka'
  return `Strategi sedang punya posisi ${side} sejak ${formatTime(start + (timeframeMs(timeframe) ?? 0))} (sebelum paper dimulai), paper menunggu sinyal berikutnya.`
}

export interface GateItem {
  key: 'trades' | 'days' | 'coins' | 'entry_days'
  label: string
  have: number
  need: number
  done: boolean
}

/** The four checkpoint-1 conditions (praregistrasi §6), in reading order. */
export function gateItems(g: BasketGate): GateItem[] {
  const days = Math.floor(g.days)
  return [
    { key: 'trades', label: 'Transaksi tertutup', have: g.trades, need: g.need_trades, done: g.trades >= g.need_trades },
    { key: 'days', label: 'Hari berjalan', have: days, need: g.need_days, done: g.days >= g.need_days },
    { key: 'coins', label: 'Koin berbeda', have: g.coins, need: g.need_coins, done: g.coins >= g.need_coins },
    { key: 'entry_days', label: 'Hari entry berbeda', have: g.entry_days, need: g.need_entry_days, done: g.entry_days >= g.need_entry_days },
  ]
}

/** "Risiko 0.25% saldo per transaksi" / "Modal dibagi 28 koin, ukuran ikut gejolak (VT60)". */
export function sizingText(s: BasketSizing, label = ''): string {
  if (s.mode === 'risk') return `Risiko ${formatNumber(s.risk_pct, { digits: 2 })}% saldo per transaksi`
  if (s.mode === 'slot_engine') {
    return `Modal dibagi ${formatCount(s.slots)} koin, ukuran ${/vt\d+/i.test(label) ? `ikut gejolak (${label.match(/vt\d+/i)![0].toUpperCase()})` : 'dari engine'}`
  }
  return `Modal dibagi ${formatCount(s.slots)} koin, ${formatNumber(s.notional_x ?? null)}× per koin`
}

const COIN_RANK: Record<BasketCoinStatus, number> = {
  watch_hilang: 0,
  paper_mati: 0,
  error: 0,
  posisi_terbuka: 1,
  menunggu_sinyal: 2,
  menunggu_sinyal_baru: 2,
  belum_dihitung: 3,
}

/** Problems first, then open positions, then the coins with most trades, then by name. */
export function sortCoins(coins: readonly BasketCoin[]): BasketCoin[] {
  return [...coins].sort((a, b) => COIN_RANK[a.status] - COIN_RANK[b.status] || b.trades - a.trades || a.coin.localeCompare(b.coin))
}

const pf = (v: number | null, inf = false) => (inf ? '∞' : v === null ? '—' : formatNumber(v))

export const INVALID_REASON_COPY: Record<string, string> = {
  cakupan: 'kurang dari 90% sinyal engine diikuti paper',
  selisih_hasil: 'selisih hasil paper vs engine lebih dari 0.30 poin %',
  keputusan_beda: 'keputusan dari transaksi engine berbeda',
  acuan_dd_tidak_ada: 'angka acuan turun terdalam belum tersimpan',
}

/** One sentence + tone for a basket: what the pre-registered rules say right now. */
export function basketAnswer(row: BasketRow): { tone: BasketTone; text: string } {
  const ev = row.evaluation
  const cp = ev.checkpoints[ev.checkpoints.length - 1]
  const n = row.progress.n
  if (ev.kill) {
    return {
      tone: 'bearish',
      text: `Rem darurat aktif: equity turun ${formatPct(ev.kill.dd_pct ?? null, { digits: 1 })} dari puncak. Basket berhenti membuka posisi dan dinilai Gagal.`,
    }
  }
  switch (ev.status) {
    case 'GAGAL':
      return { tone: 'bearish', text: `Checkpoint ${cp?.checkpoint ?? 1}: Gagal (PF ${pf(cp?.pf ?? null, cp?.pf_infinite)}, ${formatCount(cp?.trades ?? n)} transaksi).` }
    case 'LULUS':
      return {
        tone: 'bullish',
        text: `Checkpoint ${cp?.checkpoint ?? 1}: lulus (PF ${pf(cp?.pf ?? null, cp?.pf_infinite)}, ${formatCount(cp?.trades ?? n)} transaksi). Paper diteruskan; ini bukan izin live.`,
      }
    case 'LANJUT':
      return { tone: 'info', text: `Checkpoint 1: PF ${pf(cp?.pf ?? null, cp?.pf_infinite)}, belum terbukti. Paper diteruskan sampai 60 transaksi.` }
    case 'TIDAK_SAH': {
      const why = (cp?.invalid_reasons ?? []).map((r) => INVALID_REASON_COPY[r] ?? r).join(', ')
      return { tone: 'warn', text: `Checkpoint ${cp?.checkpoint ?? 1} tidak sah${why ? `: ${why}` : ''}. Proses diperbaiki dulu, lalu basket dimulai ulang.` }
    }
    case 'TIDAK_CUKUP_DATA':
      return { tone: 'warn', text: 'Syarat checkpoint 1 tidak tercapai dalam 12 minggu. Strategi belum bisa dinilai.' }
    default:
      break
  }
  if (n === 0) {
    const w = row.waiting.n
    return {
      tone: 'muted',
      text: w
        ? `Belum ada transaksi tertutup. ${formatCount(w)} koin masih memegang posisi dari sebelum paper dimulai; paper menunggu sinyal baru.`
        : `Belum ada transaksi tertutup; paper menunggu sinyal baru di ${formatCount(row.basket.n_coins)} koin.`,
    }
  }
  const of = `${formatCount(n)}/${formatCount(row.progress.of)} transaksi dari ${formatCount(row.gate.coins)} koin`
  if (ev.next?.due) return { tone: 'info', text: `${of}. Checkpoint ${ev.next.checkpoint} dijadwalkan ${formatTime(ev.next.due, { time: false })}.` }
  if (ev.next) return { tone: 'muted', text: `${of}. Penilaian paling cepat ${formatTime(ev.next.earliest, { time: false })}.` }
  return { tone: 'muted', text: `${of}.` }
}

/** "12/12 sinyal engine diikuti paper, selisih hasil median 0.04 poin %." */
export function fidelityText(f: BasketFidelity): string {
  if (!f.expected) return 'Belum ada sinyal engine sejak paper dimulai.'
  const diff = f.median_abs_diff_pp === null ? '' : `, selisih hasil median ${formatNumber(f.median_abs_diff_pp, { digits: 2 })} poin %`
  return `${formatCount(f.matched)}/${formatCount(f.expected)} sinyal engine diikuti paper${diff}.`
}

export const SKIP_REASON_COPY: Record<string, string> = {
  sebelum_mulai: 'sinyal dari sebelum paper dimulai',
  basket_berhenti: 'basket berhenti (rem darurat)',
  rem_darurat: 'rem darurat aktif',
  saldo_habis: 'saldo habis',
  stop_tidak_valid: 'stop strategi tidak valid',
  ukuran_engine_tidak_ada: 'ukuran dari engine tidak ada',
  cap_total: 'batas notional total',
  cap_posisi: 'batas notional per posisi',
  sizing_error: 'error saat menghitung ukuran',
  tidak_tercatat: 'tidak tercatat (perlu dicek)',
}

export function skipReasonLabel(reason: string): string {
  if (SKIP_REASON_COPY[reason]) return SKIP_REASON_COPY[reason]
  if (reason.startsWith('paper_error')) return 'paper menolak posisi (harga sudah lewat stop)'
  return reason.replace(/_/g, ' ')
}

// ── klasemen: presets and baskets in one list ───────────────────────────────

export type KlasemenEntry = { kind: 'preset'; key: string; row: ArenaRow; ret: number | null } | { kind: 'basket'; key: string; row: BasketRow; ret: number | null }

/** One ranking for Paper berjalan: highest return first; a basket counts as ONE entry. */
export function mergeKlasemen(presets: readonly ArenaRow[], baskets: readonly BasketRow[]): KlasemenEntry[] {
  const out: KlasemenEntry[] = [
    ...presets.map((row) => ({ kind: 'preset' as const, key: `p${row.preset.id}`, row, ret: row.stats.return_pct })),
    ...baskets.map((row) => ({ kind: 'basket' as const, key: `b${row.basket.id}`, row, ret: row.stats?.return_pct ?? null })),
  ]
  const name = (e: KlasemenEntry) => (e.kind === 'preset' ? e.row.preset.name : e.row.basket.name)
  return out.sort((a, b) => (b.ret ?? -Infinity) - (a.ret ?? -Infinity) || name(a).localeCompare(name(b)))
}
