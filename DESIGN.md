# BMTM FE design system

Short guide for building pages that look and read like the rest of the app.
Dark is the default theme; light is `html.light` (next-themes). Users are the
CEO and a small team of traders, not quants: plain Indonesian, answer first.

## 0. Look v2: like a presentation deck (docs/riset-2026-11-12/06-desain-v2.md)

- **Theme:** night navy dark by default (`docs/bmtm-briefing.html`); light
  stays available in the User Hub. Colours only through tokens:
  `brand` blue #5b8cff, `bullish` #3ccf7f, `bearish` #ff6464, `warn` #f4ad42,
  `lab` violet (simulation), `info`, `faint` (meta text).
- **Type:** Inter for text, Plus Jakarta Sans (`display` utility, all h1–h3)
  for titles and big numbers; `num` = tabular digits (no mono for numbers).
  Scale: `text-3xs` 12px (uppercase labels only), `2xs` 13px (smallest body),
  `xs` 14, `sm` 15, `base` 16, `lg` 18 (card titles), `xl` 20 (sections),
  `2xl` 24 (answers), `3xl`–`4xl` 30–36 (page titles, KPI), `5xl`–`6xl`
  48–56 (hero numbers). Never 10–12px for body text.
- **Space:** page padding 32px (16px on phones), 32px between sections,
  24px card padding, 20–24px grid gaps, table rows ≥ 52px.
- **Cards:** `rounded-3xl`, thin border, no nested cards; one card = one
  message, max 3–4 numbers: icon + short title → big number/status → one
  line → small chart → one "Lihat …" link. Buttons and pills are `rounded-full`.
- **Bento:** one hero card (`HeroCard`, gradient border `ring-gradient`,
  `glass`, soft `glow`) spans 2 columns, supporting cards (`Panel`) are smaller.
  Max 3–4 KPI tiles and max 2 content cards per row on desktop.
- **Motion:** `lift` on clickable cards, `CountUp` for hero numbers,
  `LiveDot` pulse for things that are live, pill tab transitions. All of it
  stops under `prefers-reduced-motion`.
- **Building blocks:** `KpiTile`, `Sparkline`, `ProgressBar`, `Donut`,
  `Gauge` (+ `FNG_GAUGE_ZONES`), `IconTitle`/`IconChip`, `HeroCard`/`Panel`/
  `BentoGrid`, `CoinAvatar` (stable colour per coin), `ConfidenceDots`
  (keyakinan 1–3), `LiveDot`, `CountUp`, tone helpers in `components/ui/tone.ts`.
- **Not allowed:** emoji as section markers, gradients over the whole
  background, animation that gets in the way of reading, low contrast.

## 1. Text & display rules

1. **Language.** Bahasa Indonesia, addressing the user as "kamu". English
   trading terms (Long, Short, Entry, SL, TP, PnL, Leverage, Funding …) only
   when they are in the glossary (`lib/glossary.ts`) and get an explanation.
2. **One name per concept.** Use the glossary label, e.g. "Cari setting
   terbaik" (never Optimize/Optimasi), "Lolos / Gagal" (never PASS/FAIL in
   the UI), "NETRAL", "Data baru (holdout)". New concept → add a glossary key.
3. **Every money number says where it comes from**: `<StatusPill kind="live" />`
   (real money) or `kind="paper"` (simulation) next to it, its card or the
   page title.
4. **Colour is never the only signal**, and each colour has one meaning:
   green/red = direction or result, yellow (`warn`) = look at this,
   blue (`info`) = information, purple (`lab`) = simulation. No colour for
   "margin in use" or "fear". Always pair colour with a word or an icon.
5. **Explanations open on tap** (`<InfoTip>`, `<Term>`). `title=` is only a
   fallback for mouse users, never the only place an explanation lives.
6. **Errors are Indonesian** with a suggested action and a retry/link
   (`<ErrorState error={…} />`, `describeError(err)` for toasts). Never show
   technical text like `ApiError(server:422)` or a stack trace.
7. **Every page opens with the answer.** One sentence + 2–3 numbers
   (`<AnswerCard>`), evidence and methods folded below. A warning that shows
   almost always becomes a small permanent note instead.
8. **Missing data is said, never invented**: "tidak tersedia" + why. Mock
   data exists only in mock mode.
9. **Phones (400 px) never scroll sideways** at page level. Tables use
   `<ResponsiveTable>` (cards below 640 px); chip strips may scroll inside
   their own box. Check light and dark.
10. **Times are WIB** with Indonesian months: "12 Nov 08:00 WIB". Durations
    are written out ("4 jam", "1 hari"): "1h" never means a day.

## 2. Navigation & adding a page

