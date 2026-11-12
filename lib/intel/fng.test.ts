import { describe, expect, it } from 'vitest'
import { FNG_ZONES, fngPhrase, fngZone } from './fng'

describe('Fear & Greed zones', () => {
  it('cover 0–100 without gaps or overlaps', () => {
    for (let v = 0; v <= 100; v++) expect(FNG_ZONES.filter((z) => v >= z.from && v <= z.to)).toHaveLength(1)
  })

  it('prefer the source classification over the numeric band', () => {
    expect(fngZone(44, 'Neutral')?.key).toBe('netral')
    expect(fngZone(44, null)?.key).toBe('takut')
    expect(fngZone(45, null)?.key).toBe('netral') // same bands as the market ribbon
    expect(fngZone(10, 'Extreme Fear')?.label).toBe('Sangat takut')
    expect(fngZone(90, 'EXTREME GREED')?.key).toBe('sangat_serakah')
    expect(fngZone(null, null)).toBeNull()
  })

  it('never use the up/down colours: extremes warn, the rest info or muted', () => {
    expect(FNG_ZONES.map((z) => z.tone)).toEqual(['warn', 'info', 'muted', 'info', 'warn'])
  })

  it('builds a lower-case phrase for sentences', () => {
    expect(fngPhrase(38, 'Fear')).toBe('takut (38 dari 100)')
    expect(fngPhrase(null, 'Fear')).toBeNull()
  })
})
