import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { ApiError } from '@/lib/api/errors'
import type { WebhookConfigResponse } from '@/lib/api/types/webhook'
import { TestWebhookCard } from './TestWebhookCard'
import { WebhookConfigCard } from './WebhookConfigCard'
import { AlertPayloadTemplate, alertTemplate } from './AlertPayloadTemplate'

const CONFIG: WebhookConfigResponse = { id: 'wh1', passphrase: 'pp-SECRET-1234', is_active: true, created_at: '2026-10-13T05:00:00Z' }
const T = { timeout: 5000 }

/** Every api method that writes (or reaches the exchange), so a test can assert none ran. */
const WRITERS = [
  'createWebhookConfig',
  'reactivateWebhookConfig',
  'patchWebhookConfig',
  'deleteWebhookConfig',
  'upsertCredential',
  'deleteCredential',
  'patchMe',
] as const

function spyWriters() {
  return Object.fromEntries(WRITERS.map((m) => [m, vi.spyOn(api, m).mockResolvedValue(CONFIG as never)])) as Record<
    (typeof WRITERS)[number],
    ReturnType<typeof vi.spyOn>
  >
}

function renderWith(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

afterEach(() => vi.restoreAllMocks())

describe('TestWebhookCard (preview only)', () => {
  it('only ever reads GET webhook-config and never POSTs anywhere', async () => {
    const get = vi.spyOn(api, 'getWebhookConfig').mockResolvedValue(CONFIG)
    const writers = spyWriters()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderWith(<TestWebhookCard />)

    fireEvent.click(screen.getByRole('button', { name: /pratinjau isi alert/i }))
    const make = await screen.findByRole('button', { name: /buat pratinjau isi alert/i }, T)
    await waitFor(() => expect(make).toBeEnabled(), T)
    fireEvent.click(make)

    expect(await screen.findByText(/Pratinjau, tidak dikirim/, undefined, T)).toBeInTheDocument()
    expect(screen.getByText(/"passphrase": "<PASSPHRASE>"/)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('pp-SECRET-1234')
    expect(document.body.textContent).not.toMatch(/200 OK|200 Success/)
    expect(get).toHaveBeenCalled()
    for (const spy of Object.values(writers)) expect(spy).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('has no way to send: no api client, no mutation, no fetch in the source', () => {
    const src = readFileSync(join(__dirname, 'TestWebhookCard.tsx'), 'utf8')
    const imports = src.split('\n').filter((l) => l.startsWith('import '))
    expect(imports.some((l) => l.includes('@/lib/api'))).toBe(false)
    expect(imports.filter((l) => l.includes('@/lib/queries/')).join('\n')).toBe("import { useWebhookConfig } from '@/lib/queries/webhook'")
    expect(src).not.toMatch(/useMutation|fetch\(|request\(|XMLHttpRequest|sendBeacon/)
  })
})

describe('WebhookConfigCard asks before switching the LIVE webhook', () => {
  it('inactive (404): explains both causes, activation runs only after "Ya, aktifkan"', async () => {
    vi.spyOn(api, 'getWebhookConfig').mockRejectedValue(new ApiError('not_found', 404))
    const writers = spyWriters()
    renderWith(<WebhookConfigCard />)

    expect(await screen.findByText(/belum dibuat atau sedang dijeda/, undefined, T)).toBeInTheDocument()
    expect(screen.queryByText(/No webhook configured/i)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /aktifkan webhook \(live\)/i }))
    expect(await screen.findByRole('alertdialog', undefined, T)).toHaveTextContent('LIVE')
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }))
    expect(writers.reactivateWebhookConfig).not.toHaveBeenCalled()
    expect(writers.createWebhookConfig).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /aktifkan webhook \(live\)/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Ya, aktifkan' }, T))
    await waitFor(() => expect(writers.reactivateWebhookConfig).toHaveBeenCalledTimes(1), T)
    expect(writers.createWebhookConfig).not.toHaveBeenCalled() // reactivate succeeded: no new passphrase
  })

  it('active: deactivation runs only after "Ya, nonaktifkan"', async () => {
    vi.spyOn(api, 'getWebhookConfig').mockResolvedValue(CONFIG)
    const writers = spyWriters()
    renderWith(<WebhookConfigCard />)

    fireEvent.click(await screen.findByRole('button', { name: /nonaktifkan/i }, T))
    expect(await screen.findByRole('alertdialog', undefined, T)).toHaveTextContent('LIVE')
    expect(writers.deleteWebhookConfig).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Ya, nonaktifkan' }))
    await waitFor(() => expect(writers.deleteWebhookConfig).toHaveBeenCalledTimes(1), T)
  })
})

describe('AlertPayloadTemplate', () => {
  it('uses the action / side values the bot accepts', () => {
    const open = alertTemplate('open', 'short', 'x')
    const close = alertTemplate('close', 'long', 'x')
    expect(open).toMatchObject({ action: 'open', side: 'short', size_type: 'percent', exchange: 'binance', symbol: '{{ticker}}' })
    expect(close).toMatchObject({ action: 'close', side: 'long', size_value: 100 })
    expect(close).not.toHaveProperty('leverage')
    for (const t of [open, close]) {
      expect(['open', 'close']).toContain(t.action)
      expect(JSON.stringify(t)).not.toMatch(/strategy\.order\.action|alert_message/)
    }
  })

  it('masks the passphrase on screen by default', async () => {
    vi.spyOn(api, 'getWebhookConfig').mockResolvedValue(CONFIG)
    renderWith(<AlertPayloadTemplate />)
    await screen.findByRole('button', { name: /tampilkan kata sandi/i }, T)
    expect(document.body.textContent).not.toContain('pp-SECRET-1234')
    expect(document.body.textContent).toContain('"action": "open"')
  })
})
