'use client'

import { AlertTriangle, Inbox, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/cn'
import { ApiError, type ApiErrorKind } from '@/lib/api/errors'
import { describeError } from '@/components/shell/error-copy'

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
        'flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed px-6 py-12 text-center',
        className,
      )}
    >
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand/12 text-brand [&_svg]:h-8 [&_svg]:w-8">
        {icon ?? <Inbox aria-hidden="true" />}
      </div>
      <div className="space-y-1.5">
        <p className="display text-lg font-bold">{title}</p>
        {description && <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>}
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

/**
 * Error block, always in Indonesian with a suggested action.
 *
 *   <ErrorState error={query.error} onRetry={() => query.refetch()} />
 *
 * Pass the caught `error` (preferred): it is mapped by `describeError` (status,
 * backend reason, network) and technical text like "ApiError(server:422)" is
 * never shown. `kind` / `title` / `message` still work and override the mapping.
 */
export function ErrorState({
  error,
  kind,
  title,
  message,
  hint,
  onRetry,
  action,
  className,
  compact,
}: {
  /** The caught error (ApiError or anything else). */
  error?: unknown
  kind?: ApiErrorKind
  title?: string
  message?: string
  /** What the user can do; default from the error mapping. */
  hint?: string
  onRetry?: () => void
  /** Extra action next to "Coba lagi" (e.g. a link). */
  action?: React.ReactNode
  className?: string
  compact?: boolean
}) {
  const copy = error !== undefined ? describeError(error) : null
  const body = message ?? copy?.message ?? ERROR_MESSAGES[kind ?? 'server']
  const heading = title ?? copy?.title
  const tip = hint ?? copy?.hint
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-center',
        compact ? 'py-6' : 'py-12',
        className,
      )}
    >
      <div className={cn('grid place-items-center rounded-2xl bg-bearish/12 text-bearish', compact ? 'h-11 w-11' : 'h-14 w-14')}>
        <AlertTriangle className={compact ? 'h-5 w-5' : 'h-7 w-7'} aria-hidden="true" />
      </div>
      <div className="space-y-1">
        {heading && <p className="text-base font-bold">{heading}</p>}
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{body}</p>
        {tip && <p className="mx-auto max-w-sm text-sm text-muted-foreground">{tip}</p>}
      </div>
      {(onRetry || action) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Coba lagi
            </Button>
          )}
          {action}
        </div>
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
        <Skeleton key={i} className="h-12 w-full" />
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
