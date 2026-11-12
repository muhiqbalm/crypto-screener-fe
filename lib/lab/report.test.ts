import { describe, expect, it } from 'vitest'
import {
  NOTIF_TYPE_LABEL,
  defaultWeek,
  reportHooks,
  reportKind,
  safeNotificationLink,
  signedPct,
  topFindings,
  unreadBadge,
  weekKind,
  weekLabel,
  weekPeriod,
  wibTime,
} from './report'
import type { ReportWeek, ReportWeeksResponse, WeeklyReport } from '@/lib/api/types/report'

describe('weekLabel (Monday to Monday, WIB)', () => {
  it('formats one month', () => {
    expect(weekLabel({ week: '2026-W46', start: '2026-11-09T00:00:00Z', end: '2026-11-16T00:00:00Z' })).toBe('9–16 Nov 2026')
  })
  it('formats across months', () => {
    expect(weekLabel({ week: '2026-W49', start: '2026-11-30T00:00:00Z', end: '2026-12-07T00:00:00Z' })).toBe('30 Nov – 7 Des 2026')
  })
  it('spells out the period in WIB with UTC in brackets', () => {
    expect(weekPeriod({ start: '2026-11-09T00:00:00Z', end: '2026-11-16T00:00:00Z' })).toBe(
      'Senin 9 Nov 07:00 WIB – Senin 16 Nov 07:00 WIB (00:00 UTC)',
    )
    expect(wibTime('2026-11-12T01:00:00Z')).toBe('12 Nov 08:00 WIB')
    expect(wibTime(null)).toBe('—')
  })
  it('falls back to the id on bad dates', () => {
    expect(weekLabel({ week: '2026-W46', start: 'x', end: 'y' })).toBe('2026-W46')
  })
})

describe('unreadBadge', () => {
  it('hides zero and caps', () => {
    expect(unreadBadge(0)).toBeNull()
    expect(unreadBadge(undefined)).toBeNull()
    expect(unreadBadge(7)).toBe('7')
    expect(unreadBadge(150)).toBe('99+')
  })
})

describe('safeNotificationLink', () => {
  it('only allows in-app paths', () => {
    expect(safeNotificationLink('/lab/runs/1')).toBe('/lab/runs/1')
    expect(safeNotificationLink('//evil.example')).toBeNull()
    expect(safeNotificationLink('https://evil.example')).toBeNull()
    expect(safeNotificationLink(null)).toBeNull()
  })
})

const wk = (week: string, over: Partial<ReportWeek> = {}): ReportWeek => ({
  week, start: '2026-11-09T00:00:00Z', end: '2026-11-16T00:00:00Z', current: false, snapshot: false, generated_at: null, ...over,
})

describe('defaultWeek', () => {
  it('opens the newest frozen snapshot, not the heavy running week', () => {
    const r: ReportWeeksResponse = {
      current: '2026-W47',
      weeks: [wk('2026-W47', { current: true }), wk('2026-W46', { snapshot: true }), wk('2026-W45', { snapshot: true })],
    }
    expect(defaultWeek(r)).toBe('2026-W46')
  })
  it('falls back to the running week before the first snapshot', () => {
    expect(defaultWeek({ current: '2026-W47', weeks: [wk('2026-W47', { current: true }), wk('2026-W46')] })).toBe('2026-W47')
    expect(defaultWeek(undefined)).toBeNull()
  })
  it('names week kinds', () => {
    expect(weekKind(wk('x', { snapshot: true }))).toBe('final')
    expect(weekKind(wk('x', { current: true }))).toBe('sementara')
    expect(weekKind(wk('x'))).toBe('dihitung_ulang')
    expect(reportKind({ source: 'snapshot', partial: false })).toBe('final')
    expect(reportKind({ source: 'live', partial: true })).toBe('sementara')
  })
})

