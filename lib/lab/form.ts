/**
 * Pure helpers for the Strategy Lab forms: schema → form state, form state →
 * API payload, and small presentation rules (verdict, holdout warning, scan
 * sorting). Kept free of React so they can be unit-tested directly.
 */
import type {
  LabCheck,
  LabCosts,
  LabOptimizeSearch,
  LabParamSpec,
  LabParamValue,
  LabRunCreateRequest,
  LabRunMode,
  LabScanCreateRequest,
  LabScanMode,
  LabScanRow,
  LabStatus,
  LabTemplate,
  LabVerdict,
} from '@/lib/api/types/lab'

// ---------------------------------------------------------------------------
// Param form
// ---------------------------------------------------------------------------

/** Numeric/choice inputs are kept as strings while typing; bools as booleans. */
export type ParamFormValue = string | boolean
export type ParamFormValues = Record<string, ParamFormValue>

interface ParamGroup {
  group: string
  params: LabParamSpec[]
}

/** Groups params by `group`, preserving the order in which groups first appear. */
export function groupParams(params: LabParamSpec[]): ParamGroup[] {
  const order: string[] = []
  const map = new Map<string, LabParamSpec[]>()
  for (const p of params) {
    const g = p.group?.trim() || 'Lainnya'
    if (!map.has(g)) {
      map.set(g, [])
      order.push(g)
    }
    map.get(g)!.push(p)
  }
  return order.map((group) => ({ group, params: map.get(group)! }))
}

function toFormValue(spec: LabParamSpec, v: LabParamValue | undefined): ParamFormValue {
  const value = v === undefined ? spec.default : v
  if (spec.type === 'bool') return value === true || value === 'true'
  return String(value)
}

/**
 * Initial form values from the template defaults (= live strategy), optionally
 * overridden by a previous run's params / an optimizer's best_params. Unknown
 * override keys are ignored so a stale run cannot inject params the template
 * no longer has.
 */
export function initialParamValues(
  template: LabTemplate,
  overrides?: Record<string, LabParamValue> | null,
): ParamFormValues {
  const out: ParamFormValues = {}
  for (const spec of template.params) {
    out[spec.key] = toFormValue(spec, overrides?.[spec.key])
  }
  return out
}

/** True when every value equals the template default (i.e. the live config). */
export function isLiveDefault(template: LabTemplate, values: ParamFormValues): boolean {
  const defaults = initialParamValues(template)
  return template.params.every((p) => {
    const a = values[p.key]
    const b = defaults[p.key]
    if (p.type === 'int' || p.type === 'float') return Number(a) === Number(b)
    return a === b
  })
}

/** Returns an Indonesian error message for an invalid value, or null. */
function validateParam(spec: LabParamSpec, raw: ParamFormValue | undefined): string | null {
  if (spec.type === 'bool') return null
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (spec.type === 'choice') {
    if (!s) return 'Wajib dipilih'
    if (spec.choices && spec.choices.length > 0 && !spec.choices.includes(s)) {
      return 'Pilihan tidak valid'
    }
    return null
  }
  if (s === '') return 'Wajib diisi'
  const n = Number(s)
  if (!Number.isFinite(n)) return 'Harus angka'
  if (spec.type === 'int' && !Number.isInteger(n)) return 'Harus bilangan bulat'
  if (spec.min !== null && spec.min !== undefined && n < spec.min) return `Minimal ${spec.min}`
  if (spec.max !== null && spec.max !== undefined && n > spec.max) return `Maksimal ${spec.max}`
  return null
}

export function validateParams(
  template: LabTemplate,
  values: ParamFormValues,
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const spec of template.params) {
    const err = validateParam(spec, values[spec.key])
    if (err) errors[spec.key] = err
  }
  return errors
}

