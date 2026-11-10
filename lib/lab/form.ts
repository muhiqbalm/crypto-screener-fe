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

export function validateCosts(c: CostFormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const key of ['commission_pct', 'slippage_pct'] as const) {
    const s = c[key].trim()
    const n = Number(s)
    if (s === '' || !Number.isFinite(n)) errors[key] = 'Harus angka'
    else if (n < 0) errors[key] = 'Tidak boleh negatif'
    else if (n > 5) errors[key] = 'Maksimal 5%'
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

/**
 * "Top 30" quick-select: the most liquid Binance USDT-M perps. This is a
 * static universe list (names only, no numbers); it is intersected with the
 * symbols the backend reports so we never offer something it cannot run.
 */
const TOP_30_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT',
  'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'TRXUSDT', 'DOTUSDT', 'LTCUSDT',
  'BCHUSDT', 'SUIUSDT', 'NEARUSDT', 'APTUSDT', 'ARBUSDT', 'OPUSDT',
  'TONUSDT', 'UNIUSDT', 'ATOMUSDT', 'FILUSDT', 'ETCUSDT', 'INJUSDT',
  'AAVEUSDT', 'WLDUSDT', 'SEIUSDT', 'TIAUSDT', 'HBARUSDT', 'XLMUSDT',
] as const

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

export function top30Available(available: string[]): string[] {
  const set = new Set(available)
  return TOP_30_SYMBOLS.filter((s) => set.has(s))
}

// ---------------------------------------------------------------------------
// Status / verdict / honesty
// ---------------------------------------------------------------------------

export function isActiveStatus(s: LabStatus | null | undefined): boolean {
  return s === 'queued' || s === 'running'
}

export function holdoutWarning(touches: number | null | undefined): string | null {
  if (typeof touches !== 'number' || !Number.isFinite(touches) || touches <= 1) return null
  return `Hasil holdout sudah dilihat ${touches} kali — risiko overfitting.`
}

interface VerdictCopy {
  tone: 'pass' | 'fail' | 'none'
  title: string
  body: string
}

export function verdictCopy(verdict: LabVerdict, mode: LabRunMode, status: LabStatus): VerdictCopy {
  if (status === 'queued' || status === 'running') {
    return { tone: 'none', title: 'Sedang diuji…', body: 'Rapor LOLOS/GAGAL muncul setelah run selesai.' }
  }
  if (status !== 'done') {
    return { tone: 'none', title: 'Tidak ada rapor', body: 'Run tidak selesai, jadi tidak ada rapor kejujuran.' }
  }
  if (verdict === 'PASS') {
    return {
      tone: 'pass',
      title: 'LOLOS',
      body: 'Lolos semua cek di periode holdout yang dikunci. Tetap bukan jaminan profit — paper trade dulu sebelum live.',
    }
  }
  if (verdict === 'FAIL') {
    return {
      tone: 'fail',
      title: 'GAGAL',
      body: 'Jangan dipakai live. Minimal satu cek kejujuran gagal di periode holdout.',
    }
  }
  return {
    tone: 'none',
    title: mode === 'backtest' ? 'Belum divalidasi' : 'Tanpa rapor',
    body:
      mode === 'backtest'
        ? 'Ini backtest cepat (in-sample) — bukan bukti. Klik Validasi untuk dapat rapor LOLOS/GAGAL.'
        : 'Backend tidak mengembalikan verdict untuk run ini.',
  }
}

// ---------------------------------------------------------------------------
// Main ("tunable") vs advanced params
// ---------------------------------------------------------------------------

/**
 * Indonesian copy for the 12 tunable Rosyade params. Anything not listed
 * falls back to the backend label.
 */
export const PARAM_COPY: Record<string, { label: string; help: string }> = {
  swing_len: { label: 'Panjang swing', help: 'Berapa bar kiri/kanan untuk menandai swing high/low. Kecil = lebih sering entry.' },
  long_sl_pct: { label: 'Stop loss long (%)', help: 'Jarak SL dari harga entry untuk posisi long.' },
  short_sl_pct: { label: 'Stop loss short (%)', help: 'Jarak SL dari harga entry untuk posisi short.' },
  ema_exit_len: { label: 'EMA exit', help: 'Panjang EMA untuk exit saat harga menembus balik EMA.' },
  structure_pivot_len: { label: 'Pivot struktur', help: 'Panjang pivot untuk deteksi break of structure (exit).' },
  atr_mult_medium_long: { label: 'Trailing ATR long', help: 'Pengali ATR untuk trailing stop long di regime volatilitas sedang.' },
  atr_mult_medium_short: { label: 'Trailing ATR short', help: 'Pengali ATR untuk trailing stop short di regime volatilitas sedang.' },
  adx_strong_threshold: { label: 'Batas ADX trend kuat', help: 'ADX di atas angka ini dianggap trend kuat.' },
  entry_vol_mult: { label: 'Filter volume entry', help: 'Volume bar entry minimal sekian kali rata-rata volume.' },
  ema_htf_len: { label: 'EMA timeframe besar', help: 'Panjang EMA filter trend di timeframe lebih besar.' },
  chop_limit: { label: 'Batas choppiness', help: 'Di atas angka ini pasar dianggap sideways — entry diblokir.' },
  cooldown_bars: { label: 'Jeda antar trade (bar)', help: 'Berapa bar menunggu setelah exit sebelum boleh entry lagi.' },
}

