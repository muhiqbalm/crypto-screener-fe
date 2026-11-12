/**
 * Plain-Indonesian copy for a run: action names, progress stages, backend errors and the one
 * verdict sentence shown on top of the run detail. Pure (no React), unit-tested.
 */
import { checkReason } from '@/lib/lab/form'
import { formatDuration } from '@/lib/lab/planning'
import { formatDate } from '@/lib/utils/time'
import { formatPercent, formatScore } from '@/lib/utils/format'
import type { LabCheck, LabRunDetail, LabRunMode, LabStatus } from '@/lib/api/types/lab'

/** One name per concept (glossary §4.3). */
export const MODE_COPY: Record<LabRunMode, string> = {
  backtest: 'Uji cepat',
  validate: 'Uji jujur',
  optimize: 'Cari setting terbaik',
}

export const STATUS_COPY: Record<LabStatus, string> = {
  queued: 'Antri',
  running: 'Berjalan',
  done: 'Selesai',
  error: 'Error',
  cancelled: 'Dibatalkan',
}

const STAGES: Record<string, string> = {
  queued: 'Menunggu antrian',
  data: 'Menyiapkan data harga',
  download: 'Mengunduh data harga',
  optimize: 'Mencari setting terbaik',
  'optimise on development segment': 'Mencari setting terbaik di data latih',
  'in-sample backtest': 'Menguji di data latih',
  backtest: 'Uji cepat',
  sensitivity: 'Cek ketahanan setting',
  holdout: 'Ujian di data baru (holdout)',
  'full range + monte carlo': 'Uji seluruh periode + uji acak berulang',
  monte_carlo: 'Uji acak berulang',
  report: 'Menyusun rapor',
  saving: 'Menyimpan hasil',
}

/** Backend progress stage -> Indonesian ("walk-forward fold 2/6" -> "Uji maju bertahap: bagian 2 dari 6"). */
export function stageLabel(stage: string | null | undefined): string {
  if (!stage) return 'Memproses'
  const s = stage.trim()
  const fold = s.match(/^walk[-_ ]forward(?:\s+fold\s+(\d+)\s*\/\s*(\d+))?/i)
  if (fold) return fold[1] ? `Uji maju bertahap: bagian ${fold[1]} dari ${fold[2]}` : 'Uji maju bertahap'
  const dl = s.match(/^download\s+(\S+)\s+(\S+)/i)
  if (dl) return `Mengunduh data ${dl[1]} ${dl[2]}`
  const dataTf = s.match(/^data\s+(\S+)$/i)
  if (dataTf) return `Menyiapkan data timeframe ${dataTf[1]}`
  return STAGES[s.toLowerCase()] ?? 'Memproses'
}

export interface ErrorCopy {
  /** One sentence: what happened, in plain Indonesian. */
  text: string
  /** What to do next. */
  hint: string
}

/** Backend error string (job / run error) -> Indonesian sentence + what to do. Raw text stays available as detail. */
export function errorCopy(raw: string | null | undefined): ErrorCopy {
  const e = (raw ?? '').trim()
  let m: RegExpMatchArray | null
  if ((m = e.match(/range starts inside the locked holdout \(([^)]+)\)/i))) {
    return { text: `Periode mulai di dalam data baru (holdout) yang sudah terkunci sejak ${formatDate(m[1])}.`, hint: 'Pilih tanggal mulai sebelum tanggal itu, lalu uji lagi.' }
  }
  if ((m = e.match(/extend past the locked holdout start (\S+)/i))) {
    return { text: `Periode berakhir sebelum data baru (holdout) yang terkunci sejak ${formatDate(m[1])}.`, hint: 'Kosongkan tanggal akhir supaya memakai data terbaru.' }
  }
  if (/development segment before the holdout is shorter than 60 days/i.test(e)) {
    return { text: 'Data latih sebelum data baru (holdout) kurang dari 60 hari.', hint: 'Mulai periode lebih awal.' }
  }
  if (/empty evaluation range/i.test(e)) {
    return { text: 'Periodenya kosong.', hint: 'Periksa tanggal mulai dan tanggal akhir.' }
  }
  if (/optimizer data leaks into the holdout/i.test(e)) {
    return { text: 'Pengaman data baru menghentikan uji karena data latih menyentuh data baru.', hint: 'Ini bug di server Lab. Laporkan ke admin.' }
  }
  if ((m = e.match(/not enough bars \((\d+)\) for warm-up (\d+)/i))) {
    return { text: `Data terlalu sedikit: ${m[1]} candle, sedangkan indikator butuh ${m[2]} candle pemanasan.`, hint: 'Pilih periode yang lebih panjang.' }
  }
  if ((m = e.match(/timeout after (\d+)\s*s/i))) {
    return { text: `Uji dihentikan karena melewati batas waktu (${formatDuration(Number(m[1])).replace('±', '')}).`, hint: 'Perpendek periode atau kurangi jumlah percobaan.' }
  }
  if (/cancelled by user/i.test(e)) return { text: 'Uji dibatalkan.', hint: 'Jalankan lagi kapan saja.' }
  if (/worker shutdown/i.test(e)) return { text: 'Server Lab dimulai ulang saat uji berjalan.', hint: 'Jalankan ulang uji ini.' }
  if (/could not download|no data available|no cached data|failed after \d+ attempts|ConnectionError/i.test(e)) {
    return { text: 'Data harga koin atau timeframe ini gagal diunduh.', hint: 'Coba lagi beberapa menit lagi.' }
  }
  if (/entry_tf .*lower timeframe/i.test(e)) {
    return { text: 'Timeframe timing entry harus lebih kecil dari timeframe uji.', hint: 'Ubah "Timing entry" di Lanjutan.' }
  }
  if (/invalid params|unknown params|ParamError|must be < |must be <= /i.test(e)) {
    return { text: 'Ada setting yang tidak valid.', hint: 'Buka "Ubah setting" dan periksa angka yang ditandai.' }
  }
  if (/MemoryError|exited with code|Killed/i.test(e)) {
    return { text: 'Mesin uji berhenti tiba-tiba, kemungkinan kehabisan memori.', hint: 'Coba periode yang lebih pendek.' }
  }
  if (/spawn failed/i.test(e)) return { text: 'Server Lab gagal memulai uji.', hint: 'Coba lagi beberapa saat lagi.' }
  return { text: 'Uji gagal karena error di server Lab.', hint: 'Coba lagi. Kalau terulang, kirim detail teknis ke admin.' }
}