Menu (single source `lib/nav.ts`): logo → **Beranda**, cluster **Pasar**
(Sentimen & berita → Arus besar → Peluang koin → Chart, the trader funnel),
cluster **Bot & Strategi** with a LIVE group (Status bot, Saldo & posisi,
Webhook) and a PAPER group (Uji strategi → Hasil uji → Preset → Paper
berjalan → Rekam jejak sinyal → Laporan mingguan). Settings, theme, system
status, notifications and logout live in the **User Hub** capsule (top
right). Admin sees 14 items, other accounts 8. Max 3 clusters (team rule).

1. Create `app/(app)/<route>/page.tsx` (server component) and export
   `metadata = { title: 'Nama Halaman' }`. The layout adds ` · BMTM MoonTrade`.
2. A new top-level page → one item in `NAV_CLUSTERS` (`access: 'admin'` hides
   it for non-admins; UI hint only, the backend enforces access). A page that
   belongs to an existing item → `activePrefixes` of that item, or a hub tab.
3. Sub-pages are **hub tabs** (`HUB_TABS` in `lib/nav.ts`, max 3), rendered
   with `<HubTabs hub="hasil" label="Sub-menu Hasil uji" />`. Underline tabs
   on desktop, a full-width segmented control on phones. Query-string views
   (`/koin?view=terkuat`) pass `value`.
4. Build the page with the layout primitives:

```tsx
import { PageContainer, PageHeader } from '@/components/shell/page'
import { StatusPill } from '@/components/ui/status-pill'

export const metadata = { title: 'Status bot' }

export default function Page() {
  return (
    <PageContainer>                     {/* width="narrow" | "default" | "wide" */}
      <PageHeader
        eyebrow="Bot & Strategi"
        title="Status bot"
        status={<StatusPill kind="live" />}
        description="Satu kalimat tentang isi halaman."
        help={{
          apaIni: 'Apa yang dijawab halaman ini.',
          caraPakai: ['Langkah 1.', 'Langkah 2.'],
          istilah: ['webhook', 'slippage_bps'],
        }}
        actions={<Button size="sm">…</Button>}
      />
      <AnswerCard tone="baik" answer="…" metrics={[…]} evidenceHref="#bukti" />
      …
    </PageContainer>
  )
}
```

Lab pages use `<LabHeader title subtitle status? help? />`: same header,
eyebrow "Strategi", hub tabs added automatically from the URL.
Old URLs are redirected (307, query kept) in `next.config.ts`
(`LEGACY_REDIRECTS`). Links to a coin: `coinHref(symbol)` → `/koin/ETH`.

## 3. Tokens (app/globals.css)

Only use semantic colours. Don't use raw palette classes like `emerald-400`.

| Token | Use |
|---|---|
| `bullish` / `bearish` | market direction, signed PnL, long/short, Lolos/Gagal |
| `brand` | BMTM identity, active nav, focus ring |
| `info` | neutral info, links, "running" states |
| `warn` | look at this: stale data, holdout warnings, "Perlu dicek" |
| `lab` | simulation / paper accents |
| `background`, `card`, `popover`, `sidebar`, `muted`, `accent`, `border` | surfaces |

LIVE uses the inverted foreground pill (not a status colour) so it never
reads as good/bad. Tint pattern: `border-x/30 bg-x/10 text-x` (or `<Badge variant="x">`).

Type scale: see section 0 (12px minimum, labels only). Utilities: `num`
(tabular digits, for every number), `display` (heading font), `eyebrow`
(uppercase label), `kicker` (accent label), `ring-gradient`, `glass`,
`text-glow`, `lift`, `animate-live-pulse`. Charts get colours from
`getChartTheme(isDark)` in `lib/chart-theme.ts`.

## 4. Components

