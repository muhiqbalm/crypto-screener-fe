'use client'
import { QueryClientProvider } from '@tanstack/react-query'
import { getQueryClient } from '@/lib/queries/queryClient'
import { ErrorBoundary } from '@/components/shell/ErrorBoundary'
import { ThemeProvider as NextThemesProvider } from "next-themes"


// ThemeProvider is intentionally NOT here — it must live in the server layout
// (layout.tsx) so next-themes can inject its script tag at the server level.
// Placing ThemeProvider inside a 'use client' component causes React 19 to
// warn: "Encountered a script tag while rendering React component."

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </QueryClientProvider>
  )
}


export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {

  // React 19 / Next 16 fix: suppress the <script> tag warning by
  // telling next-themes to use type="application/json" instead of
  // type="text/javascript", which React won't try to execute
  const scriptProps =
    typeof window === "undefined"
      ? undefined
      : ({ type: "application/json" } as const);

  return <NextThemesProvider {...props} scriptProps={scriptProps}>{children}</NextThemesProvider>
}