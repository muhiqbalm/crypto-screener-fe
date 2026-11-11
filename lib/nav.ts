import {
  BarChart2,
  BookOpen,
  Bookmark,
  CandlestickChart,
  FlaskConical,
  Grid3x3,
  Newspaper,
  Radar,
  ScanSearch,
  Wallet,
  Webhook,
  Layers,
  ListChecks,
  TrendingUp,
  Trophy,
  Compass,
  Swords,
  type LucideIcon,
} from 'lucide-react'

/**
 * Single source of truth for app navigation (sidebar, mobile drawer and the
 * Strategy Lab tab strip). Adding a page = adding one entry here.
 */
export interface NavItem {
  href: string
  label: string
  /** One-line hint shown as tooltip / in the mobile drawer. */
  hint?: string
  icon: LucideIcon
  /**
   * Extra path prefixes that should mark this item active
   * (e.g. /lab/runs/123 belongs to "Uji strategi").
   */
  activePrefixes?: string[]
  /** Match the href exactly instead of as a prefix. */
  exact?: boolean
}

export interface NavGroup {
  id: string
  label: string
  /** Hidden unless GET /lab/me says is_admin (UI hint only; backend enforces). */
  adminOnly?: boolean
  items: NavItem[]
}

/** Strategy Lab sub-pages. Rendered as tabs in LabHeader and in the sidebar. */
export const LAB_NAV: NavItem[] = [
  {
    href: '/lab',
    label: 'Uji strategi',
    hint: 'Backtest, validasi & optimasi satu strategi',
    icon: FlaskConical,
    exact: true,
    activePrefixes: ['/lab/runs'],
  },
  {
    href: '/lab/scan',
    label: 'Scan banyak koin',
    hint: 'Satu strategi di banyak koin × timeframe',
    icon: Grid3x3,
  },
  {
    href: '/lab/leaderboard',
    label: 'Peringkat',
    hint: 'Hasil terbaik lintas koin & timeframe, diukur di holdout',
    icon: Trophy,
    activePrefixes: ['/lab/compare'],
  },
  {
    href: '/lab/presets',
    label: 'Preset',
    hint: 'Parameter bernama per koin × timeframe (4H-ETH-Basic = live)',
    icon: Bookmark,
  },
  {
    href: '/lab/universal',
    label: 'Universal',
    hint: 'Strategi portofolio multi-koin + paper otomatis',
    icon: Layers,
  },
  {
    href: '/lab/strength',
    label: 'Koin Terkuat',
    hint: 'Ranking momentum & tren semua koin tiap 4H',
    icon: TrendingUp,
  },
  {
    href: '/lab/outlook',
    label: 'Outlook Koin',
    hint: 'Bias long/short semua koin + faktor, bukti & proyeksi dana',
    icon: Compass,
  },
  {
    href: '/lab/signals',
    label: 'Catatan Sinyal',
    hint: 'Semua sinyal dicatat & dinilai: mana yang bekerja, mana yang noise',
    icon: ListChecks,
  },
  {
    href: '/lab/arena',
    label: 'Arena Paper',
    hint: 'Semua preset paper berdampingan + cek penyimpangan vs backtest',
    icon: Swords,
    href: '/lab/live-check',
    label: 'Cek bot live',
    hint: 'Sinyal 4H-ETH-Basic menurut Lab vs yang benar-benar dieksekusi bot',
    icon: ScanSearch,
  },
]

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'market',
    label: 'Pasar',
    items: [
      { href: '/screener', label: 'Screener', hint: 'Ranking multi-faktor & sinyal', icon: BarChart2 },
      { href: '/chart', label: 'Chart', hint: 'Candle live Binance Perp + overlay strategi', icon: CandlestickChart },
      { href: '/whales', label: 'Whale Radar', hint: 'Rasio L/S top trader & transaksi besar', icon: Radar },
      { href: '/news', label: 'Berita & Sentimen', hint: 'Headline kripto + Fear & Greed', icon: Newspaper },
    ],
  },
  {
    id: 'trading',
    label: 'Trading live',
    items: [
      { href: '/balance', label: 'Saldo & Posisi', hint: 'Ekuitas & posisi live di exchange', icon: Wallet },
      { href: '/webhook', label: 'Webhook', hint: 'Jembatan alert TradingView → order', icon: Webhook },
    ],
  },
  {
    id: 'lab',
    label: 'Strategy Lab',
    adminOnly: true,
    items: [
      ...LAB_NAV,
      { href: '/journal', label: 'Jurnal', hint: 'Jurnal paper trade & statistik R', icon: BookOpen },
    ],
  },
]

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)) {
    return true
  }
  return (item.activePrefixes ?? []).some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
