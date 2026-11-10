'use client'

import { AlertTriangle, Inbox, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/cn'
import { ApiError, type ApiErrorKind } from '@/lib/api/errors'

/**
 * Standard loading / empty / error states. Use these instead of ad-hoc
 * "No data" paragraphs so every page communicates state the same way.
 */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center',
        className,
      )}
    >
      <div className="text-muted-foreground/60">{icon ?? <Inbox className="h-8 w-8" aria-hidden="true" />}</div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mx-auto max-w-sm text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export const ERROR_MESSAGES: Record<ApiErrorKind, string> = {
  auth: 'Sesi berakhir atau akses ditolak. Silakan login ulang.',
  not_found: 'Data tidak ditemukan.',
  server: 'Server sedang bermasalah. Coba lagi sebentar lagi.',
  network: 'Tidak bisa terhubung ke server. Cek koneksi internet kamu.',
}

export function errorKind(error: unknown): ApiErrorKind {
  return error instanceof ApiError ? error.kind : 'server'
}

export function ErrorState({
  kind = 'server',
  title,
  message,
  onRetry,
  className,
  compact,
}: {
  kind?: ApiErrorKind
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
  compact?: boolean
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-center',
        compact ? 'py-6' : 'py-12',
        className,
      )}
    >
      <AlertTriangle className={cn('text-bearish', compact ? 'h-6 w-6' : 'h-8 w-8')} aria-hidden="true" />
      <div className="space-y-1">
        {title && <p className="text-sm font-medium">{title}</p>}
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{message ?? ERROR_MESSAGES[kind]}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  )
}

/** Generic block skeleton list for a section that is loading. */
export function LoadingState({ rows = 4, className, label = 'Memuat…' }: { rows?: number; className?: string; label?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  )
}

/** Inline spinner + text, for buttons / small areas. */
export function InlineLoading({ label = 'Memuat…', className }: { label?: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-xs text-muted-foreground', className)}>
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      {label}
    </span>
  )
}
