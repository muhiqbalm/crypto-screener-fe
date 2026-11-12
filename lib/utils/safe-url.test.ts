import { describe, it, expect } from 'vitest'
import { safeExternalUrl, safeNextPath } from './safe-url'

describe('safeNextPath', () => {
  it('accepts same-origin paths', () => {
    expect(safeNextPath('/lab/runs/12?x=1')).toBe('/lab/runs/12?x=1')
    expect(safeNextPath('/chart#top')).toBe('/chart#top')
  })
  it('rejects open-redirect tricks', () => {
    for (const bad of ['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', 'evil.com', '/\u0000x', '/login', '/register']) {
      expect(safeNextPath(bad)).toBe('/beranda')
    }
  })
  it('falls back on empty', () => {
    expect(safeNextPath(null)).toBe('/beranda')
    expect(safeNextPath('', '/x')).toBe('/x')
  })
})

describe('safeExternalUrl', () => {
  it('allows http(s) only', () => {
    expect(safeExternalUrl('https://cointelegraph.com/a')).toBe('https://cointelegraph.com/a')
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull()
    expect(safeExternalUrl('data:text/html,hi')).toBeNull()
    expect(safeExternalUrl('not a url')).toBeNull()
    expect(safeExternalUrl(null)).toBeNull()
  })
})
