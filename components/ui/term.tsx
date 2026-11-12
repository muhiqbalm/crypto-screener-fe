'use client'

import * as React from 'react'
import { InfoTip } from '@/components/ui/info-tip'
import { getTerm, type GlossaryKey } from '@/lib/glossary'
import { cn } from '@/lib/utils/cn'

export interface TermProps {
  /** Glossary key from lib/glossary.ts (or lib/glossary-extra/*). */
  k: GlossaryKey
  /** Override the visible text (e.g. a value name); the tip still comes from the glossary. */
  children?: React.ReactNode
  /** Use the entry's `short` label (table headers, chips). */
  short?: boolean
  /** Hide the (i) button, e.g. when the same term is explained nearby. Default false. */
  noTip?: boolean
  /**
   * 'icon' (default): text + (i) button after it.
   * 'underline': the text itself is the tap target (dotted underline). Use in running text.
   */
  variant?: 'icon' | 'underline'
  className?: string
}

/**
 * A glossary term: the agreed label + a tappable explanation.
 *
 *   <Term k="holdout" />            → "Data baru (holdout) (i)"
 *   <Term k="profit_factor" short /> → "PF (i)"
 *
 * Unknown keys render the key as plain text (never crash).
 */
export function Term({ k, children, short, noTip, variant = 'icon', className }: TermProps) {
  const entry = getTerm(k)
  const text = children ?? (entry ? (short && entry.short) || entry.label : k)
  if (!entry?.tip || noTip) return <span className={className}>{text}</span>

  if (variant === 'underline') {
    return (
      <InfoTip title={entry.label} trigger={text} className={className}>
        {entry.tip}
      </InfoTip>
    )
  }
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span>{text}</span>
      <InfoTip title={entry.label} label={`Apa itu ${entry.label}?`}>
        {entry.tip}
      </InfoTip>
    </span>
  )
}
