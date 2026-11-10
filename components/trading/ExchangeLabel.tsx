import { cn } from '@/lib/utils/cn'

/** Exchange identity colours (brand recognition, not status). */
const EXCHANGE_META: Record<string, { label: string; dot: string }> = {
  binance: { label: 'Binance', dot: 'bg-[#F0B90B]' },
  okx: { label: 'OKX', dot: 'bg-foreground' },
}

export function exchangeLabel(exchange: string): string {
  const meta = EXCHANGE_META[exchange.toLowerCase()]
  return meta?.label ?? exchange.charAt(0).toUpperCase() + exchange.slice(1).toLowerCase()
}

export function ExchangeLabel({ exchange, className }: { exchange: string; className?: string }) {
  const meta = EXCHANGE_META[exchange.toLowerCase()]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-foreground', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta?.dot ?? 'bg-muted-foreground')} aria-hidden="true" />
      {exchangeLabel(exchange)}
    </span>
  )
}
