import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { LabRunDetail } from '@/lib/api/types/lab'

const push = vi.fn()
const save = vi.fn()
const createAccount = vi.fn()
const watch = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/lib/queries/lab-insights', () => ({
  useLabPresets: () => ({ data: [{ id: 9, label: 'Val1', symbol: 'ETHUSDT', timeframe: '4h' }] }),
  useSavePresetFromRun: () => ({ mutateAsync: save }),
  useWatchFromPreset: () => ({ mutateAsync: watch }),
}))
vi.mock('@/lib/queries/paper', () => ({
  usePaperAccounts: () => ({ data: [{ id: 3, name: 'Paper lama', balance: 9500 }], isPending: false, isError: false }),
  useCreatePaperAccount: () => ({ mutateAsync: createAccount }),
}))
vi.mock('@/lib/utils/toast', () => ({ notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

import { PresetPaperDialog } from './PresetPaperDialog'

const RUN = {
  id: 12, template_id: 'donchian_breakout', symbol: 'ETHUSDT', timeframe: '4h', mode: 'validate', status: 'done', verdict: 'PASS',
} as unknown as LabRunDetail

beforeEach(() => {
  vi.clearAllMocks()
  save.mockResolvedValue({ id: 77, name: '4H-ETH-Val2' })
  createAccount.mockResolvedValue({ id: 5 })
  watch.mockResolvedValue({ watch_id: 1, preset_id: 77 })
})

describe('Simpan sebagai preset & mulai paper', () => {
  it('pre-fills a free label, defaults to a new 10,000 USDT account, then lands on Paper berjalan', async () => {
    const onOpenChange = vi.fn()
    render(<PresetPaperDialog run={RUN} open onOpenChange={onOpenChange} />)
    expect(screen.getByLabelText('Label preset')).toHaveValue('Val2')
    expect(screen.getByLabelText('Akun simulasi')).toHaveValue('new')
    expect(screen.getByRole('option', { name: /Buat akun baru \(10,000 USDT\)/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Simpan & mulai paper/ }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/lab/arena?highlight=77'))
    expect(save).toHaveBeenCalledWith({ runId: 12, label: 'Val2' })
    expect(createAccount).toHaveBeenCalledWith({ name: 'Paper 4H-ETH-Val2', starting_balance: 10_000, risk_pct: 1, leverage_max: 5 })
    expect(watch).toHaveBeenCalledWith({ id: 77, accountId: 5 })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('uses an existing account when picked (no new account)', async () => {
    render(<PresetPaperDialog run={RUN} open onOpenChange={() => {}} />)
    fireEvent.change(screen.getByLabelText('Akun simulasi'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /Simpan & mulai paper/ }))
    await waitFor(() => expect(watch).toHaveBeenCalledWith({ id: 77, accountId: 3 }))
    expect(createAccount).not.toHaveBeenCalled()
  })

  it('a retry after a failed paper start does not save the preset or create the account twice', async () => {
    watch.mockRejectedValueOnce(new Error('boom'))
    render(<PresetPaperDialog run={RUN} open onOpenChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Simpan & mulai paper/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Preset 4H-ETH-Val2 sudah tersimpan')
    fireEvent.click(screen.getByRole('button', { name: /Mulai paper/ }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/lab/arena?highlight=77'))
    expect(save).toHaveBeenCalledTimes(1)
    expect(createAccount).toHaveBeenCalledTimes(1)
    expect(watch).toHaveBeenCalledTimes(2)
    expect(watch).toHaveBeenLastCalledWith({ id: 77, accountId: 5 })
  })

  it('warns before paper-trading a run that failed', () => {
    render(<PresetPaperDialog run={{ ...RUN, verdict: 'FAIL' }} open onOpenChange={() => {}} />)
    expect(screen.getByText(/Uji ini Gagal/)).toBeInTheDocument()
  })
})
