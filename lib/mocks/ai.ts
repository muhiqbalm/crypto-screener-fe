/**
 * Mock mode only (NEXT_PUBLIC_USE_MOCK_DATA=true): Ringkasan AI (GET /api/v1/lab/ai/*).
 * ILLUSTRATIVE text: no model was called. Numbers are copied from the other mocks
 * (outlook-data.json funding / signals, the /whales and /news mocks) so the pages agree.
 *
 * QA switches:
 *   NEXT_PUBLIC_MOCK_AI=off          feature off (admins see "AI belum aktif — perlu API key")
 *   NEXT_PUBLIC_MOCK_NON_ADMIN=true  member view: no reason, no note, no cost meta
 */
import type { AiFactorsResponse, AiStatusResponse, AiSummary } from '@/lib/api/types/ai'

const LABEL = 'AI · bisa salah · bukan saran investasi'
const BAR = '2026-11-11T20:00:00Z'
const BAR_CLOSE = '2026-11-12T00:00:00Z'
const SRC = {
  rezim_btc: 'Regime BTC harian (Outlook BMTM)',
  funding: 'Binance via screener BMTM',
  open_interest: 'Binance',
  arus_whale: 'Binance Futures (top trader, transaksi besar)',
  fear_greed: 'alternative.me',
  berita: 'CoinTelegraph RSS',
} as const
const NO_NEWS = 'Berita: tidak ada headline terbaru yang menyebut koin ini.'
const NO_WHALE = 'Arus whale: tidak tersedia untuk koin ini (data whale BMTM hanya BTC, ETH, SOL, DOGE).'

function summary(symbol: string, sentence: string, factors: AiSummary['factors'], gaps: string[], cost: number): AiSummary {
  return {
    symbol, bar: BAR, bar_close: BAR_CLOSE, created_at: '2026-11-12T00:06:40Z', sentence, factors, data_gaps: gaps,
    meta: {
      model: 'claude-opus-5-5', effort: 'low', cost_usd: cost, input_tokens: 412, output_tokens: 538,
      cache_read_tokens: 1004, dropped_factors: 0, effects_overridden: 0, fallback_model: null,
    },
  }
}

