import { cn } from '@/lib/utils/cn'

/** Fixed colour per coin (not semantic): the same coin always looks the same. */
const PALETTE = [
  'bg-[#f7931a]/20 text-[#f7b250]',
  'bg-[#627eea]/20 text-[#9fb2ff]',
  'bg-[#14f195]/15 text-[#5fe7b0]',
  'bg-[#c2a633]/20 text-[#e3c75a]',
  'bg-[#e84142]/15 text-[#ff8a8a]',
  'bg-[#2a5ada]/20 text-[#8eaaff]',
  'bg-[#b6509e]/20 text-[#e48bd0]',
  'bg-[#00d4aa]/15 text-[#5fe0c8]',
]
const KNOWN: Record<string, number> = { BTC: 0, ETH: 1, SOL: 2, DOGE: 3, AVAX: 4, LINK: 5, AAVE: 6, HYPE: 7 }

function slot(coin: string): number {
  if (coin in KNOWN) return KNOWN[coin]
  let h = 0
  for (const ch of coin) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % PALETTE.length
}

/** Round avatar with the coin's initials. Decorative: the coin name is always written next to it. */
export function CoinAvatar({ symbol, size = 40, className }: { symbol: string; size?: number; className?: string }) {
  const coin = symbol.toUpperCase().replace(/USDT$/, '').replace(/\/.*$/, '')
  return (
    <span
      aria-hidden="true"
      className={cn('grid shrink-0 place-items-center rounded-full font-bold tracking-tight', PALETTE[slot(coin)], className)}
      style={{ width: size, height: size, fontSize: Math.round(size * (coin.length > 3 ? 0.3 : 0.36)) }}
    >
      {coin.slice(0, 4)}
    </span>
  )
}
