/**
 * Live (real-money) bot history on this site starts on 6 Nov 2026: the trading database was
 * replaced that day and earlier records were not carried over (audit 2026-11-13 P2). The 8
 * orders of 14 Oct – 5 Nov survive only as log evidence in Cek bot live, without fill prices.
 * Every list of live trades shows this note, so an empty or short list is never read as
 * "the bot did nothing before".
 */
export const LIVE_HISTORY_START = '2026-11-06T00:00:00Z'

export const LIVE_HISTORY_NOTE =
  'Riwayat bot live mulai 6 Nov 2026. Catatan sebelum itu tidak terbawa saat database trading diganti; 8 order 14 Okt–5 Nov hanya tercatat di Cek bot live (tanpa harga fill).'

/** True when a period starting at `fromIso` begins before the recorded live history (list may be incomplete). */
export function beforeLiveHistory(fromIso: string | null | undefined): boolean {
  if (!fromIso) return false
  const t = Date.parse(fromIso)
  return Number.isFinite(t) && t < Date.parse(LIVE_HISTORY_START)
}
