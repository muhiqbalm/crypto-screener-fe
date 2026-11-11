import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
