import type { BalanceResponse } from '@/lib/api/types/credentials'

export const MOCK_BALANCE: BalanceResponse = {
  balances: [
    {
      exchange: 'binance',
      currency: 'USDT',
      free: 1250.50,
      used: 300.00,
      total: 1550.50,
      account_type: 'trading',
    },
    {
      exchange: 'binance',
      currency: 'BTC',
      free: 0.025,
      used: 0.0,
      total: 0.025,
      account_type: 'trading',
    },
    {
      exchange: 'binance',
      currency: 'ETH',
      free: 0.5,
      used: 0.1,
      total: 0.6,
      account_type: 'trading',
    },
    {
      exchange: 'okx',
      currency: 'USDT',
      free: 800.00,
      used: 0.0,
      total: 800.00,
      account_type: 'trading',
    },
    {
      exchange: 'okx',
      currency: 'ETH',
      free: 0.25,
      used: 0.0,
      total: 0.25,
      account_type: 'funding',
    },
  ],
}