const SUMMARIES: Record<string, AiSummary> = {
  '1000PEPEUSDT': summary('1000PEPEUSDT',
    'SHORT dengan keyakinan sedang pada posisi baru; funding −0.0144% menandakan short mulai ramai sehingga sedikit melemahkan, sementara kondisi pasar BTC dan open interest netral.',
    [
      { factor: 'funding', label: 'Funding', value: 'funding −0.0144%, short ramai (sinyal BULLISH)', effect: 'melemahkan', source: SRC.funding },
      { factor: 'rezim_btc', label: 'Kondisi pasar (BTC)', value: 'Pasar datar / transisi', effect: 'netral', source: SRC.rezim_btc },
      { factor: 'open_interest', label: 'Open interest', value: 'sinyal OI screener NEUTRAL', effect: 'netral', source: SRC.open_interest },
      { factor: 'fear_greed', label: 'Fear & Greed', value: '38 (Fear), suasana seluruh pasar', effect: 'netral', source: SRC.fear_greed },
    ],
    [NO_WHALE, NO_NEWS], 0.0128),
  BTCUSDT: summary('BTCUSDT',
    'SHORT berkeyakinan rendah: funding +0.0076% (long ramai) mendukung, tetapi top trader 56.2% long dan transaksi besar net +$2.06M cenderung melemahkan; kondisi pasar BTC datar.',
    [
      { factor: 'arus_whale', label: 'Arus whale', value: 'top trader 56.2% long; net +$2.06M dalam 12 menit', effect: 'melemahkan', source: SRC.arus_whale },
      { factor: 'funding', label: 'Funding', value: 'funding +0.0076%, long ramai (sinyal BEARISH)', effect: 'mendukung', source: SRC.funding },
      { factor: 'rezim_btc', label: 'Kondisi pasar (BTC)', value: 'Pasar datar / transisi', effect: 'netral', source: SRC.rezim_btc },
      { factor: 'open_interest', label: 'Open interest', value: 'sinyal OI screener NEUTRAL', effect: 'netral', source: SRC.open_interest },
      { factor: 'fear_greed', label: 'Fear & Greed', value: '38 (Fear)', effect: 'netral', source: SRC.fear_greed },
    ],
    [NO_NEWS], 0.0141),
  ETHUSDT: summary('ETHUSDT',
    'SHORT berkeyakinan rendah tanpa keunggulan historis; funding +0.0058% mendukung, tetapi sinyal OI BULLISH dan top trader 58.4% long melemahkan arah ini.',
    [
      { factor: 'open_interest', label: 'Open interest', value: 'sinyal OI screener BULLISH', effect: 'melemahkan', source: SRC.open_interest },
      { factor: 'arus_whale', label: 'Arus whale', value: 'top trader 58.4% long', effect: 'melemahkan', source: SRC.arus_whale },
      { factor: 'funding', label: 'Funding', value: 'funding +0.0058%, long ramai (sinyal BEARISH)', effect: 'mendukung', source: SRC.funding },
      { factor: 'rezim_btc', label: 'Kondisi pasar (BTC)', value: 'Pasar datar / transisi', effect: 'netral', source: SRC.rezim_btc },
    ],
    [NO_NEWS], 0.0133),
  SOLUSDT: summary('SOLUSDT',
    'Tidak ada arah Outlook (condong turun, belum terbukti); sinyal OI BULLISH sedikit melemahkan kecondongan itu, faktor lain netral.',
    [
      { factor: 'open_interest', label: 'Open interest', value: 'sinyal OI screener BULLISH', effect: 'melemahkan', source: SRC.open_interest },
      { factor: 'arus_whale', label: 'Arus whale', value: 'top trader 53.1% long, seimbang', effect: 'netral', source: SRC.arus_whale },
      { factor: 'funding', label: 'Funding', value: 'funding −0.0001%, sinyal NEUTRAL', effect: 'netral', source: SRC.funding },
    ],
    [NO_NEWS], 0.0119),
}

const nonAdmin = () => process.env.NEXT_PUBLIC_MOCK_NON_ADMIN === 'true'
const off = () => process.env.NEXT_PUBLIC_MOCK_AI === 'off'

function factors(symbol: string): AiFactorsResponse {
  const raw = symbol.toUpperCase().replace('/', '')
  const sym = raw.endsWith('USDT') ? raw : `${raw}USDT`
  const admin = !nonAdmin()
  if (off()) {
    return { symbol: sym, enabled: false, label: LABEL, summary: null,
      reason: admin ? 'no_key' : null, note: admin ? 'AI belum aktif — perlu API key' : null }
  }
  const s = SUMMARIES[sym]
  if (s) {
    const { meta, ...pub } = s
    return { symbol: sym, enabled: true, label: LABEL, summary: admin ? { ...pub, meta } : pub, reason: null, note: null }
  }
  return { symbol: sym, enabled: true, label: LABEL, summary: null,
    reason: admin ? 'pending' : null, note: admin ? 'Ringkasan AI untuk close 4H terakhir belum dibuat' : null }
}

/** Returns undefined when the path is not a Ringkasan AI endpoint (caller falls through). */
export function getAiMock(method: string, fullPath: string): { value: unknown } | undefined {
  const [path, query = ''] = fullPath.split('?')
  if (method !== 'GET' || !path.startsWith('/api/v1/lab/ai/')) return undefined
  if (path === '/api/v1/lab/ai/factors') return { value: factors(new URLSearchParams(query).get('symbol') ?? '') }
  if (path === '/api/v1/lab/ai/status') {
    const st: AiStatusResponse = { enabled: !off(), active: !off(), label: LABEL }
    return { value: nonAdmin() ? st : { ...st, reason: off() ? 'no_key' : null, model: 'claude-opus-5-5', effort: 'low' } }
  }
  return undefined
}
