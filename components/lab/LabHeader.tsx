import Link from 'next/link'
import { FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const TABS = [
  { href: '/lab', label: 'Run builder' },
  { href: '/lab/scan', label: 'Scan multi-market' },
]

export function LabHeader({ title, subtitle, active }: { title: string; subtitle: string; active?: string }) {
  return (
    <div className="flex flex-col gap-4 border-b border-border/40 pb-6 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-mono font-medium text-violet-400 shadow-sm">
          <FlaskConical className="h-3.5 w-3.5" />
          STRATEGY LAB
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">{title}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      </div>
      <nav className="flex gap-1.5" aria-label="Navigasi Lab">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              'rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors',
              active === t.href
                ? 'border-violet-500/40 bg-violet-500/10 text-violet-300'
                : 'border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
