import { cn } from '@/lib/utils/cn'
import { coinOf } from '@/lib/utils/format'

/** Stable hue (0–359) per coin, so ETH always gets the same colour. */
export function coinHue(coin: string): number {
  let h = 0
  for (let i = 0; i < coin.length; i++) h = (h * 31 + coin.charCodeAt(i)) % 360
  return h
}

/** Up to 4 letters: "1000PEPE" → "PEPE", "ETH" → "ETH". */
export function coinInitials(coin: string): string {
  const letters = coin.replace(/^\d+/, '') || coin
  return letters.slice(0, letters.length <= 4 ? 4 : 3)
}

const SIZE = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
} as const

/**
 * Coin avatar: a circle with the coin's initials in a colour that never
 * changes for that coin. Decorative (the coin name is always written next to it).
 */
export function CoinAvatar({ symbol, size = 'md', className }: { symbol: string; size?: keyof typeof SIZE; className?: string }) {
  const coin = coinOf(symbol)
  const hue = coinHue(coin)
  const initials = coinInitials(coin)
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-display font-extrabold tracking-tight',
        // light text on dark, dark text on light (same hue)
        'text-[hsl(var(--coin-h)_90%_76%)] [.light_&]:text-[hsl(var(--coin-h)_70%_34%)]',
        initials.length > 3 && size !== 'lg' && 'tracking-tighter',
        SIZE[size],
        className,
      )}
      style={
        {
          '--coin-h': hue,
          background: `linear-gradient(140deg, hsl(${hue} 85% 62% / 0.30), hsl(${(hue + 40) % 360} 85% 55% / 0.16))`,
          boxShadow: `inset 0 0 0 1px hsl(${hue} 80% 65% / 0.35)`,
        } as React.CSSProperties
      }
    >
      {initials}
    </span>
  )
}
