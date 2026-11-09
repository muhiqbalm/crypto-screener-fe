/**
 * Pure helpers for the Strategy Lab forms: schema → form state, form state →
 * API payload, and small presentation rules (verdict, holdout warning, scan
 * sorting). Kept free of React so they can be unit-tested directly.
 */
import type {
  LabCosts,
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

export interface ParamGroup {
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
export function validateParam(spec: LabParamSpec, raw: ParamFormValue | undefined): string | null {
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

export function toCostsPayload(c: CostFormValues): LabCosts {
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

export interface RunFormState {
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

/** Empty dates are omitted (backend then uses all available data). */
export function buildRunRequest(f: RunFormState, mode: LabRunMode): LabRunCreateRequest {
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
  return req
}

export function buildScanRequest(args: {
  template: LabTemplate
  symbols: string[]
  timeframes: string[]
  params: ParamFormValues | null
  costs: CostFormValues
  mode: LabScanMode
}): LabScanCreateRequest {
  const req: LabScanCreateRequest = {
    template_id: args.template.id,
    symbols: [...args.symbols],
    timeframes: [...args.timeframes],
    costs: toCostsPayload(args.costs),
    mode: args.mode,
  }
  if (args.params) req.params = toParamsPayload(args.template, args.params)
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
export const TOP_30_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT',
  'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'TRXUSDT', 'DOTUSDT', 'LTCUSDT',
  'BCHUSDT', 'SUIUSDT', 'NEARUSDT', 'APTUSDT', 'ARBUSDT', 'OPUSDT',
  'TONUSDT', 'UNIUSDT', 'ATOMUSDT', 'FILUSDT', 'ETCUSDT', 'INJUSDT',
  'AAVEUSDT', 'WLDUSDT', 'SEIUSDT', 'TIAUSDT', 'HBARUSDT', 'XLMUSDT',
] as const

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

export interface VerdictCopy {
  tone: 'pass' | 'fail' | 'none'
  title: string
  body: string
}

export function verdictCopy(verdict: LabVerdict, mode: LabRunMode, status: LabStatus): VerdictCopy {
  if (status !== 'done') {
    return {
      tone: 'none',
      title: 'Belum ada verdict',
      body: 'Verdict baru muncul setelah run selesai.',
    }
  }
  if (verdict === 'PASS') {
    return {
      tone: 'pass',
      title: 'PASS — lolos semua cek kejujuran',
      body: 'Strategi lolos uji out-of-sample. Tetap bukan jaminan profit; forward-test dulu sebelum live.',
    }
  }
  if (verdict === 'FAIL') {
    return {
      tone: 'fail',
      title: 'FAIL — jangan dipakai live',
      body: 'Minimal satu cek kejujuran gagal. Hasil backtest yang bagus di sini kemungkinan besar kebetulan atau overfit.',
    }
  }
  return {
    tone: 'none',
    title: mode === 'backtest' ? 'Backtest saja — belum divalidasi' : 'Tanpa verdict',
    body:
      mode === 'backtest'
        ? 'Backtest in-sample bukan bukti. Jalankan mode Validate untuk dapat verdict PASS/FAIL.'
        : 'Backend tidak mengembalikan verdict untuk run ini.',
  }
}

// ---------------------------------------------------------------------------
// Metric formatting helpers
// ---------------------------------------------------------------------------

const METRIC_LABELS: Record<string, string> = {
  net_return_pct: 'Net return',
  profit_factor: 'Profit factor',
  max_dd_pct: 'Max drawdown',
  trades: 'Jumlah trade',
  win_rate_pct: 'Win rate',
  sharpe: 'Sharpe',
  sortino: 'Sortino',
  cagr_pct: 'CAGR',
  avg_trade_pct: 'Rata-rata per trade',
  expectancy_pct: 'Expectancy',
  exposure_pct: 'Exposure',
  calmar: 'Calmar',
}

/** Known metrics first in a stable order, then anything else the backend sends. */
export function orderedMetricKeys(...sources: (Record<string, unknown> | null | undefined)[]): string[] {
  const all = new Set<string>()
  for (const s of sources) if (s) for (const k of Object.keys(s)) all.add(k)
  const known = Object.keys(METRIC_LABELS).filter((k) => all.has(k))
  const rest = [...all].filter((k) => !(k in METRIC_LABELS)).sort()
  return [...known, ...rest]
}

export function metricLabel(key: string): string {
  if (METRIC_LABELS[key]) return METRIC_LABELS[key]
  const base = key.replace(/_pct$/, '').replace(/_/g, ' ')
  return base.charAt(0).toUpperCase() + base.slice(1)
}
