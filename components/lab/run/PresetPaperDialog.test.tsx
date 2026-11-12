import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { LabRunDetail, LabTemplate } from '@/lib/api/types/lab'

const push = vi.fn()
const save = vi.fn()
const start = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/lib/queries/lab-insights', () => ({
  useLabPresets: () => ({ data: [{ id: 9, label: 'Val1', symbol: 'ETHUSDT', timeframe: '4h' }] }),
  useSavePresetFromRun: () => ({ mutateAsync: save }),
}))
// W3b's shared paper flow (lib/queries/paper.ts); mirrorSizing / arenaHref are the real helpers.
vi.mock('@/lib/queries/paper', () => ({
  usePaperAccounts: () => ({ data: [{ id: 3, name: 'Paper lama', balance: 9500 }], isPending: false }),
  useStartPaper: () => ({ mutateAsync: start }),
}))
vi.mock('@/lib/utils/toast', () => ({ notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

import { PresetPaperDialog } from './PresetPaperDialog'

// Margin sizing like the live Rosyade preset: 4× leverage on 50 % margin -> 2× notional.
const TEMPLATE = {
  params: [
    { key: 'sizing_mode', default: 'margin' },
    { key: 'leverage', default: 4 },
    { key: 'portfolio_risk', default: 50 },
    { key: 'dd_derisk_pct', default: 0 },
  ],
} as unknown as LabTemplate

const RUN = {
  id: 12, template_id: 'rosyade_family', symbol: 'ETHUSDT', timeframe: '4h', mode: 'validate', status: 'done', verdict: 'PASS', params: {},
} as unknown as LabRunDetail

beforeEach(() => {
  vi.clearAllMocks()
  save.mockResolvedValue({ id: 77, name: '4H-ETH-Val2' })
  start.mockResolvedValue({ presetId: 77, watchId: 1, accountId: 5, accountCreated: true })
})

describe('Simpan sebagai preset & mulai paper (shared paper flow)', () => {
  it('pre-fills a free label; default = new 10,000 USDT account sized like the test; lands on Paper berjalan', async () => {
    const onOpenChange = vi.fn()
    render(<PresetPaperDialog run={RUN} template={TEMPLATE} open onOpenChange={onOpenChange} />)
    expect(screen.getByLabelText('Label preset')).toHaveValue('Val2')
    expect(screen.getByLabelText('Akun simulasi baru')).toBeChecked()
    expect(screen.getByLabelText('Saldo awal (USDT)')).toHaveValue('10000')

    fireEvent.click(screen.getByRole('button', { name: /^Simpan & mulai paper/ }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/lab/arena?highlight=77'))
    expect(save).toHaveBeenCalledWith({ runId: 12, label: 'Val2' })
    expect(start).toHaveBeenCalledWith({ preset: { id: 77, name: '4H-ETH-Val2' }, sizing: { risk_pct: 100, leverage_max: 2 }, startingBalance: 10_000 })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('an existing account is passed as accountId (no sizing)', async () => {
    render(<PresetPaperDialog run={RUN} template={TEMPLATE} open onOpenChange={() => {}} />)
    fireEvent.change(screen.getByLabelText('Pilih akun simulasi'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /^Simpan & mulai paper/ }))
    await waitFor(() => expect(start).toHaveBeenCalledWith({ preset: { id: 77, name: '4H-ETH-Val2' }, accountId: 3 }))
  })

  it('a retry after a failed paper start does not save the preset twice', async () => {
    start.mockRejectedValueOnce(new Error('boom'))
    render(<PresetPaperDialog run={RUN} template={TEMPLATE} open onOpenChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /^Simpan & mulai paper/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Preset 4H-ETH-Val2 sudah tersimpan')
    fireEvent.click(screen.getByRole('button', { name: /^Mulai paper/ }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/lab/arena?highlight=77'))
    expect(save).toHaveBeenCalledTimes(1)
    expect(start).toHaveBeenCalledTimes(2)
  })

  it('sizing that cannot be mirrored: says why, no new account, preset can still be saved alone', async () => {
    const run = { ...RUN, params: { dd_derisk_pct: 20 } } as LabRunDetail
    render(<PresetPaperDialog run={run} template={TEMPLATE} open onOpenChange={() => {}} />)
    expect(screen.getByLabelText('Akun simulasi baru')).toBeDisabled()
    expect(screen.getByText(/mengecilkan posisi saat modal turun dalam/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Simpan & mulai paper/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Simpan preset saja' }))
    await waitFor(() => expect(save).toHaveBeenCalledWith({ runId: 12, label: 'Val2' }))
    expect(start).not.toHaveBeenCalled()
  })

  it('warns before paper-trading a run that failed', () => {
    render(<PresetPaperDialog run={{ ...RUN, verdict: 'FAIL' }} template={TEMPLATE} open onOpenChange={() => {}} />)
    expect(screen.getByText('Uji ini Gagal.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tetap simpan & mulai paper/ })).toBeInTheDocument()
  })
})
