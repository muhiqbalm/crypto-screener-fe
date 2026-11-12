/**
 * Mock mode only (NEXT_PUBLIC_USE_MOCK_DATA=true): Peluang koin endpoints.
 * Data in outlook-data.json was produced by the REAL Outlook v2 code (offline job on a
 * read-only lab.db copy + cached Binance candles); positions are synthetic.
 * Set NEXT_PUBLIC_MOCK_NON_ADMIN=true to preview the page as a non-admin account.
 */
import { mockRoleIsMember } from './role'
import { ApiError } from '@/lib/api/errors'

type Json = Record<string, unknown>

let cache: Json | null = null

async function data(): Promise<Json> {
  if (!cache) cache = (await import('./outlook-data.json')).default as unknown as Json
  return cache
}

const nonAdmin = () => process.env.NEXT_PUBLIC_MOCK_NON_ADMIN === 'true' || mockRoleIsMember()

function asViewer<T extends Json>(body: T): T {
  if (!nonAdmin()) return body
  const strip = (r: Json) => {
    const { positions: _drop, ...rest } = r
    void _drop
    return rest
  }
  const rows = Array.isArray(body.rows) ? (body.rows as Json[]).map(strip) : body.rows
  return { ...strip(body), ...(rows ? { rows } : {}), can_refresh: false, positions_available: null } as unknown as T
}

/** Returns undefined when the path is not a Peluang koin endpoint (caller falls through). */
export async function getOutlookMock(method: string, fullPath: string): Promise<unknown> {
  const [path] = fullPath.split('?')
  const p = path.replace(/^\/api\/v1\/lab/, '')
  if (method === 'GET' && p === '/me' && nonAdmin()) return { is_admin: false }
  if (!(p.startsWith('/outlook') || p === '/regime' || p.startsWith('/strength'))) return undefined
  await new Promise((r) => setTimeout(r, 200))
  const d = await data()
  if (method === 'POST') {
    if (nonAdmin()) throw new ApiError('auth', 403)
    return { job_id: 1, already: false }
  }
  if (p === '/outlook') return asViewer(d.list as Json)
  if (p === '/outlook/track-record') return d.track_record
  if (p === '/outlook/rekam-skor') return d.rekam_skor
  if (p === '/outlook/calibration') return d.calibration
  if (p === '/regime') return d.regime
  if (p === '/strength') return d.strength
  const sym = decodeURIComponent(p.replace('/outlook/', '')).toUpperCase()
  const full = sym.endsWith('USDT') ? sym : `${sym}USDT`
  const det = (d.details as Record<string, Json>)[full]
  if (!det) throw new ApiError('not_found', 404)
  return asViewer(det)
}
