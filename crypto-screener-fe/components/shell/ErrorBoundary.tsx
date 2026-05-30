'use client'
import React from 'react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <p className="text-lg font-semibold">Something went wrong</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            An unexpected error occurred. Please reload the page.
          </p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="cursor-pointer"
          >
            Reload
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
