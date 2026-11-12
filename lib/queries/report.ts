'use client'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi, reportApi } from '@/lib/api/report'
import type { NotificationList } from '@/lib/api/types/report'

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

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: (res, id) =>
      patchCache(qc, (d) => ({
        unread: res.unread,
        items: d.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
      })),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: (res) =>
      patchCache(qc, (d) => ({ unread: res.unread, items: d.items.map((n) => ({ ...n, read: true })) })),
  })
}
