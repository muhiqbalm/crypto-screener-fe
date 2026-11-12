import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { notificationsApi } from '@/lib/api/report'
import { NotificationBell } from './NotificationBell'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/lib/api/report', () => ({
  notificationsApi: {
    list: vi.fn(async () => ({
      unread: 3,
      items: [{ id: 1, type: 'job', title: 'Validasi #1 selesai', body: 'PASS', link: '/lab/runs/1', created_at: new Date().toISOString(), read: false }],
    })),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    ack: vi.fn(async () => ({ ok: true, unread: 1 })),
  },
  reportApi: {},
}))

describe('NotificationBell', () => {
  it('shows the unread count on the bell', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <NotificationBell />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Notifikasi, 3 belum dibaca' })).toBeInTheDocument()
  })
})

describe('NotificationBell sticky (audit 2026-11-13 K1)', () => {
  it('pins a failed live order on top until someone presses "Sudah dicek"', async () => {
    const now = new Date().toISOString()
    const sticky = {
      id: 9, type: 'live', title: 'Bot live tidak ikut sinyal: open SHORT ETH tidak tereksekusi',
      body: 'Alasan: ditolak', link: '/bot#cek', created_at: now, read: false, sticky: true, acked_at: null,
    }
    vi.mocked(notificationsApi.list).mockResolvedValue({
      unread: 2,
      pinned: [sticky],
      items: [sticky, { id: 1, type: 'job', title: 'Uji jujur #1 selesai', body: null, link: null, created_at: now, read: false }],
    })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <NotificationBell />
      </QueryClientProvider>,
    )
    const trigger = await screen.findByRole('button', { name: 'Notifikasi, 1 perlu dicek, 2 belum dibaca' })
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(await screen.findByText('Bot live · perlu dicek')).toBeInTheDocument()
    // pinned once, not repeated in the normal list
    expect(screen.getAllByText('Bot live tidak ikut sinyal: open SHORT ETH tidak tereksekusi')).toHaveLength(1)
    fireEvent.click(screen.getByRole('menuitem', { name: /Sudah dicek/ }))
    await waitFor(() => expect(notificationsApi.ack).toHaveBeenCalledWith(9))
  })
})
