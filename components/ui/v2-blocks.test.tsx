import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Activity } from 'lucide-react'
import { CoinAvatar, coinHue, coinInitials } from './coin-avatar'
import { ConfidenceDots } from './confidence-dots'
import { ProgressBar } from './progress-bar'
import { Donut } from './donut'
import { Gauge, FNG_GAUGE_ZONES } from './gauge'
import { Sparkline } from './sparkline'
import { KpiTile } from './kpi'
import { CountUp } from './count-up'
import { BentoGrid, HeroCard, Panel } from './hero-card'
import { LiveDot } from './live-dot'
import { IconTitle } from './icon-title'
import { StatTile } from './stat-tile'
import { StatusPill } from './status-pill'
import { signTone } from './tone'

describe('v2 building blocks', () => {
  it('CoinAvatar: stable colour and initials per coin', () => {
    expect(coinHue('ETH')).toBe(coinHue('ETH'))
    expect(coinHue('ETH')).not.toBe(coinHue('BTC'))
    expect(coinInitials('1000PEPE')).toBe('PEPE')
    expect(coinInitials('ETH')).toBe('ETH')
    const { container } = render(<CoinAvatar symbol="ETHUSDT" />)
    expect(container.textContent).toBe('ETH')
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('ConfidenceDots shows dots and the word', () => {
    render(<ConfidenceDots level="sedang" />)
    expect(screen.getByText('sedang')).toBeInTheDocument()
    expect(screen.getByTitle('Keyakinan sedang')).toBeInTheDocument()
  })

  it('ProgressBar is an accessible progressbar with numbers', () => {
    render(<ProgressBar value={12} max={30} label="Progres menuju 30 trade" showValue />)
    const bar = screen.getByRole('progressbar', { name: 'Progres menuju 30 trade' })
    expect(bar).toHaveAttribute('aria-valuenow', '12')
    expect(bar).toHaveAttribute('aria-valuemax', '30')
    expect(screen.getByText('12 / 30')).toBeInTheDocument()
  })

  it('Donut and Gauge describe themselves', () => {
    render(
      <>
        <Donut segments={[{ value: 6, tone: 'bullish', label: 'cocok' }, { value: 0, tone: 'bearish', label: 'gagal' }]} label="6 dari 6 sinyal cocok" center={<b>6/6</b>} />
        <Gauge value={38} zones={FNG_GAUGE_ZONES} label="Takut–serakah 38, takut" />
      </>,
    )
    expect(screen.getByRole('img', { name: '6 dari 6 sinyal cocok' })).toBeInTheDocument()
    expect(screen.getByText('6/6')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Takut–serakah 38, takut' })).toBeInTheDocument()
  })

  it('Sparkline needs two points and can be labelled', () => {
    const { container } = render(<Sparkline data={[1]} />)
    expect(container.innerHTML).toBe('')
    render(<Sparkline data={[1, 2, null, 3]} label="Harga 7 hari naik" />)
    expect(screen.getByRole('img', { name: 'Harga 7 hari naik' })).toBeInTheDocument()
  })

  it('KpiTile shows the final number (count-up only animates in a real browser) and the delta', () => {
    render(<KpiTile icon={Activity} label="Sinyal cocok" value={6} delta={{ value: -1.3, label: '7 hari' }} hint="dari 6 sinyal" href="/bot" />)
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('−1.3%')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/bot')
    render(<CountUp value={1234.5} format={(n) => n.toFixed(1)} />)
    expect(screen.getByText('1234.5')).toBeInTheDocument()
  })

  it('cards and helpers render', () => {
    render(
      <BentoGrid>
        <HeroCard span={2} glow="bullish" aria-label="hero">
          <IconTitle icon={Activity} title="Bot live" />
        </HeroCard>
        <Panel aria-label="panel">isi</Panel>
      </BentoGrid>,
    )
    expect(screen.getByRole('region', { name: 'hero' })).toHaveClass('ring-gradient')
    expect(screen.getByRole('heading', { name: 'Bot live' })).toBeInTheDocument()
    render(<LiveDot label="live" />)
    expect(screen.getByText('live')).toHaveClass('sr-only')
  })

  it('old APIs still work (StatTile, StatusPill sizes)', () => {
    render(
      <>
        <StatTile label="Hasil" value="+2.1%" hint="minggu lalu" />
        <StatusPill kind="live" size="xs" />
        <StatusPill kind="paper" size="lg" />
      </>,
    )
    expect(screen.getByText('+2.1%')).toBeInTheDocument()
    expect(screen.getByText('LIVE')).toBeInTheDocument()
    expect(screen.getByText('PAPER')).toBeInTheDocument()
    expect(signTone(-1)).toBe('bearish')
    expect(signTone(0)).toBe('muted')
  })
})
