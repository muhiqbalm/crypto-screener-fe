/**
 * Unit tests for mock data module (Task 2.4)
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6
 */

import { describe, it, expect } from 'vitest'
import { MOCK_SCREENER } from './screener'
import { MOCK_WEBHOOK_CONFIG } from './webhook'
import { MOCK_TRADE_LOG } from './trades'
import type { SignalDirection, TierClass } from '@/lib/api/types/screener'
import type { TradeStatus } from '@/lib/api/types/trades'

// ---------------------------------------------------------------------------
// MOCK_SCREENER
// ---------------------------------------------------------------------------
describe('MOCK_SCREENER', () => {
  it('has at least 12 assets', () => {
    expect(MOCK_SCREENER.assets).not.toBeNull()
    expect(MOCK_SCREENER.assets!.length).toBeGreaterThanOrEqual(12)
  })

  it('covers all SignalDirection values', () => {
    const signals = new Set<SignalDirection>()
    for (const asset of MOCK_SCREENER.assets ?? []) {
      if (asset.signal) signals.add(asset.signal)
    }
    expect(signals.has('BULLISH')).toBe(true)
    expect(signals.has('BEARISH')).toBe(true)
    expect(signals.has('NEUTRAL')).toBe(true)
  })

  it('covers all TierClass values', () => {
    const tiers = new Set<TierClass>()
    for (const asset of MOCK_SCREENER.assets ?? []) {
      if (asset.tier) tiers.add(asset.tier)
    }
    expect(tiers.has('A')).toBe(true)
    expect(tiers.has('B')).toBe(true)
    expect(tiers.has('C')).toBe(true)
  })

  it('has metadata with required fields', () => {
    expect(MOCK_SCREENER.metadata).toBeDefined()
    expect(typeof MOCK_SCREENER.metadata.timestamp).toBe('string')
    expect(typeof MOCK_SCREENER.metadata.symbols_count).toBe('number')
  })

  it('has summary with top_3_assets and market_overview', () => {
    expect(MOCK_SCREENER.summary.top_3_assets).toHaveLength(3)
    expect(MOCK_SCREENER.summary.market_overview).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// MOCK_WEBHOOK_CONFIG
// ---------------------------------------------------------------------------
describe('MOCK_WEBHOOK_CONFIG', () => {
  it('has is_active = true', () => {
    expect(MOCK_WEBHOOK_CONFIG.is_active).toBe(true)
  })

  it('has a 16-character passphrase', () => {
    expect(MOCK_WEBHOOK_CONFIG.passphrase).toHaveLength(16)
  })

  it('has a non-empty id', () => {
    expect(MOCK_WEBHOOK_CONFIG.id).toBeTruthy()
  })

  it('has a created_at timestamp', () => {
    expect(MOCK_WEBHOOK_CONFIG.created_at).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// MOCK_TRADE_LOG
// ---------------------------------------------------------------------------
describe('MOCK_TRADE_LOG', () => {
  it('is an array', () => {
    expect(Array.isArray(MOCK_TRADE_LOG)).toBe(true)
  })

  it('covers success, failed, and pending statuses', () => {
    const statuses = new Set<TradeStatus>(MOCK_TRADE_LOG.map((t) => t.status))
    expect(statuses.has('success')).toBe(true)
    expect(statuses.has('failed')).toBe(true)
    expect(statuses.has('pending')).toBe(true)
  })

  it('each entry has required fields', () => {
    for (const trade of MOCK_TRADE_LOG) {
      expect(trade.id).toBeTruthy()
      expect(trade.symbol).toBeTruthy()
      expect(trade.action).toMatch(/^(open|close)$/)
      expect(trade.side).toMatch(/^(long|short)$/)
      expect(trade.status).toMatch(/^(success|failed|pending|rejected)$/)
    }
  })
})
