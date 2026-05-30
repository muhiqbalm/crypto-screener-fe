# Requirements Document

## Introduction

The Crypto Screener Dashboard is a modern, responsive web frontend that consumes the existing `crypto-screener` FastAPI backend and presents two primary workflows in a single dashboard:

1. **Market Screener** — a sortable, filterable data table of ranked crypto assets with multi-factor scoring, tier classification, and trading signals (sourced from `GET /api/v1/screener/summary`).
2. **Webhook & Trading Automation** — a configuration and monitoring surface for the TradingView webhook integration that drives the backend's automated trade execution pipeline (sourced from the `/trading/users/me/webhook-config`, `/trading/users/me/trades`, and related trading routes).

The frontend is built with Next.js (App Router), React, Tailwind CSS, shadcn/ui, TanStack Query, and Lucide React icons. It targets a dark-mode-first, mobile-first dashboard aesthetic similar to professional crypto futures platforms (e.g., OKX), with strong bullish (green) and bearish (red) accents.

This document defines the functional and quality requirements for the initial deliverable: project scaffold, application shell, both dashboard tabs with mock data, TanStack Query data fetching, loading/error UX, responsive layout, and accessibility baseline.

## Glossary

- **Frontend_Application**: The Next.js + React web application defined by this spec, deployed at the root of the `crypto-screener-fe` workspace.
- **Backend_API**: The existing FastAPI service in the `crypto-screener` repository, reachable at the base URL configured via the `NEXT_PUBLIC_API_BASE_URL` environment variable.
- **Dashboard_Shell**: The top-level page layout that hosts the application header, tab navigation, and the active tab's content.
- **Tab_Navigation**: The shadcn/ui `Tabs` component instance that switches between the Market Screener tab and the Webhook & Trading Automation tab.
- **Market_Screener_Tab**: The dashboard view that lists ranked crypto assets returned by `GET /api/v1/screener/summary`.
- **Screener_Table**: The shadcn/ui + TanStack Table component instance that renders the rows in the Market Screener tab.
- **Webhook_Tab**: The dashboard view that exposes webhook configuration, alert payload template, automation toggle, and signal/execution logs.
- **Webhook_Config_Card**: The shadcn/ui `Card` component instance on the Webhook Tab that displays the user's webhook URL and secret/passphrase with a copy-to-clipboard control.
- **Alert_Payload_Template**: The read-only formatted code block on the Webhook Tab showing the JSON body that TradingView alerts must POST to the webhook endpoint.
- **Automation_Toggle**: The shadcn/ui `Switch` component instance on the Webhook Tab that pauses or resumes automated trade execution.
- **Signal_Logs_Table**: The shadcn/ui table on the Webhook Tab that displays a recent history of incoming webhook signals and their execution status.
- **API_Client**: The HTTP client module (`fetch`-based) used by TanStack Query hooks to call the Backend_API. Adds the `X-API-Key` header for screener endpoints and `Authorization: Bearer` for trading endpoints.
- **Query_Provider**: The TanStack Query `QueryClientProvider` that wraps the Frontend_Application and supplies caching, retries, and refetching policies.
- **Mock_Data_Module**: A TypeScript module that exports static fixtures matching the shapes returned by `GET /api/v1/screener/summary`, `GET /trading/users/me/webhook-config`, and `GET /trading/users/me/trades`, used when `NEXT_PUBLIC_USE_MOCK_DATA=true`.
- **Toast_System**: The shadcn/ui Sonner-based toast notifier used to surface non-blocking feedback (errors, copy confirmations, automation state changes).
- **Skeleton_Loader**: The shadcn/ui `Skeleton` component used as a placeholder while a TanStack Query is in `pending` state.
- **Theme_Provider**: The component that applies the CSS `class="dark"` strategy from `next-themes` to enable shadcn/ui's dark color tokens by default.
- **Asset_Row**: One entry in the Screener_Table corresponding to one element of the `assets` array in the `ScreenerResponse` payload.
- **Signal_Direction**: The `signal` field of an Asset_Row, with allowed values `BULLISH`, `BEARISH`, `NEUTRAL`.
- **Tier_Class**: The `tier` field of an Asset_Row, with allowed values `A`, `B`, `C`.
- **Mobile_Breakpoint**: Viewports with width less than 640 pixels (Tailwind `sm` breakpoint).
- **Tablet_Breakpoint**: Viewports with width from 640 pixels up to 1023 pixels.
- **Desktop_Breakpoint**: Viewports with width 1024 pixels or greater.

