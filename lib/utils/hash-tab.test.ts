/**
 * Unit tests for hash-tab helpers (Task 4.4)
 * Requirements: 2.4, 2.7, 2.8, 2.9
 */

import { describe, it, expect } from 'vitest'
import { tabIdFromHash, HASH_TO_TAB, setTabHash, type TabId } from './hash-tab'

// ---------------------------------------------------------------------------
// HASH_TO_TAB mapping
// ---------------------------------------------------------------------------
describe('HASH_TO_TAB', () => {
  it('maps "#screener" to "screener"', () => {
    expect(HASH_TO_TAB['#screener']).toBe('screener')
  })

  it('maps "#webhook" to "webhook"', () => {
    expect(HASH_TO_TAB['#webhook']).toBe('webhook')
  })

  it('contains exactly 2 entries', () => {
    expect(Object.keys(HASH_TO_TAB)).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// tabIdFromHash
// ---------------------------------------------------------------------------
describe('tabIdFromHash', () => {
  it('returns "screener" for "#screener"', () => {
    expect(tabIdFromHash('#screener')).toBe('screener')
  })

  it('returns "webhook" for "#webhook"', () => {
    expect(tabIdFromHash('#webhook')).toBe('webhook')
  })

  it('returns "screener" for unrecognised hash (fallback)', () => {
    expect(tabIdFromHash('#unknown')).toBe('screener')
  })

  it('returns "screener" for empty string', () => {
    expect(tabIdFromHash('')).toBe('screener')
  })

  it('returns "screener" for hash with no leading #', () => {
    expect(tabIdFromHash('screener')).toBe('screener')
  })

  it('returns "screener" for completely random string', () => {
    expect(tabIdFromHash('#foobar')).toBe('screener')
  })

  it('is case-sensitive (uppercase does not match)', () => {
    // "#SCREENER" is not in the map, so falls back to "screener"
    expect(tabIdFromHash('#SCREENER')).toBe('screener')
  })
})

// ---------------------------------------------------------------------------
// setTabHash
// ---------------------------------------------------------------------------
describe('setTabHash', () => {
  it('sets window.location.hash to the tab id', () => {
    setTabHash('webhook')
    expect(window.location.hash).toBe('#webhook')
  })

  it('sets window.location.hash to "screener"', () => {
    setTabHash('screener')
    expect(window.location.hash).toBe('#screener')
  })
})

// ---------------------------------------------------------------------------
// Round-trip: setTabHash → tabIdFromHash
// ---------------------------------------------------------------------------
describe('hash round-trip', () => {
  const tabIds: TabId[] = ['screener', 'webhook']

  tabIds.forEach((id) => {
    it(`round-trips "${id}" through hash`, () => {
      setTabHash(id)
      const recovered = tabIdFromHash(window.location.hash)
      expect(recovered).toBe(id)
    })
  })
})