/** Coerces form values into the typed `params` object the API expects. */
export function toParamsPayload(
  template: LabTemplate,
  values: ParamFormValues,
): Record<string, LabParamValue> {
  const out: Record<string, LabParamValue> = {}
  for (const spec of template.params) {
    const raw = values[spec.key]
    switch (spec.type) {
      case 'bool':
        out[spec.key] = raw === true || raw === 'true'
        break
      case 'int':
        out[spec.key] = Math.trunc(Number(raw))
        break
      case 'float':
        out[spec.key] = Number(raw)
        break
      case 'choice':
        out[spec.key] = String(raw)
        break
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Costs
// ---------------------------------------------------------------------------

export interface CostFormValues {
  commission_pct: string
  slippage_pct: string
  funding: boolean
}

export const DEFAULT_COSTS: CostFormValues = {
  commission_pct: '0.05',
  slippage_pct: '0.05',
  funding: true,
}

/** Backend limits per side (src/api/lab_models.py Costs): fee <= 1 %, slippage <= 2 %. */
export const COST_LIMITS = { commission_pct: 1, slippage_pct: 2 } as const

export function validateCosts(c: CostFormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const key of ['commission_pct', 'slippage_pct'] as const) {
    const s = c[key].trim()
    const n = Number(s)
    if (s === '' || !Number.isFinite(n)) errors[key] = 'Harus angka'
    else if (n < 0) errors[key] = 'Tidak boleh negatif'
    else if (n > COST_LIMITS[key]) errors[key] = `Maksimal ${COST_LIMITS[key]}%`
  }
  return errors
}

function toCostsPayload(c: CostFormValues): LabCosts {
  return {
    commission_pct: Number(c.commission_pct),
    slippage_pct: Number(c.slippage_pct),
    funding: c.funding,
  }
}

export function costsToForm(c: LabCosts | null | undefined): CostFormValues {
  if (!c) return { ...DEFAULT_COSTS }
  return {
    commission_pct: String(c.commission_pct),
    slippage_pct: String(c.slippage_pct),
    funding: Boolean(c.funding),
  }
}

// ---------------------------------------------------------------------------
// Payload builders
// ---------------------------------------------------------------------------

interface RunFormState {
  template: LabTemplate
  symbol: string
  timeframe: string
  start: string
  end: string
  params: ParamFormValues
  costs: CostFormValues
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function validateRunForm(f: RunFormState): Record<string, string> {
  const errors: Record<string, string> = {
    ...validateParams(f.template, f.params),
    ...validateCosts(f.costs),
  }
  if (!f.symbol) errors.symbol = 'Pilih symbol'
  if (!f.timeframe) errors.timeframe = 'Pilih timeframe'
  if (f.start && !DATE_RE.test(f.start)) errors.start = 'Format YYYY-MM-DD'
  if (f.end && !DATE_RE.test(f.end)) errors.end = 'Format YYYY-MM-DD'
  if (f.start && f.end && DATE_RE.test(f.start) && DATE_RE.test(f.end) && f.start >= f.end) {
    errors.end = 'Tanggal akhir harus setelah tanggal mulai'
  }
  return errors
}

/**
 * Empty dates are omitted (backend then uses all available data). For
 * optimize, `optimize` adds n_trials and the restricted search space.
 */
export function buildRunRequest(
  f: RunFormState,
  mode: LabRunMode,
  optimize?: OptimizeConfig | null,
): LabRunCreateRequest {
  const req: LabRunCreateRequest = {
    template_id: f.template.id,
    symbol: f.symbol,
    timeframe: f.timeframe,
    params: toParamsPayload(f.template, f.params),
    costs: toCostsPayload(f.costs),
    mode,
  }
  if (f.start) req.start = f.start
  if (f.end) req.end = f.end
  if (mode === 'optimize' && optimize) {
    req.n_trials = optimize.nTrials
    const search = buildSearch(f.template, optimize)
    if (search.params.length > 0) req.search = search
  }
  return req
}

export function buildScanRequest(args: {
  template: LabTemplate
  symbols: string[]
  timeframes: string[]
  params: ParamFormValues | null
  costs: CostFormValues
  mode: LabScanMode
  nTrials?: number
  /** One start for every timeframe, or per-timeframe starts (wins per TF). */
  start?: string
  starts?: Record<string, string>
  presetId?: string | number | null
  useBestPresets?: boolean
}): LabScanCreateRequest {
  const req: LabScanCreateRequest = {
    template_id: args.template.id,
    symbols: [...args.symbols],
    timeframes: [...args.timeframes],
    costs: toCostsPayload(args.costs),
    mode: args.mode,
  }
  if (args.params) req.params = toParamsPayload(args.template, args.params)
  if (args.mode === 'optimize' && args.nTrials) req.n_trials = args.nTrials
  if (args.start) req.start = args.start
  if (args.starts && Object.keys(args.starts).length > 0) req.starts = { ...args.starts }
  if (args.presetId !== null && args.presetId !== undefined) req.preset_id = args.presetId
  if (args.useBestPresets) req.use_best_presets = true
  return req
}

// ---------------------------------------------------------------------------
// Scan helpers
// ---------------------------------------------------------------------------

export function combinationCount(symbols: number, timeframes: number): number {
  return symbols * timeframes
}

/** Warn above these: every combination is a full validate/optimize run. */
export const SCAN_WARN_THRESHOLD: Record<LabScanMode, number> = {
  validate: 40,
  optimize: 10,
}

export function isLargeScan(combos: number, mode: LabScanMode): boolean {
  return combos > SCAN_WARN_THRESHOLD[mode]
}

const VERDICT_RANK: Record<string, number> = { PASS: 0, FAIL: 1 }

/** PASS first, then FAIL, then no verdict; within each, OOS PF desc (nulls last). */
export function sortScanRows(rows: LabScanRow[]): LabScanRow[] {
  return [...rows].sort((a, b) => {
    const va = a.verdict ? VERDICT_RANK[a.verdict] : 2
    const vb = b.verdict ? VERDICT_RANK[b.verdict] : 2
    if (va !== vb) return va - vb
    const pa = a.oos_profit_factor
    const pb = b.oos_profit_factor
    const na = pa === null || pa === undefined || !Number.isFinite(pa)
    const nb = pb === null || pb === undefined || !Number.isFinite(pb)
    if (na && nb) return 0
    if (na) return 1
    if (nb) return -1
    return pb - pa
  })
}

/** Quick-select groups for the scan picker (intersected with /symbols). */
export const MAJORS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT']
export const MEMES = ['DOGEUSDT', '1000PEPEUSDT', '1000SHIBUSDT', 'WIFUSDT', '1000BONKUSDT', '1000FLOKIUSDT', 'PEPEUSDT', 'SHIBUSDT', 'BONKUSDT', 'FLOKIUSDT']

/**
 * First N symbols in backend order (the backend lists the screener
 * universe first, ordered by liquidity).
 */
export function topN(available: string[], n: number): string[] {
  return available.slice(0, n)
}

export function pickAvailable(list: readonly string[], available: string[]): string[] {
  const set = new Set(available)
  return list.filter((s) => set.has(s))
}

// ---------------------------------------------------------------------------
// Status / verdict / honesty
// ---------------------------------------------------------------------------

export function isActiveStatus(s: LabStatus | null | undefined): boolean {
  return s === 'queued' || s === 'running'
}

export function holdoutWarning(touches: number | null | undefined): string | null {
  if (typeof touches !== 'number' || !Number.isFinite(touches) || touches <= 1) return null
  return `Data baru (holdout) kombinasi ini sudah dipakai ${touches} kali, jadi hasilnya bisa terlalu pas dengan masa lalu.`
}

/** Threshold like ">= 1.2" / "> -50.0" / "<= 3" -> "minimal 1.2" / "di atas −50" / "maksimal 3". */
export function thresholdText(t: LabCheck['threshold']): string {
  const trim = (x: number) => String(Math.round(x * 1000) / 1000)
  if (typeof t === 'number') return `batas ${trim(t)}`
  if (typeof t !== 'string') return '—'
  const m = t.trim().match(/^(>=|>|<=|<|=)?\s*(-?\d+(?:\.\d+)?)$/)
  if (!m) return t
  const v = Number(m[2])
  const n = `${v < 0 ? '−' : ''}${trim(Math.abs(v))}`
  switch (m[1]) {
    case '>=': return `minimal ${n}`
    case '>': return `di atas ${n}`
    case '<=': return `maksimal ${n}`
    case '<': return `di bawah ${n}`
    default: return n
  }
}

interface VerdictCopy {
  tone: 'pass' | 'fail' | 'none'
  title: string
  body: string
}

export function verdictCopy(verdict: LabVerdict, mode: LabRunMode, status: LabStatus): VerdictCopy {
  if (status === 'queued' || status === 'running') {
    return { tone: 'none', title: 'Sedang diuji…', body: 'Rapor Lolos/Gagal muncul setelah uji selesai.' }
  }
  if (status !== 'done') {
    return { tone: 'none', title: 'Tidak ada rapor', body: 'Uji tidak selesai, jadi tidak ada rapor.' }
  }
  if (verdict === 'PASS') {
    return {
      tone: 'pass',
      title: 'Lolos',
      body: 'Semua syarat rapor terpenuhi di data baru (holdout) yang dikunci. Tetap bukan jaminan untung: jalankan paper dulu.',
    }
  }
  if (verdict === 'FAIL') {
    return {
      tone: 'fail',
      title: 'Gagal',
      body: 'Minimal satu syarat rapor tidak terpenuhi di data baru (holdout). Jangan dipakai untuk uang asli.',
    }
  }
  return {
    tone: 'none',
    title: mode === 'backtest' ? 'Belum diuji jujur' : 'Tanpa rapor',
    body:
      mode === 'backtest'
        ? 'Ini uji cepat di seluruh data lama, tanpa rapor, jadi bukan bukti. Jalankan Uji jujur untuk mendapat rapor Lolos/Gagal.'
        : 'Server tidak mengirim rapor untuk uji ini.',
  }
}

// ---------------------------------------------------------------------------
// Main ("tunable") vs advanced params
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Strategy (template) copy: "live" wording only for the Rosyade family
// ---------------------------------------------------------------------------

/** The template whose defaults ARE the live strategy (preset 4H-ETH-Basic). */
export const LIVE_TEMPLATE_ID = 'rosyade_family'
export const LIVE_PRESET_NAME = '4H-ETH-Basic'

export function isLiveTemplate(templateId: string | null | undefined): boolean {
  return templateId === LIVE_TEMPLATE_ID
}

interface TemplateCopy {
  /** Short name for tables and chips. */
  short: string
  /** One or two plain sentences about what the strategy does. */
  description: string
  /** What the default parameters are. */
  defaults: string
}

const TEMPLATE_COPY: Record<string, TemplateCopy> = {
  rosyade_family: {
    short: 'Rosyade',
    description:
      'Strategi bot live. Masuk saat harga menembus struktur swing, disaring volume, tren timeframe besar, RSI, ADX, MACD dan filter pasar sideways.',
    defaults: 'Default = setting live 4H-ETH-Basic (ETH 4 jam). Koin dan timeframe lain biasanya butuh setting sendiri.',
  },
  donchian_breakout: {
    short: 'Donchian',
    description:
      'Ikut tren: masuk saat harga menembus titik tertinggi atau terendah N candle, keluar lewat channel lawan atau stop yang ikut bergerak (ATR).',
    defaults: 'Default = setting riset, belum pernah dipakai bot.',
  },
  mean_reversion_range: {
    short: 'Mean reversion',
    description:
      'Melawan arah di pasar sideways: masuk saat harga keluar lalu kembali ke pita Bollinger/Keltner, ambil untung di garis tengah.',
    defaults: 'Default = setting riset, belum pernah dipakai bot.',
  },
  universal_v0: {
    short: 'Universal (arsip)',
    description: 'Strategi multi-koin yang dihentikan setelah uji jujur.',
    defaults: '',
  },
}

/** Short strategy name for lists ("Rosyade", "Donchian"); falls back to the backend name or id. */
export function templateShort(templateId: string | null | undefined, backendName?: string | null): string {
  if (!templateId) return backendName?.trim() || 'Strategi'
  return TEMPLATE_COPY[templateId]?.short ?? (backendName?.trim() || templateId)
}

export function templateDescription(t: Pick<LabTemplate, 'id' | 'description'>): string {
  return TEMPLATE_COPY[t.id]?.description ?? t.description
}

export function templateDefaultsCopy(templateId: string): string {
  return TEMPLATE_COPY[templateId]?.defaults ?? 'Default = setting bawaan strategi, belum pernah dipakai bot.'
}

// ---------------------------------------------------------------------------
// Parameter copy (Indonesian label + one plain sentence)
// ---------------------------------------------------------------------------

/**
 * Labels and one-line explanations for the params the form can show in step 2 (tunable +
 * research-important, all templates). Anything not listed falls back to the backend label.
 */
export const PARAM_COPY: Record<string, { label: string; help: string }> = {
  // Rosyade: the 12 tunables
  swing_len: { label: 'Panjang swing', help: 'Berapa bar kiri/kanan untuk menandai titik balik (swing). Kecil = lebih sering masuk.' },
  long_sl_pct: { label: 'Stop loss long (%)', help: 'Jarak stop loss dari harga masuk untuk posisi long.' },
  short_sl_pct: { label: 'Stop loss short (%)', help: 'Jarak stop loss dari harga masuk untuk posisi short.' },
  ema_exit_len: { label: 'EMA keluar', help: 'Panjang EMA untuk keluar saat harga menembus balik EMA.' },
  structure_pivot_len: { label: 'Pivot struktur', help: 'Panjang pivot untuk mendeteksi struktur yang patah (sinyal keluar).' },
  atr_mult_medium_long: { label: 'Stop ikut gerak long (tren sedang)', help: 'Jarak stop ikut gerak untuk long saat tren sedang, dalam kelipatan ATR.' },
  atr_mult_medium_short: { label: 'Stop ikut gerak short (tren sedang)', help: 'Jarak stop ikut gerak untuk short saat tren sedang, dalam kelipatan ATR.' },
  adx_strong_threshold: { label: 'Batas ADX tren kuat', help: 'ADX di atas angka ini dianggap tren kuat.' },
  entry_vol_mult: { label: 'Filter volume masuk', help: 'Volume candle masuk minimal sekian kali rata-rata volume.' },
  ema_htf_len: { label: 'EMA timeframe besar', help: 'Panjang EMA penyaring arah tren di timeframe yang lebih besar.' },
  chop_limit: { label: 'Batas pasar sideways', help: 'Di atas angka choppiness ini pasar dianggap sideways, jadi entry diblokir.' },
  cooldown_bars: { label: 'Jeda antar trade (bar)', help: 'Berapa bar menunggu setelah trade rugi sebelum boleh masuk lagi.' },
  // Rosyade: research-important (riset 12 Nov)
  atr_mult_weak_long: { label: 'Stop ikut gerak long (tren lemah)', help: 'Jarak stop ikut gerak untuk long saat tren lemah, dalam kelipatan ATR. Makin besar makin longgar.' },
  long_tp1_pct: { label: 'Target TP1 long (%)', help: 'Jarak target pertama long dari harga masuk.' },
  long_tp2_pct: { label: 'Target TP2 long (%)', help: 'Jarak target kedua long dari harga masuk.' },
  short_tp1_pct: { label: 'Target TP1 short (%)', help: 'Jarak target pertama short dari harga masuk.' },
  atr_lookback_short: { label: 'Lookback stop short (bar)', help: 'Berapa bar ke belakang untuk mencari titik terendah stop ikut gerak short.' },
  short_max_drop_pct: { label: 'Filter short: batas turun (%)', help: 'Short diblokir kalau harga sudah turun lebih dari angka ini dalam beberapa bar terakhir.' },
  short_drop_lookback: { label: 'Filter short: lookback (bar)', help: 'Jumlah bar untuk mengukur seberapa jauh harga sudah turun.' },
  short_rsi_min: { label: 'Filter short: RSI minimum', help: 'Short hanya bila RSI di atas angka ini (tidak short di pasar yang sudah jenuh jual).' },
  vol_lookback: { label: 'Lookback gejolak (bar)', help: 'Panjang data untuk mengukur gejolak pada mode ukuran posisi ikut gejolak.' },
  risk_per_trade_pct: { label: 'Risiko per trade (%)', help: 'Persen modal yang dipertaruhkan per trade (mode ukuran posisi "risk").' },
  entry_atr_len: { label: 'Panjang ATR entry', help: 'Panjang ATR untuk jarak pullback/limit saat timing entry di timeframe kecil.' },
  entry_atr_mult: { label: 'Jarak pullback (× ATR)', help: 'Seberapa jauh menunggu pullback sebelum masuk, dalam kelipatan ATR (mode timing entry).' },
  entry_rsi_len: { label: 'Panjang RSI entry', help: 'Panjang RSI untuk filter masuk.' },
  macd_slow_len: { label: 'MACD lambat', help: 'Panjang EMA lambat MACD untuk filter masuk.' },
  slope_len: { label: 'Panjang EMA kemiringan', help: 'Panjang EMA yang kemiringannya dipakai untuk mendeteksi pasar datar.' },
  slope_th: { label: 'Batas kemiringan (%)', help: 'Kemiringan EMA di bawah angka ini dianggap pasar datar.' },
  dcb_vol_thresh: { label: 'Batas volume DCB', help: 'Batas lonjakan volume untuk sinyal dead-cat-bounce.' },
  be_lock_short_pct: { label: 'Kunci impas short (%)', help: 'Setelah untung sekian persen, stop short digeser ke harga masuk.' },
  // Donchian breakout
  enable_long: { label: 'Aktifkan long', help: 'Boleh membuka posisi long.' },
  enable_short: { label: 'Aktifkan short', help: 'Boleh membuka posisi short.' },
  dc_entry_len: { label: 'Channel masuk (N candle)', help: 'Masuk saat close menembus titik tertinggi/terendah N candle sebelumnya.' },
  dc_exit_len: { label: 'Channel keluar (M candle)', help: 'Keluar saat close menembus titik terendah/tertinggi M candle sebelumnya.' },
  dc_atr_len: { label: 'Panjang ATR', help: 'Panjang ATR untuk stop ikut gerak.' },
  dc_atr_mult: { label: 'Stop ikut gerak (× ATR)', help: 'Jarak stop dari titik ekstrem sejak masuk, dalam kelipatan ATR. Hanya bergerak searah untung.' },
  use_ema_htf: { label: 'Filter tren timeframe besar', help: 'Long hanya di atas EMA timeframe besar, short hanya di bawahnya.' },
  // Mean reversion (range)
  mr_regime: { label: 'Filter pasar sideways', help: 'Cara menentukan pasar sedang sideways: ADX rendah, choppiness tinggi, atau keduanya.' },
  mr_chop_len: { label: 'Panjang choppiness', help: 'Jumlah candle untuk menghitung choppiness (seberapa datar pasar).' },
  mr_chop_min: { label: 'Choppiness minimum', help: 'Hanya masuk bila choppiness di atas angka ini (pasar cukup sideways).' },
  mr_len: { label: 'Panjang rata-rata (candle)', help: 'Jumlah candle untuk garis tengah pita.' },
  mr_mult: { label: 'Lebar pita (k)', help: 'Seberapa jauh pita dari garis tengah. Makin lebar, makin jarang masuk.' },
  mr_stop_atr_mult: { label: 'Stop keras (× ATR)', help: 'Stop tetap sejauh k × ATR dari harga masuk.' },
  mr_max_bars: { label: 'Batas lama posisi (candle)', help: 'Posisi ditutup setelah sekian candle bila target atau stop belum kena (0 = mati).' },
}

/** Indonesian names for choice values (falls back to the raw value). */
const CHOICE_COPY: Record<string, Record<string, string>> = {
  mr_regime: { adx: 'ADX rendah', chop: 'Choppiness tinggi', adx_chop: 'Keduanya', off: 'Tanpa filter' },
  mr_band: { bb: 'Bollinger', kc: 'Keltner' },
  mr_trigger: { reenter: 'Kembali ke dalam pita', outside: 'Keluar pita' },
  sizing_mode: { margin: 'Margin (seperti live)', risk: 'Risiko per trade', vol_target: 'Ikut gejolak' },
  entry_mode: { bar_close: 'Saat candle tutup (live)', ltf_close: 'Close TF kecil', ltf_pullback: 'Pullback TF kecil', ltf_limit: 'Limit TF kecil' },
  entry_timeout: { skip: 'Lewati', market: 'Masuk harga pasar' },
  entry_band: { atr: 'ATR', ema: 'EMA' },
}

export function choiceLabel(key: string, value: string): string {
  return CHOICE_COPY[key]?.[value] ?? value
}

const GROUP_COPY: Record<string, string> = {
  // Rosyade (backend group names are English)
  Direction: 'Arah',
  'TP / SL': 'TP / SL',
  'TP check': 'Cek TP (tren melemah)',
  Exits: 'Keluar',
  'ATR trailing': 'Stop ikut gerak (ATR)',
  Regime: 'Kekuatan tren',
  'Entry filters': 'Filter masuk',
  'Anti-sideways': 'Anti pasar sideways',
  'Short filters': 'Filter short',
  'Breakeven lock': 'Kunci impas',
  'Order blocks': 'Zona order',
  'Risk & sizing': 'Risiko',
  Engine: 'Mesin uji',
  'Entry timing (MTF)': 'Timing entry (MTF, riset)',
  // Donchian / Mean reversion (already Indonesian, made consistent)
  'Filter trend HTF': 'Filter tren timeframe besar',
  'Sinyal breakout': 'Sinyal masuk (breakout)',
  'Exit & trailing stop': 'Keluar & stop ikut gerak',
  'Filter regime (range)': 'Filter pasar sideways',
  'Sinyal fade': 'Sinyal masuk (fade)',
  Exit: 'Keluar',
}

export function paramLabel(spec: LabParamSpec): string {
  return PARAM_COPY[spec.key]?.label ?? spec.label
}

/** Help text: the template's own (schema) text first, else the shared Rosyade copy. */
export function paramHelp(spec: LabParamSpec): string | undefined {
  return spec.help || PARAM_COPY[spec.key]?.help || undefined
}

export function groupLabel(group: string): string {
  return GROUP_COPY[group] ?? group
}

/** One short line for the step-2 cards: the curated copy first, else the schema's own help. */
export function paramShortHelp(spec: LabParamSpec): string | undefined {
  return PARAM_COPY[spec.key]?.help || spec.help || undefined
}

/** Search in "Lanjutan": Indonesian label, backend label, key or group (case-insensitive). */
export function matchesParamQuery(spec: LabParamSpec, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [paramLabel(spec), spec.label, spec.key, spec.key.replace(/_/g, ' '), groupLabel(spec.group ?? '')]
    .some((s) => s.toLowerCase().includes(q))
}

/** Main = params flagged tunable; advanced = the rest, grouped. */
export function splitParams(template: LabTemplate): { main: LabParamSpec[]; advanced: ParamGroup[] } {
  const main = template.params.filter((p) => p.tunable === true)
  const rest = template.params.filter((p) => p.tunable !== true)
  return { main, advanced: groupParams(rest) }
}

function sameValue(spec: LabParamSpec, a: ParamFormValue | LabParamValue | undefined, b: ParamFormValue | LabParamValue | undefined): boolean {
  if (spec.type === 'int' || spec.type === 'float') return Number(a) === Number(b)
  if (spec.type === 'bool') return (a === true || a === 'true') === (b === true || b === 'true')
  return String(a) === String(b)
}

/** Keys whose current value differs from the template (live) default. */
export function changedKeys(template: LabTemplate, values: ParamFormValues): string[] {
  return template.params.filter((p) => !sameValue(p, values[p.key], p.default)).map((p) => p.key)
}

interface ParamDiffRow {
  key: string
  label: string
  group: string
  def: LabParamValue
  value: LabParamValue
}

/** Params in `values` that differ from template defaults (for run detail). */
export function diffFromDefaults(
  template: LabTemplate | null | undefined,
  values: Record<string, LabParamValue> | null | undefined,
): ParamDiffRow[] {
  if (!template || !values) return []
  return template.params
    .filter((p) => p.key in values && !sameValue(p, values[p.key], p.default))
    .map((p) => ({ key: p.key, label: paramLabel(p), group: p.group, def: p.default, value: values[p.key] }))
}

// ---------------------------------------------------------------------------
// Date presets
// ---------------------------------------------------------------------------

export type DatePreset = '1y' | '2y' | '3y' | 'since2020' | 'custom'

export const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: '1y', label: '1 tahun' },
  { id: '2y', label: '2 tahun' },
  { id: '3y', label: '3 tahun' },
  { id: 'since2020', label: 'Sejak 2020' },
  { id: 'custom', label: 'Custom' },
]

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Preset → {start, end}. End is left empty (= latest data). */
export function presetRange(preset: DatePreset, today: Date = new Date()): { start: string; end: string } | null {
  if (preset === 'custom') return null
  if (preset === 'since2020') return { start: '2020-01-01', end: '' }
  const years = preset === '1y' ? 1 : preset === '2y' ? 2 : 3
  const d = new Date(Date.UTC(today.getUTCFullYear() - years, today.getUTCMonth(), today.getUTCDate()))
  return { start: isoDate(d), end: '' }
}

/** Which preset (if any) a start/end pair corresponds to. */
export function detectPreset(start: string, end: string, today: Date = new Date()): DatePreset {
  for (const p of ['1y', '2y', '3y', 'since2020'] as const) {
    const r = presetRange(p, today)!
    if (r.start === start && r.end === end) return p
  }
  return 'custom'
}

// ---------------------------------------------------------------------------
// Optimize config (n_trials + search space)
// ---------------------------------------------------------------------------

export const TRIAL_OPTIONS = [10, 30, 60] as const
export type TrialCount = (typeof TRIAL_OPTIONS)[number]

export interface SearchRange {
  enabled: boolean
  min: string
  max: string
}

export interface OptimizeConfig {
  nTrials: TrialCount
  ranges: Record<string, SearchRange>
}

export function defaultOptimizeConfig(template: LabTemplate): OptimizeConfig {
  const ranges: Record<string, SearchRange> = {}
  for (const p of template.params) {
    if (p.tunable !== true) continue
    ranges[p.key] = { enabled: true, min: String(p.min ?? ''), max: String(p.max ?? '') }
  }
  return { nTrials: 30, ranges }
}

export function validateOptimize(template: LabTemplate, cfg: OptimizeConfig): Record<string, string> {
  const errors: Record<string, string> = {}
  let enabled = 0
  for (const p of template.params) {
    const r = cfg.ranges[p.key]
    if (!r || !r.enabled) continue
    enabled++
    const lo = Number(r.min)
    const hi = Number(r.max)
    if (r.min.trim() === '' || r.max.trim() === '' || !Number.isFinite(lo) || !Number.isFinite(hi)) {
      errors[`search.${p.key}`] = 'Min/maks harus angka'
    } else if (lo >= hi) {
      errors[`search.${p.key}`] = 'Min harus lebih kecil dari maks'
    } else if ((p.min !== null && p.min !== undefined && lo < p.min) || (p.max !== null && p.max !== undefined && hi > p.max)) {
      errors[`search.${p.key}`] = `Di luar batas ${p.min}–${p.max}`
    }
  }
  if (enabled === 0) errors.search = 'Pilih minimal 1 parameter untuk dicari'
  return errors
}

function buildSearch(template: LabTemplate, cfg: OptimizeConfig): LabOptimizeSearch {
  const params: string[] = []
  const ranges: Record<string, [number, number]> = {}
  for (const p of template.params) {
    const r = cfg.ranges[p.key]
    if (!r || !r.enabled) continue
    params.push(p.key)
    ranges[p.key] = [Number(r.min), Number(r.max)]
  }
  return { params, ranges }
}

// ---------------------------------------------------------------------------
// Honesty checks → plain-language reasons
// ---------------------------------------------------------------------------

/** First number in a threshold like ">= 1.2" or "> -50.0". */
export function thresholdNumber(t: LabCheck['threshold']): number | null {
  if (typeof t === 'number') return t
  if (typeof t !== 'string') return null
  const m = t.match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : null
}

function fmtNum(v: number, digits = 2): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(digits)
}