## Requirements

### Requirement 1: Project Scaffold and Tooling

**User Story:** As a frontend developer, I want a clean Next.js + Tailwind + shadcn/ui project scaffold with TanStack Query and Lucide React installed, so that I can build dashboard features without re-configuring tooling.

#### Acceptance Criteria

1. THE Frontend_Application SHALL use Next.js with the App Router as configured by the existing `next.config.ts` and `app/` directory in the workspace.
2. THE Frontend_Application SHALL include Tailwind CSS as a build dependency declared in `package.json`.
3. THE Frontend_Application SHALL include `@tanstack/react-query`, `@tanstack/react-table`, `lucide-react`, `next-themes`, and `sonner` as runtime dependencies declared in `package.json`.
4. THE Frontend_Application SHALL include the shadcn/ui generated component files under `components/ui/` for at least: `button`, `card`, `tabs`, `table`, `switch`, `badge`, `skeleton`, `input`, `select`, `sonner`, and `tooltip`.
5. THE Frontend_Application SHALL define a TypeScript path alias `@/*` that maps to the workspace root, matching the shadcn/ui default convention.
6. WHEN the developer runs `npm run build`, THE Frontend_Application SHALL exit with status code zero and produce a `.next/` build artifact directory containing a non-empty `BUILD_ID` file.
7. WHEN the developer runs `npm run lint`, THE Frontend_Application SHALL exit with status code zero.

### Requirement 2: Application Shell and Tab Navigation

**User Story:** As a user, I want a single dashboard page with a clear header and two top-level tabs, so that I can switch between market screening and webhook automation without navigating away.

#### Acceptance Criteria

1. THE Dashboard_Shell SHALL render at the root route `/` of the Frontend_Application.
2. THE Dashboard_Shell SHALL render an application header containing the product name and a theme toggle control.
3. THE Dashboard_Shell SHALL render the Tab_Navigation with exactly two tabs labelled "Market Screener" and "Webhook & Automation".
4. WHEN the Frontend_Application is loaded for the first time in a browser session and the URL has no recognised hash, THE Tab_Navigation SHALL select the "Market Screener" tab as the active tab.
5. WHEN the user activates the "Webhook & Automation" tab, THE Dashboard_Shell SHALL render the Webhook_Tab content and unmount the Market_Screener_Tab content.
6. WHEN the user activates the "Market Screener" tab, THE Dashboard_Shell SHALL render the Market_Screener_Tab content and unmount the Webhook_Tab content.
7. WHILE the user is on a given tab, THE Tab_Navigation SHALL persist the active tab identifier in the URL hash (e.g., `#screener`, `#webhook`) so the active tab survives a page reload.
8. WHEN the page is loaded with a recognised hash value, THE Tab_Navigation SHALL activate the tab named by the hash.
9. IF the page is loaded with an unrecognised hash value, THEN THE Tab_Navigation SHALL fall back to the "Market Screener" tab.

### Requirement 3: Theme and Visual Identity

**User Story:** As a user, I want a polished dark-mode dashboard with strong bullish/bearish color cues, so that I can read trading data quickly in a professional environment.

#### Acceptance Criteria

