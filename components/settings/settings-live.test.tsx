import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { ApiError } from '@/lib/api/errors'
import type { WebhookConfigResponse } from '@/lib/api/types/webhook'
import { ExchangeCredentialCard } from './ExchangeCredentialCard'
import { WebhookConfigSettings } from './WebhookConfigSettings'
import { SettingsView } from './SettingsView'

vi.mock('next/navigation', () => ({ usePathname: () => '/settings', useRouter: () => ({ push: vi.fn() }) }))

const CONFIG: WebhookConfigResponse = { id: 'wh1', passphrase: 'pp-SECRET-1234', is_active: true, created_at: '2026-10-13T05:00:00Z' }
const T = { timeout: 5000 }

function renderWith(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

async function typeLive() {
  fireEvent.change(await screen.findByLabelText(/Ketik LIVE untuk melanjutkan/i, undefined, T), { target: { value: 'LIVE' } })
}

afterEach(() => vi.restoreAllMocks())

describe('API key changes ask first', () => {
  const existing = { exchange: 'binance', is_configured: true, created_at: '2026-10-01T00:00:00Z' }

  it('replacing a key only calls upsert after "Ya, ganti key"', async () => {
    const upsert = vi.spyOn(api, 'upsertCredential').mockResolvedValue(existing)
    renderWith(<ExchangeCredentialCard exchange="binance" existing={existing} />)
    fireEvent.click(screen.getByRole('button', { name: /ganti api key/i }))
    fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'k-123' } })
    fireEvent.change(screen.getByLabelText('Secret'), { target: { value: 's-456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(await screen.findByRole('alertdialog', undefined, T)).toHaveTextContent('Ganti API key Binance?')
    expect(upsert).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }))
    expect(upsert).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Ya, ganti key' }, T))
    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1), T)
    expect(upsert.mock.calls[0][0]).toEqual({ exchange: 'binance', api_key: 'k-123', secret: 's-456', api_passphrase: null })
  })

  it('deleting a key needs the word LIVE and only then calls delete', async () => {
    const del = vi.spyOn(api, 'deleteCredential').mockResolvedValue({ message: 'ok' })
    renderWith(<ExchangeCredentialCard exchange="binance" existing={existing} />)
    fireEvent.click(screen.getByRole('button', { name: /^hapus$/i }))
    const confirm = await screen.findByRole('button', { name: 'Ya, hapus API key' }, T)
    expect(confirm).toBeDisabled()
    fireEvent.click(confirm)
    expect(del).not.toHaveBeenCalled()
    await typeLive()
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)
    await waitFor(() => expect(del).toHaveBeenCalledWith('binance'), T)
  })
})

describe('Webhook settings ask first', () => {
  it('changing the passphrase needs LIVE and only then PATCHes', async () => {
    vi.spyOn(api, 'getWebhookConfig').mockResolvedValue(CONFIG)
    const patch = vi.spyOn(api, 'patchWebhookConfig').mockResolvedValue(CONFIG)
    renderWith(<WebhookConfigSettings />)
    fireEvent.click(await screen.findByRole('button', { name: /ganti kata sandi webhook/i }, T))
    fireEvent.change(screen.getByLabelText('Kata sandi webhook baru'), { target: { value: 'new-pass-9876' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))

    const confirm = await screen.findByRole('button', { name: 'Ya, ganti kata sandi' }, T)
    fireEvent.click(confirm)
    expect(patch).not.toHaveBeenCalled()
    await typeLive()
    fireEvent.click(confirm)
    await waitFor(() => expect(patch).toHaveBeenCalledWith({ passphrase: 'new-pass-9876' }), T)
  })

  it('a too-short passphrase never reaches the dialog or the server', async () => {
    vi.spyOn(api, 'getWebhookConfig').mockResolvedValue(CONFIG)
    const patch = vi.spyOn(api, 'patchWebhookConfig').mockResolvedValue(CONFIG)
    renderWith(<WebhookConfigSettings />)
    fireEvent.click(await screen.findByRole('button', { name: /ganti kata sandi webhook/i }, T))
    fireEvent.change(screen.getByLabelText('Kata sandi webhook baru'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(screen.getByRole('alert')).toHaveTextContent('minimal 8 karakter')
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(patch).not.toHaveBeenCalled()
  })

  it('deactivation only runs after "Ya, nonaktifkan"', async () => {
    vi.spyOn(api, 'getWebhookConfig').mockResolvedValue(CONFIG)
    const del = vi.spyOn(api, 'deleteWebhookConfig').mockResolvedValue(undefined)
    renderWith(<WebhookConfigSettings />)
    fireEvent.click(await screen.findByRole('button', { name: /nonaktifkan webhook/i }, T))
    expect(del).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Ya, nonaktifkan' }, T))
    await waitFor(() => expect(del).toHaveBeenCalledTimes(1), T)
  })

  it('activating from the inactive state only runs after "Ya, aktifkan"', async () => {
    vi.spyOn(api, 'getWebhookConfig').mockRejectedValue(new ApiError('not_found', 404))
    const reactivate = vi.spyOn(api, 'reactivateWebhookConfig').mockResolvedValue(CONFIG)
    const create = vi.spyOn(api, 'createWebhookConfig').mockResolvedValue(CONFIG)
    renderWith(<WebhookConfigSettings />)
    fireEvent.click(await screen.findByRole('button', { name: /aktifkan webhook \(live\)/i }, T))
    expect(reactivate).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Ya, aktifkan' }, T))
    await waitFor(() => expect(reactivate).toHaveBeenCalledTimes(1), T)
    expect(create).not.toHaveBeenCalled()
  })
})

describe('Akun & koneksi', () => {
  it('a failed key list is an error, never "Belum ada" (which invites overwriting a live key)', async () => {
    vi.spyOn(api, 'listCredentials').mockRejectedValue(new ApiError('server', 500))
    vi.spyOn(api, 'getWebhookConfig').mockResolvedValue(CONFIG)
    vi.spyOn(api, 'getMe').mockResolvedValue({ id: 'u1', email: 'a@b.c', name: 'A', telegram_chat_id: null } as never)
    renderWith(<SettingsView />)
    expect(await screen.findByText(/Daftar API key belum bisa dimuat/, undefined, T)).toBeInTheDocument()
    expect(screen.queryByText('Belum ada')).toBeNull()
    expect(screen.queryByRole('button', { name: /tambah api key/i })).toBeNull()
  })
})
