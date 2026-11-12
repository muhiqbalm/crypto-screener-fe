# Live pages tidy-up: change checklist (`feat/ux-live-pages`)

Scope: CEO decisions K3 and K4 (`docs/riset-2026-11-12/05-spesifikasi-implementasi.md` §1).
- **K3:** tidy the text and layout of `/balance`, `/webhook` and `/settings`, and add confirm dialogs for live actions.
- **K4:** the example alert template uses `action: open|close`.

Base: `feat/ux-shell` c69a1cd. All the changes are in commit `2137207`, plus this file. Line numbers refer to that commit.

## Behaviour is unchanged

**Not touched.** `git diff c69a1cd 2137207 -- lib/` shows only 4 added lines in `lib/mocks/index.ts`, which are mock mode only. That means:
- `lib/queries/{positions,webhook,credentials,auth}.ts` are unchanged;
- `lib/api/**` is unchanged;
- `next.config.ts` and `package.json` are unchanged.

**Hooks and queries.** Every page calls the same hooks with the same arguments:
- `useWebhookConfig`, `useAutomationToggle`, `useTradeLog`;
- `useBalance`, `useOpenPositions`, `usePositionsHistory`;
- `useCredentials`, `useUpsertCredential`, `useDeleteCredential`;
- `useMe`, `useUpdateProfile`.

The query keys, the polling intervals (trades and open positions every 15 s) and the endpoints are the same. `PositionsTable` still mounts only the selected tab (`PositionsTable.tsx:273`).

**Mutations.** Each mutation has the same function and payload. The only difference is that it now runs after the user confirms in a dialog.
- **Toggle.** Arguments are identical:
  - `{ nextEnabled: true, hasExisting: false }` when inactive (404): `WebhookConfigCard.tsx:149`, `WebhookConfigSettings.tsx:93`;
  - `{ nextEnabled, hasExisting: data.is_active }` otherwise: `WebhookConfigCard.tsx:189-194`;
  - `{ nextEnabled: false, hasExisting: true }` in settings: `WebhookConfigSettings.tsx:158`.
- **Change passphrase.** The same `api.patchWebhookConfig({ passphrase })` call, then the same invalidation of `webhookKeys.config()` (`WebhookConfigSettings.tsx:144`).
- **API key.** The same `upsert` body, `{exchange, api_key, secret, api_passphrase (OKX only)}` (`ExchangeCredentialCard.tsx:64`), and the same `remove(exchange)` (`:85`).
- **Profile.** The same `useUpdateProfile` mutation. It still sends only the changed fields; profile + Telegram and password now have separate buttons (`ProfileSettings.tsx:61`, `:80`).

`mutate(...)` became `mutateAsync(...)`. That way the dialog can stay open while the request runs, and on error it shows the reason. Errors are still caught and shown as a toast, as before.

**Nothing new reaches the server.** The UI never calls `/webhook/tradingview`:
- `TestWebhookCard` has no `api` import, no mutation and no `fetch`;
- this is tested in `webhook-live.test.tsx`.

## Checklist

### `/webhook`

| # | Change (audit §2.7) | Where |
|---|---|---|
| W1 | **Honest inactive state.** The 404 ("never created" or paused) now reads "Webhook tidak aktif (belum dibuat atau sedang dijeda)". It no longer says "No webhook configured". | `WebhookConfigCard.tsx:136`, `WebhookConfigSettings.tsx:83` |
| W2 | **"Create" can no longer silently re-enable.** Activating always opens a ConfirmLive. Its text says that an old passphrase is reused, or a new one is generated. | `WebhookConfigCard.tsx:142`, `:24` (copy), `WebhookConfigSettings.tsx:86` |
| W3 | **Deactivating goes through ConfirmLive.** This replaces the plain AlertDialog. The text adds that open positions are not closed automatically. | `WebhookConfigCard.tsx:211`, `:31` |
| W4 | **Status as text plus a pill** ("Otomasi aktif" / "Tidak aktif"), never colour only. | `WebhookConfigCard.tsx:209` |
| W5 | **Template in the bot's format.** Values were checked by reading `src/trading/models.py` `WebhookPayload`: `action` open/close, `side` long/short, `size_type`, `size_value`, optional `leverage`, `exchange`, `passphrase`. It has open/close × long/short selectors. A close sends 100% and no leverage, the same as the team's Pine. | `AlertPayloadTemplate.tsx:27-48` |
| W6 | **Template example sizes.** The example size is 50% at leverage 4, the Pine script's own defaults, replacing 100% / 5×. The text says these are examples. **Reviewer: confirm, or revert to 100/5.** | `AlertPayloadTemplate.tsx:17` |
| W7 | **Template passphrase masked on screen.** The "Salin" button still copies the real passphrase, as before, and the note says so. | `AlertPayloadTemplate.tsx:75`, `:78` |
| W8 | **Preview card cleaned up.** The fake "200 OK" / "200 Success" is removed, and the card reads "Pratinjau, tidak dikirim". The header is a real `<button>` (keyboard accessible). The unreachable error branches are removed. The text is Indonesian. | `TestWebhookCard.tsx:48`, `:120-126`, `:299` |
| W9 | **Log alert shows load errors.** A failed load used to look like an empty table. | `SignalLogsTable.tsx:157` |
| W10 | **Log alert detail.** Any row opens a detail view, and both failed **and rejected** rows show the bot's reason. | `SignalLogsTable.tsx:23`, `Detail` |
| W11 | **Log alert display.** Statuses are in Indonesian (`TradeStatusIcon.tsx:6`). Times are in WIB with an age. Rows become cards on phones. | `SignalLogsTable.tsx` |
| W12 | **Log alert rendering.** The first 50 rows are rendered, with "Tampilkan 50 lagi". The query and its polling are unchanged. | `SignalLogsTable.tsx:127` |
| W13 | **Page header.** The page is LIVE-labelled, with a help fold. Order: config + template, then log, then preview. | `app/(app)/webhook/page.tsx:18`, `WebhookTab.tsx:17` |

