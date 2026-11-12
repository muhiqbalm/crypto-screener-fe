import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, type UseQueryResult } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { LabRunDetail, LabTrade, LabWatch, LabWatchState } from '@/lib/api/types/lab'
import { StrategyOverlayPanel } from './StrategyOverlayPanel'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const watch = { id: 7, template_id: 'rosyade_family', symbol: 'ETHUSDT', timeframe: '4h', params: {}, created_at: '2026-11-01T00:00:00Z', autopaper: null } as unknown as LabWatch
const q = <T,>(data: T) => ({ isPending: false, isError: false, isFetching: false, data, refetch: vi.fn() }) as unknown as UseQueryResult<T>
const state = {
  watch_id: 7,
  computed_at: '2026-11-12T01:02:00Z',
  last_bar: '2026-11-12T00:00:00Z',
  position: { side: 'long', entry_price: 3000, entry_time: '2026-11-11T20:00:00Z', sl: 2900, tp: 3300 },
  recent_trades: [],
  last_signal: { action: 'open', side: 'long', price: 3000, time: '2026-11-11T20:00:00Z' },
} as unknown as LabWatchState

function renderPanel() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <StrategyOverlayPanel
        watchId="7"
        runId={null}
        watches={q([watch])}
        watchState={q(state)}
        run={q(undefined as unknown as LabRunDetail)}
        runTrades={q([] as LabTrade[])}
        lastPrice={3100}
        priceSource="perp"
        markersOffscreen={0}
        markerCount={0}
      />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  push.mockReset()
})

describe('StrategyOverlayPanel', () => {
  it('labels strategy signals as a simulation, never as live', () => {
    renderPanel()
    expect(screen.getByText('Sinyal strategi (simulasi)')).toBeInTheDocument()
    expect(screen.getAllByText('PAPER').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText(/Status Sinyal Live/i)).toBeNull()
    expect(screen.getByText('12 Nov 07:00 WIB')).toBeInTheDocument() // last bar 00:00 UTC
  })

  it('asks before deleting a watch and only deletes on confirm', async () => {
    const del = vi.spyOn(api, 'deleteLabWatch').mockResolvedValue(undefined as never)
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: /hapus pantauan ini/i }))
    expect(del).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog')).toHaveTextContent('ETHUSDT 4 jam')
    fireEvent.click(screen.getByRole('button', { name: /batal/i }))
    expect(del).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /hapus pantauan ini/i }))
    fireEvent.click(screen.getByRole('button', { name: /ya, hapus pantauan/i }))
    await waitFor(() => expect(del).toHaveBeenCalledTimes(1))
    expect(del.mock.calls[0][0]).toBe('7')
    await waitFor(() => expect(push).toHaveBeenCalledWith('/chart'))
  })
})