1. THE Theme_Provider SHALL apply the `dark` class to the root HTML element on initial page load.
2. THE Frontend_Application SHALL use the Inter typeface (or the existing `Geist` sans-serif variable already configured in `app/layout.tsx`) as the default sans-serif font family.
3. THE Frontend_Application SHALL define a Tailwind color token named `bullish` mapped to a green hue with WCAG AA contrast (>= 4.5:1) against the dark background.
4. THE Frontend_Application SHALL define a Tailwind color token named `bearish` mapped to a red hue with WCAG AA contrast (>= 4.5:1) against the dark background.
5. WHERE an Asset_Row's `change_24h` value is greater than zero, THE Screener_Table SHALL render the value using the `bullish` color token.
6. WHERE an Asset_Row's `change_24h` value is less than zero, THE Screener_Table SHALL render the value using the `bearish` color token.
7. WHERE an Asset_Row's Signal_Direction is `BULLISH`, THE Screener_Table SHALL render a shadcn/ui `Badge` component with the `bullish` color token as its background.
8. WHERE an Asset_Row's Signal_Direction is `BEARISH`, THE Screener_Table SHALL render a shadcn/ui `Badge` component with the `bearish` color token as its background.
9. WHERE an Asset_Row's Signal_Direction is `NEUTRAL`, THE Screener_Table SHALL render a shadcn/ui `Badge` component using the default neutral surface color.
10. WHEN the user activates the theme toggle, THE Theme_Provider SHALL switch the `dark`/`light` class on the root HTML element immediately and SHALL attempt to persist the selection in `localStorage` under the key `crypto-screener-theme`.
11. IF the `localStorage` write in criterion 10 fails (for example because storage is unavailable or full), THEN THE Theme_Provider SHALL keep the visually applied theme and SHALL log a single warning to the browser console.

### Requirement 4: API Client and Configuration

**User Story:** As a frontend developer, I want a typed API client driven by environment variables, so that the dashboard can talk to the real backend in production and to mock data in development.

#### Acceptance Criteria

1. THE Frontend_Application SHALL read the Backend_API base URL from the `NEXT_PUBLIC_API_BASE_URL` environment variable.
2. IF `NEXT_PUBLIC_API_BASE_URL` is not defined at build time, THEN THE Frontend_Application SHALL default the Backend_API base URL to `http://localhost:8000`.
3. THE API_Client SHALL attach the header `X-API-Key: <value>` to every request to a path beginning with `/api/v1/screener/`, where `<value>` is read from the `NEXT_PUBLIC_API_KEY` environment variable.
4. THE API_Client SHALL attach the header `Authorization: Bearer <token>` to every request to a path beginning with `/trading/`, where `<token>` is read from a client-side auth store (initial value: empty string).
5. WHEN a Backend_API response has an HTTP status in the range 500-599, THE API_Client SHALL throw a typed error of class `ApiError` with `kind = "server"`.
6. WHEN a Backend_API response has an HTTP status of 401 or 403, THE API_Client SHALL throw a typed error of class `ApiError` with `kind = "auth"`.
7. WHEN a Backend_API response has an HTTP status of 404, THE API_Client SHALL throw a typed error of class `ApiError` with `kind = "not_found"`.
8. WHEN a Backend_API request fails before receiving a response (network error, abort, or timeout), THE API_Client SHALL throw a typed error of class `ApiError` with `kind = "network"`.
9. THE API_Client SHALL parse every successful Backend_API response body as JSON and SHALL return the parsed value typed against a TypeScript interface that mirrors the Pydantic model declared in `src/api/models.py` of the Backend_API.

### Requirement 5: TanStack Query Caching and Fetching Policy

**User Story:** As a user, I want screener data and trading status to refresh automatically without page reloads, so that I see fresh information without manual interaction.

#### Acceptance Criteria

1. THE Query_Provider SHALL wrap the Frontend_Application root in `app/layout.tsx` so every component subtree can use TanStack Query hooks.
2. THE Query_Provider SHALL configure a default `staleTime` of 30,000 milliseconds for all queries.
3. THE Query_Provider SHALL configure a default `gcTime` of 300,000 milliseconds for all queries.
4. THE Query_Provider SHALL configure a default of 2 retry attempts for failed queries with an exponential backoff starting at 1,000 milliseconds.
5. THE Query_Provider SHALL disable retries for queries whose error has `kind = "auth"` or `kind = "not_found"`.
6. THE Market_Screener_Tab SHALL use a TanStack Query with key `["screener", "summary"]` to fetch `GET /api/v1/screener/summary`.
7. THE Market_Screener_Tab SHALL configure its summary query with `refetchInterval = 60000` milliseconds while the tab is mounted.
8. THE Webhook_Tab SHALL use a TanStack Query with key `["webhook", "config"]` to fetch `GET /trading/users/me/webhook-config`.
9. THE Webhook_Tab SHALL use a TanStack Query with key `["webhook", "trades"]` to fetch `GET /trading/users/me/trades`.
10. THE Webhook_Tab SHALL configure its trades query with `refetchInterval = 15000` milliseconds while the tab is mounted.
11. WHEN the active tab changes, THE Query_Provider SHALL stop the polling interval of the previously active tab's queries within 1,000 milliseconds.

