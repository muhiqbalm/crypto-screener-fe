import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { InfoTip } from './info-tip'
import { Term } from './term'
import { StatusPill } from './status-pill'
import { DirectionBadge, normalizeDirection } from './direction-badge'
import { VerdictBadge, normalizeVerdict } from './verdict-badge'
import { AnswerCard } from './answer-card'
import { NextStep } from './next-step'
import { ResponsiveTable } from './responsive-table'
import { ConfirmLive } from './confirm-live'
import { ErrorState } from '@/components/shell/states'
import { ApiError } from '@/lib/api/errors'

vi.mock('next/navigation', () => ({ usePathname: () => '/lab/leaderboard' }))

describe('InfoTip / Term', () => {
  it('opens the explanation on click (works on touch)', async () => {
    render(<InfoTip title="Data baru (holdout)">±20% data paling baru.</InfoTip>)
    const btn = screen.getByRole('button', { name: 'Penjelasan: Data baru (holdout)' })
    fireEvent.click(btn)
    expect(await screen.findByText('±20% data paling baru.')).toBeInTheDocument()
  })

  it('Term shows the glossary label and a tappable tip', async () => {
    render(<Term k="profit_factor" short />)
    expect(screen.getByText('PF')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Apa itu PF (rasio untung/rugi)?' }))
    expect(await screen.findByText(/Total untung ÷ total rugi/)).toBeInTheDocument()
  })

  it('Term without a tip renders plain text', () => {
    render(<Term k="qty" />)
    expect(screen.getByText('Jumlah')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('badges never rely on colour alone', () => {
  it('StatusPill has words', () => {
    render(
      <>
        <StatusPill kind="live" />
        <StatusPill kind="paper" />
        <StatusPill kind="perlu_dicek" />
      </>,
    )
    expect(screen.getByText('LIVE')).toBeInTheDocument()
    expect(screen.getByText('PAPER')).toBeInTheDocument()
    expect(screen.getByText('Perlu dicek')).toBeInTheDocument()
  })

  it('DirectionBadge maps every backend spelling', () => {
    expect(normalizeDirection('BULLISH')).toBe('long')
    expect(normalizeDirection('SHORT')).toBe('short')
    expect(normalizeDirection(-1)).toBe('short')
    expect(normalizeDirection('FLAT')).toBe('netral')
    expect(normalizeDirection(null)).toBe('netral')
    render(<DirectionBadge direction="BEARISH" />)
    expect(screen.getByText('SHORT')).toBeInTheDocument()
  })

  it('VerdictBadge maps PASS/FAIL in one place', () => {
    expect(normalizeVerdict('PASS')).toBe('lolos')
    expect(normalizeVerdict('gagal_uji')).toBe('gagal')
    expect(normalizeVerdict('belum_diuji')).toBe('belum_diuji')
    expect(normalizeVerdict(null)).toBeNull()
    const { container } = render(
      <>
        <VerdictBadge verdict="PASS" />
        <VerdictBadge verdict="FAIL" />
        <VerdictBadge verdict="belum_diuji" />
        <VerdictBadge verdict={null} />
      </>,
    )
    expect(screen.getByText('Lolos')).toBeInTheDocument()
    expect(screen.getByText('Gagal')).toBeInTheDocument()
    expect(screen.getByText('Belum diuji')).toBeInTheDocument()
    expect(container).toHaveTextContent('—')
  })
})

describe('AnswerCard / NextStep', () => {
  it('shows the answer, tone word and metrics', () => {
    render(
      <AnswerCard
        tone="perlu_dicek"
        answer="1 sinyal tidak terkirim ke bot."
        metrics={[{ label: 'Sinyal cocok', value: '7 / 8' }]}
        evidenceHref="#bukti"
      />,
    )
    expect(screen.getByText('Perlu dicek')).toBeInTheDocument()
    expect(screen.getByText('1 sinyal tidak terkirim ke bot.')).toBeInTheDocument()
    expect(screen.getByText('7 / 8')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Lihat bukti/ })).toHaveAttribute('href', '#bukti')
  })

  it('NextStep has one primary action', () => {
    render(<NextStep description="Simpan setting ini." action={{ label: 'Simpan sebagai preset', href: '/lab/presets' }} />)
    expect(screen.getByRole('link', { name: /Simpan sebagai preset/ })).toHaveAttribute('href', '/lab/presets')
  })
})

describe('ResponsiveTable', () => {
  const rows = [
    { id: 1, coin: 'ETH', pnl: '+1.2%', trades: 12, note: 'x' },
    { id: 2, coin: 'SOL', pnl: '−0.4%', trades: 4, note: 'y' },
  ]
  it('renders a table and phone cards with the key fields', () => {
    render(
      <ResponsiveTable
        rows={rows}
        rowKey={(r) => r.id}
        rowHref={(r) => `/koin/${r.coin}`}
        caption="Daftar koin"
        columns={[
          { key: 'coin', header: 'Koin', cell: (r) => r.coin, mobile: 'title' },
          { key: 'pnl', header: 'Hasil', cell: (r) => r.pnl, align: 'right' },
          { key: 'trades', header: 'Trade', cell: (r) => r.trades },
          { key: 'note', header: 'Catatan', cell: (r) => r.note, mobile: 'hidden' },
        ]}
      />,
    )
    expect(screen.getByRole('table')).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Daftar koin' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText('ETH')).toBeInTheDocument()
    expect(within(items[0]).queryByText('x')).toBeNull()
    expect(within(items[0]).getByRole('link')).toHaveAttribute('href', '/koin/ETH')
  })

  it('the desktop scroll box is positioned, so sr-only cells cannot widen the page', () => {
    const { container } = render(
      <ResponsiveTable
        rows={rows}
        rowKey={(r) => r.id}
        rowHref={(r) => `/koin/${r.coin}`}
        columns={[{ key: 'coin', header: 'Koin', cell: (r) => r.coin }]}
      />,
    )
    const scroll = container.querySelector('[data-rt-scroll]') as HTMLElement
    expect(scroll.className).toMatch(/\boverflow-x-auto\b/)
    expect(scroll.className).toMatch(/\brelative\b/)
    // every sr-only element inside the table sits under that positioned box
    for (const el of scroll.querySelectorAll('.sr-only')) expect(scroll.contains(el)).toBe(true)
    expect(scroll.querySelectorAll('.sr-only').length).toBeGreaterThan(0)
  })

  it('shows the empty state when there are no rows', () => {
    render(<ResponsiveTable rows={[]} rowKey={() => 1} columns={[]} empty={<p>Belum ada data</p>} />)
    expect(screen.getByText('Belum ada data')).toBeInTheDocument()
  })
})

describe('ConfirmLive', () => {
  it('always says LIVE and can require typing LIVE', async () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmLive
        open
        title="Hapus API key?"
        description="Bot tidak bisa membuka posisi sampai key baru dipasang."
        confirmLabel="Ya, hapus"
        onConfirm={onConfirm}
        typeToConfirm
      />,
    )
    expect(screen.getByText(/bot LIVE dan uang asli/)).toBeInTheDocument()
    const confirm = screen.getByRole('button', { name: 'Ya, hapus' })
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/untuk melanjutkan/), { target: { value: 'live' } })
    expect(confirm).not.toBeDisabled()
    fireEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})

describe('ErrorState v2', () => {
  it('never shows technical error text', () => {
    render(<ErrorState error={new ApiError('server', 422, { detail: [{ loc: ['body', 'x'], msg: 'field required' }] })} />)
    const alert = screen.getByRole('alert')
    expect(alert).not.toHaveTextContent('ApiError')
    expect(alert).toHaveTextContent('Permintaan ditolak')
  })

  it('maps 403 and network errors to Indonesian', () => {
    const { rerender } = render(<ErrorState error={new ApiError('auth', 403)} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Tidak ada akses')
    rerender(<ErrorState error={new ApiError('network')} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Cek koneksi internet kamu')
  })

  it('keeps the old kind/message API', () => {
    render(<ErrorState kind="not_found" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Data tidak ditemukan.')
  })
})
