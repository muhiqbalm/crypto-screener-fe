import { ThemeToggle } from './ThemeToggle'

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <span className="text-lg font-semibold tracking-tight">
          Crypto Screener
        </span>
        <ThemeToggle />
      </div>
    </header>
  )
}
