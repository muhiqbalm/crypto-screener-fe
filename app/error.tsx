'use client'
import { Button } from '@/components/ui/button'

interface ErrorProps {
  error: Error & { digest?: string }
  unstable_retry: () => void
}

export default function Error({ error, unstable_retry }: ErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-lg font-semibold">Something went wrong</p>
      <p className="text-sm text-muted-foreground max-w-sm">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <Button variant="outline" onClick={unstable_retry} className="cursor-pointer">
        Try again
      </Button>
    </div>
  )
}
