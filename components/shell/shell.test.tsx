import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HubTabs } from './HubTabs'
import { SidebarNav } from './SidebarNav'
import { fearGreed, fundingInfo, largeFlow, ribbonSentence, traderStance } from './market-ribbon-logic'

let mockPath = '/lab/leaderboard'
vi.mock('next/navigation', () => ({ usePathname: () => mockPath }))

describe('HubTabs', () => {
  it('marks the tab of the current path (max 3)', () => {
    mockPath = '/lab/leaderboard'
    render(<HubTabs hub="hasil" label="Sub-menu Hasil uji" />)
    const current = screen.getAllByRole('link', { current: 'page' })
    // phone segmented + desktop underline: both mark the same tab
    expect(current.map((a) => a.textContent)).toEqual(['Peringkat', 'Peringkat'])
    expect(screen.getAllByRole('link')).toHaveLength(6)
  })

  it('supports query-string views through `value`', () => {
    mockPath = '/koin'
    render(<HubTabs hub="koin" value="terkuat" label="Tampilan" />)
    expect(screen.getAllByRole('link', { current: 'page' })[0]).toHaveTextContent('Terkuat')
  })
})

describe('SidebarNav', () => {
  it('admin sees both groups with LIVE / PAPER pills', () => {
    mockPath = '/beranda'
    render(<SidebarNav isAdmin adminCheck="admin" />)
    expect(screen.getAllByRole('link')).toHaveLength(14)
    expect(screen.getByText('LIVE')).toBeInTheDocument()
    expect(screen.getByText('PAPER')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Beranda' })).toHaveAttribute('aria-current', 'page')
  })

  it('member sees 8 items; a failed admin check is explained, not silent', () => {
    mockPath = '/beranda'
    render(<SidebarNav isAdmin={false} adminCheck="error" onRetryAdmin={() => {}} />)
    expect(screen.getAllByRole('link')).toHaveLength(8)
    expect(screen.getByRole('link', { name: 'Laporan mingguan' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('tidak bisa dicek')
    expect(screen.getByRole('button', { name: /Coba lagi/ })).toBeInTheDocument()
  })

  it('drawer shows the one-line hints', () => {
    render(<SidebarNav isAdmin={false} showHints />)
    expect(screen.getByText('Koin mana yang layak dilihat, ke arah mana')).toBeInTheDocument()
  })
})

describe('market ribbon logic', () => {
  it('fear & greed: the source label wins, bands are the fallback (same as /news)', () => {
    expect(fearGreed({ fearAndGreed: { value: 38, classification: 'Fear' } })).toEqual({ value: 38, zone: 'takut' })
    expect(fearGreed({ fearAndGreed: { value: 30, classification: 'Extreme Fear' } })).toEqual({ value: 30, zone: 'sangat takut' })
    expect(fearGreed({ fearAndGreed: { value: 62, classification: null } })?.zone).toBe('serakah')
    expect(fearGreed({ fearAndGreed: null })).toBeNull()
  })

  it('top traders and large trades', () => {
    const w = {
      topTraderRatios: [
        { symbol: 'BTC', longPct: 58, shortPct: 42, lsRatio: 1.38, updated: '' },
        { symbol: 'ETH', longPct: 54, shortPct: 46, lsRatio: 1.17, updated: '' },
      ],
      smartMoneyStanceCode: 'bullish' as const,
      largeTradeNetUsd: -1_250_000,
      largeTradeWindowSeconds: 720,
    }
    expect(traderStance(w)?.text).toBe('condong long 56%')
    expect(traderStance({ ...w, smartMoneyStanceCode: 'neutral' })?.text).toBe('seimbang (56% long)')
    expect(traderStance({})).toBeNull()
    const f = largeFlow(w)
    expect(f?.word).toBe('jual > beli')
    expect(f?.amount).toBe('−$1.3M')
    expect(f?.window).toBe('12 mnt')
  })

  it('funding says who pays and the sentence handles missing data', () => {
    expect(fundingInfo(0.0123)).toEqual({ rate: 0.0123, text: '+0.0123%', payer: 'long membayar' })
    expect(fundingInfo(null)).toBeNull()
    expect(ribbonSentence({ btc: null, eth: null, fg: null, stance: null, flow: null })).toBe('Data kondisi pasar tidak tersedia.')
    expect(ribbonSentence({ btc: 'Datar', eth: 'Turun', fg: { value: 38, zone: 'takut' }, stance: null, flow: null })).toBe(
      'Pasar: BTC datar, ETH turun, takut–serakah 38 (takut).',
    )
  })
})
