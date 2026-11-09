import Link from 'next/link'
import { FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const TABS = [
  { href: '/lab', label: 'Uji strategi' },
  { href: '/lab/scan', label: 'Scan banyak koin' },
]

export function LabHeader({ title, subtitle, active }: { title: string; subtitle: string; active?: string }) {
  return (
    <div className="flex flex-col gap-4 border-b border-border/40 pb-5 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-lab/25 bg-lab/10 px-3 py-1 font-mono text-[11px] font-medium text-lab">
          <FlaskConical className="h-3.5 w-3.5" />
          STRATEGY LAB
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      </div>
      <nav className="inline-flex self-start rounded-lg border border-border/60 bg-muted/30 p-1 md:self-auto" aria-label="Navigasi Lab">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active === t.href ? 'page' : undefined}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
              active === t.href ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
