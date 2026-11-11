import { request } from './client'
import type {
  NotificationList,
  NotificationReadResponse,
  ReportWeeksResponse,
  WeeklyReport,
} from './types/report'

/** Laporan Mingguan (admin-only, same Bearer JWT as the rest of the Lab). */
export const reportApi = {
  getWeeks(signal?: AbortSignal): Promise<ReportWeeksResponse> {
    return request<ReportWeeksResponse>('GET', '/api/v1/lab/report/weeks', undefined, signal)
  },
  getWeekly(week: string | null, signal?: AbortSignal): Promise<WeeklyReport> {
    const q = week ? `?week=${encodeURIComponent(week)}` : ''
    return request<WeeklyReport>('GET', `/api/v1/lab/report/weekly${q}`, undefined, signal)
  },
}

/** In-web notifications (admin-only; read state is per user). */
export const notificationsApi = {
  list(signal?: AbortSignal): Promise<NotificationList> {
    return request<NotificationList>('GET', '/api/v1/lab/notifications?limit=30', undefined, signal)
  },
  markRead(id: number): Promise<NotificationReadResponse> {
    return request<NotificationReadResponse>('POST', `/api/v1/lab/notifications/${encodeURIComponent(String(id))}/read`)
  },
  markAllRead(): Promise<NotificationReadResponse> {
    return request<NotificationReadResponse>('POST', '/api/v1/lab/notifications/read-all')
  },
}
