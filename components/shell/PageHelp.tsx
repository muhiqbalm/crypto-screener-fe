'use client'

import { useEffect, useId, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { getTerm, type GlossaryKey } from '@/lib/glossary'
import { cn } from '@/lib/utils/cn'

export interface PageHelpContent {
  /** One or two sentences: what this page answers. */
  apaIni: React.ReactNode
  /** Short steps, 2–4. */
  caraPakai?: React.ReactNode[]
  /** Glossary keys used on this page; label + tip are listed in the panel. */
  istilah?: GlossaryKey[]
}

const STORAGE_PREFIX = 'bmtm:help:'

function readOpen(key: string): boolean | null {
  try {
    const v = window.localStorage.getItem(STORAGE_PREFIX + key)
    return v === null ? null : v === '1'
  } catch {
    return null
  }
}

function writeOpen(key: string, open: boolean) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, open ? '1' : '0')
  } catch {
    // private mode / blocked storage: the panel just won't remember
  }
}

/**
 * "Apa ini? · Cara pakai" fold under a page title. Closed by default; the
 * open/closed choice is remembered per page (localStorage, best effort).
 */
export function PageHelp({ help, helpId, className }: { help: PageHelpContent; helpId?: string; className?: string }) {
  const pathname = usePathname()
  const key = helpId ?? pathname
  const [open, setOpen] = useState(false)
  const panelId = useId()

  useEffect(() => {
    const saved = readOpen(key)
    // Sync with the remembered choice after mount (localStorage is client-only).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved !== null) setOpen(saved)
  }, [key])

  const toggle = () => {
    setOpen((o) => {
      writeOpen(key, !o)
      return !o
    })
  }

  const terms = (help.istilah ?? []).map((k) => ({ k, e: getTerm(k) })).filter((t) => t.e)

  return (
    <div className={cn('space-y-2', className)}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full text-sm font-semibold text-info hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
        Apa ini? · Cara pakai
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      <div id={panelId} hidden={!open} className="max-w-3xl space-y-4 rounded-2xl border bg-muted/40 p-4 text-base sm:p-5">
        <div className="space-y-1">
          <p className="eyebrow">Apa ini?</p>
          <div className="leading-relaxed text-foreground">{help.apaIni}</div>
        </div>
        {help.caraPakai && help.caraPakai.length > 0 && (
          <div className="space-y-1">
            <p className="eyebrow">Cara pakai</p>
            <ol className="list-decimal space-y-0.5 pl-5 leading-relaxed text-foreground marker:text-muted-foreground">
              {help.caraPakai.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        )}
        {terms.length > 0 && (
          <div className="space-y-1">
            <p className="eyebrow">Istilah</p>
            <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
              {terms.map(({ k, e }) => (
                <div key={k} className="min-w-0">
                  <dt className="text-sm font-semibold text-foreground">{e!.label}</dt>
                  {e!.tip && <dd className="text-sm text-muted-foreground">{e!.tip}</dd>}
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}
