import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { RuntimeEstimate } from './RuntimeEstimate'
import { etaLine } from './run/JobProgress'
import type { LabEstimate } from '@/lib/api/types/lab-insights'
import type { LabJob } from '@/lib/api/types/lab'

const est = (over: Partial<LabEstimate> = {}): LabEstimate => ({
  mode: 'validate', n_trials: null, cells: [{ symbol: 'ETHUSDT', timeframe: '15m', seconds: 960, bars: 100000, cached: true }],
  by_timeframe: { '15m': { seconds_each: 960, total_s: 960 } }, total_s: 960, longest_s: 960, wall_s: 960, parallel: 1,
  timeout_s: 10800, exceeds_timeout: [], near_timeout: false, long: false,
  queue: { ahead_jobs: 0, wait_s: 0, slots: 1, scan_slots: 1 }, eta_done_s: 960, calibrated: true, ...over,
})

describe('RuntimeEstimate', () => {
  it('shows the per-run estimate without an ack for normal jobs', () => {
    render(<RuntimeEstimate estimate={est()} ack={false} onAck={() => {}} />)
    expect(screen.getByText(/Perkiraan ±16 mnt per run/)).toBeInTheDocument()
    expect(screen.getByText(/Slot kosong/)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('requires an acknowledgement when near or over the timeout', () => {
    const onAck = vi.fn()
    render(<RuntimeEstimate estimate={est({ longest_s: 9000, near_timeout: true, long: true })} ack={false} onAck={onAck} />)
    expect(screen.getByText(/mendekati batas waktu/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onAck).toHaveBeenCalledWith(true)
  })

  it('shows scan totals and queue wait', () => {
    render(<RuntimeEstimate scan estimate={est({ wall_s: 7200, cells: Array(29).fill(est().cells[0]), queue: { ahead_jobs: 2, wait_s: 600, slots: 1, scan_slots: 1 } })} ack={false} onAck={() => {}} />)
    expect(screen.getByText(/±2 jam total · 29 kombinasi · berurutan/)).toBeInTheDocument()
    expect(screen.getByText(/2 job di depan, mulai ±10 mnt lagi/)).toBeInTheDocument()
  })
})

describe('etaLine', () => {
  it('describes queue position and ETA', () => {
    const job = { id: 1, status: 'queued', queue_position: 3, eta_start_s: 600, eta_done_s: 1800, timeout_s: 10800 } as LabJob
    expect(etaLine(job, 'queued')).toBe('Posisi antrian #3 · mulai ±10 mnt lagi · perkiraan selesai ±30 mnt lagi · batas waktu 3 jam')
    expect(etaLine(undefined, 'queued')).toBeNull()
  })
})