const GROUP_COPY: Record<string, string> = {
  Direction: 'Arah',
  'TP / SL': 'TP / SL',
  'TP check': 'Cek TP (exhaustion)',
  Exits: 'Exit',
  'ATR trailing': 'Trailing ATR',
  Regime: 'Regime volatilitas',
  'Entry filters': 'Filter entry',
  'Anti-sideways': 'Anti-sideways',
  'Short filters': 'Filter short',
  'Breakeven lock': 'Kunci breakeven',
  'Order blocks': 'Order block',
  'Risk & sizing': 'Risiko & ukuran posisi',
  Engine: 'Engine',
}

export function paramLabel(spec: LabParamSpec): string {
  return PARAM_COPY[spec.key]?.label ?? spec.label
}

export function groupLabel(group: string): string {
  return GROUP_COPY[group] ?? group
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

export type DatePreset = '1y' | '3y' | 'since2020' | 'custom'

export const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: '1y', label: '1 tahun' },
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
  const d = new Date(Date.UTC(today.getUTCFullYear() - (preset === '1y' ? 1 : 3), today.getUTCMonth(), today.getUTCDate()))
  return { start: isoDate(d), end: '' }
}

/** Which preset (if any) a start/end pair corresponds to. */
export function detectPreset(start: string, end: string, today: Date = new Date()): DatePreset {
  for (const p of ['1y', '3y', 'since2020'] as const) {
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

/** Measured backend timing: 10 trials ≈ 3 min, 30 ≈ 8 min, 60 ≈ 15 min. */
const TRIAL_MINUTES: Record<number, number> = { 10: 3, 30: 8, 60: 15 }

export function estimateMinutes(nTrials: number): number {
  return TRIAL_MINUTES[nTrials] ?? Math.round(nTrials / 4)
}

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
  oos_profit_factor: 'Profit factor holdout',
  oos_net_return: 'Return bersih holdout',
  mc_dd_p95: 'Drawdown terburuk (Monte Carlo 95%)',
  min_oos_trades: 'Jumlah trade holdout',
  cost_stress: 'Tahan biaya 2×',
  sensitivity: 'Parameter rapuh',
  no_liquidation: 'Likuidasi',
}

export function checkLabel(c: LabCheck): string {
  return CHECK_LABEL[c.name] ?? c.label
}

/** One plain-language Indonesian sentence describing a check result. */
export function checkReason(c: LabCheck): string {
  const v = typeof c.value === 'number' && Number.isFinite(c.value) ? c.value : null
  const t = thresholdNumber(c.threshold)
  if (v === null) return `${checkLabel(c)}: tidak ada data (dihitung GAGAL)`
  switch (c.name) {
    case 'oos_profit_factor':
      return `Profit factor di periode holdout ${v >= 999 ? 'tak terhingga (tanpa rugi)' : fmtNum(v)} (minimal ${t ?? 1.2})`
    case 'oos_net_return':
      return `Return bersih holdout setelah biaya ${fmtSignedPct(v)} (harus di atas ${t ?? 0}%)`
    case 'mc_dd_p95':
      return `Drawdown terburuk 95% bisa ${fmtSignedPct(v)} (batas ${fmtSignedPct(t ?? -50)})`
    case 'min_oos_trades':
      return `${fmtNum(v, 0)} trade di holdout (minimal ${t ?? 30} supaya hasilnya bermakna)`
    case 'cost_stress':
      return `Kalau biaya 2× lipat, return holdout jadi ${fmtSignedPct(v)} (harus di atas 0%)`
    case 'sensitivity':
      return `${fmtNum(v, 0)} parameter rapuh — hasil berubah drastis kalau digeser sedikit (maks ${t ?? 3})`
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