| Need | Use |
|---|---|
| Page frame / header (+ help fold, status pills) | `PageContainer`, `PageHeader`, `SectionHeading` (`components/shell/page.tsx`) |
| Hero card / normal card / bento grid | `HeroCard`, `Panel`, `BentoGrid` (`components/ui/hero-card.tsx`) |
| Card header with icon | `IconTitle`, `IconChip` (`components/ui/icon-title.tsx`) |
| Big KPI with delta + sparkline | `KpiTile` (`components/ui/kpi.tsx`), or `StatTile` with `delta` / `sparkline` |
| Small charts | `Sparkline`, `ProgressBar`, `Donut`, `Gauge` (`components/ui/`) |
| Coin identity / keyakinan / live dot | `CoinAvatar`, `ConfidenceDots`, `LiveDot` (`components/ui/`) |
| Sub-tabs (max 3) | `HubTabs` (`components/shell/HubTabs.tsx`) |
| The answer first | `AnswerCard` (`components/ui/answer-card.tsx`) |
| What to do next (one primary button) | `NextStep` (`components/ui/next-step.tsx`) |
| LIVE / PAPER / RISET / ARSIP, health | `StatusPill` (`components/ui/status-pill.tsx`) |
| LONG / SHORT / NETRAL | `DirectionBadge` (`components/ui/direction-badge.tsx`) |
| Lolos / Gagal / Belum diuji | `VerdictBadge` (`components/ui/verdict-badge.tsx`) |
| Glossary term + tap explanation | `Term` (`components/ui/term.tsx`), `InfoTip` (`components/ui/info-tip.tsx`) |
| "Data close 4H … · diperbarui … · berikutnya …" | `Freshness` (`components/ui/freshness.tsx`) |
| Table that becomes cards on phones | `ResponsiveTable` (`components/ui/responsive-table.tsx`) |
| Confirm an action on the LIVE bot / real money | `ConfirmLive` (`components/ui/confirm-live.tsx`) |
| Market context strip (macro + whale) | `MarketRibbon` (`components/shell/MarketRibbon.tsx`) |
| Assistant place (summary now, AI later) | `AssistantSlot` (`components/shell/AssistantSlot.tsx`) |
| Card panel with title + action | `Section` (`components/lab/Section.tsx`, shared, do not edit) or `Card` |
| KPI number | `StatTile` (`components/ui/stat-tile.tsx`) |
| Status chip | `Badge` with `variant="bullish|bearish|warn|info|lab|brand|muted"`, `size="sm|xs"` |
| Exchange name | `ExchangeLabel` (`components/trading/`) |
| 2–6 option toggle | `Segmented` (`components/ui/segmented.tsx`) |
| Loading / empty / error | `LoadingState`, `EmptyState`, `ErrorState` (`components/shell/states.tsx`) |
| Side panel / drawer, menu, popover | `Sheet`, `DropdownMenu`, `Popover` (`components/ui/`) |
| Destructive confirm (not live) | `AlertDialog` (`components/ui/alert-dialog.tsx`) |

Every data section handles **loading → error (with retry) → empty → data**.

## 5. Numbers & time (lib/utils/format.ts, lib/utils/time.ts)

Exchange style everywhere: `1,234.56`; negatives use the minus sign "−";
zero never gets "+". Never `toLocaleString('id-ID')` or bare `toFixed` in JSX.

| Value | Formatter | Example |
|---|---|---|
| Crypto price | `formatPrice` | `$67,420.50`, `$2.3457`, `$0.00001234` |
| Money | `formatUsd` / `formatUsdSigned` | `$1,234.50`, `+$12.30`, `−$4.00` |
| Plain number / count | `formatNumber(v, {digits, signed})` / `formatCount` | `1,234.56`, `12,500` |
| Percent | `formatPct(v, {digits=1, signed})` | `56.3%`, `+1.2%`, `0.0%` |
| R-multiple / R:R / bps | `formatR`, `formatRR`, `formatBps` | `+0.14R`, `1.8 : 1`, `+3.2 bps` |
| Compact USD / volume | `formatUsdCompact`, `formatVolume` | `−$1.3M`, `$1.50M` |
| Wallet amount / quantity | `formatAmount(v, ccy)`, `formatQty` | `0.0315 BTC`, `0.3` |
| Time | `formatTime` | `12 Nov 08:00 WIB` (year only if not this year) |
| Date / clock / full | `formatDate`, `formatClock`, `formatDateTime` | `12 Nov 2026`, `08:00 WIB` |
| Log timestamp (fixed width) | `formatTimestamp` | `2026-11-12 08:00:15 WIB` |
| Age | `formatAge` | `3 mnt lalu`, `2 jam lalu` |
| Timeframe / horizon / duration | `formatTimeframe`, `formatHorizon`, `formatDuration` | `4 jam`, `1 hari`, `3 jam 20 mnt` |
| Sign colour | `signClass(v)` | `text-bullish` / `text-bearish` |

## 6. Glossary

`lib/glossary.ts` holds every user-facing term (audit §4): `label`, optional
`short`, a one-sentence `tip`, and `values` (e.g. `termValue('verdict', 'PASS')`
→ "Lolos"). Show a term with `<Term k="holdout" />` (or `short`), read it
with `termLabel` / `termTip`. Each work package adds its own terms in
`lib/glossary-extra/<agent>.ts`; keys must be unique (tested).

## 7. Data loading

- Pages that summarise (Beranda, ribbons) load once, refresh every 5 min
  while visible and when the tab regains focus. No fast polling.
- Never poll exchange positions or balances outside the live pages; link to
  them instead. Never render a passphrase, key or token.
- Reuse the page hooks' query keys so a page never fetches the same data twice.
- A 403 means "no access": hide the part or show a neutral line, never an error.

## 8. Security rules

- Never use `dangerouslySetInnerHTML`. External links go through
  `safeExternalUrl` and use `rel="noopener noreferrer"`.
- Redirect targets from the URL go through `safeNextPath` (default `/beranda`).
- A new third-party host (API, websocket, image CDN) has to be added to the
  CSP in `next.config.ts`, or the browser will block it.
- Anything that can place, cancel or close a **live** order, or change the
  live bot (webhook on/off, passphrase, API keys), needs `<ConfirmLive>`,
  which always says LIVE.