### Requirement 6: Market Screener Data Table

**User Story:** As a trader, I want a table of ranked assets with sortable columns and quick filters, so that I can identify trade candidates in a few seconds.

#### Acceptance Criteria

1. THE Screener_Table SHALL render one row per element of the `assets` array returned by `GET /api/v1/screener/summary`.
2. THE Screener_Table SHALL display the following columns in this left-to-right order: `rank`, `symbol`, `price`, `change_24h`, `volume_24h`, `funding_rate`, `signal`, `composite_score`, `tier`.
3. THE Screener_Table SHALL allow the user to sort by clicking on each of the columns `rank`, `price`, `change_24h`, `volume_24h`, `composite_score`.
4. WHEN the user clicks a sortable column header that is not currently sorted, THE Screener_Table SHALL sort rows in descending order by that column.
5. WHEN the user clicks a sortable column header that is currently sorted descending, THE Screener_Table SHALL sort rows in ascending order by that column.
6. WHEN the user clicks a sortable column header that is currently sorted ascending, THE Screener_Table SHALL clear the sort and revert to the API-provided order (sorted by `rank` ascending).
7. WHERE the user-entered text in the symbol search input is a non-empty string, THE Screener_Table SHALL render only rows whose `symbol` field contains the user-entered text using a case-insensitive substring match.
8. WHERE the user-entered text in the symbol search input is the empty string, THE Screener_Table SHALL ignore the symbol text filter when computing the rendered rows.
9. THE Screener_Table SHALL provide a Signal_Direction filter control with the options `ALL`, `BULLISH`, `BEARISH`, `NEUTRAL`.
10. WHEN the Signal_Direction filter is set to a value other than `ALL`, THE Screener_Table SHALL render only rows whose `signal` field equals the selected value.
11. THE Screener_Table SHALL provide a Tier_Class filter control with the options `ALL`, `A`, `B`, `C`.
12. WHEN the Tier_Class filter is set to a value other than `ALL`, THE Screener_Table SHALL render only rows whose `tier` field equals the selected value.
13. WHEN the user combines the symbol text filter, the Signal_Direction filter, and the Tier_Class filter, THE Screener_Table SHALL render only rows that satisfy every active filter simultaneously.
14. WHEN any cell value is `null` or `undefined`, THE Screener_Table SHALL render the placeholder character `—` (em dash) in that cell.
15. WHEN the user hovers over an Asset_Row, THE Screener_Table SHALL apply a hover background color distinct from the row's resting background color.

### Requirement 7: Market Screener Empty and Error States

**User Story:** As a user, I want clear feedback when the screener has no data or fails to load, so that I am not staring at a blank table.

#### Acceptance Criteria

1. WHILE the screener summary query is in `pending` state, THE Market_Screener_Tab SHALL render the Skeleton_Loader as 8 placeholder rows in the Screener_Table region.
2. WHEN the screener summary query resolves with an empty `assets` array, THE Market_Screener_Tab SHALL render an empty-state panel containing the message "No assets available" and a "Retry" button.
3. WHEN the user clicks the empty-state "Retry" button, THE Market_Screener_Tab SHALL invalidate the `["screener", "summary"]` query and trigger a refetch.
4. THE Market_Screener_Tab SHALL NOT trigger a refetch of the `["screener", "summary"]` query from any user interaction other than (a) the explicit "Retry" button defined in criterion 3, (b) tab activation defined in Requirement 2.6, or (c) the polling interval defined in Requirement 5.7.
5. IF the screener summary query rejects with an `ApiError`, THEN THE Market_Screener_Tab SHALL render an error panel containing the error's user-facing message and a "Retry" button.
6. IF the screener summary query rejects with an `ApiError`, THEN THE Toast_System SHALL display a toast with the user-facing error message.
7. THE Toast_System SHALL deduplicate identical error toasts emitted within a 2,000-millisecond window for the same query key.

### Requirement 8: Webhook Configuration Card

**User Story:** As a user setting up TradingView automation, I want my webhook URL and passphrase displayed with one-click copy, so that I can paste them into TradingView without typos.

