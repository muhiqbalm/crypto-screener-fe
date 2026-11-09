import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider, type UseQueryResult } from '@tanstack/react-query'
import { useState } from 'react'
import { PaperTradePanel, EMPTY_DRAFT, type PaperDraft } from './PaperTradePanel'
import { api } from '@/lib/api/client'
import type { PaperAccount } from '@/lib/api/types/lab'

const account: PaperAccount = {
  id: 'a1', name: 'Uji', balance: 10_000, equity: 10_000, open_positions: 0, realized_pnl: 0,
  created_at: '2026-01-01T00:00:00Z', risk_pct: 1, leverage_max: 10,
}
const accountsQ = { isPending: false, isError: false, data: [account], refetch: vi.fn() } as unknown as UseQueryResult<PaperAccount[]>

function Harness() {
  const [draft, setDraft] = useState<PaperDraft>(EMPTY_DRAFT)
  return (
    <QueryClientProvider client={new QueryClient()}>
      <PaperTradePanel
        symbol="ETHUSDT"
        lastPrice={100}
        accounts={accountsQ}
        account={account}
        onAccountChange={() => {}}
        positions={[]}
        positionsLoading={false}
        draft={draft}
        onDraftChange={setDraft}
        watchId={null}
        watch={null}
        strategyPosition={null}
      />
    </QueryClientProvider>
  )
}

afterEach(() => vi.restoreAllMocks())

describe('PaperTradePanel', () => {
  it('is clearly labelled as paper', () => {
    render(<Harness />)
    expect(screen.getAllByText(/PAPER — bukan order sungguhan/).length).toBeGreaterThan(0)
  })

  it('shows risk-based size and requires a confirm step before sending', async () => {
    const spy = vi.spyOn(api, 'createPaperOrder').mockResolvedValue({})
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: /long/i }))
    fireEvent.change(screen.getByLabelText(/stop loss/i), { target: { value: '95' } })
    expect(screen.getByText('$100.00')).toBeInTheDocument() // risk = 1% of 10k
    fireEvent.click(screen.getByRole('button', { name: /review order paper/i }))
    expect(spy).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog')).toHaveTextContent('LONG ETHUSDT')
    fireEvent.click(screen.getByRole('button', { name: /ya, catat paper/i }))
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(1))
    expect(spy.mock.calls[0][0]).toEqual({ account_id: 'a1', symbol: 'ETHUSDT', side: 'long', sl: 95 })
  })

  it('blocks an SL on the wrong side', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: /short/i }))
    fireEvent.change(screen.getByLabelText(/stop loss/i), { target: { value: '90' } })
    fireEvent.click(screen.getByRole('button', { name: /review order paper/i }))
    expect(screen.getByText(/SL short harus di atas/)).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})
