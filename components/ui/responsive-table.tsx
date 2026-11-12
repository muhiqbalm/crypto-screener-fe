'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface ResponsiveColumn<T> {
  /** Stable id. */
  key: string
  /** Header text (desktop) and field label (phone card). */
  header: React.ReactNode
  /** Plain-text label for the phone card when `header` is not a string. */
  mobileLabel?: string
  cell: (row: T) => React.ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
  headerClassName?: string
  /**
   * Role on the phone card:
   *  'title'    big first line (left), usually the coin / preset name
   *  'badge'    top-right (status, direction, verdict)
   *  'field'    one of the key fields in the 3-column grid
   *  'hidden'   desktop only
   * Default: the first 3 columns without a role become fields, the rest hidden.
   */
  mobile?: 'title' | 'badge' | 'field' | 'hidden'
}

export interface ResponsiveTableProps<T> {
  rows: readonly T[]
  columns: ResponsiveColumn<T>[]
  rowKey: (row: T, index: number) => string | number
  /** Whole row (and card) is a link. */
  rowHref?: (row: T) => string | null | undefined
  /** Whole row (and card) is a button. Ignored when rowHref returns a link. */
  onRowClick?: (row: T) => void
  /** Accessible name of the row action, e.g. (row) => `Buka ${row.coin}`. */
  rowLabel?: (row: T) => string
  /** Highlight a row (e.g. the preset you just created). */
  isRowHighlighted?: (row: T) => boolean
  /** sr-only caption describing the table. */
  caption?: string
  /** Rendered instead of the table when there are no rows. */
  empty?: React.ReactNode
  /** Max fields on a phone card. Default 3. */
  mobileFields?: number
  className?: string
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const

function mobileRoles<T>(columns: ResponsiveColumn<T>[], max: number) {
  const title = columns.find((c) => c.mobile === 'title')
  const badge = columns.find((c) => c.mobile === 'badge')
  const explicit = columns.filter((c) => c.mobile === 'field')
  const fields = (explicit.length > 0 ? explicit : columns.filter((c) => !c.mobile)).slice(0, max)
  return { title, badge, fields }
}

/**
 * Table on ≥ 640 px, cards on phones (title + badge + up to 3 key fields +
 * arrow), so no page needs sideways scrolling. Both layouts are rendered and
 * switched with CSS (no layout flash, SSR-safe). Wide desktop tables still
 * scroll inside their own box, never the page.
 */
export function ResponsiveTable<T>({
  rows,
  columns,
  rowKey,
  rowHref,
  onRowClick,
  rowLabel,
  isRowHighlighted,
  caption,
  empty,
  mobileFields = 3,
  className,
}: ResponsiveTableProps<T>) {
  if (rows.length === 0 && empty) return <>{empty}</>
  const { title, badge, fields } = mobileRoles(columns, mobileFields)
  const desktopCols = columns

  const labelOf = (c: ResponsiveColumn<T>) => c.mobileLabel ?? (typeof c.header === 'string' ? c.header : c.key)

  return (
    <div className={cn('min-w-0', className)}>
      {/* ≥ sm: table. `relative` makes this scroll box the containing block, so
          absolutely positioned children (sr-only labels) are clipped by it
          instead of widening the page. */}
      <div data-rt-scroll className="relative hidden overflow-x-auto rounded-xl border bg-card sm:block">
        <table className="w-full caption-bottom text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="border-b bg-muted/30">
            <tr>
              {desktopCols.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    'h-9 whitespace-nowrap px-3 text-2xs font-semibold uppercase tracking-wide text-muted-foreground',
                    ALIGN[c.align ?? 'left'],
                    c.headerClassName,
                  )}
                >
                  {c.header}
                </th>
              ))}
              {(rowHref || onRowClick) && (
                <th scope="col" className="w-8 px-2">
                  <span className="sr-only">Buka</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const href = rowHref?.(row) ?? null
              const clickable = Boolean(href || onRowClick)
              return (
                <tr
                  key={rowKey(row, i)}
                  className={cn(
                    'border-b last:border-0 transition-colors',
                    clickable && 'cursor-pointer hover:bg-accent/50',
                    isRowHighlighted?.(row) && 'bg-brand/[0.07]',
                  )}
                  onClick={clickable && !href ? () => onRowClick?.(row) : undefined}
                >
                  {desktopCols.map((c) => (
                    <td key={c.key} className={cn('px-3 py-2.5 align-middle', ALIGN[c.align ?? 'left'], c.className)}>
                      {c.cell(row)}
                    </td>
                  ))}
                  {clickable && (
                    <td className="px-2 text-right">
                      {href ? (
                        <Link
                          href={href}
                          aria-label={rowLabel?.(row) ?? 'Buka detail'}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onRowClick?.(row)
                          }}
                          aria-label={rowLabel?.(row) ?? 'Buka detail'}
                          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* < sm: cards */}
      <ul className="space-y-2 sm:hidden" aria-label={caption}>
        {rows.map((row, i) => {
          const href = rowHref?.(row) ?? null
          const clickable = Boolean(href || onRowClick)
          const body = (
            <>
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0 truncate text-sm font-semibold">{title ? title.cell(row) : null}</div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {badge?.cell(row)}
                  {clickable && <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
                </div>
              </div>
              {fields.length > 0 && (
                <dl className="mt-2 grid grid-cols-3 gap-2">
                  {fields.map((c) => (
                    <div key={c.key} className="min-w-0">
                      <dt className="truncate text-3xs font-semibold uppercase tracking-wide text-muted-foreground">{labelOf(c)}</dt>
                      <dd className="mt-0.5 min-w-0 truncate text-xs">{c.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </>
          )
          const cardClass = cn(
            'block w-full rounded-xl border bg-card p-3 text-left',
            clickable && 'transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isRowHighlighted?.(row) && 'border-brand/50 bg-brand/[0.07]',
          )
          return (
            <li key={rowKey(row, i)}>
              {href ? (
                <Link href={href} aria-label={rowLabel?.(row)} className={cardClass}>
                  {body}
                </Link>
              ) : onRowClick ? (
                // div[role=button]: a <button> may not contain the card's block content.
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onRowClick(row)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onRowClick(row)
                    }
                  }}
                  aria-label={rowLabel?.(row)}
                  className={cn(cardClass, 'cursor-pointer')}
                >
                  {body}
                </div>
              ) : (
                <div className={cardClass}>{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