function fmtSignedPct(v: number): string {
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmtNum(Math.abs(v), 1)}%`
}

const CHECK_LABEL: Record<string, string> = {
  oos_profit_factor: 'PF di data baru',
  oos_net_return: 'Hasil bersih di data baru',
  mc_dd_p95: 'Turun terdalam wajar (uji acak)',
  min_oos_trades: 'Jumlah trade di data baru',
  cost_stress: 'Tahan biaya dobel',
  sensitivity: 'Setting rapuh',
  no_liquidation: 'Likuidasi',
}

export function checkLabel(c: LabCheck): string {
  return CHECK_LABEL[c.name] ?? c.label
}

/** One plain-language Indonesian sentence describing a check result. */
export function checkReason(c: LabCheck): string {
  const v = typeof c.value === 'number' && Number.isFinite(c.value) ? c.value : null
  const t = thresholdNumber(c.threshold)
  if (v === null) return `${checkLabel(c)}: tidak ada data (dihitung Gagal)`
  switch (c.name) {
    case 'oos_profit_factor':
      return `PF di data baru ${v >= 999 ? 'tak terhingga (tanpa rugi)' : fmtNum(v)} (minimal ${t ?? 1.2})`
    case 'oos_net_return':
      return `Hasil bersih di data baru setelah biaya ${fmtSignedPct(v)} (harus di atas ${t ?? 0}%)`
    case 'mc_dd_p95':
      return `Turun terdalam wajar bisa ${fmtSignedPct(v)} (batas ${fmtSignedPct(t ?? -50)})`
    case 'min_oos_trades':
      return `${fmtNum(v, 0)} trade di data baru (minimal ${t ?? 30} supaya hasilnya bermakna)`
    case 'cost_stress':
      return `Kalau biaya dobel, hasil di data baru jadi ${fmtSignedPct(v)} (harus di atas 0%)`
    case 'sensitivity':
      return `${fmtNum(v, 0)} setting rapuh: hasilnya berubah jauh kalau digeser sedikit (maks ${t ?? 3})`
    case 'no_liquidation':
      return `${fmtNum(v, 0)} kali kena likuidasi (harus 0)`
    default:
      return `${checkLabel(c)}: ${fmtNum(v)} (syarat ${String(c.threshold ?? '—')})`
  }
}

/** Reasons for the hero card: failed checks first. */
export function verdictReasons(checks: LabCheck[]): { failed: string[]; passed: string[] } {
  return {
    failed: checks.filter((c) => !c.passed).map(checkReason),
    passed: checks.filter((c) => c.passed).map(checkReason),
  }
}

// ---------------------------------------------------------------------------
// Relative time ("5 mnt lalu")
// ---------------------------------------------------------------------------

export function relativeTime(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '—'
  const s = Math.round((now - t) / 1000)
  if (s < 45) return 'baru saja'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} mnt lalu`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} jam lalu`
  const d = Math.round(h / 24)
  if (d < 30) return `${d} hari lalu`
  return new Date(t).toISOString().slice(0, 10)
}
