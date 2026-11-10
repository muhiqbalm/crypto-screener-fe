import { Badge } from '@/components/ui/badge'

/** LONG / SHORT pill — word + colour so colour is never the only signal. */
export function SideBadge({ side }: { side: string }) {
  const isLong = side.toLowerCase() === 'long' || side.toLowerCase() === 'buy'
  return (
    <Badge variant={isLong ? 'bullish' : 'bearish'} size="sm" className="uppercase tracking-wide">
      {isLong ? 'Long' : 'Short'}
    </Badge>
  )
}
