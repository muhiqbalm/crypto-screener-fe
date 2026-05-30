'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ApiErrorKind } from '@/lib/api/errors'

const ERROR_MESSAGES: Record<ApiErrorKind, string> = {
  auth: 'Authentication required. Please check your API key or log in again.',
  not_found: 'The requested resource was not found.',
  server: 'A server error occurred. Please try again later.',
  network: 'Network error. Please check your connection and try again.',
}

interface ErrorPanelProps {
  kind: ApiErrorKind
  onRetry: () => void
  messageOverride?: string
}

export function ErrorPanel({ kind, onRetry, messageOverride }: ErrorPanelProps) {
  const message = messageOverride ?? ERROR_MESSAGES[kind]
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 py-12 text-center"
    >
      {/* Icon + text together so color is not the only indicator */}
      <AlertTriangle
        className="h-10 w-10 text-bearish"
        aria-hidden="true"
      />
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
      <Button
        variant="outline"
        onClick={onRetry}
        className="transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Retry
      </Button>
    </div>
  )
}