#### Acceptance Criteria

1. THE Webhook_Config_Card SHALL display the full webhook URL formed by concatenating the Backend_API base URL with the path `/webhook/tradingview`.
2. THE Webhook_Config_Card SHALL display the user's `passphrase` value returned by `GET /trading/users/me/webhook-config`.
3. THE Webhook_Config_Card SHALL render the `passphrase` value masked by default, displaying only the last 4 characters in plaintext and replacing all other characters with the bullet character `•`.
4. THE Webhook_Config_Card SHALL provide a visibility-toggle button that switches the `passphrase` between masked and plaintext display.
5. THE Webhook_Config_Card SHALL provide a "Copy" button next to the webhook URL that, when activated, writes the full webhook URL string to the system clipboard.
6. THE Webhook_Config_Card SHALL provide a "Copy" button next to the passphrase that, when activated, writes the unmasked passphrase string to the system clipboard.
7. WHEN a "Copy" button writes a value to the clipboard, THE Toast_System SHALL display a confirmation toast containing the text "Copied to clipboard" within 200 milliseconds.
8. IF the clipboard write fails (e.g., browser permission denied), THEN THE Toast_System SHALL display an error toast containing the text "Copy failed" and the underlying error reason.
9. WHILE the webhook config query is in `pending` state, THE Webhook_Config_Card SHALL render Skeleton_Loader placeholders for the URL row and the passphrase row.
10. IF the webhook config query rejects with an `ApiError` whose `kind = "not_found"`, THEN THE Webhook_Config_Card SHALL render the message "No webhook configuration yet" and a "Create webhook config" button.
11. IF the webhook config query rejects with an `ApiError` whose `kind` is not `"not_found"`, THEN THE Webhook_Config_Card SHALL render the error panel defined in Requirement 17 (without the "Create webhook config" button) using the message that matches the error's `kind`.

### Requirement 9: Alert Payload Template Display

**User Story:** As a user configuring TradingView, I want the exact JSON template TradingView should send, so that I can copy it directly into the alert message field.

#### Acceptance Criteria

1. THE Alert_Payload_Template SHALL render a code block whose content is a syntactically valid JSON string with the keys `action`, `symbol`, `side`, `size_type`, `size_value`, `leverage`, `exchange`, and `passphrase`.
2. THE Alert_Payload_Template SHALL set the `action` field to the placeholder string `{{strategy.order.action}}`.
3. THE Alert_Payload_Template SHALL set the `symbol` field to the placeholder string `{{ticker}}`.
4. THE Alert_Payload_Template SHALL set the `passphrase` field to the actual passphrase value returned by `GET /trading/users/me/webhook-config`, when that query has resolved successfully.
5. WHILE the webhook config query is in `pending` state, THE Alert_Payload_Template SHALL set the `passphrase` field to the placeholder string `<your-passphrase>`.
6. THE Alert_Payload_Template SHALL render the JSON content using a monospaced typeface and preserve indentation of 2 spaces per nesting level.
7. THE Alert_Payload_Template SHALL provide a "Copy template" button that writes the rendered JSON string (with the placeholder substitutions applied) to the system clipboard.
8. WHEN the user clicks "Copy template", THE Toast_System SHALL display a confirmation toast containing the text "Template copied".
9. FOR ANY rendered JSON template, parsing the rendered text with `JSON.parse` SHALL produce an object whose keys match the set defined in criterion 1 (round-trip property).

### Requirement 10: Automation Toggle

**User Story:** As a user, I want a single switch to pause or resume my trading automation, so that I can stop trades immediately during market events.

#### Acceptance Criteria

