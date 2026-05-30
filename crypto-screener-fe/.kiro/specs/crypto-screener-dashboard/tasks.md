# Implementation Plan: Crypto Screener Dashboard

Convert the feature design into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step. Focus ONLY on tasks that involve writing, modifying, or testing code.

## Overview

The implementation extends the existing Next.js 16 + Tailwind v4 scaffold by layering shadcn/ui, TanStack Query/Table, next-themes, sonner, and lucide-react on top. Code is built bottom-up: types and the API client first, then query hooks and pure utilities, then shared shell components, then the two feature tabs, finally the page that ties everything together. Property-based tests are authored alongside the code each property targets so regressions surface immediately. All tasks reference the granular sub-requirement clauses in `requirements.md` and the property numbers in `design.md`.

## Tasks

- [x] 1. Project scaffold and tooling extensions
  - [x] 1.1 Install runtime and dev dependencies
    - Add `@tanstack/react-query`, `@tanstack/react-table`, `lucide-react`, `next-themes`, `sonner`, `class-variance-authority`, `clsx`, `tailwind-merge`, `@radix-ui/react-tabs`, `@radix-ui/react-switch`, `@radix-ui/react-select`, `@radix-ui/react-tooltip`, `@radix-ui/react-label`, `@radix-ui/react-slot` to `package.json` runtime dependencies
    - Add `vitest`, `@vitest/ui`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`, `fast-check`, `@fast-check/vitest`, `msw` to dev dependencies
    - Add npm scripts `test`, `test:run`, `test:ui` driving Vitest in single-run, watch, and UI modes respectively
    - Confirm the `@/*` TypeScript path alias is present in `tsconfig.json` (matches shadcn/ui convention)
    - _Requirements: 1.3, 1.4, 1.5_

  - [x] 1.2 Configure Tailwind v4 theme tokens and global styles
    - Edit `app/globals.css` to declare an `@theme` block with shadcn `new-york` zinc dark tokens plus `--color-bullish`, `--color-bullish-foreground`, `--color-bearish`, `--color-bearish-foreground` using OKLCH values verified to clear WCAG AA 4.5:1 against the dark surface
    - Add a `:root.light` override block for the light-mode token set
    - Ensure the default `<html>` rendering uses the dark token set (the `dark` class is applied by `next-themes` from `app/providers.tsx` in a later task)
    - _Requirements: 3.1, 3.3, 3.4_

  - [x] 1.3 Generate shadcn/ui primitive components
    - Create `components/ui/{button,card,tabs,table,switch,badge,skeleton,input,select,sonner,tooltip,label}.tsx` using the shadcn `new-york` style and the project's `@/lib/utils/cn` helper
    - Each generated file is a thin wrapper over Radix primitives with Tailwind class variants
    - _Requirements: 1.4_

  - [x] 1.4 Configure Vitest with jsdom and React Testing Library
    - Create `vitest.config.ts` with `environment: "jsdom"`, `globals: true`, and `setupFiles: ["./vitest.setup.ts"]`
    - Create `vitest.setup.ts` importing `@testing-library/jest-dom/vitest` and registering global mocks (e.g., `IntersectionObserver`, `matchMedia`)
    - Wire path alias `@/*` to the workspace root via `vite-tsconfig-paths` or an inline `resolve.alias`
    - _Requirements: 1.6, 1.7_

- [x] 2. API client, error model, and mock data module
  - [x] 2.1 Define TypeScript interfaces for backend models
    - Create `lib/api/types/common.ts` (`ResponseMetadata`)
    - Create `lib/api/types/screener.ts` (`SignalDirection`, `TierClass`, `AssetSummary`, `AssetDetail`, `MarketOverview`, `SummaryData`, `ScreenerResponse`)
    - Create `lib/api/types/webhook.ts` (`WebhookConfigResponse`, `WebhookConfigCreateRequest`, `WebhookConfigUpdateRequest`)
    - Create `lib/api/types/trades.ts` (`TradeStatus`, `TradeSide`, `TradeAction`, `TradeLogResponse`)
    - Mirror exactly the Pydantic model field names and nullability declared in the backend
    - _Requirements: 4.9, 18.5_

  - [x] 2.2 Implement `ApiError` class and the typed `request<T>` API client
    - Create `lib/api/errors.ts` exporting `ApiErrorKind` and the `ApiError` class with `kind`, `status`, and `cause`
    - Create `lib/api/paths.ts` exporting endpoint path constants (`/api/v1/screener/summary`, `/trading/users/me/webhook-config`, `/trading/users/me/trades`)
    - Create `lib/api/client.ts` exporting an `api` namespace with `getScreenerSummary`, `getWebhookConfig`, `createWebhookConfig`, `patchWebhookConfig`, `deleteWebhookConfig`, `getTradeLog`
    - Resolve base URL from `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000`)
    - Attach `X-API-Key` to `/api/v1/screener/*` paths and `Authorization: Bearer <token>` to `/trading/*` paths
    - Map `2xx → JSON parse`, `401|403 → ApiError("auth")`, `404 → ApiError("not_found")`, `5xx → ApiError("server")`, other 4xx → `ApiError("server")`, `fetch` rejection → `ApiError("network")`
    - When `NEXT_PUBLIC_USE_MOCK_DATA === "true"`, lazy-import `lib/mocks/index.ts` and dispatch from there instead of issuing `fetch`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [ ]* 2.3 Write property test for API client error mapping and headers
    - **Property 3: ApiError mapping is total and drives error UX**
    - **Validates: Requirements 4.3, 4.4, 4.5, 4.6, 4.7, 4.8**
    - Use a stubbed `fetch` driven by `arbHttpStatus()` to assert kind mapping is total and that header attachment matches path prefix

  - [x] 2.4 Implement auth store and mock data module
    - Create `lib/utils/auth-store.ts` exposing a module-level `getToken(): string` and `setToken(t: string): void` (initial value: empty string)
    - Create `lib/mocks/screener.ts` with `MOCK_SCREENER: ScreenerResponse` containing ≥12 assets covering all `SignalDirection` and all `TierClass` values
    - Create `lib/mocks/webhook.ts` with `MOCK_WEBHOOK_CONFIG: WebhookConfigResponse` (`is_active = true`, 16-char passphrase)
    - Create `lib/mocks/trades.ts` with `MOCK_TRADE_LOG: TradeLogResponse[]` covering at least `success`, `failed`, `pending` statuses
    - Create `lib/mocks/index.ts` exporting `getMock(method, path)` that resolves to a Promise on next microtask
    - _Requirements: 4.4, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

  - [ ]* 2.5 Write property test for mock module isolation
    - **Property 12: Mock module isolation**
    - **Validates: Requirements 16.7**
    - Stub `process.env.NEXT_PUBLIC_USE_MOCK_DATA` and assert no symbol from `lib/mocks/*` is reachable from the request call stack when the flag is unset

- [ ] 3. TanStack Query layer
  - [x] 3.1 Create QueryClient factory and shared keys
    - Create `lib/queries/queryClient.ts` exporting `makeQueryClient()` with `staleTime: 30_000`, `gcTime: 300_000`, retry policy that disables retries for `auth` and `not_found` and otherwise retries up to 2 times with `min(1000 * 2 ** attempt, 30_000)` backoff, and `refetchOnWindowFocus: false`
    - Implement the per-request server / per-process client singleton pattern documented in the design
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

  - [ ] 3.2 Implement screener and webhook query hooks
    - Create `lib/queries/screener.ts` exporting `screenerKeys` and `useScreenerSummary()` with `refetchInterval: 60_000` and `refetchIntervalInBackground: false`
    - Create `lib/queries/webhook.ts` exporting `webhookKeys`, `useWebhookConfig()` (no interval), and `useTradeLog()` with `refetchInterval: 15_000`
    - Pass the query's `signal` into `request<T>` so the active-tab unmount path aborts in-flight calls
    - _Requirements: 5.6, 5.7, 5.8, 5.9, 5.10, 5.11_

  - [x] 3.3 Implement the automation-toggle mutation
    - Add `useAutomationToggle()` to `lib/queries/webhook.ts`
    - Map `(nextEnabled = true, hasExisting = false) → POST createWebhookConfig`, `(nextEnabled = true, hasExisting = true) → no-op success`, `(nextEnabled = false) → DELETE deleteWebhookConfig`
    - In `onSettled`, invalidate `webhookKeys.config` so the switch's checked value re-reads the server state
    - Generate a random 16-character passphrase via `generatePassphrase()` (place under `lib/utils/random.ts`) when issuing `POST`
    - _Requirements: 10.3, 10.4, 10.9_

- [x] 4. Pure utility helpers and their property tests
  - [x] 4.1 Implement formatting and helper utilities
    - Create `lib/utils/cn.ts` re-exporting `clsx` + `tailwind-merge`
    - Create `lib/utils/format.ts` with `formatPrice`, `formatPercent`, `formatVolume`, `formatFunding`, `formatScore`, `formatTimestamp`, `valueOrDash`
    - All numeric formatters return `"—"` for `null`, `undefined`, or `NaN`
    - `formatPercent` produces exactly `n` fraction digits with a leading `"+"` or `"-"`
    - `formatTimestamp` produces `YYYY-MM-DD HH:mm:ss` in the user's local timezone via `Intl.DateTimeFormat`
    - _Requirements: 6.14, 11.3, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_

  - [ ]* 4.2 Write property test for formatter shapes
    - **Property 16: Number formatters obey their declared shape**
    - **Validates: Requirements 11.3, 19.1, 19.3, 19.4, 19.5**

  - [ ]* 4.3 Write property test for percent round-trip within tolerance
    - **Property 7: Percent formatter round-trip within tolerance**
    - **Validates: Requirements 19.7**

  - [x] 4.4 Implement hash-tab helpers and `valueOrDash`
    - Create `lib/utils/hash-tab.ts` exporting `TabId`, `HASH_TO_TAB`, `tabIdFromHash(h: string): TabId`, and `setTabHash(id: TabId)`; unrecognised hashes resolve to `"screener"`
    - Implement a `useTabFromHash()` hook based on `useSyncExternalStore` against the `hashchange` event
    - _Requirements: 2.4, 2.7, 2.8, 2.9_

  - [ ]* 4.5 Write property test for tab hash round-trip
    - **Property 2: Tab navigation hash round-trip**
    - **Validates: Requirements 2.4, 2.7, 2.8, 2.9**

- [x] 5. Checkpoint - foundation layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Application shell, providers, and shared shell components
  - [x] 6.1 Implement Providers, ErrorBoundary, and route-level error fallback
    - Create `app/providers.tsx` (client component) wrapping `{children}` in `<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="crypto-screener-theme">`, `<QueryClientProvider client={getQueryClient()}>`, and the custom `<ErrorBoundary>`
    - Implement a class-component `ErrorBoundary` in `components/shell/ErrorBoundary.tsx` rendering "Something went wrong" + a "Reload" button on uncaught exceptions
    - Create `app/error.tsx` as Next.js's per-route fallback (delegates to the same fallback UI)
    - _Requirements: 5.1, 17.7_

  - [x] 6.2 Implement the toast wrapper with deduplication and stack cap
    - Create `components/shell/Toaster.tsx` mounting sonner's `<Toaster richColors closeButton position="bottom-right" visibleToasts={4} />`, switching to `top-center` at `< sm` via Tailwind responsive wrapper classes
    - Create `lib/utils/toast.ts` exporting `notify.success(msg, opts?)`, `notify.error(msg, opts?)`, `notify.info(msg, opts?)` that wrap sonner with a 3 000 ms / 6 000 ms duration default and apply `border-l-bullish` / `border-l-bearish` accent classes
    - Implement `dedupeToast(key, message, windowMs = 2000)` that records the last `(key, message, ts)` and short-circuits within the window
    - _Requirements: 7.7, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 15.9_

  - [ ]* 6.3 Write property test for toast deduplication window
    - **Property 10: Toast deduplication respects the 2 000 ms window**
    - **Validates: Requirements 7.7**

  - [ ]* 6.4 Write property test for toast stack cap
    - **Property 17: Toast stack honours its cap**
    - **Validates: Requirements 13.6**

  - [x] 6.5 Implement DashboardHeader and ThemeToggle
    - Create `components/shell/DashboardHeader.tsx` rendering the product name and a `ThemeToggle` button, sticky at `top-0 z-30`
    - Create `components/shell/ThemeToggle.tsx` using `useTheme()`; wrap the `setTheme` call in `try/catch` so a `localStorage` write failure logs a single `console.warn` and keeps the visually applied class
    - _Requirements: 2.2, 3.10, 3.11_

  - [ ]* 6.6 Write property test for theme persistence best-effort behaviour
    - **Property 1: Theme persistence is best-effort**
    - **Validates: Requirements 3.10, 3.11**

  - [x] 6.7 Implement TabNavigation with hash-synced state and ARIA pattern
    - Create `components/shell/TabNavigation.tsx` wrapping shadcn `Tabs` with two `TabsTrigger`s ("Market Screener", "Webhook & Automation") and two `TabsContent` slots
    - Drive the active tab from `useTabFromHash()` and update the hash on `onValueChange`
    - On `< sm` apply `grid grid-cols-2 w-full` to the `TabsList`
    - Confirm Radix `Tabs` already provides `role="tablist"`, `role="tab"`, `role="tabpanel"`, and Right/Left arrow navigation
    - _Requirements: 2.3, 2.5, 2.6, 14.4, 15.2, 15.3, 15.4_

  - [x] 6.8 Implement ErrorPanel and EmptyPanel
    - Create `components/shell/ErrorPanel.tsx` taking `{ kind: ApiErrorKind; onRetry: () => void; messageOverride?: string }` and mapping `kind` to the user-facing strings defined in Req 17.1–17.4
    - Render an `AlertTriangle` icon in `text-bearish`, the message, and a `Button` labelled "Retry"
    - Create `components/shell/EmptyPanel.tsx` taking `{ message: string; ctaLabel?: string; onCta?: () => void }` for empty / not_found states
    - _Requirements: 7.2, 7.5, 17.1, 17.2, 17.3, 17.4, 17.5_

  - [x] 6.9 Update root layout
    - Replace `app/layout.tsx` so that `<html lang="en">` wraps `<body>` containing `<Providers>{children}</Providers>` and `<Toaster />`
    - Preserve the existing Geist font variable wiring
    - _Requirements: 3.2, 5.1, 15.10_

- [x] 7. Market Screener tab
  - [x] 7.1 Implement cell components: ChangeCell, SignalBadge, TierBadge
    - `components/screener/ChangeCell.tsx` formats with `formatPercent`; applies `text-bullish` for `> 0`, `text-bearish` for `< 0`, default text otherwise; renders `"—"` for null/NaN
    - `components/screener/SignalBadge.tsx` maps `BULLISH → bullish`, `BEARISH → bearish`, `NEUTRAL → muted`; renders `"—"` for null
    - `components/screener/TierBadge.tsx` renders A/B/C with discrete shades distinct from bullish/bearish
    - _Requirements: 3.5, 3.6, 3.7, 3.8, 3.9, 6.14_

  - [ ]* 7.2 Write property test for color-by-sign mapping in ChangeCell
    - **Property 13: Color tokens map by sign**
    - **Validates: Requirements 3.5, 3.6**

  - [ ]* 7.3 Write property test for categorical badge mapping totality
    - **Property 14: Categorical badge token mapping is total**
    - **Validates: Requirements 3.7, 3.8, 3.9, 11.4, 11.5, 11.6, 11.7, 11.8**

  - [x] 7.4 Implement ScreenerFilters and column-visibility hook
    - `components/screener/ScreenerFilters.tsx` with three controls: symbol `Input`, signal `Select` (`ALL|BULLISH|BEARISH|NEUTRAL`), tier `Select` (`ALL|A|B|C`); state owned locally and passed to the parent table
    - `lib/utils/use-column-visibility.ts` exposing `useColumnVisibility()` that returns the allowed column id set per breakpoint as defined in Req 14.1–14.3 (mobile / tablet / desktop)
    - _Requirements: 6.9, 6.11, 14.1, 14.2, 14.3, 14.7_

  - [x] 7.5 Implement ScreenerTable with sort, filter, ARIA, and column visibility
    - `components/screener/ScreenerTable.tsx` built on TanStack Table v8 + shadcn `Table` with the column definitions from the design
    - Override the default header click so the sort cycle is `unsorted → desc → asc → unsorted`
    - Wire `columnFilters` to symbol substring (case-insensitive), signal equality, and tier equality with AND combination
    - Render `"—"` for null/undefined cells via `valueOrDash`
    - Apply `hover:bg-muted/50` to `<TableRow>`
    - Render `<th scope="col">` and set `aria-sort` to `"ascending"`, `"descending"`, or `"none"` per the active sort
    - Drive column visibility from `useColumnVisibility()`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.10, 6.12, 6.13, 6.14, 6.15, 14.1, 14.2, 14.3, 14.7, 14.8, 15.6, 15.7, 15.8_

  - [ ]* 7.6 Write property test for screener filter pipeline
    - **Property 4: Screener filter pipeline is monotone and order-preserving**
    - **Validates: Requirements 6.1, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12, 6.13**

  - [ ]* 7.7 Write property test for sort cycle closure and ARIA correctness
    - **Property 5: Sort cycle is closed and ARIA-correct**
    - **Validates: Requirements 6.4, 6.5, 6.6, 15.7, 15.8**

  - [ ]* 7.8 Write property test for null/undefined cells rendering as em dash
    - **Property 6: Null/undefined cells render as em dash**
    - **Validates: Requirements 6.14, 19.6**

  - [x] 7.9 Implement MarketScreenerTab states (pending, error, empty, data)
    - `components/screener/MarketScreenerTab.tsx` consumes `useScreenerSummary()` and renders one of: 8-row skeleton, `ErrorPanel` + `notify.error` (deduped against the query key), `EmptyPanel("No assets available")`, or `ScreenerFilters` + `ScreenerTable`
    - Wire the empty / error "Retry" button to `queryClient.invalidateQueries({ queryKey: screenerKeys.summary })`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 7.10 Write property test for skeleton ↔ data atomic swap
    - **Property 11: Skeleton ↔ data swap is atomic**
    - **Validates: Requirements 12.2, 12.3, 12.4**

- [x] 8. Webhook & Automation tab
  - [x] 8.1 Implement WebhookConfigCard with passphrase masking
    - `components/webhook/WebhookConfigCard.tsx` consumes `useWebhookConfig()`
    - Compute the webhook URL locally as `${NEXT_PUBLIC_API_BASE_URL}/webhook/tradingview`
    - Render the passphrase masked by default via `maskPassphrase(p) = "•".repeat(max(0, p.length - 4)) + p.slice(-4)` (placed in `lib/utils/mask.ts`)
    - Provide a visibility-toggle button and "Copy" buttons for the URL and the passphrase (clipboard write wrapped in try/catch; success → `notify.success("Copied to clipboard")`, failure → `notify.error("Copy failed: " + reason)`)
    - On `not_found` error, render "No webhook configuration yet" + a "Create webhook config" button that calls `useAutomationToggle().mutate({ nextEnabled: true, hasExisting: false })`
    - On other errors, render `ErrorPanel`
    - On pending, render skeleton rows for URL and passphrase
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 14.5_

  - [ ]* 8.2 Write property test for passphrase masking
    - **Property 15: Passphrase masking preserves the last four characters**
    - **Validates: Requirements 8.3**

  - [x] 8.3 Implement AlertPayloadTemplate
    - `components/webhook/AlertPayloadTemplate.tsx` builds the template object and serialises with `JSON.stringify(template, null, 2)`
    - Substitute `passphrase` with the resolved value when `useWebhookConfig()` succeeds, else `<your-passphrase>`
    - Render inside `<pre><code>` with a monospaced font
    - "Copy template" button writes the rendered string to the clipboard and emits `notify.success("Template copied")`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 14.5_

  - [ ]* 8.4 Write property test for alert payload JSON shape
    - **Property 8: Alert payload template is parseable JSON**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.9**

  - [x] 8.5 Implement AutomationToggle
    - `components/webhook/AutomationToggle.tsx` wraps shadcn `Switch` with an accessible `<Label htmlFor="automation-toggle">Automation enabled</Label>`
    - `checked` is derived from `useWebhookConfig().data?.is_active ?? false`
    - `onCheckedChange` calls `useAutomationToggle().mutate({ nextEnabled, hasExisting: !!data })`
    - While `mutation.isPending`, the switch is `disabled` and shows `Loader2`
    - On success, emit `notify.success("Automation enabled" | "Automation paused")`; on error, emit `notify.error(error.message)`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 15.5_

  - [ ]* 8.6 Write property test for automation toggle state convergence
    - **Property 9: Automation toggle visual state matches server state after settle**
    - **Validates: Requirements 10.7, 10.9**

  - [x] 8.7 Implement TradeStatusIcon and SignalLogsTable
    - `components/webhook/TradeStatusIcon.tsx` renders `Check` (bullish) / `X` (bearish) / `Clock` (warning) per `TradeStatus`
    - `components/webhook/SignalLogsTable.tsx` consumes `useTradeLog()`; columns: `created_at`, `symbol`, `action`, `side`, `status`, `fill_price`, `filled_quantity`
    - Render `created_at` via `formatTimestamp`
    - `side` rendered as `Badge` with `bullish` (long) / `bearish` (short)
    - Failed rows are clickable and toggle an inline expand panel showing `error_details`
    - Use `useRef` to compare `data.length` against the previous render and emit `notify.info("New signal received: …")` for the most recent entry on growth
    - On pending render 5 skeleton rows; on empty array render the "No signals recorded yet" empty-state row
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10, 11.11, 11.12_

  - [x] 8.8 Implement WebhookTab layout
    - `components/webhook/WebhookTab.tsx` arranges `WebhookConfigCard` and `AlertPayloadTemplate` in a vertical stack on mobile and a `grid-cols-2 gap-6` on `lg+`
    - Place `AutomationToggle` and `SignalLogsTable` below as full-width
    - _Requirements: 14.5, 14.6, 14.8_

- [x] 9. Checkpoint - feature tabs implemented
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Final wiring, integration tests, and verification
  - [x] 10.1 Implement DashboardShell page
    - Replace `app/page.tsx` with a server component that renders `DashboardHeader` + `TabNavigation` whose tab content slots are `MarketScreenerTab` and `WebhookTab` respectively
    - Verify the page produces no horizontal scrollbar at 360 px width by using `overflow-x-hidden` on the outer container only as a last resort and otherwise relying on responsive utilities
    - _Requirements: 2.1, 2.3, 14.8_

  - [ ]* 10.2 Write example unit tests for shell components
    - TabNavigation keyboard navigation (Req 15.3, 15.4)
    - ThemeToggle `localStorage` failure path (Req 3.11)
    - ScreenerTable header `aria-sort` example assertions (Req 15.7, 15.8)
    - AutomationToggle on/off → POST/DELETE example assertions (Req 10.3, 10.4)
    - SignalLogsTable new-signal toast and failed-row expansion (Req 11.9, 11.10)
    - ErrorPanel kind → message mapping (Req 17.1–17.4)
    - _Requirements: 3.11, 10.3, 10.4, 11.9, 11.10, 15.3, 15.4, 15.7, 15.8, 17.1, 17.2, 17.3, 17.4_

  - [ ]* 10.3 Write MSW-backed integration tests for screener and webhook flows
    - Screener pending → success path producing the resolved data view (Req 7.1, 12.1)
    - Screener error path with retry button invalidating the query (Req 7.5, 17.5)
    - Webhook tab 404 path showing "Create webhook config" (Req 8.10)
    - Trade log polling at the 15 000 ms interval (Req 5.10)
    - _Requirements: 5.10, 7.1, 7.5, 8.10, 12.1, 17.5_

  - [x] 10.4 Verify build and lint
    - Run `npm run lint` and fix any violations until exit code is 0
    - Run `npm run build` and confirm exit code 0 plus a non-empty `.next/BUILD_ID` artifact
    - _Requirements: 1.6, 1.7_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; core implementation tasks are never marked optional.
- Property test sub-tasks are placed adjacent to the implementation they target so failures surface during the same wave.
- Each task references granular sub-requirement clauses from `requirements.md` and (for property tests) the property number from the design's "Correctness Properties" section.
- Polling intervals, retry policy, and skeleton-vs-data atomicity are intentionally validated by property tests because their behaviour must hold across many randomly generated inputs and timing states.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "2.1"] },
    { "id": 2, "tasks": ["2.2", "4.1", "4.4"] },
    { "id": 3, "tasks": ["2.3", "2.4", "3.1", "4.2", "4.3", "4.5", "6.8"] },
    { "id": 4, "tasks": ["2.5", "3.2", "6.2", "7.1"] },
    { "id": 5, "tasks": ["3.3", "6.3", "6.4", "6.5", "6.7", "7.2", "7.3", "7.4"] },
    { "id": 6, "tasks": ["6.1", "6.6", "7.5", "8.1", "8.3", "8.5", "8.7"] },
    { "id": 7, "tasks": ["6.9", "7.6", "7.7", "7.8", "7.9", "8.2", "8.4", "8.6", "8.8"] },
    { "id": 8, "tasks": ["7.10", "10.1"] },
    { "id": 9, "tasks": ["10.2", "10.3", "10.4"] }
  ]
}
```
