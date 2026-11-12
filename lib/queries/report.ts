'use client'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi, reportApi } from '@/lib/api/report'
import type { LabNotification, NotificationList } from '@/lib/api/types/report'

const NOTIF_KEY = ['lab', 'notifications'] as const
/** Bell polling: every 60 s, paused while the tab is hidden (like the other Lab polls). */
export const NOTIFICATIONS_POLL_MS = 60_000

export function useReportWeeks() {
  return useQuery({
    queryKey: ['lab', 'report', 'weeks'] as const,
    queryFn: ({ signal }) => reportApi.getWeeks(signal),
    staleTime: 5 * 60_000,
  })
}

/** `week` null = the running week. Pass `enabled: false` until the week is known. */
export function useWeeklyReport(week: string | null, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['lab', 'report', 'weekly', week ?? 'current'] as const,
    queryFn: ({ signal }) => reportApi.getWeekly(week, signal),
    enabled: opts.enabled ?? true,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
}

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: NOTIF_KEY,
    queryFn: ({ signal }) => notificationsApi.list(signal),
    enabled,
    retry: false,
    refetchInterval: NOTIFICATIONS_POLL_MS,
    refetchIntervalInBackground: false,
  })
}

function patchCache(qc: ReturnType<typeof useQueryClient>, fn: (d: NotificationList) => NotificationList) {
  qc.setQueryData<NotificationList>(NOTIF_KEY, (d) => (d ? fn(d) : d))
}

/** Sticky and not acknowledged yet: stays unread and pinned whatever the read state says. */
export function isOpenSticky(n: Pick<LabNotification, 'sticky' | 'acked_at'>): boolean {
  return Boolean(n.sticky && !n.acked_at)
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: (res, id) =>
      patchCache(qc, (d) => ({
        ...d,
        unread: res.unread,
        items: d.items.map((n) => (n.id === id && !isOpenSticky(n) ? { ...n, read: true } : n)),
      })),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: (res) =>
      patchCache(qc, (d) => ({
        ...d,
        unread: res.unread,
        items: d.items.map((n) => (isOpenSticky(n) ? n : { ...n, read: true })),
      })),
  })
}

/** "Sudah dicek" on a sticky notification (shared by every admin). */
export function useAckNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => notificationsApi.ack(id),
    onSuccess: (res, id) => {
      const at = new Date().toISOString()
      patchCache(qc, (d) => ({
        ...d,
        unread: res.unread,
        pinned: (d.pinned ?? []).filter((n) => n.id !== id),
        items: d.items.map((n) => (n.id === id ? { ...n, read: true, acked_at: n.acked_at ?? at } : n)),
      }))
    },
  })
}