export type SentenceTone = 'pass' | 'fail' | 'none' | 'running' | 'error'

export interface VerdictSentence {
  tone: SentenceTone
  text: string
}

function num(m: Record<string, unknown> | null | undefined, k: string): number | null {
  const v = m?.[k]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function lowerFirst(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s
}

/** "Lolos: untung di data baru (holdout) setelah biaya, +8.4% dari 51 trade (PF 1.45)." and friends. */
export function verdictSentence(run: Pick<LabRunDetail, 'status' | 'verdict' | 'mode' | 'checks' | 'oos_metrics' | 'metrics' | 'error'>): VerdictSentence {
  if (run.status === 'queued') return { tone: 'running', text: 'Menunggu antrian. Rapor muncul setelah uji selesai.' }
  if (run.status === 'running') return { tone: 'running', text: 'Sedang diuji. Rapor muncul setelah uji selesai.' }
  if (run.status === 'cancelled') return { tone: 'none', text: 'Uji dibatalkan sebelum selesai, jadi tidak ada rapor.' }
  if (run.status === 'error') return { tone: 'error', text: `Uji gagal dijalankan. ${errorCopy(run.error).text}` }
  const ho = run.oos_metrics as Record<string, unknown> | null
  if (run.verdict === 'PASS') {
    const net = num(ho, 'net_return_pct')
    const trades = num(ho, 'trades')
    const pf = num(ho, 'profit_factor')
    const parts = [net !== null ? formatPercent(net, 1) : null, trades !== null ? `dari ${Math.round(trades)} transaksi` : null]
      .filter(Boolean)
      .join(' ')
    return {
      tone: 'pass',
      text: `Lolos: untung di data baru (holdout) setelah biaya${parts ? `, ${parts}` : ''}${pf !== null ? ` (PF ${formatScore(pf)})` : ''}.`,
    }
  }
  if (run.verdict === 'FAIL') {
    const failed = (run.checks ?? []).filter((c: LabCheck) => !c.passed)
    const first = failed[0] ? lowerFirst(checkReason(failed[0])) : 'minimal satu syarat rapor tidak terpenuhi'
    const more = failed.length > 1 ? ` (+${failed.length - 1} syarat lain)` : ''
    return { tone: 'fail', text: `Gagal: ${first}${more}.` }
  }
  if (run.mode === 'backtest') {
    const m = run.metrics as Record<string, unknown>
    const net = num(m, 'net_return_pct')
    const trades = num(m, 'trades')
    return {
      tone: 'none',
      text: `Uji cepat selesai${net !== null ? `: ${formatPercent(net, 1)} di seluruh periode` : ''}${trades !== null ? ` dari ${Math.round(trades)} transaksi` : ''}. Belum ada rapor, jadi belum bukti.`,
    }
  }
  return { tone: 'none', text: 'Uji selesai, tapi server tidak mengirim rapor.' }
}

export interface VerdictHeadline {
  tone: SentenceTone
  /** The big word of the hero: "Lolos", "Gagal", "Uji cepat"… */
  word: string
  /** One line under it. Numbers live in the KPIs, so they are not repeated here. */
  line: string
}

/** Hero headline for the run detail (design v2): big word + one line. */
export function verdictHeadline(run: Pick<LabRunDetail, 'status' | 'verdict' | 'mode' | 'checks' | 'error'>): VerdictHeadline {
  if (run.status === 'queued') return { tone: 'running', word: 'Menunggu antrian', line: 'Rapor muncul setelah uji selesai.' }
  if (run.status === 'running') return { tone: 'running', word: 'Sedang diuji', line: 'Rapor muncul setelah uji selesai.' }
  if (run.status === 'cancelled') return { tone: 'none', word: 'Dibatalkan', line: 'Uji berhenti sebelum selesai, jadi tidak ada rapor.' }
  if (run.status === 'error') return { tone: 'error', word: 'Error', line: errorCopy(run.error).text }
  if (run.verdict === 'PASS') return { tone: 'pass', word: 'Lolos', line: 'Untung di data baru setelah biaya, dan semua syarat rapor terpenuhi.' }
  if (run.verdict === 'FAIL') {
    const failed = (run.checks ?? []).filter((c: LabCheck) => !c.passed)
    const first = failed[0] ? checkReason(failed[0]) : 'Minimal satu syarat rapor tidak terpenuhi'
    return { tone: 'fail', word: 'Gagal', line: `${first}${failed.length > 1 ? ` (+${failed.length - 1} syarat lain)` : ''}.` }
  }
  if (run.mode === 'backtest') return { tone: 'none', word: 'Uji cepat', line: 'Tanpa rapor, jadi belum bukti. Uji jujur memberi rapor Lolos/Gagal.' }
  return { tone: 'none', word: 'Tanpa rapor', line: 'Server tidak mengirim rapor untuk uji ini.' }
}
