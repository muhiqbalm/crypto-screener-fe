import {
  Activity,
  BookOpen,
  Bookmark,
  CandlestickChart,
  ClipboardList,
  Compass,
  FileText,
  FlaskConical,
  Grid3x3,
  House,
  ListChecks,
  Newspaper,
  PlayCircle,
  Radar,
  Scale,
  Trophy,
  Wallet,
  Webhook,
  History,
  Table2,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { coinOf } from '@/lib/utils/format'

/**
 * Single source of truth for app navigation (sidebar, mobile drawer, hub
 * sub-tabs). Sitemap: docs/riset-2026-11-12/02-audit-ux.md §3.2.
 *
 *   Logo / Beranda
 *   PASAR            Sentimen & berita → Arus besar → Peluang koin → Chart
 *                    (trader funnel order, .agents/rules)
 *   BOT & STRATEGI   Bot live · uang asli [LIVE]: Status bot, Saldo & posisi, Webhook
 *                    Strategi · simulasi & riset [PAPER]: Uji strategi → Hasil uji →
 *                    Preset → Paper berjalan → Rekam jejak sinyal → Laporan mingguan
 *   USER HUB         (components/shell/UserHub.tsx)
 *
 * Admin sees 14 items, everyone else 8 (Laporan mingguan is readable by all,
 * CEO decision). `access` is a UI hint only: the backend enforces every
 * permission.
 */

export type NavAccess = 'all' | 'admin'

export interface NavItem {
  href: string
  label: string
  /** One-line hint, shown under the label in the mobile drawer and as tooltip. */
  hint?: string
  icon: LucideIcon
  /**
   * Extra path prefixes that should mark this item active
   * (e.g. /lab/runs/123 belongs to "Hasil uji").
   */
  activePrefixes?: string[]
  /** Match the href exactly instead of as a prefix. */
  exact?: boolean
  /** Who sees this item in the menu. Default 'all'. */
  access?: NavAccess
}

export interface NavSection {
  id: string
  /** Sub-group title inside a cluster; omitted for single-section clusters. */
  label?: string
  /** LIVE (real money) or PAPER (simulation) pill next to the title. */
  mode?: 'live' | 'paper'
  items: NavItem[]
}

export interface NavCluster {
  id: 'pasar' | 'bot-strategi'
  label: string
  sections: NavSection[]
}

export const HOME_ITEM: NavItem = {
  href: '/beranda',
  label: 'Beranda',
  hint: 'Ringkasan hari ini: pasar, koin, bot & paper',
  icon: House,
  exact: true,
}

export const NAV_CLUSTERS: NavCluster[] = [
  {
    id: 'pasar',
    label: 'Pasar',
    sections: [
      {
        id: 'pasar',
        items: [
          { href: '/news', label: 'Sentimen & berita', hint: 'Takut–serakah & judul berita kripto', icon: Newspaper },
          { href: '/whales', label: 'Arus besar', hint: 'Whale: trader besar & transaksi besar', icon: Radar },
          {
            href: '/koin',
            label: 'Peluang koin',
            hint: 'Koin mana yang layak dilihat, ke arah mana',
            icon: Compass,
          },
          { href: '/chart', label: 'Chart', hint: 'Candle live + garis strategi', icon: CandlestickChart },
        ],
      },
    ],
  },
  {
    id: 'bot-strategi',
    label: 'Bot & Strategi',
    sections: [
      {
        id: 'bot-live',
        label: 'Bot live · uang asli',
        mode: 'live',
        items: [
          { href: '/bot', label: 'Status bot', hint: 'Bot live aman? Sinyal vs eksekusi', icon: Activity, access: 'admin' },
          { href: '/balance', label: 'Saldo & posisi', hint: 'Saldo & posisi di exchange', icon: Wallet },
          { href: '/webhook', label: 'Webhook', hint: 'Jalur alert TradingView → bot', icon: Webhook },
        ],
      },
      {
        id: 'strategi',
        label: 'Strategi · simulasi',
        mode: 'paper',
        items: [
          {
            href: '/lab',
            label: 'Uji strategi',
            hint: 'Uji ide di satu atau banyak koin',
            icon: FlaskConical,
            exact: true,
            activePrefixes: ['/lab/scan'],
            access: 'admin',
          },
          {
            href: '/lab/hasil',
            label: 'Hasil uji',
            hint: 'Riwayat, peringkat & perbandingan uji',
            icon: ClipboardList,
            activePrefixes: ['/lab/leaderboard', '/lab/compare', '/lab/runs', '/lab/universal'],
            access: 'admin',
          },
          { href: '/lab/presets', label: 'Preset', hint: 'Setting tersimpan per koin × timeframe', icon: Bookmark, access: 'admin' },
          {
            href: '/lab/arena',
            label: 'Paper berjalan',
            hint: 'Semua preset simulasi & jurnal',
            icon: PlayCircle,
            activePrefixes: ['/journal'],
            access: 'admin',
          },
          { href: '/lab/signals', label: 'Rekam jejak sinyal', hint: 'Sinyal mana yang terbukti', icon: ListChecks, access: 'admin' },
          // Readable by every logged-in account (CEO decision K1), so it is in
          // everyone's menu; actions inside stay admin-only in the backend.
          { href: '/lab/report', label: 'Laporan mingguan', hint: 'Ringkasan minggu: paper, sinyal, bot', icon: FileText },
        ],
      },
    ],
  },
]

function visible(item: NavItem, isAdmin: boolean): boolean {
  return (item.access ?? 'all') === 'all' || isAdmin
}

/** Menu for a role: Beranda + clusters with hidden items and empty groups removed. */
export function navForRole(isAdmin: boolean): { home: NavItem; clusters: NavCluster[] } {
  const clusters = NAV_CLUSTERS.map((c) => ({
    ...c,
    sections: c.sections
      .map((s) => ({ ...s, items: s.items.filter((i) => visible(i, isAdmin)) }))
      .filter((s) => s.items.length > 0),
  })).filter((c) => c.sections.length > 0)
  return { home: HOME_ITEM, clusters }
}

/** Every menu item a role sees, Beranda first (admin 14, others 8). */
export function navItemsForRole(isAdmin: boolean): NavItem[] {
  const { home, clusters } = navForRole(isAdmin)
  return [home, ...clusters.flatMap((c) => c.sections.flatMap((s) => s.items))]
}

export function isNavItemActive(item: Pick<NavItem, 'href' | 'exact' | 'activePrefixes'>, pathname: string): boolean {
  const href = item.href.split(/[?#]/)[0]
  if (item.exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)) {
    return true
  }
  return (item.activePrefixes ?? []).some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/** The menu item that owns a path (for titles / breadcrumbs), or null. */
export function activeNavItem(pathname: string, isAdmin = true): NavItem | null {
  return navItemsForRole(isAdmin).find((i) => isNavItemActive(i, pathname)) ?? null
}

/** Link to a coin's page (Peluang koin): "ETHUSDT" / "ETH/USDT:USDT" / "ETH" → "/koin/ETH". */
export function coinHref(symbol: string): string {
  return `/koin/${encodeURIComponent(coinOf(symbol))}`
}

/**
 * Lab paths every logged-in user may READ (CEO decision K1). The Lab gate lets
 * these through; actions on them stay admin-only in the backend.
 */
export const LAB_READ_ALL_PREFIXES = ['/lab/report'] as const

export function isReadableByAll(pathname: string): boolean {
  return LAB_READ_ALL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

// ── Hub sub-tabs (max 3 per page) ──────────────────────────────────────────

export interface HubTab {
  href: string
  label: string
  icon?: LucideIcon
  hint?: string
  exact?: boolean
  activePrefixes?: string[]
  /** For query-string views (/koin?view=…): the page passes the active `value` to HubTabs. */
  value?: string
}

export const HUB_TABS = {
  /** Uji strategi: Satu koin · Banyak koin */
  uji: [
    { href: '/lab', label: 'Satu koin', icon: FlaskConical, exact: true },
    { href: '/lab/scan', label: 'Banyak koin', icon: Grid3x3 },
  ],
  /** Hasil uji: Riwayat · Peringkat · Bandingkan */
  hasil: [
    { href: '/lab/hasil', label: 'Riwayat', icon: History, activePrefixes: ['/lab/runs'] },
    { href: '/lab/leaderboard', label: 'Peringkat', icon: Trophy },
    { href: '/lab/compare', label: 'Bandingkan', icon: Scale },
  ],
  /** Paper berjalan: Klasemen · Jurnal */
  paper: [
    { href: '/lab/arena', label: 'Klasemen', icon: PlayCircle },
    { href: '/journal', label: 'Jurnal', icon: BookOpen },
  ],
  /** Peluang koin views (query string): Outlook · Terkuat · Tabel faktor */
  koin: [
    { href: '/koin', label: 'Outlook', icon: Compass, value: 'outlook' },
    { href: '/koin?view=terkuat', label: 'Terkuat', icon: TrendingUp, value: 'terkuat' },
    { href: '/koin?view=faktor', label: 'Tabel faktor', icon: Table2, value: 'faktor' },
  ],
} as const satisfies Record<string, readonly HubTab[]>

export type HubId = keyof typeof HUB_TABS

/** Route-based hub (uji / hasil / paper) that owns a path, or null. Query-string hubs are never returned. */
export function hubForPath(pathname: string): HubId | null {
  for (const id of ['uji', 'hasil', 'paper'] as const) {
    if (HUB_TABS[id].some((t) => isNavItemActive(t, pathname))) return id
  }
  return null
}
