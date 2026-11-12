import { describe, expect, it } from 'vitest'
import nextConfig, { LEGACY_REDIRECTS } from '../next.config'
import { safeNextPath } from './utils/safe-url'

/** Audit §3.4: old URLs keep working (307 for now, query string passed through by Next). */
describe('legacy redirects', () => {
  it('maps the old pages to the new ones with 307 (permanent: false)', async () => {
    const list = await nextConfig.redirects!()
    const map = Object.fromEntries(list.map((r) => [r.source, r]))
    expect(map['/screener']).toMatchObject({ destination: '/koin?view=faktor', permanent: false })
    expect(map['/lab/outlook']).toMatchObject({ destination: '/koin', permanent: false })
    expect(map['/lab/strength']).toMatchObject({ destination: '/koin?view=terkuat', permanent: false })
    expect(map['/lab/live-check']).toMatchObject({ destination: '/bot', permanent: false })
    expect(list).toHaveLength(LEGACY_REDIRECTS.length)
  })

  it('never loops: no destination is itself redirected', async () => {
    const list = await nextConfig.redirects!()
    const sources = new Set(list.map((r) => r.source))
    for (const r of list) expect(sources.has(r.destination.split('?')[0])).toBe(false)
  })

  it('keeps links that must stay (notifications, reports)', async () => {
    const sources = new Set((await nextConfig.redirects!()).map((r) => r.source))
    for (const keep of ['/lab', '/lab/runs/:id', '/lab/scan', '/lab/report', '/lab/signals', '/journal', '/balance', '/webhook', '/settings', '/chart']) {
      expect(sources.has(keep)).toBe(false)
    }
  })

  it('sends people to Beranda after login by default', () => {
    expect(safeNextPath(null)).toBe('/beranda')
    expect(safeNextPath('/lab/runs/3')).toBe('/lab/runs/3')
  })
})
