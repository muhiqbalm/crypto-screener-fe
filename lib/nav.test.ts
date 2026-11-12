import { describe, expect, it } from 'vitest'
import {
  HUB_TABS,
  NAV_CLUSTERS,
  activeNavItem,
  hubForPath,
  isNavItemActive,
  isReadableByAll,
  navForRole,
  navItemsForRole,
} from './nav'

describe('menu v2', () => {
  it('admin sees 14 items, other accounts 7', () => {
    expect(navItemsForRole(true)).toHaveLength(14)
    expect(navItemsForRole(false)).toHaveLength(7)
  })

  it('non-admin menu = Beranda + 4 Pasar + Saldo + Webhook', () => {
    expect(navItemsForRole(false).map((i) => i.href)).toEqual([
      '/beranda',
      '/news',
      '/whales',
      '/koin',
      '/chart',
      '/balance',
      '/webhook',
    ])
  })

  it('has at most 3 clusters and Pasar follows the trader funnel', () => {
    expect(NAV_CLUSTERS.length).toBeLessThanOrEqual(3)
    expect(NAV_CLUSTERS.map((c) => c.label)).toEqual(['Pasar', 'Bot & Strategi'])
    expect(NAV_CLUSTERS[0].sections[0].items.map((i) => i.href)).toEqual(['/news', '/whales', '/koin', '/chart'])
  })

  it('strategy items follow the work flow and the live group comes first', () => {
    const { clusters } = navForRole(true)
    const bot = clusters[1]
    expect(bot.sections.map((s) => s.mode)).toEqual(['live', 'paper'])
    expect(bot.sections[1].items.map((i) => i.label)).toEqual([
      'Uji strategi',
      'Hasil uji',
      'Preset',
      'Paper berjalan',
      'Rekam jejak sinyal',
      'Laporan mingguan',
    ])
  })

  it('no duplicate hrefs, no Universal / Screener / old Lab pages in the menu', () => {
    const hrefs = navItemsForRole(true).map((i) => i.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
    for (const old of ['/screener', '/lab/universal', '/lab/outlook', '/lab/strength', '/lab/live-check', '/settings']) {
      expect(hrefs).not.toContain(old)
    }
  })

  it('marks the right item active for sub pages', () => {
    expect(activeNavItem('/lab/runs/12')?.label).toBe('Hasil uji')
    expect(activeNavItem('/lab/compare')?.label).toBe('Hasil uji')
    expect(activeNavItem('/lab/scan')?.label).toBe('Uji strategi')
    expect(activeNavItem('/lab')?.label).toBe('Uji strategi')
    expect(activeNavItem('/journal')?.label).toBe('Paper berjalan')
    expect(activeNavItem('/koin/ETH')?.label).toBe('Peluang koin')
    expect(activeNavItem('/beranda')?.label).toBe('Beranda')
    expect(isNavItemActive({ href: '/lab', exact: true }, '/lab/presets')).toBe(false)
  })

  it('hubs have max 3 tabs and own their paths', () => {
    for (const tabs of Object.values(HUB_TABS)) expect(tabs.length).toBeLessThanOrEqual(3)
    expect(hubForPath('/lab/scan')).toBe('uji')
    expect(hubForPath('/lab/leaderboard')).toBe('hasil')
    expect(hubForPath('/lab/runs/7')).toBe('hasil')
    expect(hubForPath('/journal')).toBe('paper')
    expect(hubForPath('/lab/presets')).toBeNull()
  })

  it('Laporan is readable by every logged-in account, other Lab pages are not', () => {
    expect(isReadableByAll('/lab/report')).toBe(true)
    expect(isReadableByAll('/lab/report/print')).toBe(true)
    expect(isReadableByAll('/lab')).toBe(false)
    expect(isReadableByAll('/lab/reports')).toBe(false)
  })
})