1. THE Automation_Toggle SHALL render a shadcn/ui `Switch` component with an accessible label "Automation enabled".
2. THE Automation_Toggle SHALL reflect the `is_active` field of the webhook config response as the initial checked state.
3. WHEN the user changes the Automation_Toggle from off to on, THE Frontend_Application SHALL send `POST /trading/users/me/webhook-config` if no active webhook config exists, OR `PATCH /trading/users/me/webhook-config` to set `is_active = true` if one exists.
4. WHEN the user changes the Automation_Toggle from on to off, THE Frontend_Application SHALL send `DELETE /trading/users/me/webhook-config` to deactivate the active webhook config.
5. WHILE the toggle mutation is in `pending` state, THE Automation_Toggle SHALL display a loading spinner and SHALL disable further user interaction with the switch.
6. WHEN the toggle mutation resolves successfully, THE Toast_System SHALL display a confirmation toast containing the text "Automation enabled" or "Automation paused" matching the new state.
7. IF the toggle mutation rejects with an `ApiError`, THEN THE Automation_Toggle SHALL revert its visual state to the value before the user interaction.
8. IF the toggle mutation rejects with an `ApiError`, THEN THE Toast_System SHALL display an error toast containing the error's user-facing message.
9. WHEN the toggle mutation resolves, THE Frontend_Application SHALL invalidate the `["webhook", "config"]` query so the next read reflects the server-side state.

### Requirement 11: Signal and Execution Logs Table

**User Story:** As a user, I want a recent history of webhook signals and their execution status, so that I can verify my automation is working and spot failed trades.

#### Acceptance Criteria

1. THE Signal_Logs_Table SHALL render one row per element of the array returned by `GET /trading/users/me/trades`.
2. THE Signal_Logs_Table SHALL display the following columns in this left-to-right order: `created_at`, `symbol`, `action`, `side`, `status`, `fill_price`, `filled_quantity`.
3. THE Signal_Logs_Table SHALL render the `created_at` timestamp using the user's local timezone in the format `YYYY-MM-DD HH:mm:ss`.
4. WHERE the `side` field equals `long`, THE Signal_Logs_Table SHALL render the value as a shadcn/ui `Badge` using the `bullish` color token.
5. WHERE the `side` field equals `short`, THE Signal_Logs_Table SHALL render the value as a shadcn/ui `Badge` using the `bearish` color token.
6. WHERE the `status` field equals `success`, THE Signal_Logs_Table SHALL render a green check icon next to the status text.
7. WHERE the `status` field equals `failed`, THE Signal_Logs_Table SHALL render a red cross icon next to the status text.
8. WHERE the `status` field equals `pending` or `rejected`, THE Signal_Logs_Table SHALL render a yellow clock icon next to the status text.
9. WHEN the user clicks a row whose `status` equals `failed`, THE Signal_Logs_Table SHALL expand an inline panel showing the row's `error_details` value.
10. WHEN the trade log query receives a new array longer than the previously cached array, THE Toast_System SHALL display a toast containing the text "New signal received" for the most recent entry.
11. WHILE the trade log query is in `pending` state, THE Signal_Logs_Table SHALL render the Skeleton_Loader as 5 placeholder rows.
12. WHEN the trade log query resolves with an empty array, THE Signal_Logs_Table SHALL render an empty-state row containing the text "No signals recorded yet".

### Requirement 12: Loading and Skeleton Behaviour

**User Story:** As a user, I want skeleton placeholders that match the final layout, so that the page does not jump or shift while data loads.

#### Acceptance Criteria

1. WHILE any TanStack Query is in `pending` state, THE component bound to that query SHALL render a Skeleton_Loader whose outer dimensions match the dimensions of the resolved component within 8 pixels of tolerance.
2. THE Skeleton_Loader SHALL never render simultaneously with the resolved data view for the same query.
3. WHEN a TanStack Query transitions from `pending` to `success`, THE component SHALL replace the Skeleton_Loader with the resolved data view in the same render commit (no intermediate empty frame).
4. WHEN a TanStack Query transitions from `pending` to `error`, THE component SHALL replace the Skeleton_Loader with the error panel in the same render commit.
5. WHEN a previously successful TanStack Query is invalidated and re-enters the `pending` state (a refetch is in progress), THE component bound to that query SHALL replace the resolved data view with the Skeleton_Loader within 100 milliseconds of the refetch starting.

### Requirement 13: Toast Feedback System

**User Story:** As a user, I want non-blocking confirmations and error notifications, so that I know my actions succeeded without interrupting my workflow.

#### Acceptance Criteria

