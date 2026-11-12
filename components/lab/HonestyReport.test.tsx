import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChecksList, HoldoutWarning, VerdictBanner } from './HonestyReport'
import type { LabCheck } from '@/lib/api/types/lab'

// Real backend shapes (crypto-screener src/lab/honesty.py)
const CHECKS: LabCheck[] = [
  { name: 'oos_profit_factor', label: 'Holdout profit factor', value: 1.41, threshold: '>= 1.2', passed: true },
  { name: 'mc_dd_p95', label: 'Monte Carlo 95th-pct drawdown (%)', value: -62.3, threshold: '> -50.0', passed: false },
  { name: 'min_oos_trades', label: 'Holdout trades', value: 18, threshold: '>= 30', passed: false },
]

describe('VerdictBanner', () => {
  it('renders LOLOS with no dismiss control', () => {
    render(<VerdictBanner verdict="PASS" mode="validate" status="done" checks={CHECKS.slice(0, 1)} />)
    const banner = screen.getByTestId('verdict-banner')
    expect(banner).toHaveAttribute('data-tone', 'pass')
    expect(banner).toHaveTextContent('Lolos')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders GAGAL with plain-language reasons from failed checks', () => {
    render(<VerdictBanner verdict="FAIL" mode="optimize" status="done" checks={CHECKS} />)
    expect(screen.getByTestId('verdict-banner')).toHaveAttribute('data-tone', 'fail')
    expect(screen.getByText('Gagal')).toBeInTheDocument()
    const reasons = screen.getByTestId('verdict-reasons')
    expect(reasons).toHaveTextContent('Gagal karena turun terdalam wajar bisa −62.3% (batas −50%)')
    expect(reasons).toHaveTextContent('18 trade di data baru (minimal 30')
    expect(reasons).not.toHaveTextContent('PF di data baru')
  })

  it('backtest without verdict says it is not validated', () => {
    render(<VerdictBanner verdict={null} mode="backtest" status="done" />)
    expect(screen.getByText(/belum diuji jujur/i)).toBeInTheDocument()
  })
})

describe('HoldoutWarning', () => {
  it('hidden at 1 touch', () => {
    const { container } = render(<HoldoutWarning touches={1} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shown when > 1', () => {
    render(<HoldoutWarning touches={4} />)
    expect(screen.getByTestId('holdout-warning')).toHaveTextContent('sudah dipakai 4 kali')
  })
})

describe('ChecksList', () => {
  it('shows Indonesian label, value and requirement per check', () => {
    render(<ChecksList checks={CHECKS} />)
    expect(screen.getByText('PF di data baru')).toBeInTheDocument()
    expect(screen.getByText('1.41')).toBeInTheDocument()
    expect(screen.getByText('minimal 1.2')).toBeInTheDocument()
    expect(screen.getAllByLabelText('gagal')).toHaveLength(2)
    expect(screen.getAllByLabelText('lolos')).toHaveLength(1)
  })
})
