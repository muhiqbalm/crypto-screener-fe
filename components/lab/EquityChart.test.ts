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