1. THE Toast_System SHALL render in the bottom-right corner of the viewport on Desktop_Breakpoint screens.
2. THE Toast_System SHALL render in the top-center of the viewport on Mobile_Breakpoint screens.
3. THE Toast_System SHALL auto-dismiss success toasts after 3,000 milliseconds.
4. THE Toast_System SHALL auto-dismiss error toasts after 6,000 milliseconds.
5. THE Toast_System SHALL provide a manual dismiss control (close button) on every toast.
6. THE Toast_System SHALL stack at most 4 toasts at one time and SHALL discard the oldest toast when a fifth toast is emitted.
7. THE Toast_System SHALL use the `bullish` color token for the success toast left-border accent and the `bearish` color token for the error toast left-border accent.

### Requirement 14: Responsive Layout

**User Story:** As a user, I want the dashboard to adapt to phones, tablets, and desktops, so that I can monitor markets from any device.

#### Acceptance Criteria

1. ON Mobile_Breakpoint, THE Screener_Table SHALL render only the columns `rank`, `symbol`, `price`, `change_24h`, and `signal`.
2. ON Tablet_Breakpoint, THE Screener_Table SHALL render the columns `rank`, `symbol`, `price`, `change_24h`, `volume_24h`, `signal`, and `tier`.
3. ON Desktop_Breakpoint, THE Screener_Table SHALL render all columns defined in Requirement 6.2.
4. ON Mobile_Breakpoint, THE Tab_Navigation SHALL render the tab triggers as full-width buttons stacked horizontally with equal width.
5. ON Mobile_Breakpoint, THE Webhook_Config_Card and the Alert_Payload_Template SHALL each occupy 100% of the available content width.
6. ON Desktop_Breakpoint, THE Webhook_Config_Card and the Alert_Payload_Template SHALL be arranged side-by-side in a 2-column grid with each column occupying 50% of the available content width.
7. WHEN the viewport width changes across a breakpoint boundary, THE Frontend_Application SHALL apply the layout for the new breakpoint within 200 milliseconds without a page reload.
8. THE Dashboard_Shell SHALL never produce horizontal scrollbars on viewports with width 360 pixels or greater.

### Requirement 15: Accessibility Baseline

**User Story:** As a user with assistive technology, I want the dashboard to follow accessibility conventions, so that I can navigate and operate it with a keyboard or screen reader.

#### Acceptance Criteria

1. THE Frontend_Application SHALL provide a visible focus indicator with a contrast ratio of at least 3:1 against adjacent colors on every interactive element.
2. THE Tab_Navigation SHALL implement the WAI-ARIA Tabs pattern, including `role="tablist"`, `role="tab"`, and `role="tabpanel"` attributes.
3. WHEN the user presses the Right arrow key while focus is on a tab trigger, THE Tab_Navigation SHALL move focus to the next tab trigger.
4. WHEN the user presses the Left arrow key while focus is on a tab trigger, THE Tab_Navigation SHALL move focus to the previous tab trigger.
5. THE Automation_Toggle SHALL expose an `aria-checked` attribute that mirrors its checked state.
6. THE Screener_Table SHALL render `<th scope="col">` cells for every column header.
7. WHEN a sortable column header is sorted ascending, THE Screener_Table SHALL set the `aria-sort` attribute on that header to `ascending`.
8. WHEN a sortable column header is sorted descending, THE Screener_Table SHALL set the `aria-sort` attribute on that header to `descending`.
9. THE Toast_System SHALL announce new toasts to assistive technology by rendering them inside an `aria-live="polite"` region.
10. THE Frontend_Application SHALL set the `lang` attribute on the root `<html>` element to a valid BCP 47 language tag.

### Requirement 16: Mock Data Module

**User Story:** As a developer, I want mock data wired up to the same query keys, so that I can develop and demo the UI without a running backend.

#### Acceptance Criteria

1. WHEN the environment variable `NEXT_PUBLIC_USE_MOCK_DATA` is set to the string `"true"`, THE API_Client SHALL return values from the Mock_Data_Module instead of issuing HTTP requests.
2. THE Mock_Data_Module SHALL export a fixture conforming to the `ScreenerResponse` TypeScript interface containing at least 12 `assets` entries.
3. THE Mock_Data_Module SHALL export at least one Asset_Row with each Signal_Direction (`BULLISH`, `BEARISH`, `NEUTRAL`).
4. THE Mock_Data_Module SHALL export at least one Asset_Row with each Tier_Class (`A`, `B`, `C`).
5. THE Mock_Data_Module SHALL export a fixture conforming to the `WebhookConfigResponse` TypeScript interface with `is_active = true` and a non-empty `passphrase`.
6. THE Mock_Data_Module SHALL export a fixture conforming to `list[TradeLogResponse]` containing at least one entry with each `status` value in the set `{success, failed, pending}`.
7. THE Mock_Data_Module SHALL be tree-shaken out of the production bundle when `NEXT_PUBLIC_USE_MOCK_DATA` is unset or set to any value other than `"true"`.

