'use client'

import { useState, useEffect } from 'react'

export type ColumnId =
  | 'symbol'
  | 'rank'
  | 'price'
  | 'change_24h'
  | 'volume_24h'
  | 'funding_rate'
  | 'signal'
  | 'tier'
  | 'composite_score'

/**
 * Mobile (< 640px): symbol, signal, change_24h
 * Req 14.1 — note: design.md lists rank, symbol, price, change_24h, signal
 * but requirements.md 14.1 lists rank, symbol, price, change_24h, signal.
 * We follow requirements.md as the authoritative source.
 */
const MOBILE_COLUMNS: Set<ColumnId> = new Set([
  'symbol',
  'signal',
  'change_24h',
])

/**
 * Tablet (640–1023px): symbol, signal, tier, change_24h, price
 * Req 14.2
 */
const TABLET_COLUMNS: Set<ColumnId> = new Set([
  'symbol',
  'signal',
  'tier',
  'change_24h',
  'price',
])

/**
 * Desktop (≥ 1024px): all columns
 * Req 14.3
 */
const DESKTOP_COLUMNS: Set<ColumnId> = new Set<ColumnId>([
  'symbol',
  'rank',
  'price',
  'change_24h',
  'volume_24h',
  'funding_rate',
  'signal',
  'tier',
  'composite_score',
])

function getColumnsForWidth(width: number): Set<ColumnId> {
  if (width < 640) return MOBILE_COLUMNS
  if (width < 1024) return TABLET_COLUMNS
  return DESKTOP_COLUMNS
}

/**
 * Returns the set of column IDs that should be visible at the current
 * viewport width. Updates reactively when the viewport is resized across
 * a breakpoint boundary (Req 14.7).
 *
 * Defaults to DESKTOP_COLUMNS during SSR so the server-rendered HTML
 * matches the most common case and avoids hydration mismatches on desktop.
 */
export function useColumnVisibility(): Set<ColumnId> {
  const [columns, setColumns] = useState<Set<ColumnId>>(DESKTOP_COLUMNS)

  useEffect(() => {
    function update() {
      setColumns(getColumnsForWidth(window.innerWidth))
    }

    // Apply immediately on mount
    update()

    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return columns
}
