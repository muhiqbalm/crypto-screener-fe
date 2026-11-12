/**
 * "Sentimen & berita" — summaries of /api/v1/intel/news (pure, no React).
 *
 * Headline sentiment is a keyword guess on the title only (backend
 * src/services/intel_service.py), so it is labelled that way everywhere. The backend's
 * "category" (Catalyst = any positive headline, Regulatory = one keyword, everything else
 * Macro) is not a real category and is not shown.
 */
import type { IntelNewsResponse, NewsItem } from '@/lib/api/types/intel'
import { fngPhrase } from './fng'

export type HeadlineTone = 'positif' | 'negatif' | 'netral'

export const HEADLINE_TONE_LABEL: Record<HeadlineTone, string> = {
  positif: 'Positif',
  negatif: 'Negatif',
  netral: 'Netral',
}

export function headlineTone(s: NewsItem['sentiment'] | null | undefined): HeadlineTone {
  return s === 'BULLISH' ? 'positif' : s === 'BEARISH' ? 'negatif' : 'netral'
}

export type ToneFilter = 'semua' | HeadlineTone

export function filterNews(items: NewsItem[], tone: ToneFilter, search: string): NewsItem[] {
  const q = search.trim().toLowerCase()
  return items.filter((n) => {
    if (tone !== 'semua' && headlineTone(n.sentiment) !== tone) return false
    if (!q) return true
    return (
      n.title.toLowerCase().includes(q) ||
      n.summary.toLowerCase().includes(q) ||
      n.affectedSymbols.some((s) => s.toLowerCase().includes(q))
    )
  })
}

export function toneCounts(items: NewsItem[]): Record<HeadlineTone, number> {
  const c: Record<HeadlineTone, number> = { positif: 0, negatif: 0, netral: 0 }
  for (const n of items) c[headlineTone(n.sentiment)]++
  return c
}

/** "BTC", "ETH" … or "Umum" when the backend found no coin name ("CRYPTO"). */
export function coinTag(sym: string): string {
  return sym === 'CRYPTO' ? 'Umum' : sym
}

/** The answer line at the top of Sentimen & berita. */
export function newsAnswer(intel: IntelNewsResponse | null | undefined): string {
  const fng = intel?.fearAndGreed ?? null
  const items = intel?.news ?? []
  const parts: string[] = []
  const mood = fng ? fngPhrase(fng.value, fng.classification) : null
  parts.push(mood ? `Pasar sedang ${mood}.` : 'Indeks takut–serakah tidak tersedia saat ini.')
  if (items.length) {
    const c = toneCounts(items)
    const lead =
      c.positif > c.negatif ? 'lebih banyak positif' : c.negatif > c.positif ? 'lebih banyak negatif' : 'berimbang'
    parts.push(
      `Dari ${items.length} judul berita terbaru, ${c.positif} positif, ${c.negatif} negatif dan ${c.netral} netral (${lead}, ditebak dari kata kunci di judul).`,
    )
  } else {
    parts.push('Judul berita tidak tersedia saat ini.')
  }
  return parts.join(' ')
}
