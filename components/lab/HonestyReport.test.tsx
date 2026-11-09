import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChecksList, HoldoutWarning, VerdictBanner } from './HonestyReport'

describe('VerdictBanner', () => {
  it('renders PASS with no dismiss control', () => {
    render(<VerdictBanner verdict="PASS" mode="validate" status="done" />)
    const banner = screen.getByTestId('verdict-banner')
    expect(banner).toHaveAttribute('data-tone', 'pass')
    expect(banner).toHaveTextContent('PASS')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders FAIL', () => {
    render(<VerdictBanner verdict="FAIL" mode="optimize" status="done" />)
    expect(screen.getByTestId('verdict-banner')).toHaveAttribute('data-tone', 'fail')
    expect(screen.getByText(/jangan dipakai live/i)).toBeInTheDocument()
  })

  it('backtest without verdict says it is not validated', () => {
    render(<VerdictBanner verdict={null} mode="backtest" status="done" />)
    expect(screen.getByText(/belum divalidasi/i)).toBeInTheDocument()
  })
})

describe('HoldoutWarning', () => {
  it('hidden at 1 touch', () => {
    const { container } = render(<HoldoutWarning touches={1} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shown when > 1', () => {
    render(<HoldoutWarning touches={4} />)
    expect(screen.getByTestId('holdout-warning')).toHaveTextContent('Hasil holdout sudah dilihat 4 kali — risiko overfitting')
  })
})

describe('ChecksList', () => {
  it('shows value vs threshold and pass/fail', () => {
    render(
      <ChecksList
        checks={[
          { name: 'pf', label: 'Profit factor OOS', value: 1.05, threshold: 1.2, passed: false },
          { name: 'n', label: 'Jumlah trade', value: 42, threshold: 30, passed: true },
        ]}
      />,
    )
    expect(screen.getByText('Profit factor OOS')).toBeInTheDocument()
    expect(screen.getByText('1.05')).toBeInTheDocument()
    expect(screen.getByText('batas 1.20')).toBeInTheDocument()
    expect(screen.getByText('GAGAL')).toBeInTheDocument()
    expect(screen.getByText('LOLOS')).toBeInTheDocument()
  })
})
