import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ParamForm } from './ParamForm'
import { initialParamValues } from '@/lib/lab/form'
import type { LabTemplate } from '@/lib/api/types/lab'

const T: LabTemplate = {
  id: 't',
  name: 'T',
  description: '',
  timeframes: ['4h'],
  params: [
    { key: 'ema_fast', label: 'EMA cepat', type: 'int', default: 21, min: 2, max: 200, group: 'Trend' },
    { key: 'use_htf', label: 'Filter HTF', type: 'bool', default: true, group: 'Trend' },
    { key: 'side', label: 'Arah', type: 'choice', default: 'both', choices: ['both', 'long'], group: 'Risk' },
  ],
}

describe('ParamForm', () => {
  it('renders a field per param grouped by group, with the live-default note', () => {
    render(<ParamForm template={T} values={initialParamValues(T)} errors={{}} onChange={() => {}} />)
    expect(screen.getByText('Trend')).toBeInTheDocument()
    expect(screen.getByText('Risk')).toBeInTheDocument()
    expect(screen.getByLabelText(/EMA cepat/)).toHaveValue(21)
    expect(screen.getByRole('switch')).toBeInTheDocument()
    expect(screen.getByLabelText(/Arah/)).toHaveValue('both')
    expect(screen.getByText(/default = preset 4H-ETH-Basic \(setting live ETH 4H\)/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reset ke default live/i })).toBeDisabled()
  })

  it('reset button restores defaults', () => {
    const onChange = vi.fn()
    render(<ParamForm template={T} values={{ ...initialParamValues(T), ema_fast: '50' }} errors={{}} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /reset ke default live/i }))
    expect(onChange).toHaveBeenCalledWith(initialParamValues(T))
  })

  it('shows field errors', () => {
    render(<ParamForm template={T} values={initialParamValues(T)} errors={{ ema_fast: 'Minimal 2' }} onChange={() => {}} />)
    expect(screen.getByText('Minimal 2')).toBeInTheDocument()
  })
})
