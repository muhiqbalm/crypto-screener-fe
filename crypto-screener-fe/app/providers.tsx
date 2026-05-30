'use client'
import { ThemeProvider } from 'next-themes'
import { QueryClientProvider } from '@tanstack/react-query'
import { getQueryClient } from '@/lib/queries/queryClient'
import { ErrorBoundary } from '@/components/shell/ErrorBoundary'

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="crypto-screener-theme"
    >
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
