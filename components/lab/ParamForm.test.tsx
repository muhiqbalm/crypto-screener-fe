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
  it('renders a field per param grouped by group; no "live" wording for a research template', () => {
    render(<ParamForm template={T} values={initialParamValues(T)} errors={{}} onChange={() => {}} />)
    expect(screen.getByText('Trend')).toBeInTheDocument()
    expect(screen.getByText('Risk')).toBeInTheDocument()
    expect(screen.getByLabelText(/EMA cepat/)).toHaveValue(21)
    expect(screen.getByRole('switch')).toBeInTheDocument()
    expect(screen.getByLabelText(/Arah/)).toHaveValue('both')
    expect(screen.getByText('Default strategi (setting riset)')).toBeInTheDocument()
    expect(screen.queryByText(/live/i)).toBeNull()
    expect(screen.getByRole('button', { name: /^reset ke default$/i })).toBeDisabled()
  })

  it('says "setting live" only for the Rosyade family', () => {
    const R: LabTemplate = { ...T, id: 'rosyade_family' }
    render(<ParamForm template={R} values={initialParamValues(R)} errors={{}} onChange={() => {}} />)
    expect(screen.getByText(/Sama dengan 4H-ETH-Basic \(setting live\)/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reset ke setting live/i })).toBeDisabled()
  })

  it('reset button restores defaults', () => {
    const onChange = vi.fn()
    render(<ParamForm template={T} values={{ ...initialParamValues(T), ema_fast: '50' }} errors={{}} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /^reset ke default$/i }))
    expect(onChange).toHaveBeenCalledWith(initialParamValues(T))
  })

  it('shows field errors', () => {
    render(<ParamForm template={T} values={initialParamValues(T)} errors={{ ema_fast: 'Minimal 2' }} onChange={() => {}} />)
    expect(screen.getByText('Minimal 2')).toBeInTheDocument()
  })
})

describe('ParamForm schema help (non-Rosyade templates)', () => {
  it('shows the help text the template schema provides, schema first over shared copy', async () => {
    const { paramHelp } = await import('@/lib/lab/form')
    const H: LabTemplate = {
      ...T,
      params: [
        { key: 'dc_entry_len', label: 'Channel entry N (bar)', type: 'int', default: 55, min: 5, max: 300, group: 'Sinyal', help: 'Long saat close > high N bar.' },
        { key: 'use_ema_htf', label: 'Filter trend EMA HTF', type: 'bool', default: true, group: 'Sinyal', help: 'Dari bar HTF yang sudah close.' },
      ],
    }
    render(<ParamForm template={H} values={initialParamValues(H)} errors={{}} onChange={() => {}} />)
    expect(screen.getByText('Long saat close > high N bar.')).toBeInTheDocument()
    expect(screen.getByText('Dari bar HTF yang sudah close.')).toBeInTheDocument()
    expect(paramHelp({ key: 'ema_htf_len', label: 'x', type: 'int', default: 1, group: 'g' })).toMatch(/EMA/)
    expect(paramHelp({ key: 'ema_htf_len', label: 'x', type: 'int', default: 1, group: 'g', help: 'own' })).toBe('own')
  })
})
