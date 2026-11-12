import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { botApi } from '@/lib/api/bot'
import { liveCheckApi } from '@/lib/api/livecheck'
import { shadowApi } from '@/lib/api/shadow'
import { mockBotStatus } from '@/lib/mocks/bot'
import { pasarBotMock } from '@/lib/mocks/pasar-bot'
import type { BotStatus } from '@/lib/api/types/bot'
import type { LiveCheckReport } from '@/lib/api/types/livecheck'
import type { ShadowReport } from '@/lib/api/types/shadow'
import { BotStatusView } from './BotStatusView'

vi.mock('next/navigation', () => ({ usePathname: () => '/bot', useRouter: () => ({ push: vi.fn() }) }))

function setup(bot: BotStatus = mockBotStatus()) {
  const report = (bars: number) => pasarBotMock('GET', `/api/v1/lab/live-check?bars=${bars}`)!.value as LiveCheckReport
  vi.spyOn(liveCheckApi, 'getReport').mockImplementation(async (bars: number) => report(bars))
  vi.spyOn(shadowApi, 'getReport').mockResolvedValue(pasarBotMock('GET', '/api/v1/lab/shadow')!.value as ShadowReport)
  vi.spyOn(botApi, 'getStatus').mockResolvedValue(bot)
  const webhookConfig = vi.spyOn(api, 'getWebhookConfig')
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(
    <QueryClientProvider client={client}>
      <BotStatusView />
    </QueryClientProvider>,
  )
  return { view, webhookConfig }
}

afterEach(() => vi.restoreAllMocks())

describe('BotStatusView', () => {
  it('answers "Bot live aman?" first, in one sentence, with a LIVE label', async () => {
    setup()
    await waitFor(() => expect(screen.getByText(/^Perlu dicek: 5 dari 6 sinyal 7 hari terakhir sesuai/)).toBeInTheDocument())
    expect(screen.getByText('Bot live aman?')).toBeInTheDocument()
    expect(screen.getAllByText('LIVE').length).toBeGreaterThan(0)
    // The answer opens the evidence on the problem rows.
    expect(screen.getByRole('link', { name: /lihat baris bermasalah/i })).toHaveAttribute('href', '#cek')
  })

  it('shows the webhook state per bot account and never asks for or renders a passphrase', async () => {
    const { view, webhookConfig } = setup()
    await waitFor(() => expect(screen.getByText('Webhook aktif')).toBeInTheDocument())
    expect(screen.getByText('Webhook tidak aktif')).toBeInTheDocument()
    expect(webhookConfig).not.toHaveBeenCalled()
    expect(view.container.textContent).not.toMatch(/xK9mP2nQ4rT7vW3z/) // the mock webhook passphrase
    expect(screen.getByText(/Kata sandi webhook tidak ditampilkan/)).toBeInTheDocument()
  })

  it('has the anchors other pages link to', async () => {
    const { view } = setup()
    await waitFor(() => expect(view.container.querySelector('#eksekusi')).not.toBeNull())
    expect(view.container.querySelector('#cek')).not.toBeNull()
  })

  it('says plainly when no account can trade', async () => {
    const off = mockBotStatus()
    setup({ ...off, active_accounts: 0, accounts: off.accounts.map((a) => ({ ...a, webhook_active: false, webhook_since: null })) })
    await waitFor(() => expect(screen.getByText(/webhook bot sedang tidak aktif/)).toBeInTheDocument())
  })
})