### `/settings` (Akun & koneksi)

| # | Change (audit §2.8) | Where |
|---|---|---|
| S1 | **API key save/replace behind ConfirmLive.** Replacing uses a red button; a first save shows the same dialog. | `ExchangeCredentialCard.tsx:259` |
| S2 | **API key delete behind ConfirmLive, with "LIVE" typed** to confirm. This replaces the two-click "Confirm remove". | `ExchangeCredentialCard.tsx:240`, `:244` |
| S3 | **Webhook passphrase change behind ConfirmLive, with "LIVE" typed.** The text warns that old alerts stop working. | `WebhookConfigSettings.tsx:283`, `:132` |
| S4 | **Webhook activate/deactivate behind ConfirmLive.** Same copy as `/webhook`; the trash icon is replaced by a power icon. | `WebhookConfigSettings.tsx:86`, `:266` |
| S5 | **Failed API key list is an error, not "Not configured".** The error tells the user not to re-save while the status is unknown. | `SettingsView.tsx:69` |
| S6 | **The two passphrases have distinct names:** "Passphrase API OKX" and "Kata sandi webhook". | `ExchangeCredentialCard.tsx:188` |
| S7 | **Errors are in Indonesian** via `describeError`, never "ApiError(server:422)". | all `notify.error` calls |
| S8 | **Telegram guidance.** Explains the group ID minus sign, that the bot must be in the group, and that an empty field uses the team's default group. | `ProfileSettings.tsx:168` |
| S9 | **Profile and password are saved separately.** | `ProfileSettings.tsx:61`, `:80` |
| S10 | **Title "Akun & koneksi"** (User Hub name), LIVE pills on the key and webhook sections, help fold. | `SettingsView.tsx:46`, `app/(app)/settings/page.tsx:4` |

### `/balance`

| # | Change (audit §2.6) | Where |
|---|---|---|
| B1 | **Colours.** "Bebas" and "Dipakai margin" are neutral, no longer green and red. | `BalanceCard.tsx:44` |
| B2 | **Stablecoin total explained.** It sums USDT/USDC only and is not equity or uPnL. | `BalanceCard.tsx:126` |
| B3 | **"Diperbarui X lalu"** comes from the existing query's `dataUpdatedAt`. | `BalanceCard.tsx:132`, `PositionsTable.tsx:169` |
| B4 | **Asset rows fit phones.** Two lines instead of a cut-off row. | `BalanceCard.tsx:31` |
| B5 | **Missing key or error → link to Akun & koneksi.** The errors go through ErrorState v2. | `BalanceCard.tsx:161`, `PositionsTable.tsx` `LoadError` |
| B6 | **Positions become cards on phones.** Untung/rugi berjalan is a key field. Columns are Indonesian. | `PositionsTable.tsx:58` |
| B7 | **uPnL % basis explained:** uPnL ÷ (entry × qty), as computed in `monitoring_service.py`. | `PositionsTable.tsx:201` |
| B8 | **Realized PnL labelled "perkiraan, belum termasuk fee & funding".** The history is marked "dari catatan bot". | `PositionsTable.tsx:104`, `:242` |
| B9 | **Page header fixed.** It no longer says everything is read from the exchange; the history comes from bot records. LIVE pill, help fold. | `app/(app)/balance/page.tsx:19` |

### Tests (new)

- `components/webhook/webhook-live.test.tsx`, 6 tests:
  - TestWebhookCard only calls GET config; no writer and no `fetch` is called; its source has no api/mutation/fetch;
  - activate/deactivate only run after confirmation;
  - the template uses open/close and masks the passphrase.
- `components/settings/settings-live.test.tsx`, 7 tests:
  - replacing a key → upsert only after "Ya, ganti key";
  - deleting a key needs "LIVE";
  - a passphrase change needs "LIVE";
  - a short passphrase never reaches the dialog;
  - deactivate and activate are gated;
  - a failed key list shows an error.