### Requirement 17: Error Handling and Resilience

**User Story:** As a user, I want clear, recoverable error states, so that transient backend failures do not break my session.

#### Acceptance Criteria

1. WHEN the API_Client throws an `ApiError` with `kind = "network"`, THE component bound to that query SHALL render an error panel with the message "Connection lost — check your network".
2. WHEN the API_Client throws an `ApiError` with `kind = "server"`, THE component bound to that query SHALL render an error panel with the message "The server is unavailable. Please try again."
3. WHEN the API_Client throws an `ApiError` with `kind = "auth"`, THE component bound to that query SHALL render an error panel with the message "Your session has expired. Please sign in again."
4. WHEN the API_Client throws an `ApiError` with `kind = "not_found"`, THE component bound to that query SHALL render an empty-state panel rather than an error panel.
5. THE error panel SHALL provide a "Retry" button that, when activated, invalidates and refetches the failing query.
6. FOR ANY failing query that has `kind = "network"` or `kind = "server"`, retrying the request SHALL eventually produce either a successful result or another typed `ApiError` (no unhandled exception SHALL escape the query layer).
7. WHEN any unhandled exception is thrown inside a React component subtree, THE Frontend_Application SHALL render a top-level Error Boundary fallback containing the message "Something went wrong" and a "Reload" button.

### Requirement 18: Project Structure and Conventions

**User Story:** As a developer joining the project, I want a predictable folder structure that matches shadcn/ui and Next.js App Router conventions, so that I can find and add files without guesswork.

#### Acceptance Criteria

1. THE Frontend_Application SHALL place shadcn/ui generated component source files under the directory `components/ui/`.
2. THE Frontend_Application SHALL place feature-specific components under the directory `components/<feature>/` (for example `components/screener/`, `components/webhook/`).
3. THE Frontend_Application SHALL place TanStack Query hooks under the directory `lib/queries/`.
4. THE Frontend_Application SHALL place the API_Client implementation under the directory `lib/api/`.
5. THE Frontend_Application SHALL place TypeScript interfaces that mirror Backend_API response models under the directory `lib/api/types/`.
6. THE Frontend_Application SHALL place the Mock_Data_Module under the directory `lib/mocks/`.
7. THE Frontend_Application SHALL place the root dashboard page in `app/page.tsx` and the root layout (containing the Theme_Provider, Query_Provider, and Toast_System) in `app/layout.tsx`.
8. THE Frontend_Application SHALL place utility functions (formatters for prices, percentages, timestamps) under `lib/utils/`.

### Requirement 19: Number and Currency Formatting

**User Story:** As a user, I want consistently formatted numbers, so that I can compare assets at a glance.

#### Acceptance Criteria

1. THE Frontend_Application SHALL format `price` values using a US locale with up to 8 fraction digits and stripping trailing zeros (for example, `0.00123400` is rendered as `0.001234`).
2. THE Frontend_Application SHALL format `change_24h` values as a percentage with exactly 2 fraction digits and a leading sign character (`+` or `-`).
3. THE Frontend_Application SHALL format `volume_24h` values using compact notation with one fraction digit for values >= 1,000 (for example, `1,234,567` is rendered as `1.2M`).
4. THE Frontend_Application SHALL format `funding_rate` values as a percentage with 4 fraction digits and a leading sign character.
5. THE Frontend_Application SHALL format `composite_score` values with exactly 2 fraction digits.
6. WHEN a numeric input value is `NaN`, `null`, or `undefined`, THE formatter SHALL return the placeholder character `—`.
7. FOR ANY finite numeric input `x`, the percentage formatter SHALL satisfy: parsing the formatted output (after stripping the `%` sign) and dividing by 100 produces a number within 1e-9 of `x` divided by 100 (round-trip property within tolerance).
