import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { AiFactorsResponse, AiSummary } from '@/lib/api/types/ai'

const state: { data: AiFactorsResponse | undefined; error: unknown } = { data: undefined, error: null }
vi.mock('@/lib/queries/ai', () => ({ useAiFactors: () => ({ data: state.data, error: state.error }) }))

import { AiFactorCard, AiFactorLine, AI_LABEL } from './AiFactorSummary'
import { getAiMock } from '@/lib/mocks/ai'

const SUMMARY: AiSummary = {
  symbol: 'BTCUSDT', bar: '2026-11-11T20:00:00Z', bar_close: '2026-11-12T00:00:00Z', created_at: '2026-11-12T00:06:40Z',
  sentence: 'SHORT berkeyakinan rendah: funding +0.0076% mendukung, tetapi top trader 56.2% long melemahkan.',
  factors: [
    { factor: 'funding', label: 'Funding', value: 'funding +0.0076%, long ramai', effect: 'mendukung', source: 'Binance via screener BMTM' },
    { factor: 'arus_whale', label: 'Arus whale', value: 'top trader 56.2% long', effect: 'melemahkan', source: 'Binance Futures' },
    { factor: 'rezim_btc', label: 'Kondisi pasar (BTC)', value: 'Pasar datar / transisi', effect: 'netral', source: 'Regime BTC' },
  ],
  data_gaps: ['Berita: tidak ada headline terbaru yang menyebut koin ini.'],
}
const on = (summary: AiSummary | null, note: string | null = null): AiFactorsResponse => ({
  symbol: 'BTCUSDT', enabled: true, label: AI_LABEL, summary, reason: note ? 'pending' : null, note,
})

describe('Ringkasan AI', () => {
  beforeEach(() => {
    state.data = undefined
    state.error = null
  })

  it('shows the sentence, the factors with their effect in words, the label and the data time', () => {
    state.data = on(SUMMARY)
    render(<AiFactorCard symbol="BTCUSDT" />)
    expect(screen.getByRole('region', { name: 'Ringkasan AI' })).toBeInTheDocument()
    expect(screen.getByText(SUMMARY.sentence)).toBeInTheDocument()
    expect(screen.getByText(AI_LABEL)).toBeInTheDocument()
    expect(screen.getByText('Mendukung')).toBeInTheDocument()
    expect(screen.getByText('Melemahkan')).toBeInTheDocument()
    expect(screen.getByText('Netral')).toBeInTheDocument()
    expect(screen.getByText('Sumber: Binance via screener BMTM')).toBeInTheDocument()
    expect(screen.getByText(/Data kosong \(tidak ditebak\)/)).toBeInTheDocument()
    expect(screen.getByText(/Data close 4H 12 Nov 07:00 WIB/)).toBeInTheDocument()
    expect(screen.queryByText(/biaya \$/)).not.toBeInTheDocument()          // cost is admin-only meta
  })

  it('shows model and cost only when the backend sent admin meta', () => {
    state.data = on({ ...SUMMARY, meta: { model: 'claude-opus-5-5', effort: 'low', cost_usd: 0.0141, input_tokens: 1,
      output_tokens: 1, cache_read_tokens: 1, dropped_factors: 0, effects_overridden: 0, fallback_model: null } })
    render(<AiFactorCard symbol="BTCUSDT" />)
    expect(screen.getByText(/claude-opus-5-5 · biaya \$0\.0141/)).toBeInTheDocument()
  })

  it('keeps the page explanation in one folded "Rincian", with or without an AI summary', () => {
    state.data = on(SUMMARY)
    const { container, rerender } = render(<AiFactorCard symbol="BTCUSDT" detail={['Kenapa: tren turun.', 'Risiko: funding negatif.']} />)
    const fold = container.querySelector('details')
    expect(fold).not.toHaveAttribute('open')
    expect(fold).toHaveTextContent('Rincian: kenapa, bukti, risiko')
    expect(fold).toHaveTextContent('Kenapa: tren turun.')
    expect(container.querySelectorAll('details')).toHaveLength(1)
    state.data = { symbol: 'BTCUSDT', enabled: false, label: AI_LABEL, summary: null, reason: null, note: null }
    rerender(<AiFactorCard symbol="BTCUSDT" detail={['Kenapa: tren turun.']} />)
    expect(container.querySelector('details')).not.toHaveAttribute('open')
    expect(screen.getByText('Kenapa: tren turun.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Ringkasan AI' })).not.toBeInTheDocument()
  })

  it('renders nothing for members while the feature is off, loading or failing', () => {
    state.data = { symbol: 'BTCUSDT', enabled: false, label: AI_LABEL, summary: null, reason: null, note: null }
    const { container, rerender } = render(<AiFactorCard symbol="BTCUSDT" />)
    expect(container).toBeEmptyDOMElement()
    rerender(<AiFactorLine symbol="BTCUSDT" />)
    expect(container).toBeEmptyDOMElement()
    state.data = undefined
    rerender(<AiFactorCard symbol="BTCUSDT" />)
    expect(container).toBeEmptyDOMElement()
    state.data = on(SUMMARY)
    state.error = new Error('403')
    rerender(<AiFactorCard symbol="BTCUSDT" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('gives admins one subtle line when the feature is off', () => {
    state.data = { symbol: 'BTCUSDT', enabled: false, label: AI_LABEL, summary: null, reason: 'no_key', note: 'AI belum aktif — perlu API key' }
    render(<AiFactorCard symbol="BTCUSDT" />)
    expect(screen.getByTestId('ai-note')).toHaveTextContent('AI belum aktif — perlu API key')
    expect(screen.queryByRole('region', { name: 'Ringkasan AI' })).not.toBeInTheDocument()
  })

  it('compact line: sentence, label, data time and effect counts, with no controls inside the card link', () => {
    state.data = on(SUMMARY)
    const { container } = render(<AiFactorLine symbol="BTCUSDT" />)
    expect(screen.getByTestId('ai-line')).toHaveTextContent(SUMMARY.sentence)
    expect(screen.getByText(`${AI_LABEL} · data 12 Nov 07:00 WIB · 1 mendukung · 1 melemahkan`)).toBeInTheDocument()
    expect(container.querySelectorAll('a, button')).toHaveLength(0)
  })
})

describe('Ringkasan AI mock (mock mode only)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('serves a summary for mocked coins, a pending note for others, and the off state on demand', () => {
    const btc = getAiMock('GET', '/api/v1/lab/ai/factors?symbol=BTC')?.value as AiFactorsResponse
    expect(btc.summary?.sentence).toMatch(/^SHORT/)
    expect(btc.summary?.meta?.model).toBe('claude-opus-5-5')
    const xrp = getAiMock('GET', '/api/v1/lab/ai/factors?symbol=XRPUSDT')?.value as AiFactorsResponse
    expect(xrp.summary).toBeNull()
    expect(xrp.note).toMatch(/belum dibuat/)
    vi.stubEnv('NEXT_PUBLIC_MOCK_AI', 'off')
    const off = getAiMock('GET', '/api/v1/lab/ai/factors?symbol=BTC')?.value as AiFactorsResponse
    expect(off.enabled).toBe(false)
    expect(off.note).toBe('AI belum aktif — perlu API key')
    vi.stubEnv('NEXT_PUBLIC_MOCK_NON_ADMIN', 'true')
    const member = getAiMock('GET', '/api/v1/lab/ai/factors?symbol=BTC')?.value as AiFactorsResponse
    expect(member.note).toBeNull()
    expect(getAiMock('GET', '/api/v1/lab/outlook')).toBeUndefined()
  })
})
