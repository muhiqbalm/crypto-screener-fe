import { describe, expect, it } from 'vitest'
import { botMock, mockBotStatus } from './bot'

describe('bot status mock', () => {
  it('serves only GET /api/v1/lab/bot/status', () => {
    expect(botMock('GET', '/api/v1/lab/bot/status')?.value).toMatchObject({ available: true, active_accounts: 1 })
    expect(botMock('POST', '/api/v1/lab/bot/status')).toBeNull()
    expect(botMock('GET', '/api/v1/lab/live-check?bars=42')).toBeNull()
  })

  it('never carries a passphrase or user id', () => {
    expect(JSON.stringify(mockBotStatus(Date.parse('2026-11-12T05:00:00Z')))).not.toMatch(/passphrase|user_id|user-/i)
  })
})
