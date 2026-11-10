'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import type { SignalDirection, TierClass } from '@/lib/api/types/screener'

export interface ScreenerFilterState {
  symbol: string
  signal: SignalDirection | 'ALL'
  tier: TierClass | 'ALL'
}

interface ScreenerFiltersProps {
  filters: ScreenerFilterState
  onFiltersChange: (filters: ScreenerFilterState) => void
}

export function ScreenerFilters({ filters, onFiltersChange }: ScreenerFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {/* Symbol search */}
      <div className="flex flex-col gap-1.5 min-w-[160px]">
        <Label
          htmlFor="symbol-filter"
          className="text-xs text-muted-foreground"
        >
          Simbol
        </Label>
        <Input
          id="symbol-filter"
          type="search"
          placeholder="Cari simbol…"
          value={filters.symbol}
          onChange={(e) =>
            onFiltersChange({ ...filters, symbol: e.target.value })
          }
          className="h-8 text-sm transition-colors duration-200 focus-visible:ring-ring"
          aria-label="Filter simbol"
        />
      </div>

      {/* Signal filter */}
      <div className="flex flex-col gap-1.5 min-w-[130px]">
        <Label
          htmlFor="signal-filter"
          className="text-xs text-muted-foreground"
        >
          Sinyal
        </Label>
        <Select
          value={filters.signal}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, signal: v as SignalDirection | 'ALL' })
          }
        >
          <SelectTrigger
            id="signal-filter"
            className="h-8 text-sm cursor-pointer transition-colors duration-200"
            aria-label="Filter sinyal"
          >
            <SelectValue placeholder="Semua sinyal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua sinyal</SelectItem>
            <SelectItem value="BULLISH">Bullish</SelectItem>
            <SelectItem value="BEARISH">Bearish</SelectItem>
            <SelectItem value="NEUTRAL">Neutral</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tier filter */}
      <div className="flex flex-col gap-1.5 min-w-[110px]">
        <Label
          htmlFor="tier-filter"
          className="text-xs text-muted-foreground"
        >
          Tier
        </Label>
        <Select
          value={filters.tier}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, tier: v as TierClass | 'ALL' })
          }
        >
          <SelectTrigger
            id="tier-filter"
            className="h-8 text-sm cursor-pointer transition-colors duration-200"
            aria-label="Filter tier"
          >
            <SelectValue placeholder="Semua tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua tier</SelectItem>
            <SelectItem value="A">Tier A</SelectItem>
            <SelectItem value="B">Tier B</SelectItem>
            <SelectItem value="C">Tier C</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
