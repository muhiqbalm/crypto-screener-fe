import { describe, it, expect } from 'vitest'
import { splitSegments } from './EquityChart'

describe('splitSegments', () => {
  it('splits contiguous segments and bridges boundaries', () => {
    const s = splitSegments([
      { t: '2024-01-01T00:00:00Z', equity: 100, segment: 'is' },
      { t: '2024-01-02T00:00:00Z', equity: 110, segment: 'is' },
      { t: '2024-01-03T00:00:00Z', equity: 105, segment: 'oos' },
      { t: '2024-01-03T00:00:00Z', equity: 106, segment: 'oos' },
      { t: '2024-01-04T00:00:00Z', equity: 120, segment: 'holdout' },
    ])
    expect(s.map((x) => x.segment)).toEqual(['is', 'oos', 'holdout'])
    expect(s[1].data.map((d) => d.value)).toEqual([110, 106])
    expect(s[2].data[0].value).toBe(106)
  })
})

describe('chart axis numbers (audit 2026-11-13 P11)', () => {
  it('formats prices as 1,234.56 and percents with a real minus sign', async () => {
    const { chartPercentFormatter, chartPriceFormatter, getChartTheme } = await import('@/lib/chart-theme')
    expect(chartPriceFormatter(16000)).toBe('16,000.00')
    expect(chartPriceFormatter(335)).toBe('335.00')
    expect(chartPriceFormatter(-1234.5)).toBe('−1,234.50')
    expect(chartPriceFormatter(0.01234)).toBe('0.0123')
    expect(chartPercentFormatter(0)(-5)).toBe('−5%')
    expect(chartPercentFormatter(1)(12.34)).toBe('+12.3%')
    expect(getChartTheme(true).fontSize).toBe(13)
  })
})
