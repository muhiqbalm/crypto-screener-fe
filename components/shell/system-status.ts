'use client'

import { useApiHealth } from '@/lib/queries/health'

export type SystemState = 'mock' | 'pending' | 'healthy' | 'degraded' | 'offline'

export interface SystemStatus {
  state: SystemState
  /** Glossary wording: "Sistem normal" / "Data screener terlambat" / "Server tidak terjangkau". */
  label: string
  /** Small extra line (latency). */
  detail: string | null
  /** true when the user should notice (degraded / offline / mock). */
  attention: boolean
  dotClass: string
}

const LABEL: Record<SystemState, string> = {
  mock: 'Mode contoh (data palsu)',
  pending: 'Mengecek sistem…',
  healthy: 'Sistem normal',
  degraded: 'Data screener terlambat',
  offline: 'Server tidak terjangkau',
}

const DOT: Record<SystemState, string> = {
  mock: 'bg-warn',
  pending: 'bg-muted-foreground/50',
  healthy: 'bg-bullish',
  degraded: 'bg-warn',
  offline: 'bg-bearish',
}

/** Backend health (GET /api/v1/health every 30 s) in glossary words. */
export function useSystemStatus(): SystemStatus {
  const isMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'
  const { data: health, isPending } = useApiHealth()
  const state: SystemState = isMock ? 'mock' : isPending ? 'pending' : (health?.status ?? 'offline')
  const latency = health?.latencyMs
  return {
    state,
    label: LABEL[state],
    detail:
      state === 'healthy' || state === 'degraded'
        ? `Respons server ${latency ?? '–'} ms`
        : state === 'offline'
          ? 'Coba muat ulang halaman sebentar lagi.'
          : state === 'mock'
            ? 'Hanya untuk pengembangan.'
            : null,
    attention: state === 'degraded' || state === 'offline' || state === 'mock',
    dotClass: DOT[state],
  }
}