const emptyReport = (): WeeklyReport => ({
  week: '2026-W46', start: '2026-11-09T00:00:00Z', end: '2026-11-16T00:00:00Z', partial: false, generated_at: 't',
  source: 'snapshot', snapshot: { generator: 'worker', generated_at: 't' },
  sections: {
    paper: { available: false },
    ledger: { available: false },
    execution: { available: false },
    live_bot: { available: false },
    lab: { available: false },
    system: { available: true, deploys: { available: false }, backups: { available: false }, processes: null, processes_at: 't' },
  },
  hooks: [],
})

describe('topFindings (Ringkasan minggu ini)', () => {
  it('adds nothing for sections without data', () => {
    expect(topFindings(emptyReport(), { isAdmin: true })).toEqual([])
  })

  it('puts problems first and keeps three', () => {
    const r = emptyReport()
    r.sections.live_bot = { available: true, signals: 4, orders: 8, executed: 7, rejected: 1 }
    r.sections.system.deploys = { available: true, failed: 1, live: 2 }
    r.sections.paper = {
      available: true, target_trades: 30, trades_week: 5, trades_total: 12,
      best: { preset: '4H-ETH-Basic', week_return_pct: 3.2 }, worst: { preset: '4H-SOL-Opt', week_return_pct: -1.1 },
      presets: [{ trades_total: 12 }, { trades_total: 3 }] as NonNullable<WeeklyReport['sections']['paper']['presets']>,
    }
    r.sections.ledger = { available: true, counts_week: { terbukti: 1, negatif: 1 }, signals_week: 40 }
    const f = topFindings(r, { isAdmin: true })
    expect(f.map((x) => x.key)).toEqual(['bot', 'deploy', 'paper'])
    expect(f[0].tone).toBe('buruk')
    expect(f[0].text).toBe('Bot live: 1 dari 8 order ditolak atau gagal (4 sinyal).')
    expect(f[2].text).toContain('terbaik 4H-ETH-Basic +3.2%, terburuk 4H-SOL-Opt \u22121.1%')
    expect(f[2].text).toContain('Belum ada yang mencapai 30 transaksi (terbanyak 12/30)')
    expect(f[2].text.toLowerCase()).not.toContain('siap')
  })

  it('drops links to admin pages for team members, keeps the text', () => {
    const r = emptyReport()
    r.sections.live_bot = { available: true, signals: 2, orders: 2, executed: 2, rejected: 0 }
    const [team] = topFindings(r, { isAdmin: false })
    expect(team.text).toContain('2 dari 2 order tereksekusi')
    expect(team.href).toBeUndefined()
    expect(topFindings(r, { isAdmin: true })[0].href).toBe('/bot')
  })
})

describe('report labels', () => {
  it('maps old hooks to the new pages and hides admin pages from the team', () => {
    const hooks = [
      { id: 'arena', title: 'Arena Paper', href: '/lab/arena', note: 'x' },
      { id: 'live_check', title: 'Cek Live vs Strategi', href: '/lab/live-check', note: 'x' },
      { id: 'outlook', title: 'Outlook Koin', href: '/lab/outlook', note: 'x' },
    ]
    expect(reportHooks(hooks, true).map((h) => [h.title, h.href])).toEqual([
      ['Paper berjalan', '/lab/arena'], ['Status bot', '/bot'], ['Peluang koin', '/koin'],
    ])
    expect(reportHooks(hooks, false).map((h) => h.id)).toEqual(['outlook'])
  })
  it('uses one vocabulary', () => {
    expect(NOTIF_TYPE_LABEL.ledger).toBe('Rekam jejak sinyal')
    expect(NOTIF_TYPE_LABEL.deploy).toBe('Pembaruan sistem')
    expect([signedPct(1.234), signedPct(-0.5, 1), signedPct(0), signedPct(null)]).toEqual(['+1.23%', '\u22120.5%', '0.00%', 'tidak tersedia'])
  })
})
