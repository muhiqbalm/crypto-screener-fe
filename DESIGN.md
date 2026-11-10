# BMTM FE design system

Short guide for building pages that look like the rest of the app. Dark is
the default theme; light is `html.light` (next-themes). UI copy is Indonesian;
trading terms (Long, Short, Entry, PnL, Stop loss) stay in English.

## 1. Adding a page

1. Create `app/(app)/<route>/page.tsx` (server component) and export
   `metadata = { title: 'Nama Halaman' }`. The layout adds the
   ` · BMTM MoonTrade` suffix.
2. Add the route to `lib/nav.ts`:
   - Strategy Lab sub-page → append to `LAB_NAV`. It shows up in the sidebar
     *and* in the Lab tab strip (`LabHeader`).
   - Other page → add an item to the right group in `NAV_GROUPS`.
     `adminOnly` groups only show when `GET /lab/me` says `is_admin`. This is
     a UI hint only: the backend must enforce access.
3. Build the page with the layout primitives:

```tsx
import { Trophy } from 'lucide-react'
import { PageContainer, PageHeader, SectionHeading } from '@/components/shell/page'

export const metadata = { title: 'Koin Terkuat · Strategy Lab' }

export default function Page() {
  return (
    <PageContainer>                     {/* width="narrow" | "default" | "wide" */}
      <PageHeader
        eyebrow="Strategy Lab" eyebrowIcon={Trophy} tone="lab"
        title="Koin terkuat"
        description="Satu kalimat tentang isi halaman."
        actions={<Button size="sm">…</Button>}
      />
      <SectionHeading title="Ranking" description="…" />
      …
    </PageContainer>
  )
}
```

For a Lab page, use `<LabHeader title subtitle actions? />`. It already includes the tabs.
`PageHeader` is server-safe. `PageTabs` and `LabHeader` are client components
(nav items contain icon components, which can't be passed as server→client props).

## 2. Tokens (app/globals.css)

Only use semantic colours. Don't use raw palette classes like `emerald-400` or `rose-500`.

| Token | Use |
|---|---|
| `bullish` / `bearish` | market direction, signed PnL, long/short |
| `brand` | BMTM identity, active nav, focus ring |
| `info` | neutral info, links, "running" states |
| `warn` | caution, stale data, holdout warnings |
| `lab` | Strategy Lab / paper-only accents |
| `background`, `card`, `popover`, `sidebar`, `muted`, `accent`, `border` | surfaces |

Tint pattern: `border-x/30 bg-x/10 text-x` (or just `<Badge variant="x">`).

Type scale: `text-3xs` (10px, the minimum), `text-2xs` (11px), then the
Tailwind defaults. Utilities: `num` (mono + tabular digits, for every number),
`eyebrow` (small uppercase label).

Charts (lightweight-charts is canvas) get their colours from `getChartTheme(isDark)`
in `lib/chart-theme.ts`.

## 3. Components

| Need | Use |
|---|---|
| Page frame / header / section title | `components/shell/page.tsx` |
| Card panel with title + action | `Section` (`components/lab/Section.tsx`) or `Card` |
| KPI number | `StatTile` (`components/ui/stat-tile.tsx`) |
| Status chip | `Badge` with `variant="bullish|bearish|warn|info|lab|brand|muted"`, `size="sm|xs"` |
| Long/Short, exchange name | `SideBadge`, `ExchangeLabel` (`components/trading/`) |
| 2–6 option toggle | `Segmented` (`components/ui/segmented.tsx`) |
| Loading / empty / error | `LoadingState`, `EmptyState`, `ErrorState` (`components/shell/states.tsx`) |
| Side panel / drawer | `Sheet` (`components/ui/sheet.tsx`, Radix Dialog) |
| Menu | `DropdownMenu` (`components/ui/dropdown-menu.tsx`) |
| Destructive / live-money confirm | `AlertDialog` (`components/ui/alert-dialog.tsx`) |

Every data section handles **loading → error (with retry) → empty → data**.

## 4. Numbers (lib/utils/format.ts)

| Value | Formatter | Example |
|---|---|---|
| Crypto price | `formatPrice` | `$67,420.50`, `$2.3457`, `$0.00001234` |
| Money (balance, equity, PnL, notional) | `formatUsd` / `formatUsdSigned` | `$1,234.50`, `+$12.30` |
| Wallet amount in its own currency | `formatAmount(v, ccy)` | `$800.00` (USDT), `0.0315 BTC` |
| Quantity / contracts | `formatQty` | `0.3`, `12,500` |
| Percent change | `formatPercent` | `+1.23%` |
| Volume | `formatVolume` | `$1.50M` |
| Sign colour | `signClass(v)` | `text-bullish` / `text-bearish` |

Never call `toFixed` in JSX for prices: low-priced coins round to `$0.00`.

## 5. Security rules

- Never use `dangerouslySetInnerHTML`. External links go through
  `safeExternalUrl` and use `rel="noopener noreferrer"`.
- Redirect targets from the URL go through `safeNextPath`.
- A new third-party host (API, websocket, image CDN) has to be added to the CSP in
  `next.config.ts`, or the browser will block it.
- Anything that can place, cancel or close a **live** order needs an
  `AlertDialog` confirm, and must say *live* in the copy.
